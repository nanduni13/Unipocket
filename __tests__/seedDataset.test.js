const assert = require('assert');
const {
  seedSubjects,
  seedTasks,
  resolveSeedDataset,
  SEED_COUNTS,
} = require('../src/data/seedDataset');
const {
  addDaysToLocalDate,
  buildLocalDueAt,
} = require('../src/utils/dates');

function run() {
  assert.strictEqual(seedSubjects.length, SEED_COUNTS.subjects);
  assert.strictEqual(
    seedTasks.filter((t) => t.type === 'assignment').length,
    SEED_COUNTS.assignments,
  );
  assert.strictEqual(
    seedTasks.filter((t) => t.type === 'exam').length,
    SEED_COUNTS.exams,
  );
  assert.strictEqual(
    seedTasks.filter((t) => t.type === 'study').length,
    SEED_COUNTS.study,
  );

  const resolved = resolveSeedDataset(
    '2026-11-03',
    addDaysToLocalDate,
    buildLocalDueAt,
  );

  assert.strictEqual(resolved.referenceDate, '2026-11-03');
  assert.strictEqual(resolved.subjects.length, 5);
  assert.strictEqual(resolved.tasks.length, 25);

  // Every task references a known subject temp id
  const tempIds = new Set(resolved.subjects.map((s) => s.tempId));
  for (const task of resolved.tasks) {
    assert.ok(tempIds.has(task.subjectTempId));
    if (task.type === 'study') {
      assert.ok(task.scheduledDate);
      assert.strictEqual(task.dueAt, null);
      assert.match(task.scheduledDate, /^\d{4}-\d{2}-\d{2}$/);
    } else {
      assert.ok(task.dueAt);
      assert.strictEqual(task.scheduledDate, null);
      assert.match(task.dueAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    }
  }

  // Offsets produce both past and future dates relative to reference
  const studyDates = resolved.tasks
    .filter((t) => t.type === 'study')
    .map((t) => t.scheduledDate);
  assert.ok(studyDates.includes('2026-11-03'));
  assert.ok(studyDates.some((d) => d < '2026-11-03'));
  assert.ok(studyDates.some((d) => d > '2026-11-03'));

  // Seed dates are fixed once resolved — calling again with same reference is stable
  const again = resolveSeedDataset('2026-11-03', addDaysToLocalDate, buildLocalDueAt);
  assert.deepStrictEqual(again.tasks, resolved.tasks);

  console.log('seedDataset.test.js passed');
}

run();
