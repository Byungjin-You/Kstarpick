import { connectToDatabase } from '../../../utils/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const { db } = await connectToDatabase();
    
    // 실제 컬렉션 이름 매핑
    const collectionMap = {
      'news': { 
        name: 'news', 
        fields: ['title', 'summary', 'content', 'contentHtml', 'cast', 'actors', 'starring', 'director', 'castMembers', 'actorNames'],
        htmlFields: ['content', 'contentHtml'] // HTML 콘텐츠가 있는 필드
      },
      'dramas': { 
        name: 'dramas', 
        fields: ['title', 'summary', 'description', 'cast', 'actors', 'starring', 'director', 'cast.name', 'actors.name', 'castMembers', 'actorNames'], 
        filter: { category: 'drama' }
      },
      'movies': { 
        name: 'dramas', 
        fields: ['title', 'summary', 'description', 'cast', 'actors', 'starring', 'director', 'cast.name', 'actors.name', 'castMembers', 'actorNames'], 
        filter: { category: 'movie' }
      },
      'actors': { 
        name: 'celebrities', 
        fields: ['name', 'description', 'biography', 'knownAs', 'alternateNames', 'roles', 'filmography', 'filmography.title']
      }
    };
    
    console.log(`Searching for suggestions with query: "${q}"`);
    
    // 단어 단위 검색을 위한 처리
    const searchTerms = q.split(/\s+/).filter(term => term.length > 1);
    const useWordByWordSearch = searchTerms.length > 1;
    
    const searchPromises = Object.entries(collectionMap).map(async ([type, config]) => {
      const { name, fields, filter = {}, htmlFields } = config;
      
      // 검색 쿼리 구성
      let searchQuery;
      
      if (useWordByWordSearch) {
        // 단어 단위 검색 - 각 단어가 어느 필드든 하나 이상 포함되어 있어야 함
        const termConditions = searchTerms.map(term => {
          const fieldConditions = fields.map(field => ({ [field]: { $regex: term, $options: 'i' } }));
          
          // HTML 필드가 있는 경우 HTML 태그 내부 텍스트 검색 추가
          if (htmlFields && htmlFields.length > 0) {
            htmlFields.forEach(field => {
              fieldConditions.push({ [field]: { $regex: `>([^<]*${term}[^<]*)`, $options: 'i' } });
            });
          }
          
          return { $or: fieldConditions };
        });
        
        searchQuery = {
          $and: [
            ...termConditions,
            filter // 추가 필터 적용
          ]
        };
        
        console.log(`Using word-by-word search for "${q}" in ${name} with terms:`, searchTerms);
      } else {
        // 기존 방식 - 전체 검색어가 하나의 필드에 포함
        const fieldConditions = fields.map(field => ({ [field]: { $regex: q, $options: 'i' } }));
        
        // HTML 필드가 있는 경우 HTML 태그 내부 텍스트 검색 추가
        if (htmlFields && htmlFields.length > 0) {
          htmlFields.forEach(field => {
            fieldConditions.push({ [field]: { $regex: `>([^<]*${q}[^<]*)`, $options: 'i' } });
          });
        }
        
        searchQuery = {
          $and: [
            { $or: fieldConditions },
            filter // 추가 필터 적용
          ]
        };
      }
      
      const results = await db.collection(name)
        .find(searchQuery)
        .sort({ viewCount: -1, createdAt: -1 }) // 조회수 높은 순 + 최신순
        .limit(5)
        .toArray();
      
      console.log(`Found ${results.length} suggestions in ${name} collection`);
      
      // 각 컬렉션별 특성에 맞게 결과 매핑
      return {
        type,
        suggestions: results.map(item => ({
          id: item._id,
          title: item.title || item.name || '', // celebrities는 name 필드 사용
          count: item.viewCount || 0,
          createdAt: item.createdAt,
          category: item.category
        }))
      };
    });

    const suggestionsResults = await Promise.all(searchPromises);
    
    // 중복 제거 및 정렬 로직 개선
    const combinedSuggestions = suggestionsResults
      .flatMap(result => 
        result.suggestions.map(suggestion => ({
          ...suggestion,
          type: result.type
        }))
      )
      // 조회수 높은 순 + 최신순 정렬
      .sort((a, b) => {
        // 조회수 차이가 크면 조회수 기준 정렬
        if (Math.abs(b.count - a.count) > 10) {
          return b.count - a.count;
        }
        // 조회수 비슷하면 날짜 기준 정렬
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      })
      .slice(0, 10);
    
    console.log(`Returning ${combinedSuggestions.length} total suggestions`);

    return res.status(200).json({
      suggestions: combinedSuggestions
    });

  } catch (error) {
    console.error('Search suggestions error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 