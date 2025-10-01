/**
 * 크롤링된 리뷰 데이터를 MongoDB에 저장하는 스크립트
 * 
 * 사용법: 
 * node scripts/import-reviews.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// MongoDB 연결
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kpop-news-portal';

// Review 모델 정의
const ReviewSchema = new mongoose.Schema({
  reviewId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  userProfileUrl: String,
  userImage: String,
  rating: { type: Number, default: 0 },
  title: { type: String, required: true },
  reviewText: { type: String, required: true },
  reviewHtml: String,
  reviewDate: String,
  helpfulCount: { type: Number, default: 0 },
  dramaId: { type: String, required: true },
  sourceUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 모델이 이미 정의되어 있는지 확인
let Review;
try {
  Review = mongoose.model('Review');
} catch (error) {
  Review = mongoose.model('Review', ReviewSchema);
}

// 드라마 ID와 타이틀 매핑
const dramaMapping = {
  '702271-weak-hero-season-2': {
    id: 'weak-hero-class-2',  // 이 값을 실제 DB의 드라마 ID로 변경해야 함
    title: 'Weak Hero Class 2 (2025)'
  }
  // 필요에 따라 다른 드라마 매핑 추가
};

async function importReviews() {
  try {
    // MongoDB 연결
    console.log('MongoDB에 연결 중...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB 연결 성공');

    // 크롤링된 리뷰 디렉토리 읽기
    const reviewsDir = path.join(process.cwd(), 'crawled-reviews');
    const files = fs.readdirSync(reviewsDir);
    
    console.log(`${files.length}개의 리뷰 파일을 발견했습니다.`);
    
    // 각 파일 처리
    let totalImported = 0;
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const filePath = path.join(reviewsDir, file);
      console.log(`파일 처리 중: ${file}`);
      
      // JSON 파일 읽기
      const reviews = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`${reviews.length}개의 리뷰를 파일에서 로드했습니다.`);
      
      // 파일 이름에서 드라마 ID 추출 (예: 702271-weak-hero-season-2-reviews.json)
      const fileBaseName = path.basename(file, '.json');
      const dramaMappingKey = fileBaseName.replace('-reviews', '');
      
      // 드라마 ID와 타이틀 찾기
      const dramaInfo = dramaMapping[dramaMappingKey];
      if (!dramaInfo) {
        console.warn(`경고: ${dramaMappingKey}에 대한 드라마 매핑이 없습니다. 이 파일은 건너뜁니다.`);
        continue;
      }
      
      const dramaId = dramaInfo.id;
      console.log(`드라마 ID: ${dramaId}, 제목: ${dramaInfo.title}`);
      
      // 리뷰를 데이터베이스에 저장
      for (const review of reviews) {
        try {
          // 이미 존재하는 리뷰인지 확인
          const existingReview = await Review.findOne({ reviewId: review.reviewId });
          
          if (existingReview) {
            // 기존 리뷰 업데이트
            await Review.updateOne(
              { reviewId: review.reviewId },
              { 
                ...review,
                dramaId: dramaId,
                updatedAt: new Date()
              }
            );
            console.log(`기존 리뷰 업데이트: ${review.title?.substring(0, 30)}...`);
          } else {
            // 새 리뷰 저장
            const newReview = new Review({
              ...review,
              dramaId: dramaId
            });
            await newReview.save();
            totalImported++;
            console.log(`새 리뷰 저장: ${review.title?.substring(0, 30)}...`);
          }
        } catch (err) {
          console.error(`리뷰 저장 중 오류 (ID: ${review.reviewId}):`, err.message);
        }
      }
    }
    
    console.log(`총 ${totalImported}개의 새 리뷰를 저장했습니다.`);
    
  } catch (err) {
    console.error('리뷰 가져오기 오류:', err);
  } finally {
    // 연결 종료
    await mongoose.connection.close();
    console.log('MongoDB 연결 종료');
  }
}

// 스크립트 실행
importReviews(); 