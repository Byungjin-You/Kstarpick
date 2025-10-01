const { MongoClient } = require('mongodb');

async function main() {
  // Database connection string
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kpop-news-portal';
  const client = new MongoClient(uri);

  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    // Get the database instance
    const db = client.db();
    
    // Search for Sooyoung in titles
    const titleResults = await db.collection('news')
      .find({ title: { $regex: 'Sooyoung', $options: 'i' } })
      .toArray();
    
    console.log(`\nFound ${titleResults.length} news items with 'Sooyoung' in title:`);
    titleResults.forEach(item => {
      console.log(`- ${item.title}`);
    });
    
    // Search for Sooyoung in content
    const contentResults = await db.collection('news')
      .find({ 
        $or: [
          { content: { $regex: 'Sooyoung', $options: 'i' } },
          { contentHtml: { $regex: 'Sooyoung', $options: 'i' } }
        ]
      })
      .toArray();
    
    console.log(`\nFound ${contentResults.length} news items with 'Sooyoung' in content:`);
    contentResults.slice(0, 10).forEach(item => {
      console.log(`- ${item.title}`);
    });
    
    if (contentResults.length > 10) {
      console.log(`  ... and ${contentResults.length - 10} more`);
    }
    
    // Search for cast members with Sooyoung in TVFilms
    const castResults = await db.collection('tvfilms')
      .find({ 
        "cast.name": { $regex: 'Sooyoung', $options: 'i' }
      })
      .toArray();
    
    console.log(`\nFound ${castResults.length} TV shows/films with 'Sooyoung' in cast:`);
    castResults.forEach(item => {
      console.log(`- ${item.title}`);
      // Display the matching cast member
      const matchingCast = item.cast.filter(cast => 
        new RegExp('Sooyoung', 'i').test(cast.name || '')
      );
      if (matchingCast.length > 0) {
        console.log(`  Cast: ${matchingCast.map(c => c.name).join(', ')}`);
      }
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    // Close the connection
    await client.close();
    console.log('\nMongoDB connection closed');
  }
}

main().catch(console.error); 