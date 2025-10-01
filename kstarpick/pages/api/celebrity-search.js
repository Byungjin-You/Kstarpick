import { connectToDatabase } from '../../utils/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { q, type = 'all', page = 1, limit = 12 } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const { db } = await connectToDatabase();
    console.log(`[CELEBRITY-SEARCH] Received search query for celebrity: "${q}"`);
    
    // 연예인 이름 검색을 위한 맞춤 쿼리
    const searchResults = {
      news: [],
      dramas: [],
      movies: [],
      actors: []
    };
    
    // 1. 뉴스 제목에서 연예인 이름 직접 검색
    const newsCollection = db.collection('news');
    const newsResults = await newsCollection
      .find({ title: { $regex: q, $options: 'i' } })
      .limit(parseInt(limit))
      .toArray();
      
    console.log(`[CELEBRITY-SEARCH] Found ${newsResults.length} news items with "${q}" in title`);
    searchResults.news = newsResults;
    
    // 2. TVFilms에서 배우 이름으로 검색
    const tvfilmsCollection = db.collection('tvfilms');
    const castQuery = {
      "cast.name": { $regex: q, $options: 'i' }
    };
    
    const tvfilmsResults = await tvfilmsCollection
      .find(castQuery)
      .limit(parseInt(limit))
      .toArray();
      
    console.log(`[CELEBRITY-SEARCH] Found ${tvfilmsResults.length} TV/Films with "${q}" in cast`);
    
    // 드라마와 영화 분류
    searchResults.dramas = tvfilmsResults.filter(item => item.category === 'drama');
    searchResults.movies = tvfilmsResults.filter(item => item.category === 'movie');
    
    // 3. 배우 컬렉션에서 직접 검색
    const actorsCollection = db.collection('celebrities');
    const actorsResults = await actorsCollection
      .find({ 
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { knownAs: { $regex: q, $options: 'i' } },
          { alternateNames: { $regex: q, $options: 'i' } }
        ]
      })
      .limit(parseInt(limit))
      .toArray();
      
    console.log(`[CELEBRITY-SEARCH] Found ${actorsResults.length} actors matching "${q}"`);
    searchResults.actors = actorsResults;
    
    // 결과 합산 및 반환
    const totalResults = Object.values(searchResults).reduce((sum, arr) => sum + arr.length, 0);
    
    return res.status(200).json({
      results: searchResults,
      total: totalResults,
      page: parseInt(page),
      totalPages: Math.ceil(totalResults / parseInt(limit))
    });
    
  } catch (error) {
    console.error('[CELEBRITY-SEARCH] Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 