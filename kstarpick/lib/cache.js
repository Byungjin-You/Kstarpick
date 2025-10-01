// 메모리 캐시 저장소
const cache = new Map();

// 캐시 설정
const CACHE_CONFIG = {
  // 뉴스 관련 캐시 (5분)
  news: { ttl: 5 * 60 * 1000 },
  // 드라마 관련 캐시 (10분)
  drama: { ttl: 10 * 60 * 1000 },
  // 셀럽 관련 캐시 (15분)
  celeb: { ttl: 15 * 60 * 1000 },
  // 뮤직 관련 캐시 (30분)
  music: { ttl: 30 * 60 * 1000 },
  // 기본 캐시 (1분)
  default: { ttl: 1 * 60 * 1000 },
};

/**
 * 캐시에서 데이터 가져오기
 * @param {string} key - 캐시 키
 * @returns {any|null} 캐시된 데이터 또는 null
 */
export function getFromCache(key) {
  const cached = cache.get(key);
  
  if (!cached) {
    return null;
  }
  
  // TTL 체크
  if (Date.now() > cached.expiry) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

/**
 * 캐시에 데이터 저장
 * @param {string} key - 캐시 키
 * @param {any} data - 저장할 데이터
 * @param {string} type - 캐시 타입 (news, drama, celeb, music, default)
 */
export function setCache(key, data, type = 'default') {
  const config = CACHE_CONFIG[type] || CACHE_CONFIG.default;
  const expiry = Date.now() + config.ttl;
  
  cache.set(key, {
    data,
    expiry,
    type,
  });
  
  // 캐시 크기 제한 (최대 1000개)
  if (cache.size > 1000) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

/**
 * 캐시 삭제
 * @param {string} key - 삭제할 캐시 키
 */
export function deleteFromCache(key) {
  cache.delete(key);
}

/**
 * 타입별 캐시 모두 삭제
 * @param {string} type - 캐시 타입
 */
export function clearCacheByType(type) {
  for (const [key, value] of cache.entries()) {
    if (value.type === type) {
      cache.delete(key);
    }
  }
}

/**
 * 모든 캐시 삭제
 */
export function clearAllCache() {
  cache.clear();
}

/**
 * 캐시 상태 정보
 * @returns {object} 캐시 상태
 */
export function getCacheStats() {
  const stats = {
    total: cache.size,
    byType: {},
    expired: 0,
  };
  
  const now = Date.now();
  
  for (const [key, value] of cache.entries()) {
    // 타입별 카운트
    if (!stats.byType[value.type]) {
      stats.byType[value.type] = 0;
    }
    stats.byType[value.type]++;
    
    // 만료된 캐시 카운트
    if (now > value.expiry) {
      stats.expired++;
    }
  }
  
  return stats;
}

/**
 * 만료된 캐시 정리
 */
export function cleanupExpiredCache() {
  const now = Date.now();
  const keysToDelete = [];
  
  for (const [key, value] of cache.entries()) {
    if (now > value.expiry) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => cache.delete(key));
  
  return keysToDelete.length;
}

/**
 * API 응답 캐싱 래퍼 함수
 * @param {string} key - 캐시 키
 * @param {Function} fetchFn - 데이터를 가져오는 함수
 * @param {string} type - 캐시 타입
 * @returns {Promise<any>} 캐시된 데이터 또는 새로 가져온 데이터
 */
export async function withCache(key, fetchFn, type = 'default') {
  // 캐시에서 먼저 확인
  const cached = getFromCache(key);
  if (cached) {
    return cached;
  }
  
  try {
    // 캐시에 없으면 새로 가져오기
    const data = await fetchFn();
    
    // 성공한 경우에만 캐시에 저장
    if (data) {
      setCache(key, data, type);
    }
    
    return data;
  } catch (error) {
    console.error(`Failed to fetch data for key: ${key}`, error);
    throw error;
  }
}

/**
 * 캐시 키 생성 헬퍼
 * @param {string} prefix - 키 접두사
 * @param {object} params - 파라미터 객체
 * @returns {string} 생성된 캐시 키
 */
export function createCacheKey(prefix, params = {}) {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return paramString ? `${prefix}:${paramString}` : prefix;
}

// 정기적으로 만료된 캐시 정리 (5분마다)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cleaned = cleanupExpiredCache();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired cache entries`);
    }
  }, 5 * 60 * 1000);
} 