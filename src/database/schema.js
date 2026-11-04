const { SCHEMA_VERSION } = require('../data/seedDataset');

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT,
  color TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subjectId INTEGER NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('assignment', 'exam', 'study')),
  description TEXT,
  scheduledDate TEXT,
  dueAt TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_tasks_subjectId ON tasks(subjectId);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduledDate ON tasks(scheduledDate);
CREATE INDEX IF NOT EXISTS idx_tasks_dueAt ON tasks(dueAt);
`;

module.exports = {
  CREATE_TABLES_SQL,
  SCHEMA_VERSION,
};
