const ALL_TASK_TYPES = ['assignment', 'exam', 'study'];

const ALLOWED_TYPES = {
  studyPlanner: ['study'],
  assignments: ['assignment', 'exam'],
  dashboard: ALL_TASK_TYPES,
  details: ALL_TASK_TYPES,
};

function typeLabel(type) {
  if (type === 'exam') return 'Exam';
  if (type === 'study') return 'Study';
  return 'Assignment';
}

function isAllowedTaskType(type, allowedTypes = ALL_TASK_TYPES) {
  return Array.isArray(allowedTypes) && allowedTypes.includes(type);
}

/**
 * Build a save payload without silently changing the selected type.
 * Irrelevant date fields are cleared so the task lands on the correct screen.
 */
function buildTaskSavePayload(input, options = {}) {
  const allowedTypes = options.allowedTypes || ALL_TASK_TYPES;
  const type = input.type;
  if (!isAllowedTaskType(type, allowedTypes)) {
    return {
      ok: false,
      error: 'This task type is not available here.',
      payload: null,
    };
  }

  const status = input.status === 'completed' ? 'completed' : 'pending';
  const payload = {
    title: input.title,
    description: input.description,
    subjectId: input.subjectId,
    type,
    status,
    dueAt: type === 'study' ? null : input.dueAt || null,
    scheduledDate: type === 'study' ? input.scheduledDate || null : null,
  };

  return { ok: true, error: null, payload };
}

function shouldMovePlannerToSavedDate(selectedDate, savedScheduledDate) {
  return Boolean(
    savedScheduledDate && selectedDate && savedScheduledDate !== selectedDate,
  );
}

module.exports = {
  ALL_TASK_TYPES,
  ALLOWED_TYPES,
  typeLabel,
  isAllowedTaskType,
  buildTaskSavePayload,
  shouldMovePlannerToSavedDate,
};
