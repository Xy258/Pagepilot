import mongoose from 'mongoose';

// Local DB
const localUri = 'mongodb://127.0.0.1:27017/artisan-workshop';
console.log('Connecting to Local DB...');
const localConn = await mongoose.createConnection(localUri);
console.log('✅ Connected to Local DB');

// Atlas DB
const atlasUri = 'mongodb+srv://ullasmahesh21_db_user:6Amns8FjGvoT3Fld@artisan-workshop.azydkb8.mongodb.net/artisan-workshop?retryWrites=true&w=majority';
console.log('Connecting to Atlas DB...');
const atlasConn = await mongoose.createConnection(atlasUri);
console.log('✅ Connected to Atlas DB');

try {
  const collections = await localConn.db.listCollections().toArray();

  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;
    
    console.log(`Reading local collection: ${name}`);
    const docs = await localConn.db.collection(name).find().toArray();
    
    if (docs.length) {
      console.log(`Writing ${docs.length} docs to Atlas collection: ${name}`);
      // Drop atlas collection first if you want to replace, but for now we just insert
      // Or we can delete existing and insert
      await atlasConn.db.collection(name).deleteMany({});
      await atlasConn.db.collection(name).insertMany(docs);
      console.log(`✅ Copied ${docs.length} docs → ${name}`);
    } else {
      console.log(`⚠️ No docs in ${name}`);
    }
  }
} catch (err) {
  console.error('Error during migration:', err);
} finally {
  await localConn.close();
  await atlasConn.close();
  console.log('🎉 Migration completed!');
}
