import { getDatabase, withTransaction } from './db';
import {
  initializeDatabase as initializeWithAdapters,
  performInitialize as performWithAdapters,
  resetInitializationLock as resetLock,
  seedInitialData as seedRows,
  getMeta,
} from './bootstrap';

export function resetInitializationLock() {
  return resetLock();
}

export function seedInitialData(db) {
  return seedRows(db);
}

export function performInitialize(adapters = {}) {
  return performWithAdapters({
    getDatabase,
    withTransaction,
    ...adapters,
  });
}

/**
 * Safe one-time database bootstrap. Preserves user data across launches.
 * Concurrent callers share one in-flight promise so seed cannot run twice.
 * Failed attempts clear the lock so Retry can run without deleting data.
 */
export function initializeDatabase(adapters = {}) {
  return initializeWithAdapters({
    getDatabase,
    withTransaction,
    ...adapters,
  });
}

export async function getInitializationInfo() {
  const db = await getDatabase();
  const initialized = await getMeta(db, 'initialized');
  const seedRef = await getMeta(db, 'seedReferenceDate');
  const schema = await getMeta(db, 'schemaVersion');
  return {
    initialized: initialized?.value === '1',
    seedReferenceDate: seedRef?.value || null,
    schemaVersion: schema?.value || null,
  };
}
