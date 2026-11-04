/**
 * In-memory transactional store for bootstrap tests.
 * This is not native SQLite. It implements the same operations the seeder uses
 * so transaction rollback, insert-once, and persistence can be unit-tested in Node.
 */
function cloneState(state) {
  return {
    metadata: { ...state.metadata },
    subjects: state.subjects.map((row) => ({ ...row })),
    tasks: state.tasks.map((row) => ({ ...row })),
    nextSubjectId: state.nextSubjectId,
    nextTaskId: state.nextTaskId,
  };
}

function createMemoryDb(options = {}) {
  const failOn = options.failOn || null;
  let state = {
    metadata: {},
    subjects: [],
    tasks: [],
    nextSubjectId: 1,
    nextTaskId: 1,
  };

  async function execAsync() {
    return undefined;
  }

  async function getFirstAsync(sql, params = []) {
    if (sql.includes('FROM app_metadata')) {
      const key = params[0];
      if (state.metadata[key] == null) return null;
      return { value: state.metadata[key] };
    }
    if (sql.includes('COUNT(*)') && sql.includes('FROM tasks')) {
      return { count: state.tasks.length };
    }
    return null;
  }

  async function getAllAsync(sql) {
    if (sql.includes('FROM subjects')) return state.subjects.map((row) => ({ ...row }));
    if (sql.includes('FROM tasks')) return state.tasks.map((row) => ({ ...row }));
    return [];
  }

  async function runAsync(sql, params = []) {
    if (failOn && sql.includes(failOn)) {
      throw new Error(`Forced failure on ${failOn}`);
    }
    if (sql.includes('INTO app_metadata')) {
      const [key, value] = params;
      state.metadata[key] = String(value);
      return { lastInsertRowId: 0, changes: 1 };
    }
    if (sql.includes('INTO subjects')) {
      const [name, code, color, createdAt] = params;
      const row = {
        id: state.nextSubjectId,
        name,
        code,
        color,
        createdAt,
      };
      state.nextSubjectId += 1;
      state.subjects.push(row);
      return { lastInsertRowId: row.id, changes: 1 };
    }
    if (sql.includes('INTO tasks')) {
      const [
        subjectId,
        title,
        type,
        description,
        scheduledDate,
        dueAt,
        status,
        createdAt,
        updatedAt,
      ] = params;
      const row = {
        id: state.nextTaskId,
        subjectId,
        title,
        type,
        description,
        scheduledDate,
        dueAt,
        status,
        createdAt,
        updatedAt,
      };
      state.nextTaskId += 1;
      state.tasks.push(row);
      return { lastInsertRowId: row.id, changes: 1 };
    }
    if (sql.includes('UPDATE tasks SET status')) {
      const [status, updatedAt, id] = params;
      const row = state.tasks.find((t) => t.id === id);
      if (row) {
        row.status = status;
        row.updatedAt = updatedAt;
      }
      return { changes: row ? 1 : 0 };
    }
    if (sql.includes('DELETE FROM tasks')) {
      const [id] = params;
      const before = state.tasks.length;
      state.tasks = state.tasks.filter((t) => t.id !== id);
      return { changes: before - state.tasks.length };
    }
    return { changes: 0, lastInsertRowId: 0 };
  }

  async function withTransactionAsync(work) {
    const snapshot = cloneState(state);
    try {
      await work();
    } catch (error) {
      state = snapshot;
      throw error;
    }
  }

  const db = {
    execAsync,
    getFirstAsync,
    getAllAsync,
    runAsync,
    withTransactionAsync,
    inspect() {
      return cloneState(state);
    },
    replaceState(next) {
      state = cloneState(next);
    },
  };

  return db;
}

function createMemoryAdapters(db) {
  return {
    getDatabase: async () => db,
    withTransaction: async (work) => {
      let result;
      await db.withTransactionAsync(async () => {
        result = await work(db);
      });
      return result;
    },
  };
}

module.exports = {
  createMemoryDb,
  createMemoryAdapters,
};
