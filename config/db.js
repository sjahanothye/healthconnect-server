const { MongoClient, ServerApiVersion } = require('mongodb');

let client = null;
let db = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'healthconnect_db';

  if (db) return db;

  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    await client.connect();
    db = client.db(dbName);
    console.log(`[HealthConnect] Connected to MongoDB database: ${dbName}`);
    return db;
  } catch (error) {
    console.warn(`[HealthConnect] MongoDB connection warning: ${error.message}`);
    console.warn('[HealthConnect] Running with fallback in-memory cache until MongoDB is connected.');
    return null;
  }
};

const getDB = () => db;

const getCollections = () => {
  if (!db) return null;
  return {
    usersCollection: db.collection('users'),
    eventsCollection: db.collection('events'),
    joinedEventsCollection: db.collection('joined_events'),
  };
};

module.exports = {
  connectDB,
  getDB,
  getCollections,
};
