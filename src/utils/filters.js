const { isPastDueAt } = require('./dates');

/**
 * Combined search + filters for assignment/exam list.
 * Filters work together (AND). Pending appear before completed; each group by date.
 *
 * @param {Array} tasks
 * @param {{ search?: string, subjectId?: number|null|'all', status?: string, type?: string }} filters
 * @param {Date} [now]
 */
function filterAssignmentsAndExams(tasks, filters = {}, now = new Date()) {
  const search = (filters.search || '').trim().toLowerCase();
  const subjectId = filters.subjectId;
  const status = filters.status || 'all';
  const type = filters.type || 'all';

  const filtered = tasks.filter((task) => {
    if (task.type !== 'assignment' && task.type !== 'exam') return false;

    if (search && !(task.title || '').toLowerCase().includes(search)) {
      return false;
    }

    if (subjectId && subjectId !== 'all' && Number(task.subjectId) !== Number(subjectId)) {
      return false;
    }

    if (status !== 'all' && task.status !== status) {
      return false;
    }

    if (type !== 'all' && task.type !== type) {
      return false;
    }

    return true;
  });

  const dateKey = (task) => task.dueAt || '';

  filtered.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'pending' ? -1 : 1;
    }
    const cmp = dateKey(a).localeCompare(dateKey(b));
    if (cmp !== 0) return cmp;
    return (a.title || '').localeCompare(b.title || '');
  });

  return filtered.map((task) => annotateTaskLabels(task, now));
}

/**
 * Attach display labels for overdue assignments / past exams.
 * Past pending exams must show "Past exam", not "Overdue".
 */
function annotateTaskLabels(task, now = new Date()) {
  let label = null;
  if (task.status === 'pending' && task.type === 'assignment' && isPastDueAt(task.dueAt, now)) {
    label = 'Overdue';
  } else if (task.status === 'pending' && task.type === 'exam' && isPastDueAt(task.dueAt, now)) {
    label = 'Past exam';
  }
  return { ...task, displayLabel: label };
}

/**
 * @param {Array} tasks
 * @param {string} dateStr YYYY-MM-DD
 */
function filterStudyTasksForDate(tasks, dateStr) {
  return tasks
    .filter((t) => t.type === 'study' && t.scheduledDate === dateStr)
    .sort((a, b) => {
      if (a.status === b.status) return (a.title || '').localeCompare(b.title || '');
      return a.status === 'pending' ? -1 : 1;
    });
}

/**
 * Daily completion progress without dividing by zero.
 * @param {Array} tasks
 */
function calcCompletionProgress(tasks) {
  const total = tasks.length;
  if (total === 0) {
    return { total: 0, completed: 0, percent: 0 };
  }
  const completed = tasks.filter((t) => t.status === 'completed').length;
  return {
    total,
    completed,
    percent: Math.round((completed / total) * 100),
  };
}

module.exports = {
  filterAssignmentsAndExams,
  annotateTaskLabels,
  filterStudyTasksForDate,
  calcCompletionProgress,
};
