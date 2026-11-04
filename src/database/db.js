import * as SQLite from 'expo-sqlite';

const DB_NAME = 'unipocket.db';

let dbInstance = null;
let openPromise = null;

/**
 * Open (or reuse) the SQLite database and enforce foreign keys.
 * Concurrent callers share a single pending open promise.
 */
export async function getDatabase() {
  if (dbInstance) return dbInstance;
  if (openPromise) return openPromise;

  openPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync('PRAGMA foreign_keys = ON;');
    dbInstance = db;
    return dbInstance;
  })();

  try {
    return await openPromise;
  } catch (error) {
    openPromise = null;
    dbInstance = null;
    throw error;
  }
}

/** Test helper / recovery: clear the cached connection. */
export function resetDatabaseConnection() {
  dbInstance = null;
  openPromise = null;
}

/**
 * Run related writes atomically using expo-sqlite's transaction helper.
 */
export async function withTransaction(work) {
  const db = await getDatabase();
  let result;
  await db.withTransactionAsync(async () => {
    result = await work(db);
  });
  return result;
}
