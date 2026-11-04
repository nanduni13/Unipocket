const assert = require('assert');
const {
  filterAssignmentsAndExams,
  annotateTaskLabels,
  calcCompletionProgress,
  filterStudyTasksForDate,
} = require('../src/utils/filters');

function run() {
  const now = new Date(2026, 10, 3, 12, 0, 0);

  const tasks = [
    {
      id: 1,
      title: 'React Native Lab',
      type: 'assignment',
      subjectId: 1,
      status: 'completed',
      dueAt: '2026-11-10T09:00:00',
    },
    {
      id: 2,
      title: 'Security Brief',
      type: 'assignment',
      subjectId: 2,
      status: 'pending',
      dueAt: '2026-11-01T09:00:00',
    },
    {
      id: 3,
      title: 'SQA Quiz',
      type: 'exam',
      subjectId: 2,
      status: 'pending',
      dueAt: '2026-11-02T10:00:00',
    },
    {
      id: 4,
      title: 'Study notes',
      type: 'study',
      subjectId: 1,
      status: 'pending',
      scheduledDate: '2026-11-03',
    },
    {
      id: 5,
      title: 'Future Exam',
      type: 'exam',
      subjectId: 1,
      status: 'pending',
      dueAt: '2026-11-20T09:00:00',
    },
  ];

  // Combined filters
  const filtered = filterAssignmentsAndExams(
    tasks,
    { search: 's', subjectId: 2, status: 'pending', type: 'all' },
    now,
  );
  assert.strictEqual(filtered.length, 2);
  assert.strictEqual(filtered[0].id, 2); // overdue assignment first by date among pending
  assert.strictEqual(filtered[0].displayLabel, 'Overdue');
  assert.strictEqual(filtered[1].id, 3);
  assert.strictEqual(filtered[1].displayLabel, 'Past exam');

  // Past exam must not be labelled Overdue
  const pastExam = annotateTaskLabels(tasks[2], now);
  assert.strictEqual(pastExam.displayLabel, 'Past exam');

  const overdue = annotateTaskLabels(tasks[1], now);
  assert.strictEqual(overdue.displayLabel, 'Overdue');

  // Pending before completed
  const sorted = filterAssignmentsAndExams(tasks, { status: 'all', type: 'all' }, now);
  assert.ok(sorted.every((t) => t.type !== 'study'));
  const firstCompletedIndex = sorted.findIndex((t) => t.status === 'completed');
  const lastPendingIndex = [...sorted]
    .map((t, i) => (t.status === 'pending' ? i : -1))
    .filter((i) => i >= 0)
    .pop();
  if (firstCompletedIndex !== -1 && lastPendingIndex !== undefined) {
    assert.ok(lastPendingIndex < firstCompletedIndex);
  }

  // Progress never divides by zero
  assert.deepStrictEqual(calcCompletionProgress([]), {
    total: 0,
    completed: 0,
    percent: 0,
  });
  assert.deepStrictEqual(
    calcCompletionProgress([
      { status: 'completed' },
      { status: 'pending' },
    ]),
    { total: 2, completed: 1, percent: 50 },
  );

  const study = filterStudyTasksForDate(
    [
      ...tasks,
      {
        id: 6,
        type: 'study',
        scheduledDate: '2026-11-04',
        status: 'pending',
        title: 'Other day',
      },
    ],
    '2026-11-03',
  );
  assert.strictEqual(study.length, 1);
  assert.strictEqual(study[0].id, 4);

  console.log('filters.test.js passed');
}

run();
