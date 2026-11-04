import { getDatabase } from './db';
import { getLocalDateTimeString } from '../utils/dates';
import { normalizeNameKey, trimOrEmpty } from '../utils/validation';

export async function getAllSubjectsWithTaskCounts() {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT s.id, s.name, s.code, s.color, s.createdAt,
            COUNT(t.id) AS taskCount
     FROM subjects s
     LEFT JOIN tasks t ON t.subjectId = s.id
     GROUP BY s.id
     ORDER BY s.name COLLATE NOCASE ASC`,
  );
}

export async function getAllSubjects() {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT id, name, code, color, createdAt
     FROM subjects
     ORDER BY name COLLATE NOCASE ASC`,
  );
}

export async function getSubjectById(id) {
  const db = await getDatabase();
  return db.getFirstAsync(
    `SELECT id, name, code, color, createdAt FROM subjects WHERE id = ?`,
    [id],
  );
}

export async function isDuplicateSubjectName(name, excludeId = null) {
  const db = await getDatabase();
  const rows = await db.getAllAsync(`SELECT id, name FROM subjects`);
  const key = normalizeNameKey(name);
  return rows.some(
    (row) =>
      normalizeNameKey(row.name) === key &&
      (excludeId == null || Number(row.id) !== Number(excludeId)),
  );
}

export async function createSubject({ name, code, color }) {
  const db = await getDatabase();
  const trimmedName = trimOrEmpty(name);
  const trimmedCode = trimOrEmpty(code) || null;
  if (!trimmedName) throw new Error('Subject name is required.');
  if (!color) throw new Error('Subject colour is required.');
  if (await isDuplicateSubjectName(trimmedName)) {
    throw new Error('A subject with this name already exists.');
  }
  const createdAt = getLocalDateTimeString();
  const result = await db.runAsync(
    `INSERT INTO subjects (name, code, color, createdAt) VALUES (?, ?, ?, ?)`,
    [trimmedName, trimmedCode, color, createdAt],
  );
  return getSubjectById(result.lastInsertRowId);
}

export async function updateSubject(id, { name, code, color }) {
  const db = await getDatabase();
  const existing = await getSubjectById(id);
  if (!existing) throw new Error('Subject not found.');

  const trimmedName = trimOrEmpty(name);
  const trimmedCode = trimOrEmpty(code) || null;
  if (!trimmedName) throw new Error('Subject name is required.');
  if (!color) throw new Error('Subject colour is required.');
  if (await isDuplicateSubjectName(trimmedName, id)) {
    throw new Error('A subject with this name already exists.');
  }

  await db.runAsync(
    `UPDATE subjects SET name = ?, code = ?, color = ? WHERE id = ?`,
    [trimmedName, trimmedCode, color, id],
  );
  return getSubjectById(id);
}

export async function deleteSubject(id) {
  const db = await getDatabase();
  const existing = await getSubjectById(id);
  if (!existing) throw new Error('Subject not found.');

  const linked = await db.getFirstAsync(
    `SELECT COUNT(*) AS count FROM tasks WHERE subjectId = ?`,
    [id],
  );
  if (linked && Number(linked.count) > 0) {
    const error = new Error(
      'This subject has linked tasks. Reassign or delete those tasks first, then try again.',
    );
    error.code = 'SUBJECT_HAS_TASKS';
    error.taskCount = Number(linked.count);
    throw error;
  }

  await db.runAsync(`DELETE FROM subjects WHERE id = ?`, [id]);
  return true;
}
