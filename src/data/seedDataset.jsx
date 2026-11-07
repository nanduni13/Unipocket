/**
 * Original fictional UniPocket demonstration dataset.
 *
 * IMPORTANT FOR YOUR SUBMISSION:
 * These are demonstration records only. Review, personalize, and understand
 * every item before submitting your individual ICA 03 work. Do not invent
 * official university subject codes — codes may be left empty.
 *
 * Dates use day offsets from the first-launch local calendar date.
 * Offsets are resolved once during initial SQLite seeding and then stored
 * permanently. Later launches never recalculate or shift saved dates.
 */

const SCHEMA_VERSION = 1;

/** Subject templates (ids are temporary keys used only while seeding). */
const seedSubjects = [
  {
    tempId: 'mad',
    name: 'Mobile Application Development',
    code: '',
    color: '#4F46E5',
  },
  {
    tempId: 'sqa',
    name: 'Software Quality Assurance',
    code: '',
    color: '#059669',
  },
  {
    tempId: 'dip',
    name: 'Digital Image Processing',
    code: '',
    color: '#0EA5E9',
  },
  {
    tempId: 'csec',
    name: 'Computer Security',
    code: '',
    color: '#D97706',
  },
  {
    tempId: 'mcc',
    name: 'Mobile and Computer Communication',
    code: '',
    color: '#DB2777',
  },
];

/**
 * Task templates. dayOffset is relative to seed reference date.
 * For assignment/exam: dueAt uses dayOffset + hour/minute.
 * For study: scheduledDate uses dayOffset only.
 */
const seedTasks = [
  // 10 assignments
  {
    subjectTempId: 'mad',
    title: 'React Native Navigation Lab Report',
    type: 'assignment',
    description: 'Document stack and tab navigation choices with screenshots.',
    dayOffset: -5,
    hour: 23,
    minute: 59,
    status: 'pending',
  },
  {
    subjectTempId: 'sqa',
    title: 'Test Case Design Worksheet',
    type: 'assignment',
    description: 'Prepare black-box test cases for a login module.',
    dayOffset: -2,
    hour: 17,
    minute: 0,
    status: 'completed',
  },
  {
    subjectTempId: 'dip',
    title: 'Histogram Equalisation Exercise',
    type: 'assignment',
    description: 'Apply histogram equalisation and compare before/after images.',
    dayOffset: 3,
    hour: 23,
    minute: 59,
    status: 'pending',
  },
  {
    subjectTempId: 'csec',
    title: 'Threat Modelling Brief',
    type: 'assignment',
    description: 'Identify assets, threats, and mitigations for a campus portal.',
    dayOffset: 7,
    hour: 12,
    minute: 0,
    status: 'pending',
  },
  {
    subjectTempId: 'mcc',
    title: 'Wireless Protocol Comparison Sheet',
    type: 'assignment',
    description: 'Compare Wi-Fi, Bluetooth, and cellular for student apps.',
    dayOffset: 10,
    hour: 18,
    minute: 30,
    status: 'pending',
  },
  {
    subjectTempId: 'mad',
    title: 'Offline-First Feature Proposal',
    type: 'assignment',
    description: 'Propose local storage options for an offline planner.',
    dayOffset: 1,
    hour: 9,
    minute: 0,
    status: 'pending',
  },
  {
    subjectTempId: 'sqa',
    title: 'Bug Report Review Pack',
    type: 'assignment',
    description: 'Classify severity for five fictional defect reports.',
    dayOffset: -8,
    hour: 16,
    minute: 0,
    status: 'completed',
  },
  {
    subjectTempId: 'dip',
    title: 'Edge Detection Mini Project',
    type: 'assignment',
    description: 'Implement Sobel edge detection notes with sample output.',
    dayOffset: 14,
    hour: 23,
    minute: 59,
    status: 'pending',
  },
  {
    subjectTempId: 'csec',
    title: 'Password Policy Critique',
    type: 'assignment',
    description: 'Critique a weak fictional password policy and suggest fixes.',
    dayOffset: 5,
    hour: 15,
    minute: 0,
    status: 'pending',
  },
  {
    subjectTempId: 'mcc',
    title: 'Latency Measurement Reflection',
    type: 'assignment',
    description: 'Reflect on measured round-trip times in a lab simulation.',
    dayOffset: -1,
    hour: 11,
    minute: 30,
    status: 'pending',
  },

  // 5 exams
  {
    subjectTempId: 'mad',
    title: 'MAD Mid-Semester Exam',
    type: 'exam',
    description: 'Covers components, state, and navigation basics.',
    dayOffset: 12,
    hour: 9,
    minute: 30,
    status: 'pending',
  },
  {
    subjectTempId: 'sqa',
    title: 'SQA Quiz 2',
    type: 'exam',
    description: 'Short quiz on verification vs validation.',
    dayOffset: -3,
    hour: 10,
    minute: 0,
    status: 'pending',
  },
  {
    subjectTempId: 'dip',
    title: 'DIP Practical Test',
    type: 'exam',
    description: 'In-lab practical on filtering and transforms.',
    dayOffset: 20,
    hour: 13,
    minute: 0,
    status: 'pending',
  },
  {
    subjectTempId: 'csec',
    title: 'Computer Security Oral Review',
    type: 'exam',
    description: 'Oral questions on cryptography fundamentals.',
    dayOffset: 6,
    hour: 14,
    minute: 0,
    status: 'pending',
  },
  {
    subjectTempId: 'mcc',
    title: 'MCC Written Test',
    type: 'exam',
    description: 'Written paper on network layers and mobile protocols.',
    dayOffset: -10,
    hour: 9,
    minute: 0,
    status: 'completed',
  },

  // 10 study tasks across several dates
  {
    subjectTempId: 'mad',
    title: 'Revise FlatList performance notes',
    type: 'study',
    description: 'Skim notes on keys, memoization, and list windows.',
    dayOffset: 0,
    status: 'pending',
  },
  {
    subjectTempId: 'sqa',
    title: 'Practice equivalence partitioning',
    type: 'study',
    description: 'Work through two textbook examples.',
    dayOffset: 0,
    status: 'completed',
  },
  {
    subjectTempId: 'dip',
    title: 'Watch lecture on Fourier transforms',
    type: 'study',
    description: 'Focus on frequency-domain intuition.',
    dayOffset: 1,
    status: 'pending',
  },
  {
    subjectTempId: 'csec',
    title: 'Flashcards: CIA triad',
    type: 'study',
    description: 'Quick recall drill for confidentiality, integrity, availability.',
    dayOffset: -1,
    status: 'completed',
  },
  {
    subjectTempId: 'mcc',
    title: 'Sketch OSI vs TCP/IP diagram',
    type: 'study',
    description: 'Draw and label layers from memory.',
    dayOffset: 2,
    status: 'pending',
  },
  {
    subjectTempId: 'mad',
    title: 'Read Expo SQLite docs summary',
    type: 'study',
    description: 'Summarise async API methods used in UniPocket.',
    dayOffset: 0,
    status: 'pending',
  },
  {
    subjectTempId: 'sqa',
    title: 'Review regression testing checklist',
    type: 'study',
    description: 'Prepare talking points for lab discussion.',
    dayOffset: 3,
    status: 'pending',
  },
  {
    subjectTempId: 'dip',
    title: 'Colour space conversion practice',
    type: 'study',
    description: 'Convert RGB examples to grayscale by hand.',
    dayOffset: -2,
    status: 'pending',
  },
  {
    subjectTempId: 'csec',
    title: 'Study hashing vs encryption',
    type: 'study',
    description: 'Write a one-page comparison table.',
    dayOffset: 4,
    status: 'pending',
  },
  {
    subjectTempId: 'mcc',
    title: 'Revise handoff and roaming notes',
    type: 'study',
    description: 'Focus on cellular mobility management terms.',
    dayOffset: 1,
    status: 'pending',
  },
];

/**
 * Resolve seed templates into concrete insertable rows using a reference date.
 * @param {string} referenceDate YYYY-MM-DD local
 * @param {(base: string, days: number) => string} addDaysFn
 * @param {(dateStr: string, hour: number, minute: number) => string} buildDueAtFn
 */
function resolveSeedDataset(referenceDate, addDaysFn, buildDueAtFn) {
  const subjects = seedSubjects.map((s) => ({
    tempId: s.tempId,
    name: s.name,
    code: s.code || null,
    color: s.color,
  }));

  const tasks = seedTasks.map((t) => {
    const dateStr = addDaysFn(referenceDate, t.dayOffset);
    const isStudy = t.type === 'study';
    return {
      subjectTempId: t.subjectTempId,
      title: t.title,
      type: t.type,
      description: t.description || null,
      scheduledDate: isStudy ? dateStr : null,
      dueAt: isStudy ? null : buildDueAtFn(dateStr, t.hour ?? 9, t.minute ?? 0),
      status: t.status,
    };
  });

  return { subjects, tasks, referenceDate };
}

/** Expected counts for verification helpers / tests. */
const SEED_COUNTS = {
  subjects: 5,
  assignments: 10,
  exams: 5,
  study: 10,
  tasksTotal: 25,
};

module.exports = {
  SCHEMA_VERSION,
  seedSubjects,
  seedTasks,
  resolveSeedDataset,
  SEED_COUNTS,
};
