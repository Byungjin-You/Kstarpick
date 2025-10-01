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
    
    // Search for exact news title
    const exactTitle = "Park Bo Gum, Kim So Hyun, Lee Sang Yi, And More Share What \"Good Boy\" Means To Them";
    const exactResult = await db.collection('news')
      .findOne({ title: exactTitle });
    
    if (exactResult) {
      console.log("\nFound exact news title in database:");
      console.log(`- ${exactResult.title}`);
      console.log(`- ID: ${exactResult._id}`);
      console.log(`- Slug: ${exactResult.slug}`);
    } else {
      console.log("\nExact news title not found in database");
    }
    
    // Search for Park Bo Gum in titles
    const titleResults = await db.collection('news')
      .find({ title: { $regex: 'Park Bo Gum', $options: 'i' } })
      .toArray();
    
    console.log(`\nFound ${titleResults.length} news items with 'Park Bo Gum' in title:`);
    titleResults.forEach(item => {
      console.log(`- ${item.title}`);
    });
    
    // Search for Park Bo Gum in content
    const contentResults = await db.collection('news')
      .find({ 
        $or: [
          { content: { $regex: 'Park Bo Gum', $options: 'i' } },
          { contentHtml: { $regex: 'Park Bo Gum', $options: 'i' } }
        ]
      })
      .toArray();
    
    console.log(`\nFound ${contentResults.length} news items with 'Park Bo Gum' in content:`);
    contentResults.slice(0, 10).forEach(item => {
      console.log(`- ${item.title}`);
    });
    
    if (contentResults.length > 10) {
      console.log(`  ... and ${contentResults.length - 10} more`);
    }
    
    // Check collections metadata
    const collections = await db.listCollections().toArray();
    console.log("\nDatabase collections:");
    collections.forEach(coll => {
      console.log(`- ${coll.name}`);
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