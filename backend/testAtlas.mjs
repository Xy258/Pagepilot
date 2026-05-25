import mongoose from 'mongoose';
// Using direct replica set connection (like index.js)
const uri = 'mongodb://ullasmahesh21_db_user:6Amns8FjGvoT3Fld@ac-fw9iegd-shard-00-02.azydkb8.mongodb.net:27017,ac-fw9iegd-shard-00-00.azydkb8.mongodb.net:27017,ac-fw9iegd-shard-00-01.azydkb8.mongodb.net:27017/artisan-workshop?ssl=true&authSource=admin&replicaSet=atlas-7o49gd-shard-0';
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('✅ Atlas connection succeeded');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Atlas connection failed:', err.message);
    process.exit(1);
  });
