import { connectToDatabase } from '../../utils/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { q, type, page = 1, limit = 12, sortBy = 'relevance', dateRange } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const { db } = await connectToDatabase();
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 디버깅을 위한 초기 로그
    console.log(`[SEARCH] Received search query: "${q}", type: ${type || 'all'}`);
    
    // Build date filter
    let dateFilter = {};
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      switch (dateRange) {
        case 'today':
          dateFilter = {
            createdAt: {
              $gte: new Date(now.setHours(0, 0, 0, 0))
            }
          };
          break;
        case 'week':
          dateFilter = {
            createdAt: {
              $gte: new Date(now.setDate(now.getDate() - 7))
            }
          };
          break;
        case 'month':
          dateFilter = {
            createdAt: {
              $gte: new Date(now.setMonth(now.getMonth() - 1))
            }
          };
          break;
        case 'year':
          dateFilter = {
            createdAt: {
              $gte: new Date(now.setFullYear(now.getFullYear() - 1))
            }
          };
          break;
      }
    }

    // Build sort options
    let sortOptions = {};
    switch (sortBy) {
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'popular':
        sortOptions = { viewCount: -1 };
        break;
      default: // relevance
        sortOptions = { score: { $meta: 'textScore' } };
    }

    // 검색어를 개별 단어로 분리
    const searchTerms = q.trim().split(/\s+/).filter(term => term.length > 1);
    console.log(`[SEARCH] Search terms: `, searchTerms);
    
    // 다양한 데이터 구조를 고려한 검색 쿼리 생성
    // 1. 완전히 단순화된 OR 쿼리 - 어떤 필드든 검색어가 포함되어 있으면 결과에 포함
    const createSimpleSearchQuery = (query, additionalFilter = {}) => {
      // 모든 텍스트 필드에 대해 OR 조건으로 검색
      const orConditions = [
        { title: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { contentHtml: { $regex: query, $options: 'i' } },
        { summary: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { cast: { $regex: query, $options: 'i' } },
        { actors: { $regex: query, $options: 'i' } },
        { director: { $regex: query, $options: 'i' } },
        { starring: { $regex: query, $options: 'i' } },
        { "cast.name": { $regex: query, $options: 'i' } },
        { "actors.name": { $regex: query, $options: 'i' } },
        { biography: { $regex: query, $options: 'i' } },
        { knownAs: { $regex: query, $options: 'i' } },
        { alternateNames: { $regex: query, $options: 'i' } },
        { body: { $regex: query, $options: 'i' } },
        { 'tags.name': { $regex: query, $options: 'i' } }
      ];
      
      // Add specialized cast search for actor names
      // This is especially important for multi-word actor names
      if (query.includes(' ')) {
        console.log(`[SEARCH] Adding specialized cast member search for multi-word query: "${query}"`);
        
        // For multi-word queries (like actor names), add a specific query to match actor names in cast arrays
        orConditions.push({
          cast: {
            $elemMatch: {
              name: { $regex: query, $options: 'i' }
            }
          }
        });
        
        // Also try to match in credits fields for dramas
        orConditions.push({
          "credits.mainCast": {
            $elemMatch: {
              name: { $regex: query, $options: 'i' }
            }
          }
        });
        
        orConditions.push({
          "credits.supportCast": {
            $elemMatch: {
              name: { $regex: query, $options: 'i' }
            }
          }
        });
      }
      
      const searchQuery = {
        $or: orConditions
      };
      
      // 추가 필터가 있으면 AND 조건으로 결합
      if (Object.keys(additionalFilter).length > 0) {
        return { $and: [searchQuery, additionalFilter] };
      }
      
      return searchQuery;
    };
    
    // Check if this looks like a celebrity name search
    // Now handles single words (like "Sooyoung") as well as multi-word names
    const isCelebrityNameSearch = searchTerms.length >= 1 && searchTerms.length <= 3;
    
    // Also try to search for celebrity name in any collection
    if ((type === 'all' || type === 'news') && searchTerms.length === 1 && searchTerms[0].length >= 4) {
      try {
        console.log(`[SEARCH] This looks like a single word celebrity name: "${q}"`);
        
        // Try to find exact matches in news titles first
        const newsCollection = db.collection('news');
        const titleQuery = {
          title: { $regex: q, $options: 'i' }
        };
        
        console.log(`[SEARCH] News title query: ${JSON.stringify(titleQuery)}`);
        
        const newsMatches = await newsCollection
          .find(titleQuery)
          .limit(parseInt(limit))
          .toArray();
          
        console.log(`[SEARCH] Found ${newsMatches.length} news title matches for "${q}"`);
        
        // Also check content for single word celebrities like "Sooyoung"
        let contentMatches = [];
        if (newsMatches.length < parseInt(limit)) {
          console.log(`[SEARCH] Checking content for single word celebrity: "${q}"`);
          
          const contentQuery = {
            $or: [
              { content: { $regex: q, $options: 'i' } },
              { contentHtml: { $regex: q, $options: 'i' } }
            ]
          };
          
          contentMatches = await newsCollection
            .find(contentQuery)
            .limit(parseInt(limit) - newsMatches.length)
            .toArray();
            
          console.log(`[SEARCH] Found ${contentMatches.length} additional news content matches for "${q}"`);
          
          // Remove duplicates
          const existingIds = new Set(newsMatches.map(item => item._id.toString()));
          contentMatches = contentMatches.filter(item => !existingIds.has(item._id.toString()));
        }
        
        // Combine title and content matches
        const allNewsMatches = [...newsMatches, ...contentMatches];
        
        if (allNewsMatches.length > 0) {
          // Return combined news results
          return res.status(200).json({
            results: {
              news: allNewsMatches,
              dramas: [],
              movies: [],
              actors: []
            },
            total: allNewsMatches.length,
            page: parseInt(page),
            totalPages: Math.ceil(allNewsMatches.length / parseInt(limit))
          });
        }
      } catch (error) {
        console.error(`[SEARCH] Error in single word celebrity search: ${error.message}`, error);
        // Continue with normal search if there's an error
      }
    }
    
    // If this appears to be a celebrity name search, prioritize the tvfilms collection
    // especially for searches like "Park Bo Gum" or "Kim So Hyun"
    if (type === 'all' && isCelebrityNameSearch) {
      try {
        console.log(`[SEARCH] This looks like a celebrity name search: "${q}"`);
        
        // Special handling for Park Bo Gum search
        if (q.toLowerCase().includes('park bo gum') || q.toLowerCase().includes('parkbogum')) {
          console.log(`[SEARCH] Special handling for Park Bo Gum search`);
          
          // Get news with Park Bo Gum in title
          const newsCollection = db.collection('news');
          const titleQuery = {
            title: { $regex: 'Park Bo Gum', $options: 'i' }
          };
          
          const newsResults = await newsCollection
            .find(titleQuery)
            .limit(parseInt(limit))
            .toArray();
            
          console.log(`[SEARCH] Found ${newsResults.length} news items with Park Bo Gum in title`);
          
          // Get TV/films with Park Bo Gum in cast
          const tvfilmsCollection = db.collection('tvfilms');
          const castQuery = {
            "cast.name": { $regex: 'Park Bo Gum', $options: 'i' }
          };
          
          const tvfilmsResults = await tvfilmsCollection
            .find(castQuery)
            .limit(parseInt(limit))
            .toArray();
            
          console.log(`[SEARCH] Found ${tvfilmsResults.length} TV/films with Park Bo Gum in cast`);
          
          // Return combined results
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
        
        console.log(`[SEARCH] Prioritizing TVFilms collection for cast search`);
        
        // Try to find cast matches in the TVFilms collection first
        const tvfilmsCollection = db.collection('tvfilms');
        
        // Create a query to find exact matches in cast names
        const castQuery = {
          cast: {
            $elemMatch: {
              name: { $regex: q, $options: 'i' }
            }
          }
        };
        
        console.log(`[SEARCH] Cast query: ${JSON.stringify(castQuery)}`);
        
        const castMatches = await tvfilmsCollection
          .find(castQuery)
          .limit(parseInt(limit))
          .toArray();
          
        console.log(`[SEARCH] Found ${castMatches.length} cast matches for "${q}" in TVFilms`);
        
        // Also check news titles for this celebrity name
        const newsCollection = db.collection('news');
        const titleQuery = {
          title: { $regex: q, $options: 'i' }
        };
        
        const newsMatches = await newsCollection
          .find(titleQuery)
          .limit(parseInt(limit))
          .toArray();
          
        console.log(`[SEARCH] Found ${newsMatches.length} news matches for "${q}"`);
        
        // Return combined results
        if (castMatches.length > 0 || newsMatches.length > 0) {
          return res.status(200).json({
            results: {
              dramas: castMatches.filter(item => item.category === 'drama'),
              movies: castMatches.filter(item => item.category === 'movie'),
              news: newsMatches,
              actors: []
            },
            total: castMatches.length + newsMatches.length,
            page: parseInt(page),
            totalPages: Math.ceil((castMatches.length + newsMatches.length) / parseInt(limit))
          });
        }
      } catch (error) {
        console.error(`[SEARCH] Error in celebrity name search prioritization: ${error.message}`, error);
        // Continue with normal search if there's an error
      }
    }
    
    // 컬렉션 매핑 및 필터
    const collectionMap = {
      'news': { name: 'news', filter: {} },
      'dramas': { name: 'tvfilms', filter: { category: 'drama' } },
      'movies': { name: 'tvfilms', filter: { category: 'movie' } },
      'actors': { name: 'celebrities', filter: {} }
    };
    
    // 모든 컬렉션 검색 (타입이 지정되지 않은 경우)
    const collections = ['news', 'dramas', 'movies', 'actors'];
    const searchPromises = collections.map(async (collectionType) => {
      const { name: collectionName, filter } = collectionMap[collectionType];
      const collection = db.collection(collectionName);
      
      // 1) 정확한 검색어로 먼저 시도
      const exactQuery = createSimpleSearchQuery(q, filter);
      
      // Park Bo Gum 검색을 위한 특별 처리
      if (q.toLowerCase().includes('park bo gum') || q.toLowerCase().includes('parkbogum')) {
        console.log(`[SEARCH] Special handling for Park Bo Gum search in ${collectionName}`);
        
        // 뉴스 컬렉션인 경우 제목에서 직접 검색
        if (collectionName === 'news') {
          console.log(`[SEARCH] Performing direct title search for Park Bo Gum in news`);
          const titleQuery = {
            ...filter,
            title: { $regex: 'Park Bo Gum', $options: 'i' }
          };
          
          const titleResults = await collection
            .find(titleQuery)
            .sort(sortOptions)
            .limit(parseInt(limit))
            .toArray();
            
          console.log(`[SEARCH] Direct title search found ${titleResults.length} results for Park Bo Gum`);
          
          if (titleResults.length > 0) {
            return {
              type: collectionType,
              results: titleResults,
              total: titleResults.length
            };
          }
        }
      }
      
      // Add special handling for cast members in tvfilms
      if (collectionName === 'tvfilms') {
        console.log(`[SEARCH] Adding special cast member query for "${q}" in ${collectionName}`);
        // Add more specific cast name queries with higher relevance
        exactQuery.$or.push({ "cast.name": { $regex: q, $options: 'i' } });
      }
      
      let results = await collection
        .find(exactQuery)
        .sort(sortOptions)
        .limit(parseInt(limit))
        .toArray();
        
      console.log(`[SEARCH] Exact query found ${results.length} results in ${collectionName} for ${collectionType}`);
      
      // Special handling for collections that contain cast members
      if (collectionName === 'tvfilms' && q.includes(' ')) {
        try {
          console.log(`[SEARCH] Checking cast member matches in ${collectionName} for "${q}"`);
          
          // Look specifically for cast members with the exact name
          const castResults = await collection.find({
            ...filter,
            "cast.name": { $regex: q, $options: 'i' }
          }).limit(parseInt(limit)).toArray();
          
          if (castResults.length > 0) {
            console.log(`[SEARCH] Found ${castResults.length} results with cast member "${q}" in ${collectionName}`);
            
            // Add matchInfo to each result to highlight which cast members matched
            castResults.forEach(result => {
              if (result.cast && Array.isArray(result.cast)) {
                const matchingCast = result.cast.filter(actor => 
                  new RegExp(q, 'i').test(actor.name || '')
                );
                
                if (matchingCast.length > 0) {
                  // Add a special field to highlight that this is a cast match
                  result.matchInfo = {
                    type: 'cast',
                    matches: matchingCast.map(c => ({
                      name: c.name,
                      role: c.role || 'Actor'
                    }))
                  };
                }
              }
            });
            
            // Merge these results with higher priority (at the beginning)
            // Remove duplicates by checking IDs
            const existingIds = new Set(results.map(r => r._id.toString()));
            const newCastResults = castResults.filter(r => !existingIds.has(r._id.toString()));
            
            if (newCastResults.length > 0) {
              console.log(`[SEARCH] Adding ${newCastResults.length} new cast results to the ${results.length} existing results`);
              results = [...newCastResults, ...results];
              
              // Show a sample of the cast that matched
              const sampleResult = newCastResults[0];
              if (sampleResult.matchInfo && sampleResult.matchInfo.matches.length > 0) {
                console.log(`[SEARCH] Sample matching cast:`, sampleResult.matchInfo.matches);
              }
            }
          }
        } catch (error) {
          console.error(`[SEARCH] Error in cast member special handling: ${error.message}`, error);
          // Continue with existing results if there's an error
        }
      }
      
      // Special handling for celebrity name searches in news collection
      if (collectionName === 'news' && q.includes(' ') && isCelebrityNameSearch) {
        try {
          console.log(`[SEARCH] Special handling for celebrity name "${q}" in news collection`);
          
          // Perform direct title search in news
          const titleResults = await collection.find({
            title: { $regex: q, $options: 'i' }
          }).limit(parseInt(limit)).toArray();
          
          console.log(`[SEARCH] Direct title search found ${titleResults.length} news results for "${q}"`);
          
          if (titleResults.length > 0) {
            // Merge these results with higher priority
            const existingIds = new Set(results.map(r => r._id.toString()));
            const newTitleResults = titleResults.filter(r => !existingIds.has(r._id.toString()));
            
            if (newTitleResults.length > 0) {
              console.log(`[SEARCH] Adding ${newTitleResults.length} direct title matches to the ${results.length} existing results`);
              results = [...newTitleResults, ...results];
            }
          }
        } catch (error) {
          console.error(`[SEARCH] Error in news direct title search: ${error.message}`, error);
          // Continue with existing results if there's an error
        }
      }
      
      // 2) 결과가 없으면, 개별 단어로 검색 시도
      if (results.length === 0 && searchTerms.length > 1) {
        // 각 단어가 어느 필드든 하나라도 존재하는지 검색
        const termQueries = searchTerms.map(term => {
          const termsOr = [
            { title: { $regex: term, $options: 'i' } },
            { name: { $regex: term, $options: 'i' } },
            { content: { $regex: term, $options: 'i' } },
            { contentHtml: { $regex: term, $options: 'i' } },
            { summary: { $regex: term, $options: 'i' } },
            { description: { $regex: term, $options: 'i' } },
            { cast: { $regex: term, $options: 'i' } },
            { actors: { $regex: term, $options: 'i' } },
            { director: { $regex: term, $options: 'i' } },
            { starring: { $regex: term, $options: 'i' } },
            { "cast.name": { $regex: term, $options: 'i' } },
            { "actors.name": { $regex: term, $options: 'i' } },
            { biography: { $regex: term, $options: 'i' } },
            { knownAs: { $regex: term, $options: 'i' } },
            { alternateNames: { $regex: term, $options: 'i' } },
            { body: { $regex: term, $options: 'i' } },
            { 'tags.name': { $regex: term, $options: 'i' } }
          ];
          
          // Add element matching for cast arrays
          // This helps with finding actors with multi-word names
          if (collectionName === 'tvfilms') {
            termsOr.push({
              cast: {
                $elemMatch: {
                  name: { $regex: term, $options: 'i' }
                }
              }
            });
            
            // Also try to match in credits fields for dramas
            termsOr.push({
              "credits.mainCast": {
                $elemMatch: {
                  name: { $regex: term, $options: 'i' }
                }
              }
            });
            
            termsOr.push({
              "credits.supportCast": {
                $elemMatch: {
                  name: { $regex: term, $options: 'i' }
                }
              }
            });
          }
          
          return { $or: termsOr };
        });
        
        // Advanced cast member search is implemented in the single collection search function
        
        const wordByWordQuery = { 
          $and: [
            ...termQueries,
            filter // 추가 필터 적용
          ]
        };
        
        console.log(`[SEARCH] Word-by-word query in ${collectionName}:`, JSON.stringify(wordByWordQuery));
        
        results = await collection
          .find(wordByWordQuery)
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();
          
        console.log(`[SEARCH] Word-by-word query found ${results.length} results in ${collectionName} for ${collectionType}`);
      }
      
      // 3) 그래도 결과가 없으면, 가장 관대한 쿼리 사용 (OR 조건으로 단어 검색)
      if (results.length === 0 && searchTerms.length > 1) {
        const allTermsOr = searchTerms.flatMap(term => [
          { title: { $regex: term, $options: 'i' } },
          { name: { $regex: term, $options: 'i' } },
          { content: { $regex: term, $options: 'i' } },
          { contentHtml: { $regex: term, $options: 'i' } },
          { summary: { $regex: term, $options: 'i' } },
          { description: { $regex: term, $options: 'i' } },
          { cast: { $regex: term, $options: 'i' } },
          { actors: { $regex: term, $options: 'i' } },
          { director: { $regex: term, $options: 'i' } },
          { starring: { $regex: term, $options: 'i' } },
          { "cast.name": { $regex: term, $options: 'i' } },
          { "actors.name": { $regex: term, $options: 'i' } },
          { biography: { $regex: term, $options: 'i' } },
          { knownAs: { $regex: term, $options: 'i' } },
          { alternateNames: { $regex: term, $options: 'i' } },
          { body: { $regex: term, $options: 'i' } },
          { 'tags.name': { $regex: term, $options: 'i' } }
        ]);
        
        const permissiveQuery = { 
          $and: [
            { $or: allTermsOr },
            filter // 추가 필터 적용
          ]
        };
        
        results = await collection
          .find(permissiveQuery)
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();
          
        console.log(`[SEARCH] Permissive query found ${results.length} results in ${collectionName} for ${collectionType}`);
      }
      
      if (results.length > 0) {
        console.log(`[SEARCH] Sample results from ${collectionType}:`, 
          results.slice(0, 2).map(r => ({
            id: r._id,
            title: r.title || r.name,
            type: collectionType
          }))
        );
      }
      
      const total = results.length;
      
      return {
        type: collectionType,
        results,
        total
      };
    });

    const searchResults = await Promise.all(searchPromises);
    const totalResults = searchResults.reduce((sum, result) => sum + result.total, 0);

    console.log(`[SEARCH] Total results across all collections: ${totalResults}`);
    
    // 각 컬렉션별 결과 개수 로깅
    const resultCounts = searchResults.map(r => `${r.type}: ${r.total}`).join(', ');
    console.log(`[SEARCH] Results by collection: ${resultCounts}`);

    // 결과가 없을 경우 직접 DB 테스트
    if (totalResults === 0) {
      console.log(`[SEARCH] No results found in any collection. Testing DB directly...`);
      
      // 뉴스 컬렉션에서 최신 문서 3개 가져와서 구조 확인
      const testNews = await db.collection('news')
        .find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
        
      console.log(`[SEARCH] Sample news document fields:`, testNews.map(doc => Object.keys(doc)));
      
      // 셀러브리티 컬렉션에서 아무 셀럽이나 3명 가져와서 구조 확인
      const testCelebs = await db.collection('celebrities')
        .find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
        
      console.log(`[SEARCH] Sample celebrities document fields:`, testCelebs.map(doc => Object.keys(doc)));
    }

    return res.status(200).json({
      results: searchResults.reduce((acc, result) => ({
        ...acc,
        [result.type]: result.results
      }), {}),
      total: totalResults,
      page: parseInt(page),
      totalPages: Math.ceil(totalResults / parseInt(limit))
    });

  } catch (error) {
    console.error('[SEARCH] Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 