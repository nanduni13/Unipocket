const assert = require('assert');
const {
  validateSubjectForm,
  validateTaskForm,
} = require('../src/utils/validation');

function run() {
  const subjects = [
    { id: 1, name: 'Computer Security' },
    { id: 2, name: 'Mobile Application Development' },
  ];

  const missingName = validateSubjectForm(
    { name: '  ', code: '', color: '#4F46E5' },
    subjects,
  );
  assert.strictEqual(missingName.isValid, false);
  assert.ok(missingName.errors.name);

  const duplicate = validateSubjectForm(
    { name: 'computer security', code: '', color: '#4F46E5' },
    subjects,
  );
  assert.strictEqual(duplicate.isValid, false);

  const editSame = validateSubjectForm(
    { name: 'Computer Security', code: '', color: '#4F46E5' },
    subjects,
    1,
  );
  assert.strictEqual(editSame.isValid, true);

  const badTask = validateTaskForm({
    title: '',
    subjectId: null,
    type: 'assignment',
    dueAt: null,
  });
  assert.strictEqual(badTask.isValid, false);
  assert.ok(badTask.errors.title);
  assert.ok(badTask.errors.subjectId);
  assert.ok(badTask.errors.dueAt);

  const studyOk = validateTaskForm({
    title: ' Revise notes ',
    subjectId: 1,
    type: 'study',
    scheduledDate: '2026-11-03',
    description: '  ',
  });
  assert.strictEqual(studyOk.isValid, true);
  assert.strictEqual(studyOk.values.title, 'Revise notes');
  assert.strictEqual(studyOk.values.description, null);

  console.log('validation.test.js passed');
}

run();
