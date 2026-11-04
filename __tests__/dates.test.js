const assert = require('assert');
const {
  getLocalDateString,
  addDaysToLocalDate,
  buildLocalDueAt,
  parseLocalDateTime,
  isPastDueAt,
  shiftLocalDate,
} = require('../src/utils/dates');

function run() {
  // Local date string format
  const sample = new Date(2026, 10, 3, 15, 30, 0); // 3 Nov 2026 local
  assert.strictEqual(getLocalDateString(sample), '2026-11-03');

  // Day offsets stay on local calendar (no UTC day shift)
  assert.strictEqual(addDaysToLocalDate('2026-11-03', 0), '2026-11-03');
  assert.strictEqual(addDaysToLocalDate('2026-11-03', 1), '2026-11-04');
  assert.strictEqual(addDaysToLocalDate('2026-11-03', -1), '2026-11-02');
  assert.strictEqual(addDaysToLocalDate('2026-01-31', 1), '2026-02-01');

  assert.strictEqual(buildLocalDueAt('2026-11-03', 9, 5), '2026-11-03T09:05:00');

  const parsed = parseLocalDateTime('2026-11-03T14:15:00');
  assert.ok(parsed instanceof Date);
  assert.strictEqual(parsed.getFullYear(), 2026);
  assert.strictEqual(parsed.getMonth(), 10);
  assert.strictEqual(parsed.getDate(), 3);
  assert.strictEqual(parsed.getHours(), 14);
  assert.strictEqual(parsed.getMinutes(), 15);

  const now = new Date(2026, 10, 3, 12, 0, 0);
  assert.strictEqual(isPastDueAt('2026-11-03T11:00:00', now), true);
  assert.strictEqual(isPastDueAt('2026-11-03T13:00:00', now), false);

  const shifted = shiftLocalDate(new Date(2026, 10, 3), 2);
  assert.strictEqual(getLocalDateString(shifted), '2026-11-05');

  console.log('dates.test.js passed');
}

run();
