import { getDatabase } from './db';
import { getSubjectById } from './subjectsRepo';
import {
  getLocalDateString,
  getLocalDateTimeString,
  isPastDueAt,
  isValidLocalDateString,
  isValidLocalDateTimeString,
} from '../utils/dates';
import { toPositiveIntegerId } from '../utils/ids';
import { annotateTaskLabels } from '../utils/filters';
import { trimOrEmpty } from '../utils/validation';

const TASK_SELECT = `
  SELECT t.id, t.subjectId, t.title, t.type, t.description,
         t.scheduledDate, t.dueAt, t.status, t.createdAt, t.updatedAt,
         s.name AS subjectName, s.color AS subjectColor, s.code AS subjectCode
  FROM tasks t
  INNER JOIN subjects s ON s.id = t.subjectId
`;

export async function getTaskById(id) {
  const db = await getDatabase();
  return db.getFirstAsync(`${TASK_SELECT} WHERE t.id = ?`, [id]);
}

export async function getAllTasks() {
  const db = await getDatabase();
  return db.getAllAsync(`${TASK_SELECT} ORDER BY t.dueAt ASC, t.scheduledDate ASC, t.title ASC`);
}

export async function getAssignmentsAndExams() {
  const db = await getDatabase();
  return db.getAllAsync(
    `${TASK_SELECT}
     WHERE t.type IN ('assignment', 'exam')
     ORDER BY CASE t.status WHEN 'pending' THEN 0 ELSE 1 END,
              t.dueAt ASC,
              t.title ASC`,
  );
}

export async function getStudyTasksByDate(dateStr) {
  const db = await getDatabase();
  return db.getAllAsync(
    `${TASK_SELECT}
     WHERE t.type = 'study' AND t.scheduledDate = ?
     ORDER BY CASE t.status WHEN 'pending' THEN 0 ELSE 1 END, t.title ASC`,
    [dateStr],
  );
}

export async function normalizeTaskPayload(input) {
  const title = trimOrEmpty(input.title);
  const description = trimOrEmpty(input.description) || null;
  const type = input.type;
  const status = input.status === 'completed' ? 'completed' : 'pending';
  const subjectId = toPositiveIntegerId(input.subjectId);

  if (!title) throw new Error('Title is required.');
  if (!subjectId) throw new Error('Subject is required.');
  if (!['assignment', 'exam', 'study'].includes(type)) {
    throw new Error('Invalid task type.');
  }

  const subject = await getSubjectById(subjectId);
  if (!subject) {
    throw new Error('Selected subject does not exist.');
  }

  let scheduledDate = null;
  let dueAt = null;

  if (type === 'study') {
    scheduledDate = input.scheduledDate || null;
    if (!scheduledDate) throw new Error('Scheduled date is required for study tasks.');
    if (!isValidLocalDateString(scheduledDate)) {
      throw new Error('Scheduled date must be a valid local YYYY-MM-DD date.');
    }
  } else {
    dueAt = input.dueAt || null;
    if (!dueAt) throw new Error('Date and time are required for assignments and exams.');
    if (!isValidLocalDateTimeString(dueAt)) {
      throw new Error('Due date must be a valid local YYYY-MM-DDTHH:mm[:ss] value.');
    }
  }

  return { title, description, type, status, subjectId, scheduledDate, dueAt };
}

export async function createTask(input) {
  const db = await getDatabase();
  const payload = await normalizeTaskPayload(input);
  const now = getLocalDateTimeString();

  const result = await db.runAsync(
    `INSERT INTO tasks
      (subjectId, title, type, description, scheduledDate, dueAt, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.subjectId,
      payload.title,
      payload.type,
      payload.description,
      payload.scheduledDate,
      payload.dueAt,
      payload.status,
      now,
      now,
    ],
  );
  return getTaskById(result.lastInsertRowId);
}

export async function updateTask(id, input) {
  const db = await getDatabase();
  const existing = await getTaskById(id);
  if (!existing) throw new Error('Task not found.');

  const payload = await normalizeTaskPayload({ ...existing, ...input });
  const updatedAt = getLocalDateTimeString();

  await db.runAsync(
    `UPDATE tasks
     SET subjectId = ?, title = ?, type = ?, description = ?,
         scheduledDate = ?, dueAt = ?, status = ?, updatedAt = ?
     WHERE id = ?`,
    [
      payload.subjectId,
      payload.title,
      payload.type,
      payload.description,
      payload.scheduledDate,
      payload.dueAt,
      payload.status,
      updatedAt,
      id,
    ],
  );
  return getTaskById(id);
}

export async function setTaskStatus(id, status) {
  if (!['pending', 'completed'].includes(status)) {
    throw new Error('Invalid status.');
  }
  const db = await getDatabase();
  const existing = await getTaskById(id);
  if (!existing) throw new Error('Task not found.');
  const updatedAt = getLocalDateTimeString();
  await db.runAsync(`UPDATE tasks SET status = ?, updatedAt = ? WHERE id = ?`, [
    status,
    updatedAt,
    id,
  ]);
  return getTaskById(id);
}

export async function deleteTask(id) {
  const db = await getDatabase();
  const existing = await getTaskById(id);
  if (!existing) throw new Error('Task not found.');
  await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);
  return true;
}

/**
 * Dashboard aggregates — always computed from live SQLite rows.
 * Upcoming lists pending assignments and exams only; study tasks use Today.
 */
export async function getDashboardData(now = new Date()) {
  const db = await getDatabase();
  const today = getLocalDateString(now);
  const nowStr = getLocalDateTimeString(now);

  const pendingAssignments = await db.getFirstAsync(
    `SELECT COUNT(*) AS count FROM tasks
     WHERE type = 'assignment' AND status = 'pending'`,
  );

  const upcomingExams = await db.getFirstAsync(
    `SELECT COUNT(*) AS count FROM tasks
     WHERE type = 'exam' AND status = 'pending' AND dueAt >= ?`,
    [nowStr],
  );

  const todayStudyPending = await db.getFirstAsync(
    `SELECT COUNT(*) AS count FROM tasks
     WHERE type = 'study' AND status = 'pending' AND scheduledDate = ?`,
    [today],
  );

  const upcomingRows = await db.getAllAsync(
    `${TASK_SELECT}
     WHERE t.status = 'pending'
       AND t.type IN ('assignment', 'exam')
       AND t.dueAt >= ?
     ORDER BY t.dueAt ASC, t.title ASC
     LIMIT 8`,
    [nowStr],
  );

  const overdueAssignments = await db.getAllAsync(
    `${TASK_SELECT}
     WHERE t.type = 'assignment' AND t.status = 'pending' AND t.dueAt < ?
     ORDER BY t.dueAt ASC`,
    [nowStr],
  );

  const todayStudyTasks = await db.getAllAsync(
    `${TASK_SELECT}
     WHERE t.type = 'study' AND t.scheduledDate = ?
     ORDER BY CASE t.status WHEN 'pending' THEN 0 ELSE 1 END, t.title ASC`,
    [today],
  );

  return {
    counts: {
      pendingAssignments: Number(pendingAssignments?.count || 0),
      upcomingExams: Number(upcomingExams?.count || 0),
      todayStudyPending: Number(todayStudyPending?.count || 0),
    },
    upcoming: upcomingRows.map((t) => annotateTaskLabels(t, now)),
    overdueAssignments: overdueAssignments.map((t) => annotateTaskLabels(t, now)),
    todayStudyTasks: todayStudyTasks.map((t) => annotateTaskLabels(t, now)),
    today,
    nowStr,
  };
}

export function isOverdueAssignment(task, now = new Date()) {
  return (
    task.type === 'assignment' &&
    task.status === 'pending' &&
    isPastDueAt(task.dueAt, now)
  );
}

export function isPastPendingExam(task, now = new Date()) {
  return task.type === 'exam' && task.status === 'pending' && isPastDueAt(task.dueAt, now);
}
