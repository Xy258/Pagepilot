import mongoose from 'mongoose';

// Local DB
const localUri = 'mongodb://127.0.0.1:27017/artisan-workshop';
console.log('Connecting to Local DB...');
const localConn = await mongoose.createConnection(localUri).asPromise();
console.log('✅ Connected to Local DB');

// Atlas DB
const atlasUri = 'mongodb://ullasmahesh21_db_user:6Amns8FjGvoT3Fld@ac-fw9iegd-shard-00-02.azydkb8.mongodb.net:27017,ac-fw9iegd-shard-00-00.azydkb8.mongodb.net:27017,ac-fw9iegd-shard-00-01.azydkb8.mongodb.net:27017/artisan-workshop?ssl=true&authSource=admin&replicaSet=atlas-7o49gd-shard-0';
console.log('Connecting to Atlas DB...');
const atlasConn = await mongoose.createConnection(atlasUri).asPromise();
console.log('✅ Connected to Atlas DB');

try {
  const collections = await localConn.db.listCollections().toArray();

  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;
    
    console.log(`Reading local collection: ${name}`);
    const docs = await localConn.db.collection(name).find().toArray();
    
    if (docs.length) {
      console.log(`Writing ${docs.length} docs to Atlas collection: ${name}`);
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
