const {
  isValidLocalDateString,
  isValidLocalDateTimeString,
} = require('./dates');
const { isValidPositiveIntegerId } = require('./ids');
const { ALL_TASK_TYPES, isAllowedTaskType } = require('./taskTypes');

function trimOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNameKey(name) {
  return trimOrEmpty(name).toLowerCase();
}

/**
 * @param {{ name: string, code?: string, color?: string }} values
 * @param {Array<{ id: number, name: string }>} existingSubjects
 * @param {number|null} [editingId]
 */
function validateSubjectForm(values, existingSubjects = [], editingId = null) {
  const errors = {};
  const name = trimOrEmpty(values.name);
  if (!name) {
    errors.name = 'Subject name is required.';
  } else {
    const duplicate = existingSubjects.some(
      (s) =>
        normalizeNameKey(s.name) === normalizeNameKey(name) &&
        Number(s.id) !== Number(editingId),
    );
    if (duplicate) {
      errors.name = 'A subject with this name already exists.';
    }
  }
  if (!values.color) {
    errors.color = 'Please choose a colour.';
  }
  return { errors, isValid: Object.keys(errors).length === 0, values: { ...values, name } };
}

/**
 * @param {object} values
 * @param {{ allowedTypes?: string[] }} [options]
 */
function validateTaskForm(values, options = {}) {
  const errors = {};
  const title = trimOrEmpty(values.title);
  const description = trimOrEmpty(values.description);
  const type = values.type;
  const allowedTypes = options.allowedTypes || ALL_TASK_TYPES;

  if (!title) errors.title = 'Title is required.';
  if (!isValidPositiveIntegerId(values.subjectId)) {
    errors.subjectId = 'Please select a subject.';
  }
  if (!isAllowedTaskType(type, allowedTypes)) {
    errors.type = 'Please select a valid type.';
  }

  if (type === 'study') {
    if (!values.scheduledDate) {
      errors.scheduledDate = 'Scheduled date is required.';
    } else if (!isValidLocalDateString(values.scheduledDate)) {
      errors.scheduledDate = 'Enter a valid calendar date (YYYY-MM-DD).';
    }
  } else if (type === 'assignment' || type === 'exam') {
    if (!values.dueAt) {
      errors.dueAt = 'Date and time are required.';
    } else if (!isValidLocalDateTimeString(values.dueAt)) {
      errors.dueAt = 'Enter a valid date and time.';
    }
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    values: {
      ...values,
      title,
      description: description || null,
    },
  };
}

module.exports = {
  trimOrEmpty,
  normalizeNameKey,
  validateSubjectForm,
  validateTaskForm,
};
