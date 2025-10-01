import mongoose from 'mongoose';

/**
 * News 모델 스키마 정의
 * MongoDB에서는 스키마가 강제되지 않지만, 애플리케이션 레벨에서 데이터 구조를 정의하는 것이 좋습니다.
 */

// 뉴스 아이템의 예상 필드 구조
export const NewsSchema = {
  title: String, // 뉴스 제목
  summary: String, // 요약 내용
  content: String, // HTML 형식의 전체 내용
  category: String, // 카테고리 (kpop, drama, movie, etc.)
  coverImage: String, // 커버 이미지 URL
  tags: Array, // 태그 배열
  viewCount: Number, // 조회수
  featured: Boolean, // 메인 페이지 노출 여부
  createdAt: Date, // 생성 시간
  updatedAt: Date, // 수정 시간
  
  // 크롤링 관련 필드
  source: String, // 출처 (ex: 'Soompi')
  sourceUrl: String, // 출처 웹사이트 URL
  articleUrl: String, // 원본 기사 URL
  thumbnailUrl: String, // 썸네일 이미지 URL
  timeText: String, // 시간 정보 텍스트
  
  // 관계 필드
  authorId: String, // 작성자 ID (선택 사항)
  relatedCelebs: Array, // 관련 셀럽 ID 배열 (선택 사항)
};

// 뉴스 데이터 유효성 검사 함수
export function validateNews(news) {
  const errors = {};
  
  if (!news.title) errors.title = '제목을 입력해주세요';
  if (!news.content) errors.content = '내용을 입력해주세요';
  if (!news.category) errors.category = '카테고리를 선택해주세요';
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

// 뉴스 데이터 정규화 함수
export function normalizeNews(newsData) {
  return {
    ...newsData,
    featured: Boolean(newsData.featured),
    viewCount: Number(newsData.viewCount || 0),
    tags: Array.isArray(newsData.tags) ? newsData.tags : (newsData.tags ? newsData.tags.split(',').map(tag => tag.trim()) : []),
    createdAt: newsData.createdAt ? new Date(newsData.createdAt) : new Date(),
    updatedAt: new Date()
  };
}

const NewsSchemaMongoose = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title for this news'],
    maxlength: [200, 'Title cannot be more than 200 characters'],
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  content: {
    type: String,
    required: [true, 'Please provide content for this news'],
  },
  summary: {
    type: String,
    required: [true, 'Please provide a summary for this news'],
    maxlength: [500, 'Summary cannot be more than 500 characters'],
  },
  coverImage: {
    type: String,
    required: [true, 'Please provide a cover image for this news'],
  },
  tags: {
    type: [String],
    default: [],
  },
  category: {
    type: String,
    required: [true, 'Please select a category for this news'],
    enum: ['kpop', 'drama', 'movie', 'variety', 'celeb', 'other'],
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  lang: {
    type: String,
    required: true,
    enum: ['en', 'ko', 'ja', 'zh', 'es'],
    default: 'en',
  },
  translationOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'News',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.News || mongoose.model('News', NewsSchemaMongoose); 