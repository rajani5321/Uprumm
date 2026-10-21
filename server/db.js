import mongoose from 'mongoose';

let isConnected = false;
let cachedPromise = null;
let lastConnectAttempt = 0;
const RETRY_COOLDOWN_MS = 15000;

// Attach connection event handlers
mongoose.connection.on('connected', () => {
  isConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.warn(`⚠️ MongoDB Connection Error: ${err.message}`);
  isConnected = false;
  cachedPromise = null;
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  cachedPromise = null;
});

const DEFAULT_MONGODB_URI = 'mongodb+srv://tudurajanikanta_db_user:eaIDwUdtRQz3ao5s@cluster0.ijuqwqe.mongodb.net/uprumm?authSource=admin&retryWrites=true&w=majority';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

  if (!uri) {
    if (!process.env.VERCEL) {
      console.log('ℹ️  MongoDB URI not configured. Running in local fallback mode.');
    }
    return false;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  if (cachedPromise) {
    return cachedPromise;
  }

  if (Date.now() - lastConnectAttempt < RETRY_COOLDOWN_MS) {
    return false;
  }

  lastConnectAttempt = Date.now();


  cachedPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    retryWrites: true,
    w: 'majority'
  }).then(conn => {
    isConnected = conn.connection.readyState === 1;
    console.log(`\n🍃 MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  }).catch(err => {
    cachedPromise = null;
    isConnected = false;
    console.warn(`⚠️  MongoDB Connection Notice: ${err.message}. Operating with fallback data.`);
    return false;
  });

  return cachedPromise;
}

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}
