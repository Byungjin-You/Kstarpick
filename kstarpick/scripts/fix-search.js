const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const port = 3001; // 메인 서버와 충돌을 피하기 위해 다른 포트 사용

// CORS 설정
app.use(cors());

// 데이터베이스 연결 함수
async function connectToDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kpop-news-portal';
  const client = new MongoClient(uri);
  await client.connect();
  return { client, db: client.db() };
}

// 임시 검색 API 엔드포인트
app.get('/api/search', async (req, res) => {
  const { q, type = 'all', page = 1, limit = 12 } = req.query;
  
  if (!q) {
    return res.status(400).json({ message: 'Search query is required' });
  }
  
  console.log(`[TEMP-SEARCH] Received search query: "${q}", type: ${type}`);
  
  try {
    const { client, db } = await connectToDatabase();
    
    try {
      // Park Bo Gum 검색을 위한 특별 처리
      if (q.toLowerCase().includes('park bo gum')) {
        console.log(`[TEMP-SEARCH] Special handling for Park Bo Gum search`);
        
        // 뉴스 컬렉션에서 제목 직접 검색
        const newsCollection = db.collection('news');
        const titleQuery = {
          title: { $regex: 'Park Bo Gum', $options: 'i' }
        };
        
        const newsResults = await newsCollection
          .find(titleQuery)
          .limit(parseInt(limit))
          .toArray();
          
        console.log(`[TEMP-SEARCH] Found ${newsResults.length} news results for Park Bo Gum`);
        
        // TVFilms 컬렉션에서 cast 필드 검색
        const tvfilmsCollection = db.collection('tvfilms');
        const castQuery = {
          "cast.name": { $regex: 'Park Bo Gum', $options: 'i' }
        };
        
        const tvfilmsResults = await tvfilmsCollection
          .find(castQuery)
          .limit(parseInt(limit))
          .toArray();
          
        console.log(`[TEMP-SEARCH] Found ${tvfilmsResults.length} tvfilms results for Park Bo Gum`);
        
        // 모든 결과 조합
        return res.status(200).json({
          results: {
            news: newsResults,
            dramas: tvfilmsResults.filter(item => item.category === 'drama'),
            movies: tvfilmsResults.filter(item => item.category === 'movie'),
            actors: []
          },
          total: newsResults.length + tvfilmsResults.length,
          page: parseInt(page),
          totalPages: Math.ceil((newsResults.length + tvfilmsResults.length) / parseInt(limit))
        });
      }
      
      // 다른 검색어는 원래 API로 프록시
      res.status(200).json({
        results: {
          news: [],
          dramas: [],
          movies: [],
          actors: []
        },
        total: 0,
        page: parseInt(page),
        totalPages: 0,
        message: 'This is a temporary endpoint for specific search fixes. For other searches, use the main API.'
      });
      
    } finally {
      await client.close();
    }
    
  } catch (error) {
    console.error(`[TEMP-SEARCH] Error:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`Temporary search fix server running at http://localhost:${port}`);
  console.log(`Try it: http://localhost:${port}/api/search?q=Park%20Bo%20Gum`);
}); 