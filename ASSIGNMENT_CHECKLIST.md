# ICA 03 Assignment Checklist — UniPocket

Maps each stated requirement to the implementation location and a verification step.

| # | Requirement | Implementation | How to verify |
| --- | --- | --- | --- |
| 1 | React Native app | Expo React Native project (`package.json`, `App.js`) | `npm install` then `npx expo start` |
| 2 | At least five distinct screens | `DashboardScreen`, `SubjectsScreen`, `AssignmentsScreen`, `StudyPlannerScreen`, `TaskDetailsScreen` | Open each via tabs / task tap |
| 3 | Suitable navigation | `src/navigation/AppNavigator.js` — tabs + stack | Switch tabs; open details; Android back |
| 4 | Original local dataset | `src/data/seedDataset.js` | Inspect file; first launch inserts rows |
| 5 | Retrieve/display local data dynamically | `src/database/*` + screens load via repos | Edit a record; lists/counts update |
| 6 | Search, filter, details | Assignments filters + Task Details | Search + filters together; open a card |
| 7 | Works without internet | Local SQLite only; no network APIs | Airplane mode on standalone build |
| 8 | No public APIs / online DB / backend | No fetch/API clients for app data | Code search; offline use |

## Screens

| Screen | File | Verification |
| --- | --- | --- |
| Dashboard | `src/screens/DashboardScreen.js` | Counts and lists match SQLite; taps open details |
| Subjects | `src/screens/SubjectsScreen.js` | Add/edit modal; delete blocked when tasks linked |
| Assignments | `src/screens/AssignmentsScreen.js` | Search + subject/status/type + clear |
| Study Planner | `src/screens/StudyPlannerScreen.js` | Date controls; progress; empty state |
| Task Details | `src/screens/TaskDetailsScreen.js` | Edit/delete/status; missing id message |

## Navigation details

| Requirement | Location | Verification |
| --- | --- | --- |
| Bottom tabs | `AppNavigator` Tabs | Four tab icons visible |
| Stack for details | `TaskDetails` stack screen | Card → details → back |
| Modals for forms | `SubjectFormModal`, `TaskFormModal` | Add/Edit opens modal |
| Android back | React Navigation + modal `onRequestClose` | Back closes details/modals |
| Unsaved discard prompt | Form modals `Alert` when dirty | Edit field, press Close |

## Database

| Requirement | Location | Verification |
| --- | --- | --- |
| Reusable SQLite layer | `src/database/` | Screens call repos, not raw SQL UI |
| Tables subjects/tasks/metadata | `schema.js`, `init.js` | First launch succeeds |
| Parameterized queries | `*Repo.js` (`?` placeholders) | Review source |
| Foreign keys | `PRAGMA foreign_keys = ON` | Linked subject delete blocked |
| Transactions for seed/related writes | `withTransaction` + seed | First launch atomic |
| Preserve user changes | No auto-reset | Restart after edit |
| Shared refresh | `src/context/DataContext.js` | Mutate → other screens update |
| Local calendar dates | `src/utils/dates.js` | Study day does not UTC-shift |
| Overdue vs past exam | `annotateTaskLabels` | Labels on Assignments/Details |

## Dataset

| Requirement | Location | Verification |
| --- | --- | --- |
| 5 subjects, 10 assignments, 5 exams, 10 study | `seedDataset.js` / `SEED_COUNTS` | `npm test` |
| Offsets from first-launch date | `resolveSeedDataset` + `init.js` | Metadata `seedReferenceDate` |
| Insert once; marker after success | `initializeDatabase` | Second launch no duplicates |
| Personalise note | README + seed file header | Read comments |

## Forms / UX

| Requirement | Location | Verification |
| --- | --- | --- |
| Subject/task validation | `validation.js` + modals | Submit empty fields |
| Duplicate subject names | case-insensitive trim | Add same name twice |
| Disable save while saving | modals `saving` state | Rapid double-tap Save |
| Confirm deletions | `ConfirmDialog` | Delete subject/task |
| Loading/error/empty | shared components | Observe first load / empty filters |

## Offline / docs / GitHub readiness

| Requirement | Location | Verification |
| --- | --- | --- |
| README with run commands | `README.md` | Follow PowerShell steps |
| Standalone build notes | README section | Build APK when SDK available |
| Manual checklist | README + this file | Device walkthrough |
| `.gitignore` | root `.gitignore` | `node_modules`, builds ignored |
| No remote push unless asked | — | No `git push` performed by default |

## Automated checks run in development

| Check | Command | Result recording |
| --- | --- | --- |
| Date helpers | `npm test` | Recorded when run by developer/agent |
| Filters / labels / progress | `npm test` | Includes overdue vs past exam |
| Seed resolve counts | `npm test` | 5/10/5/10 |
| Validation helpers | `npm test` | Duplicate names, required fields |

Device/emulator items (Expo Go, airplane mode, release APK) remain **manual** until executed on hardware.
