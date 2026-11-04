import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import PrimaryButton from '../components/PrimaryButton';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';

import { useData } from '../context/DataContext';
import { useForegroundAndMidnightRefresh } from '../hooks/useForegroundAndMidnightRefresh';
import {
  createTask,
  getAllSubjects,
  getStudyTasksByDate,
  setTaskStatus,
} from '../database';
import {
  createRequestGate,
  shouldApplyLoadResult,
} from '../utils/asyncLoad';
import {
  formatDisplayDate,
  getLocalDateString,
  parseLocalDateTime,
  shiftLocalDate,
} from '../utils/dates';
import { interpretDatePickerEvent } from '../utils/pickerEvents';
import {
  ALLOWED_TYPES,
  shouldMovePlannerToSavedDate,
} from '../utils/taskTypes';
import {
  annotateTaskLabels,
  calcCompletionProgress,
} from '../utils/filters';

const theme = {
  background: '#F7F7FC',
  surface: '#FFFFFF',
  purple: '#6D4AFF',
  purpleDark: '#392278',
  soft: '#EEE9FF',
  text: '#25223B',
  muted: '#686278',
  border: '#E8E5F1',
  green: '#19866B',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates(dateString) {
  const selected = parseLocalDateTime(dateString) || new Date();

  // Monday is the first day of the displayed week.
  const daysSinceMonday = (selected.getDay() + 6) % 7;
  const monday = shiftLocalDate(selected, -daysSinceMonday);

  return Array.from({ length: 7 }, (_, index) => {
    const date = shiftLocalDate(monday, index);

    return {
      key: getLocalDateString(date),
      day: DAY_LABELS[date.getDay()],
      number: date.getDate(),
    };
  });
}

export default function StudyPlannerScreen() {
  const navigation = useNavigation();
  const { ready, refreshKey, refresh } = useData();

  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [tasks, setTasks] = useState([]);
  const [loadedDate, setLoadedDate] = useState(null);
  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [busyIds, setBusyIds] = useState({});

  const gateRef = useRef(createRequestGate());
  const activeRef = useRef(false);
  const aliveRef = useRef(true);
  const selectedDateRef = useRef(selectedDate);
  const busyRef = useRef(new Set());

  selectedDateRef.current = selectedDate;

  useEffect(() => {
    aliveRef.current = true;

    return () => {
      aliveRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!ready || !activeRef.current) return;

    const dateToLoad = selectedDateRef.current;
    const requestId = gateRef.current.next();

    const canApply = () =>
      shouldApplyLoadResult(
        requestId,
        gateRef.current.getLatest(),
        activeRef.current && aliveRef.current,
      ) && dateToLoad === selectedDateRef.current;

    setLoading(true);

    try {
      const [rows, subjectRows] = await Promise.all([
        getStudyTasksByDate(dateToLoad),
        getAllSubjects(),
      ]);

      if (!canApply()) return;

      setTasks(rows.map((task) => annotateTaskLabels(task)));
      setSubjects(subjectRows);
      setLoadedDate(dateToLoad);
      setError(null);
    } catch (err) {
      if (!canApply()) return;

      setError(err?.message || 'Could not load study tasks.');
    } finally {
      if (canApply()) {
        setLoading(false);
      }
    }
  }, [ready]);

  useFocusEffect(
    useCallback(() => {
      activeRef.current = true;
      load();

      return () => {
        activeRef.current = false;
        gateRef.current.next();
      };
    }, [load, refreshKey, selectedDate]),
  );

  useForegroundAndMidnightRefresh(load);

  const chooseDate = (dateString) => {
    if (dateString === selectedDateRef.current) return;

    // Invalidate old requests immediately, before the next render.
    gateRef.current.next();
    selectedDateRef.current = dateString;

    setError(null);
    setActionError(null);
    setLoading(true);
    setSelectedDate(dateString);
  };

  const selectedDateObj =
    parseLocalDateTime(selectedDate) || new Date();

  const moveDate = (days) => {
    chooseDate(
      getLocalDateString(shiftLocalDate(selectedDateObj, days)),
    );
  };

  const onPickerChange = (event, date) => {
    const result = interpretDatePickerEvent(
      event,
      date,
      Platform.OS,
    );

    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (result.action === 'set') {
      chooseDate(getLocalDateString(result.date));
    }
  };

  const toggleComplete = async (task) => {
    // A ref blocks repeat taps immediately, before React rerenders.
    if (busyRef.current.has(task.id)) return;

    busyRef.current.add(task.id);
    setBusyIds((current) => ({ ...current, [task.id]: true }));
    setActionError(null);

    try {
      const nextStatus =
        task.status === 'completed' ? 'pending' : 'completed';

      await setTaskStatus(task.id, nextStatus);

      if (aliveRef.current) {
        setTasks((current) =>
          current.map((row) =>
            row.id === task.id
              ? { ...row, status: nextStatus }
              : row,
          ),
        );

        // Reload before releasing the checkbox.
        await load();
      }

      refresh();
    } catch (err) {
      if (aliveRef.current) {
        setActionError(
          err?.message || 'Could not update this task. Try again.',
        );
      }
    } finally {
      busyRef.current.delete(task.id);

      if (aliveRef.current) {
        setBusyIds((current) => {
          const next = { ...current };
          delete next[task.id];
          return next;
        });
      }
    }
  };

  const onSave = async (payload) => {
    const created = await createTask(payload);
    const savedDate = created?.scheduledDate || payload.scheduledDate;

    if (
      aliveRef.current &&
      shouldMovePlannerToSavedDate(
        selectedDateRef.current,
        savedDate,
      )
    ) {
      chooseDate(savedDate);

      Alert.alert(
        'Study task saved',
        `The planner moved to ${formatDisplayDate(savedDate)}.`,
      );
    }

    refresh();
  };

  const hasCurrentData = loadedDate === selectedDate;
  const visibleTasks = hasCurrentData ? tasks : [];
  const progress = calcCompletionProgress(visibleTasks);
  const pendingCount = progress.total - progress.completed;
  const weekDates = getWeekDates(selectedDate);
  const today = getLocalDateString();

  const allDone =
    progress.total > 0 && progress.completed === progress.total;

  if (!ready || (loading && loadedDate == null)) {
    return <LoadingState message="Preparing your study planner…" />;
  }

  if (error && loadedDate == null) {
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={visibleTasks}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>MAKE TIME FOR WHAT MATTERS</Text>
              <Text style={styles.title}>Study Planner</Text>
              <Text style={styles.heroDescription}>
                One focused task at a time.
              </Text>

              <Pressable
                onPress={() => setShowPicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Choose a study date"
                style={styles.heroDateButton}
              >
                <Text style={styles.heroDate}>
                  {formatDisplayDate(selectedDate)}
                </Text>
                <Text style={styles.heroDateHint}>
                  Tap to choose another date
                </Text>
              </Pressable>
            </View>

            <ErrorBanner message={error} onRetry={load} />
            <ErrorBanner message={actionError} />

            <View style={styles.weekControls}>
              <Pressable
                onPress={() => moveDate(-7)}
                accessibilityRole="button"
                accessibilityLabel="Previous week"
                style={styles.weekButton}
              >
                <Text style={styles.weekButtonText}>‹ Prev week</Text>
              </Pressable>

              <Pressable
                onPress={() => chooseDate(getLocalDateString())}
                accessibilityRole="button"
                style={styles.todayButton}
              >
                <Text style={styles.todayText}>Today</Text>
              </Pressable>

              <Pressable
                onPress={() => moveDate(7)}
                accessibilityRole="button"
                accessibilityLabel="Next week"
                style={styles.weekButton}
              >
                <Text style={styles.weekButtonText}>Next week ›</Text>
              </Pressable>
            </View>

            <ScrollView
              key={weekDates[0].key}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateStrip}
            >
              {weekDates.map((day) => {
                const selected = day.key === selectedDate;
                const isToday = day.key === today;

                return (
                  <Pressable
                    key={day.key}
                    onPress={() => chooseDate(day.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${formatDisplayDate(day.key)}${
                      isToday ? ', today' : ''
                    }`}
                    style={[
                      styles.dayCard,
                      selected && styles.daySelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayLabel,
                        selected && styles.selectedText,
                      ]}
                    >
                      {day.day}
                    </Text>

                    <Text
                      style={[
                        styles.dayNumber,
                        selected && styles.selectedText,
                      ]}
                    >
                      {day.number}
                    </Text>

                    <View
                      style={[
                        styles.dayDot,
                        isToday && styles.todayDot,
                        isToday && selected && styles.selectedDot,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.progressCard}>
              <View style={styles.progressTop}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>Daily progress</Text>
                  <Text style={styles.cardSubtitle}>
                    {!hasCurrentData
                      ? loading
                        ? 'Loading selected date…'
                        : 'Could not load this date.'
                      : progress.total === 0
                        ? 'A fresh day to plan your study.'
                        : `${progress.completed} of ${progress.total} tasks completed`}
                  </Text>
                </View>

                <Text style={styles.percentage}>
                  {hasCurrentData ? `${progress.percent}%` : '—'}
                </Text>
              </View>

              <View
                style={styles.progressTrack}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel="Selected day study progress"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: hasCurrentData ? progress.percent : 0,
                }}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        hasCurrentData ? progress.percent : 0
                      }%`,
                    },
                    allDone && styles.completeFill,
                  ]}
                />
              </View>

              <Text style={styles.progressHint}>
                {allDone
                  ? 'Everything planned for this day is complete!'
                  : 'Small, consistent study sessions make a difference.'}
              </Text>

              <View style={styles.countsRow}>
                <View style={styles.countItem}>
                  <Text style={styles.countNumber}>
                    {hasCurrentData ? progress.total : '—'}
                  </Text>
                  <Text style={styles.countLabel}>Planned</Text>
                </View>

                <View style={styles.countItem}>
                  <Text style={styles.countNumber}>
                    {hasCurrentData ? pendingCount : '—'}
                  </Text>
                  <Text style={styles.countLabel}>Pending</Text>
                </View>

                <View style={styles.countItem}>
                  <Text style={[styles.countNumber, styles.greenText]}>
                    {hasCurrentData ? progress.completed : '—'}
                  </Text>
                  <Text style={styles.countLabel}>Completed</Text>
                </View>
              </View>
            </View>

            <PrimaryButton
              title="+ Add Study Task"
              onPress={() => setFormVisible(true)}
              style={styles.addButton}
            />

            <View style={styles.sectionHeading}>
              <View style={styles.flex}>
                <Text style={styles.sectionTitle}>
                  {selectedDate === today ? "Today's tasks" : 'Study tasks'}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Tick a task when you finish it.
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.badgeText}>
                  {hasCurrentData ? visibleTasks.length : '—'}
                </Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={
              item.status === 'completed'
                ? styles.completedTask
                : undefined
            }
          >
            <TaskCard
              task={item}
              showCheckbox
              completeDisabled={Boolean(busyIds[item.id])}
              onToggleComplete={toggleComplete}
              onPress={() =>
                navigation.navigate('TaskDetails', { taskId: item.id })
              }
            />
          </View>
        )}
        ListEmptyComponent={
          !hasCurrentData ? (
            <Text style={styles.message}>
              {loading
                ? 'Loading study tasks…'
                : 'Use Retry above to load this date.'}
            </Text>
          ) : (
            <View style={styles.emptyCard}>
              <EmptyState
                icon="book-outline"
                title="Your day is open"
                message="Add a study task and take your first step."
              />
            </View>
          )
        }
      />

      {showPicker ? (
        <View>
          <DateTimePicker
            value={selectedDateObj}
            mode="date"
            display="default"
            onChange={onPickerChange}
          />

          {Platform.OS === 'ios' ? (
            <PrimaryButton
              title="Done"
              onPress={() => setShowPicker(false)}
            />
          ) : null}
        </View>
      ) : null}

      <TaskFormModal
        visible={formVisible}
        mode="add"
        defaultType="study"
        defaultDate={selectedDate}
        subjects={subjects}
        allowedTypes={ALLOWED_TYPES.studyPlanner}
        lockType
        onSubmit={onSave}
        onClose={() => setFormVisible(false)}
        onCreateSubject={() => {
          setFormVisible(false);
          navigation.navigate('Subjects');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 36,
  },
  flex: {
    flex: 1,
  },
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: theme.purpleDark,
    marginBottom: 14,
  },
  eyebrow: {
    color: '#DDD3FF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  heroDescription: {
    color: '#E6DFFF',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  heroDateButton: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#50378F',
    marginTop: 20,
    minHeight: 48,
  },
  heroDate: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  heroDateHint: {
    color: '#E6DFFF',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  weekControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  weekButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  weekButtonText: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  todayButton: {
    minHeight: 44,
    paddingHorizontal: 17,
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: theme.soft,
  },
  todayText: {
    color: theme.purpleDark,
    fontSize: 12,
    fontWeight: '700',
  },
  dateStrip: {
    gap: 8,
    paddingBottom: 16,
  },
  dayCard: {
    minWidth: 46,
    minHeight: 87,
    paddingHorizontal: 9,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: theme.purple,
    borderColor: theme.purple,
  },
  dayLabel: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  dayNumber: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
  },
  selectedText: {
    color: '#FFFFFF',
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  todayDot: {
    backgroundColor: theme.purple,
  },
  selectedDot: {
    backgroundColor: '#FFFFFF',
  },
  progressCard: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  percentage: {
    color: theme.purple,
    fontSize: 27,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    borderRadius: 8,
    backgroundColor: theme.soft,
    overflow: 'hidden',
    marginTop: 18,
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: theme.purple,
  },
  completeFill: {
    backgroundColor: theme.green,
  },
  progressHint: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 11,
  },
  countsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  countItem: {
    flexGrow: 1,
    flexBasis: 70,
    padding: 11,
    alignItems: 'center',
    borderRadius: 13,
    backgroundColor: theme.background,
  },
  countNumber: {
    color: theme.purpleDark,
    fontSize: 21,
    fontWeight: '800',
  },
  greenText: {
    color: theme.green,
  },
  countLabel: {
    color: theme.muted,
    fontSize: 10,
    marginTop: 5,
  },
  addButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginBottom: 15,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: theme.muted,
    fontSize: 12,
    marginTop: 5,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: theme.soft,
  },
  badgeText: {
    color: theme.purpleDark,
    fontSize: 12,
    fontWeight: '700',
  },
  completedTask: {
    borderLeftWidth: 3,
    borderLeftColor: theme.green,
    paddingLeft: 7,
  },
  emptyCard: {
    padding: 16,
    backgroundColor: theme.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  message: {
    color: theme.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 26,
  },
});