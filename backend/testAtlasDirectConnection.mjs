import mongoose from 'mongoose';

// Direct connection without SRV records
const directUri = 'mongodb://ullasmahesh21_db_user:6Amns8FjGvoT3Fld@159.41.183.45:27017/artisan-workshop?authSource=admin&retryWrites=true&w=majority';

mongoose.connect(directUri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('✅ Direct Atlas connection succeeded');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Direct connection failed:', err.message);
    process.exit(1);
  });
