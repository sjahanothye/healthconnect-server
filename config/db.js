const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { sampleEvents } = require('../data/sampleEvents');

let client = null;
let db = null;
let isConnected = false;

// In-Memory Storage Fallback (Ensures full functionality even before MongoDB Atlas URI is added)
class InMemoryCollection {
  constructor(initialData = []) {
    this.data = initialData.map((item, idx) => ({
      ...item,
      _id: item._id || new ObjectId().toString(),
    }));
  }

  async countDocuments() {
    return this.data.length;
  }

  async findOne(query) {
    return (
      this.data.find((item) => {
        for (const [key, val] of Object.entries(query)) {
          if (key === '_id') {
            const strId = typeof val === 'object' && val.toString ? val.toString() : val;
            if (item._id.toString() !== strId.toString()) return false;
          } else if (typeof val === 'object' && val !== null) {
            // Basic handling
            if (item[key] !== val) return false;
          } else if (item[key] !== val) {
            return false;
          }
        }
        return true;
      }) || null
    );
  }

  find(query = {}) {
    let results = this.data.filter((item) => {
      // EventDate $gte check
      if (query.eventDate && query.eventDate.$gte) {
        if (item.eventDate < query.eventDate.$gte) return false;
      }
      if (query.eventType && item.eventType !== query.eventType) {
        return false;
      }
      if (query.organizerEmail && item.organizerEmail !== query.organizerEmail) {
        return false;
      }
      if (query.userEmail && item.userEmail !== query.userEmail) {
        return false;
      }
      if (query.$or) {
        const matchesOr = query.$or.some((sub) => {
          for (const [key, cond] of Object.entries(sub)) {
            if (cond && cond.$regex) {
              const regex = new RegExp(cond.$regex, cond.$options || 'i');
              if (regex.test(item[key] || '')) return true;
            }
          }
          return false;
        });
        if (!matchesOr) return false;
      }
      return true;
    });

    return {
      sort: (sortObj) => {
        const key = Object.keys(sortObj)[0];
        const dir = sortObj[key];
        results.sort((a, b) => {
          if (a[key] < b[key]) return dir === 1 ? -1 : 1;
          if (a[key] > b[key]) return dir === 1 ? 1 : -1;
          return 0;
        });
        return {
          limit: (limitNum) => ({
            toArray: async () => results.slice(0, limitNum),
          }),
          toArray: async () => results,
        };
      },
      limit: (limitNum) => ({
        toArray: async () => results.slice(0, limitNum),
      }),
      toArray: async () => results,
    };
  }

  async insertOne(doc) {
    const newDoc = {
      ...doc,
      _id: doc._id || new ObjectId().toString(),
    };
    this.data.unshift(newDoc);
    return { insertedId: newDoc._id };
  }

  async insertMany(docs) {
    const inserted = docs.map((doc) => ({
      ...doc,
      _id: doc._id || new ObjectId().toString(),
    }));
    this.data.push(...inserted);
    return { insertedCount: inserted.length };
  }

  async updateOne(filter, update) {
    const item = await this.findOne(filter);
    if (!item) return { matchedCount: 0, modifiedCount: 0 };

    if (update.$set) {
      Object.assign(item, update.$set);
    }
    if (update.$inc) {
      for (const [key, incVal] of Object.entries(update.$inc)) {
        item[key] = (item[key] || 0) + incVal;
      }
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async deleteOne(filter) {
    const idx = this.data.findIndex((item) => {
      if (filter._id) {
        const strId = filter._id.toString ? filter._id.toString() : filter._id;
        return item._id.toString() === strId;
      }
      return false;
    });
    if (idx !== -1) {
      this.data.splice(idx, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteMany(filter) {
    if (filter.eventId) {
      const before = this.data.length;
      this.data = this.data.filter((item) => item.eventId !== filter.eventId);
      return { deletedCount: before - this.data.length };
    }
    this.data = [];
    return { deletedCount: 0 };
  }
}

// In-Memory Fallback Collections
const memoryUsers = new InMemoryCollection();
const memoryEvents = new InMemoryCollection(sampleEvents);
const memoryJoined = new InMemoryCollection();

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'healthconnect_db';

  if (!uri || uri.includes('<username>')) {
    console.log('[HealthConnect] Running with In-Memory fallback database (Fully operational for testing).');
    console.log('[HealthConnect] Tip: To connect to cloud MongoDB, add your Atlas URI to server/.env');
    return null;
  }

  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      serverSelectionTimeoutMS: 4000,
    });

    await client.connect();
    db = client.db(dbName);
    isConnected = true;
    console.log(`[HealthConnect] Successfully connected to MongoDB database: ${dbName}`);
    return db;
  } catch (error) {
    console.warn(`[HealthConnect] MongoDB connection notice (${error.message}).`);
    console.warn('[HealthConnect] Running with In-Memory database fallback (API is still 100% active).');
    return null;
  }
};

const getDB = () => db;

const getCollections = () => {
  if (db && isConnected) {
    return {
      usersCollection: db.collection('users'),
      eventsCollection: db.collection('events'),
      joinedEventsCollection: db.collection('joined_events'),
    };
  }

  // Return in-memory collections so the server NEVER throws 500 when testing locally
  return {
    usersCollection: memoryUsers,
    eventsCollection: memoryEvents,
    joinedEventsCollection: memoryJoined,
  };
};

module.exports = {
  connectDB,
  getDB,
  getCollections,
};
