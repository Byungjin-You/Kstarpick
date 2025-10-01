const fetch = require('node-fetch');

async function main() {
  const searchTerm = 'Park Bo Gum';
  console.log(`Performing direct search for "${searchTerm}" via API...`);
  
  try {
    // API 엔드포인트 직접 호출
    const response = await fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(searchTerm)}&type=all&page=1&limit=20`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`\nSearch API response status: ${response.status}`);
    
    // 전체 결과 개수 확인
    const totalResults = Object.values(data.results).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`Total results: ${totalResults}`);
    
    // 각 컬렉션별 결과 개수
    Object.entries(data.results).forEach(([type, results]) => {
      console.log(`\n${type} results (${results.length}):`);
      results.slice(0, 5).forEach(item => {
        console.log(`- ${item.title || item.name}`);
      });
      
      if (results.length > 5) {
        console.log(`  ... and ${results.length - 5} more`);
      }
    });
    
    // 결과가 없으면 직접 데이터베이스 조회
    if (totalResults === 0) {
      console.log("\nNo results from API. Now checking database directly...");
      
      const { MongoClient } = require('mongodb');
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kpop-news-portal';
      const client = new MongoClient(uri);
      
      try {
        await client.connect();
        const db = client.db();
        
        // 뉴스 타이틀 검색
        const newsResults = await db.collection('news')
          .find({ title: { $regex: searchTerm, $options: 'i' } })
          .limit(10)
          .toArray();
        
        console.log(`\nFound ${newsResults.length} news items with "${searchTerm}" in title (direct DB query):`);
        newsResults.forEach(item => {
          console.log(`- ${item.title}`);
        });
      } finally {
        await client.close();
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error); 