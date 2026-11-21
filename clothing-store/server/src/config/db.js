const mongoose = require('mongoose');
const env = require('./env');
const { detectTransactions } = require('../services/tx');

async function connectDB() {
  if (!env.mongoUri) {
    throw new Error('MONGO_URI is not set. Copy server/.env.example to server/.env and fill it in.');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  const tx = await detectTransactions();
  console.log(`MongoDB connected: ${mongoose.connection.host} (transactions ${tx ? 'enabled' : 'unavailable: using compensating writes'})`);
}

module.exports = connectDB;
