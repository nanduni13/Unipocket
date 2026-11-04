/**
 * Runs pure logic unit tests with Node (no device / Jest required).
 */
const path = require('path');

const tests = [
  '../__tests__/dates.test.js',
  '../__tests__/filters.test.js',
  '../__tests__/seedDataset.test.js',
  '../__tests__/validation.test.js',
];

let failed = 0;
for (const rel of tests) {
  try {
    require(path.join(__dirname, rel));
  } catch (error) {
    failed += 1;
    console.error(`FAILED ${rel}`);
    console.error(error);
  }
}

if (failed > 0) {
  console.error(`\n${failed} test file(s) failed.`);
  process.exit(1);
}

console.log('\nAll logic tests passed.');
