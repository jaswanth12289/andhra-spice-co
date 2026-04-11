const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({}).toArray();
    
    if (users.length === 0) {
      console.log('NO_USERS_FOUND');
    } else {
      const result = await db.collection('users').updateMany({}, { $set: { role: 'admin' } });
      console.log(`SUCCESS_${result.modifiedCount}`);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
