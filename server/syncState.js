import Setting from './models/Setting.js';
import { isDbConnected } from './db.js';

let localSyncState = {
  productsVersion: Date.now(),
  settingsVersion: Date.now(),
  ordersVersion: Date.now(),
  usersVersion: Date.now(),
  globalVersion: Date.now()
};

/**
 * Increment the sync version for a category (products, settings, orders)
 * Updates in-memory state and persists to MongoDB Atlas so all serverless instances
 * and all connected devices detect the change immediately.
 */
export async function bumpSyncVersion(type = 'products') {
  const now = Date.now();
  localSyncState[`${type}Version`] = now;
  localSyncState.globalVersion = now;

  if (isDbConnected()) {
    try {
      await Setting.findOneAndUpdate(
        { key: 'sync_state' },
        {
          $set: {
            [`${type}Version`]: now,
            globalVersion: now,
            updatedAt: new Date()
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (err) {
      console.warn('[SyncState Notice] Failed to persist sync version to DB:', err.message);
    }
  }

  return localSyncState;
}

/**
 * Retrieve current sync state from MongoDB (shared across all devices/lambdas)
 * with fast fallback to in-memory state.
 */
export async function getSyncStatus() {
  if (isDbConnected()) {
    try {
      const dbState = await Setting.findOne({ key: 'sync_state' }).lean();
      if (dbState) {
        return {
          productsVersion: Number(dbState.productsVersion) || localSyncState.productsVersion,
          settingsVersion: Number(dbState.settingsVersion) || localSyncState.settingsVersion,
          ordersVersion: Number(dbState.ordersVersion) || localSyncState.ordersVersion,
          usersVersion: Number(dbState.usersVersion) || localSyncState.usersVersion,
          globalVersion: Number(dbState.globalVersion) || localSyncState.globalVersion,
          dbConnected: true,
          serverTime: Date.now()
        };
      }
    } catch (err) {
      console.warn('[SyncState Notice] Error reading DB sync state:', err.message);
    }
  }

  return {
    ...localSyncState,
    dbConnected: isDbConnected(),
    serverTime: Date.now()
  };
}
