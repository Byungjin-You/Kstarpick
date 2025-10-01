import { dbConnect } from '../../../utils/mongodb';
import { ObjectId } from 'mongodb';
import { decodeHtmlEntities } from '../../../utils/helpers';

/**
 * @swagger
 * /api/music:
 *   get:
 *     description: 음악 트랙 목록을 가져옵니다.
 *     responses:
 *       200:
 *         description: 음악 트랙 목록
 *   post:
 *     description: 새 음악 트랙을 등록합니다.
 *     responses:
 *       201:
 *         description: 음악 트랙이 성공적으로 등록됨
 *       400:
 *         description: 유효하지 않은 입력
 *       401:
 *         description: 인증되지 않음
 */
export default async function handler(req, res) {
  console.log(`🎵 음악 API 호출 - 메서드: ${req.method}, 시간: ${new Date().toISOString()}`);
  
  // GET 메서드 처리
  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  
  // POST 메서드 처리
  if (req.method === 'POST') {
    return handlePost(req, res);
  }
  
  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
}

// GET 메서드 처리 함수
async function handleGet(req, res) {

  try {
    console.log('🔗 MongoDB 연결 시도 중...');
    const { db } = await dbConnect();
    console.log('✅ 음악 API - MongoDB 연결 성공');
    
    console.log('🔍 쿼리 파라미터:', req.query);
    
    // 쿼리 파라미터
    const { limit = 10, page = 1 } = req.query;
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;
    
    console.log(`음악 목록 조회 - limit: ${limitNum}, page: ${pageNum}, skip: ${skip}`);
    
    // 데이터 조회
    const musics = await db.collection('musics').find({})
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip)
      .toArray();
      
    console.log(`${musics.length}개의 음악 항목 조회 완료`);
    
    // 전체 아이템 수
    const totalItems = await db.collection('musics').countDocuments({});
    const totalPages = Math.ceil(totalItems / limitNum);
    
    console.log('📈 전체 통계:', { totalItems, totalPages });
    
    if (musics.length > 0) {
      console.log('📋 첫 번째 음악:', {
        title: musics[0].title,
        artist: musics[0].artist,
        position: musics[0].position
      });
    }
    
    // 반환하기 전에 필드명 표준화 (클라이언트 측 호환성)
    const formattedMusic = musics.map((music, index) => {
      // 숫자 형식 변환
      const ensureNumber = (value, defaultValue = 0) => {
        if (typeof value === 'number') return value;
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
      };
      
      // 일일 조회수 통합
      const dailyViews = ensureNumber(
        music.dailyViews || music.dailyview || music.dailyView, 
        Math.round(ensureNumber(music.views) * 0.02)
      );
      
      // position 처리
      let position = ensureNumber(music.position, index + 1);
      let previousPosition = ensureNumber(music.previousPosition, position);
      
      // 로그 출력
      console.log(`음악 데이터 [${index}]: 제목="${music.title}", position=${position}, prev=${previousPosition}, dailyViews=${dailyViews}`);
      
      return {
        _id: music._id,
        title: decodeHtmlEntities(music.title) || '',
        artist: decodeHtmlEntities(music.artist) || '',
        position: position,
        previousPosition: previousPosition,
        coverImage: music.coverImage || '',
        dailyViews: dailyViews,
        totalViews: ensureNumber(music.views),
        releaseDate: music.releaseDate,
        slug: music.slug || '',
        youtubeUrl: music.musicVideo || '',
        album: music.album || ''
      };
    });

    // 결과 반환
    return res.status(200).json({
      success: true,
      currentPage: pageNum,
      totalPages,
      totalItems,
      musics: formattedMusic
    });
    
  } catch (error) {
    console.error('❌ 음악 API 오류:', error);
    console.error('오류 스택:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}

// POST 메서드 처리 함수 (음악 추가)
async function handlePost(req, res) {
  try {
    console.log('🔗 MongoDB 연결 시도 중... (POST)');
    const { db } = await dbConnect();
    console.log('✅ 음악 POST API - MongoDB 연결 성공');
    
    console.log('📝 음악 추가 요청 데이터:', {
      title: req.body.title,
      artist: req.body.artist,
      position: req.body.position
    });
    
    const {
      title,
      artist,
      album,
      position = 999,
      previousPosition,
      youtubeUrl,
      musicVideo,
      dailyViews = 0,
      totalViews = 0,
      views,
      releaseDate,
      featured = false,
      coverImage,
      description,
      genre = ['kpop']
    } = req.body;
    
    // 필수 필드 검증
    if (!title || !artist) {
      return res.status(400).json({
        success: false,
        message: '제목과 아티스트는 필수 입력 항목입니다.'
      });
    }
    
    // 중복 체크 (제목 + 아티스트 조합)
    const existingMusic = await db.collection('musics').findOne({
      title: title,
      artist: artist
    });
    
    if (existingMusic) {
      return res.status(409).json({
        success: false,
        message: '동일한 제목과 아티스트의 음악이 이미 존재합니다.'
      });
    }
    
    // Slug 생성 함수
    const generateSlug = (title, artist) => {
      const baseSlug = `${title}-${artist}`
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s-]/g, '') // 특수문자 제거
        .replace(/\s+/g, '-') // 공백을 하이픈으로
        .replace(/-+/g, '-') // 연속 하이픈 제거
        .replace(/^-|-$/g, '') // 앞뒤 하이픈 제거
        .substring(0, 100); // 길이 제한
      
      return baseSlug || `music-${Date.now()}`;
    };

    // 유니크한 slug 생성
    let slug = generateSlug(title, artist);
    let counter = 1;
    
    // slug 중복 체크 및 유니크하게 만들기
    while (await db.collection('musics').findOne({ slug })) {
      slug = `${generateSlug(title, artist)}-${counter}`;
      counter++;
    }

    // 음악 데이터 구성
    const musicData = {
      title: decodeHtmlEntities(title),
      artist: decodeHtmlEntities(artist),
      slug: slug, // slug 필드 추가
      album: album || '',
      position: parseInt(position) || 999,
      previousPosition: parseInt(previousPosition) || parseInt(position) || 999,
      youtubeUrl: youtubeUrl || musicVideo || '',
      musicVideo: youtubeUrl || musicVideo || '',
      dailyViews: parseInt(dailyViews) || 0,
      views: parseInt(views) || parseInt(totalViews) || 0,
      totalViews: parseInt(totalViews) || parseInt(views) || 0,
      releaseDate: releaseDate || new Date().toISOString(),
      featured: Boolean(featured),
      coverImage: coverImage || '',
      description: description || '',
      genre: Array.isArray(genre) ? genre : [genre],
      status: 'active', // 기본값으로 active 상태 설정
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('💾 저장할 음악 데이터:', {
      title: musicData.title,
      artist: musicData.artist,
      position: musicData.position,
      dailyViews: musicData.dailyViews,
      views: musicData.views
    });
    
    // MongoDB에 저장
    const result = await db.collection('musics').insertOne(musicData);
    
    if (result.insertedId) {
      console.log('✅ 음악 추가 성공:', result.insertedId);
      
      // 새로 생성된 음악 데이터 반환
      const newMusic = await db.collection('musics').findOne({
        _id: result.insertedId
      });
      
      return res.status(201).json({
        success: true,
        message: '음악이 성공적으로 추가되었습니다.',
        music: newMusic
      });
    } else {
      throw new Error('음악 추가에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('❌ 음악 추가 오류:', error);
    return res.status(500).json({
      success: false,
      message: '음악 추가 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}

// 음악 목록 조회 (레거시 함수 - 호환성을 위해 유지하지만 사용 안함)
/*
async function getMusic(req, res) {
  // 이 함수는 더 이상 사용되지 않습니다. 
  // 메인 핸들러 함수에서 네이티브 MongoDB를 사용합니다.
}
*/

// 새 음악 등록 (레거시 함수 - 호환성을 위해 유지하지만 사용 안함)
/*
async function createMusic(req, res, session) {
  // 이 함수는 더 이상 사용되지 않습니다. 
  // 메인 핸들러 함수에서 네이티브 MongoDB를 사용합니다.
}
*/