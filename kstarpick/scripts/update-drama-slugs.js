// Script to update drama and movie slugs to remove ID numbers
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kstarpick_dev';

async function updateSlugs() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const dramas = db.collection('dramas');

    // Find all dramas and movies with slugs that have numbers
    // Pattern 1: ending with -[numbers] (mantis-177855)
    // Pattern 2: starting with [numbers]- (754057-it-will-come-true)
    const items = await dramas.find({
      $or: [
        { slug: { $regex: /-\d+$/ } },      // Matches slugs ending with -[numbers]
        { slug: { $regex: /^\d+-/ } }       // Matches slugs starting with [numbers]-
      ]
    }).toArray();

    console.log(`Found ${items.length} items with numbered slugs`);

    let updated = 0;
    let skipped = 0;

    for (const item of items) {
      const oldSlug = item.slug;
      // Remove the -[numbers] at the end OR [numbers]- at the beginning
      let newSlug = oldSlug.replace(/-\d+$/, '');      // Remove trailing -[numbers]
      newSlug = newSlug.replace(/^\d+-/, '');          // Remove leading [numbers]-

      if (newSlug === oldSlug || !newSlug) {
        skipped++;
        continue;
      }

      // Check if new slug already exists (to avoid conflicts)
      const existing = await dramas.findOne({
        slug: newSlug,
        _id: { $ne: item._id }
      });

      if (existing) {
        console.log(`⚠️  Conflict: ${newSlug} already exists for another item. Keeping: ${oldSlug}`);
        skipped++;
        continue;
      }

      // Update the slug
      await dramas.updateOne(
        { _id: item._id },
        { $set: { slug: newSlug } }
      );

      console.log(`✅ Updated: ${oldSlug} → ${newSlug}`);
      updated++;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Successfully updated ${updated} slugs`);
    console.log(`⚠️  Skipped ${skipped} items (no change or conflict)`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Error updating slugs:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the update
updateSlugs();