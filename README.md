# UniPocket – Offline Student Assignment and Study Planner

UniPocket is an offline-first React Native (Expo) mobile app for organising university subjects, assignments, exams, and daily study tasks. All data is stored locally with **expo-sqlite**. The app does **not** use public APIs, online databases, or backend services.

> **Title registration:** Confirm that **UniPocket** is available on your class registration sheet and register it yourself before the title deadline (**4 November 2026**). This repository does not claim the title is unique or already registered. Project deadline: **15 November 2026**.

> **Demonstration dataset:** The bundled seed records in `src/data/seedDataset.js` are fictional demonstration data. Review, personalise, and understand them before your individual submission.

## Features and five screens

1. **Dashboard** – greeting, today’s date, live counts (pending assignments, upcoming exams, today’s pending study tasks), upcoming items, overdue assignments, today’s study tasks, and quick-add actions.
2. **Subjects** – list subjects with colour, optional code, and linked task counts; add / edit / delete with validation (linked subjects cannot be deleted).
3. **Assignments** – combined assignment + exam list with search, subject / status / type filters, clear filters, and add actions.
4. **Study Planner** – date picker with previous / next / today controls, daily study tasks, completion checkboxes, and progress (safe when empty).
5. **Task Details** – full task view with edit, delete (confirm), mark completed / pending; handles missing IDs gracefully.

Navigation: bottom tabs for screens 1–4, stack push for Task Details, modals for forms.

## Technology stack

| Area | Choice |
| --- | --- |
| Framework | React Native + Expo SDK 58 (JavaScript) |
| Navigation | React Navigation (bottom tabs + native stack) |
| Local database | expo-sqlite (async API, foreign keys, transactions) |
| Date/time UI | @react-native-community/datetimepicker |
| Icons | @expo/vector-icons (Ionicons) |
| Target | Android-focused offline student planner |

## Installation and run (Windows PowerShell)

From the project folder:

```powershell
cd "C:\Users\pathi\Desktop\MCC Project\Unipocket"
npm install
npx expo start
```

Then press `a` for Android emulator, or scan the QR code with Expo Go on a physical Android device (same Wi‑Fi as your PC for development).

Useful scripts:

```powershell
npm start                 # same as npx expo start
npm run android           # open on Android
npm test                  # run pure logic unit tests (Node)
```

### Android device / emulator setup

1. Install [Android Studio](https://developer.android.com/studio) and create an AVD, **or** enable USB debugging / use Expo Go on a phone.
2. For Expo Go: install Expo Go from the Play Store, start Metro with `npx expo start`, then connect.
3. Development mode needs the Metro bundler running and a network path to your PC. That is **not** the same as a standalone offline install (see below).

## Folder structure

```text
Unipocket/
  App.js
  app.json
  babel.config.js
  package.json
  README.md
  ASSIGNMENT_CHECKLIST.md
  assets/                 # local icons / splash only
  src/
    components/           # reusable UI + forms
    screens/              # five screens
    navigation/           # tabs + stack
    database/             # SQLite open, schema, repos, init/seed
    data/                 # original seed dataset (edit to personalise)
    context/              # shared refresh after mutations
    utils/                # dates, filters, validation
    theme/                # colours, spacing, typography
  __tests__/              # logic tests
  scripts/run-logic-tests.js
```

## Database schema

**subjects**

| Column | Notes |
| --- | --- |
| id | INTEGER PK |
| name | required |
| code | optional |
| color | hex colour |
| createdAt | local timestamp string |

**tasks**

| Column | Notes |
| --- | --- |
| id | INTEGER PK |
| subjectId | FK → subjects(id) |
| title | required |
| type | `assignment` \| `exam` \| `study` |
| description | optional |
| scheduledDate | `YYYY-MM-DD` for study (local calendar) |
| dueAt | local `YYYY-MM-DDTHH:mm:ss` for assignment/exam |
| status | `pending` \| `completed` |
| createdAt / updatedAt | local timestamp strings |

**app_metadata**

| key examples | purpose |
| --- | --- |
| initialized | `1` after successful first seed |
| schemaVersion | schema marker |
| seedReferenceDate | first-launch local date used to resolve offsets |

Foreign keys are enabled (`PRAGMA foreign_keys = ON`). Related writes and first-time seeding use transactions. The database is **never** auto-reset; user edits persist across launches.

## Dataset personalisation

Edit **`src/data/seedDataset.js`**.

- Subjects and task templates use **day offsets** from the first-launch local date.
- On first launch only, offsets are converted to concrete dates and inserted once inside a transaction.
- The seed reference date is stored in metadata; later launches do **not** recalculate dates.
- Deleted seed rows are **not** restored on restart.

After you personalise the file, uninstall the app (or clear app data) once if you need a clean re-seed during development. Normal everyday use should keep the existing SQLite file.

## One-time initialisation

1. Open database and create tables if needed.
2. If `initialized != 1`, insert subjects + tasks in a transaction.
3. Write metadata (`seedReferenceDate`, `schemaVersion`, `initialized=1`) only after success.
4. On later launches, skip seeding and load saved rows.

## Offline behaviour

Core features work without internet once the app is installed and data exists locally:

- View / search / filter
- Add / edit / delete
- Toggle completion
- Open details
- Restart and read saved SQLite data

Installing npm packages or using Expo Go with Metro requires a development network. For a true offline cold start, use a standalone Android build (next section).

## Standalone Android build (no Metro)

**Development (`npx expo start` + Expo Go):** JS is loaded from the Metro server. Airplane mode will break that session unless the bundle was already cached in a way Expo Go allows — do not rely on this for the offline demo.

**Standalone / release build:** the JS bundle is packaged into the APK/AAB. After install, the app can launch without Metro.

Example local build flow (requires Android SDK):

```powershell
npx expo run:android --variant release
```

Or with EAS (Expo account):

```powershell
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

Install the produced APK on a device, enable airplane mode, and verify Dashboard / CRUD still work.

> Offline cold-start of a release APK was **not** verified in this development environment unless you complete the steps above on your machine.

## Manual test checklist

See also `ASSIGNMENT_CHECKLIST.md`.

1. First launch inserts seed data once; second launch does not duplicate.
2. All five screens reachable (tabs + task details).
3. Lists/counts come from SQLite (change a record and watch Dashboard update).
4. Add subject / assignment / exam / study task.
5. Edit a task; Subjects counts and other screens refresh.
6. Mark complete; Dashboard pending counts change.
7. Search + subject + status + type filters together.
8. Study tasks appear on the correct local date.
9. Overdue assignment vs Past exam labels.
10. Delete a task; remains deleted after restart.
11. Subject with linked tasks cannot be deleted.
12. Invalid forms show inline errors.
13. Close and reopen app; changes remain.
14. Airplane mode after standalone install (device check).
15. Installed APK launches without Metro (device check).

## Short demonstration sequence

1. Open UniPocket → Dashboard shows seed counts and today’s study tasks.
2. Open Subjects → show colours and linked counts → try deleting a linked subject (blocked).
3. Open Assignments → search “React” → filter Pending + Assignment.
4. Open Study Planner → Today → tick a checkbox → progress updates.
5. Open any card → Task Details → mark completed → return to Dashboard.
6. Add a personal assignment → confirm it appears in filters and Dashboard upcoming/overdue as appropriate.
7. Force-close and reopen → data still present.

## Known limitations

- Android is the focus; iOS is not the primary demo target.
- Expo Go development still depends on Metro while coding.
- DateTimePicker UI differs slightly between Android versions.
- No cloud sync, accounts, or notifications (by design).
- Seed content is fictional and must be personalised for submission.

## Concepts used (short explanations)

- **CRUD** – create/read/update/delete via repository functions in `src/database/`.
- **Navigation** – React Navigation tabs for main areas; stack for details; Android back pops the stack / closes modals.
- **Search & filters** – client-side AND combination in `src/utils/filters.js` over SQLite-loaded rows.
- **State refresh** – `DataContext` increments `refreshKey` after mutations; focused screens reload.

## Suggested development commits (do not backdate)

Create commits yourself after real milestones, for example:

1. Scaffold Expo app and dependencies  
2. Add SQLite layer + seed dataset  
3. Implement navigation and five screens  
4. Forms, validation, and polish  
5. Tests + README + assignment checklist  

Do not fabricate or rewrite git history. A remote repository is not created unless you ask.

## Licence

See `LICENSE` if present in the project root.
