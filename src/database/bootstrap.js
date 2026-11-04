/**
 * Database bootstrap without native SQLite imports.
 * Used by the app (via init.js) and by Node logic tests with a fake DB.
 */
const { resolveSeedDataset, SCHEMA_VERSION, SEED_COUNTS } = require('../data/seedDataset');
const {
  addDaysToLocalDate,
  buildLocalDueAt,
  getLocalDateString,
  getLocalDateTimeString,
} = require('../utils/dates');
const { CREATE_TABLES_SQL } = require('./schema');

const META_INITIALIZED = 'initialized';
const META_SCHEMA_VERSION = 'schemaVersion';
const META_SEED_REFERENCE_DATE = 'seedReferenceDate';

let inflightInitialize = null;

function resetInitializationLock() {
  inflightInitialize = null;
}

async function getMeta(db, key) {
  return db.getFirstAsync(`SELECT value FROM app_metadata WHERE key = ?`, [key]);
}

async function setMeta(db, key, value) {
  await db.runAsync(
    `INSERT INTO app_metadata (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, String(value)],
  );
}

async function ensureSchema(db) {
  await db.execAsync(CREATE_TABLES_SQL);
}

async function seedInitialData(db, helpers = {}) {
  const nowFn = helpers.getLocalDateTimeString || getLocalDateTimeString;
  const dateFn = helpers.getLocalDateString || getLocalDateString;
  const referenceDate = dateFn();
  const { subjects, tasks } = resolveSeedDataset(
    referenceDate,
    addDaysToLocalDate,
    buildLocalDueAt,
  );
  const now = nowFn();
  const tempToId = {};

  for (const subject of subjects) {
    const result = await db.runAsync(
      `INSERT INTO subjects (name, code, color, createdAt) VALUES (?, ?, ?, ?)`,
      [subject.name, subject.code, subject.color, now],
    );
    tempToId[subject.tempId] = result.lastInsertRowId;
  }

  for (const task of tasks) {
    const subjectId = tempToId[task.subjectTempId];
    if (!subjectId) {
      throw new Error(`Seed subject missing for task: ${task.title}`);
    }
    await db.runAsync(
      `INSERT INTO tasks
        (subjectId, title, type, description, scheduledDate, dueAt, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subjectId,
        task.title,
        task.type,
        task.description,
        task.scheduledDate,
        task.dueAt,
        task.status,
        now,
        now,
      ],
    );
  }

  await setMeta(db, META_SEED_REFERENCE_DATE, referenceDate);
  await setMeta(db, META_SCHEMA_VERSION, String(SCHEMA_VERSION));
  await setMeta(db, META_INITIALIZED, '1');

  return {
    referenceDate,
    inserted: {
      subjects: subjects.length,
      tasks: tasks.length,
      ...SEED_COUNTS,
    },
  };
}

async function recordSchemaVersionIfMissing(db) {
  const schema = await getMeta(db, META_SCHEMA_VERSION);
  if (!schema?.value) {
    await setMeta(db, META_SCHEMA_VERSION, String(SCHEMA_VERSION));
  }
}

async function performInitialize(adapters = {}) {
  const getDb = adapters.getDatabase;
  const runTx = adapters.withTransaction;
  if (!getDb || !runTx) {
    throw new Error('Database adapters are required.');
  }

  try {
    const db = await getDb();
    await ensureSchema(db);

    const initialized = await getMeta(db, META_INITIALIZED);
    if (initialized?.value === '1') {
      await recordSchemaVersionIfMissing(db);
      const seedRef = await getMeta(db, META_SEED_REFERENCE_DATE);
      return {
        ready: true,
        seededNow: false,
        seedReferenceDate: seedRef?.value || null,
      };
    }

    const seedResult = await runTx(async (txDb) => seedInitialData(txDb));

    return {
      ready: true,
      seededNow: true,
      seedReferenceDate: seedResult.referenceDate,
      inserted: seedResult.inserted,
    };
  } catch (error) {
    const message =
      error?.message ||
      'Failed to initialise the local UniPocket database. Please restart the app.';
    const wrapped = new Error(message);
    wrapped.cause = error;
    throw wrapped;
  }
}

async function initializeDatabase(adapters) {
  if (inflightInitialize) return inflightInitialize;

  inflightInitialize = performInitialize(adapters).then(
    (result) => result,
    (error) => {
      inflightInitialize = null;
      throw error;
    },
  );

  return inflightInitialize;
}

module.exports = {
  META_INITIALIZED,
  META_SCHEMA_VERSION,
  META_SEED_REFERENCE_DATE,
  resetInitializationLock,
  seedInitialData,
  performInitialize,
  initializeDatabase,
  getMeta,
  setMeta,
  CREATE_TABLES_SQL,
};
