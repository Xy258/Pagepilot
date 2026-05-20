import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/artisan-workshop');
  const result = await mongoose.connection.db.collection('sites').deleteMany({
    $or: [{ goal: { $exists: false } }, { goal: null }, { name: 'Untitled Masterpiece' }]
  });
  console.log(`Deleted ${result.deletedCount} legacy Untitled Masterpiece sites.`);
  process.exit(0);
}

run().catch(console.error);
