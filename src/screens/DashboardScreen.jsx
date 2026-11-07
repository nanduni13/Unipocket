import React, { useCallback, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import StatCard from '../components/StatCard';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';

import { useData } from '../context/DataContext';
import { useForegroundAndMidnightRefresh } from '../hooks/useForegroundAndMidnightRefresh';
import { createTask, getAllSubjects, getDashboardData } from '../database';
import { createRequestGate, shouldApplyLoadResult } from '../utils/asyncLoad';
import { formatDisplayDate, getGreeting } from '../utils/dates';
import { annotateTaskLabels } from '../utils/filters';
import { ALLOWED_TYPES } from '../utils/taskTypes';
import { colors, spacing } from '../theme';

const palette = {
  purple: '#6D4AFF',
  purpleDark: '#392278',
  lavender: '#EEE9FF',
  background: '#F7F7FC',
  text: '#25223B',
  muted: '#77738B',
  border: '#E8E5F1',
  green: '#19866B',
  red: '#BA394E',
};

function SectionHeading({ title, count, subtitle }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        ) : null}
      </View>

      <View style={styles.countBadge}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  );
}

function QuickAction({ symbol, title, subtitle, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [
        styles.quickAction,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.actionIcon}>
        <Text style={styles.actionSymbol}>{symbol}</Text>
      </View>

      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { ready, refreshKey, refresh } = useData();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [formType, setFormType] = useState('assignment');

  const gateRef = useRef(createRequestGate());
  const activeRef = useRef(false);

  const load = useCallback(async () => {
    if (!ready || !activeRef.current) return;

    const requestId = gateRef.current.next();

    const canApply = () =>
      shouldApplyLoadResult(
        requestId,
        gateRef.current.getLatest(),
        activeRef.current,
      );

    try {
      const [dashboard, subjectRows] = await Promise.all([
        getDashboardData(),
        getAllSubjects(),
      ]);

      if (!canApply()) return;

      setData(dashboard);
      setSubjects(subjectRows);
      setError(null);
    } catch (err) {
      if (!canApply()) return;
      setError(err?.message || 'Could not load your dashboard.');
    } finally {
      if (canApply()) {
        setLoading(false);
        setRefreshing(false);
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
    }, [load, refreshKey]),
  );

  useForegroundAndMidnightRefresh(load);

  const openAdd = (type) => {
    setFormType(type);
    setFormVisible(true);
  };

  const onSave = async (payload) => {
    await createTask(payload);
    refresh();
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (!ready || (loading && !data)) {
    return <LoadingState message="Preparing your study space…" />;
  }

  if (!data) {
    return (
      <ErrorState
        message={error || 'Could not load your dashboard.'}
        onRetry={load}
      />
    );
  }

  const upcoming = data.upcoming || [];
  const overdue = data.overdueAssignments || [];
  const todayTasks = data.todayStudyTasks || [];

  const completedToday = todayTasks.filter(
    (task) => task.status === 'completed',
  ).length;

  const progress =
    todayTasks.length > 0
      ? Math.round((completedToday / todayTasks.length) * 100)
      : 0;

  const allDone =
    todayTasks.length > 0 && completedToday === todayTasks.length;

  const openDetails = (task) => {
    navigation.navigate('TaskDetails', { taskId: task.id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[palette.purple]}
            tintColor={palette.purple}
          />
        }
      >
        <View style={styles.topBar}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/unipocket-logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="UniPocket"
            />
            <Text style={styles.brandCaption}>
              Your study companion
            </Text>
          </View>

          <View style={styles.localBadge}>
            <View style={styles.localDot} />
            <Text style={styles.localText}>On device</Text>
          </View>
        </View>

        <ErrorBanner message={error} onRetry={load} />

        <View style={styles.hero}>
          <Text style={styles.heroDate}>
            {formatDisplayDate(data.today)}
          </Text>

          <Text style={styles.heroTitle}>{getGreeting()}!</Text>

          <Text style={styles.heroDescription}>
            A little planning today makes tomorrow easier.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('StudyPlanner')}
            style={({ pressed }) => [
              styles.heroButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.heroButtonText}>
              Open study planner →
            </Text>
          </Pressable>
        </View>

        <Text style={styles.overviewTitle}>Your overview</Text>

        <View style={styles.statsRow}>
          <StatCard
            label="Pending assignments"
            value={data.counts.pendingAssignments}
            accent={palette.purple}
          />
          <StatCard
            label="Upcoming exams"
            value={data.counts.upcomingExams}
            accent={colors.warning}
          />
        </View>

        <View style={styles.studySummary}>
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>
              Study tasks left today
            </Text>
            <Text style={styles.summarySubtitle}>
              Keep your next study step manageable.
            </Text>
          </View>

          <Text style={styles.summaryNumber}>
            {data.counts.todayStudyPending}
          </Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle}>
                Today's study progress
              </Text>
              <Text style={styles.summarySubtitle}>
                {todayTasks.length === 0
                  ? 'Add your first study task for today.'
                  : `${completedToday} of ${todayTasks.length} tasks completed`}
              </Text>
            </View>

            <Text style={styles.progressNumber}>{progress}%</Text>
          </View>

          <View
            style={styles.progressTrack}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Today's study completion"
            accessibilityValue={{ min: 0, max: 100, now: progress }}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
                allDone && styles.progressComplete,
              ]}
            />
          </View>

          <Text style={styles.progressHint}>
            {allDone
              ? 'All planned study tasks are complete. Well done!'
              : 'Small steps count. Focus on one task at a time.'}
          </Text>
        </View>

        <Text style={styles.overviewTitle}>Create something new</Text>

        <View style={styles.quickActions}>
          <QuickAction
            symbol="+"
            title="Assignment"
            subtitle="Save a deadline"
            onPress={() => openAdd('assignment')}
          />
          <QuickAction
            symbol="E"
            title="Exam"
            subtitle="Plan ahead"
            onPress={() => openAdd('exam')}
          />
          <QuickAction
            symbol="✓"
            title="Study task"
            subtitle="Build your day"
            onPress={() => openAdd('study')}
          />
        </View>

        <SectionHeading
          title="Today's study"
          subtitle="Your plan for the day"
          count={todayTasks.length}
        />

        {todayTasks.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="A fresh start"
            message="Add a study task and give today a clear direction."
          />
        ) : (
          todayTasks.map((task) => (
            <TaskCard
              key={`today-${task.id}`}
              task={task}
              onPress={() => openDetails(task)}
            />
          ))
        )}

        <SectionHeading
          title="Upcoming deadlines"
          subtitle="Assignments and exams coming up next"
          count={upcoming.length}
        />

        {upcoming.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Nothing coming up"
            message="Add an assignment or exam to keep track of its date."
          />
        ) : (
          upcoming.map((task) => (
            <TaskCard
              key={`upcoming-${task.id}`}
              task={annotateTaskLabels(task)}
              onPress={() => openDetails(task)}
            />
          ))
        )}

        <SectionHeading
          title="Needs attention"
          subtitle="Pending assignments past their deadlines"
          count={overdue.length}
        />

        {overdue.length === 0 ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>
              No overdue assignments
            </Text>
            <Text style={styles.successDescription}>
              Your deadlines are looking clear.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.overdueNotice}>
              <Text style={styles.overdueText}>
                Review these deadlines and choose your next step.
              </Text>
            </View>

            {overdue.map((task) => (
              <TaskCard
                key={`overdue-${task.id}`}
                task={annotateTaskLabels(task)}
                onPress={() => openDetails(task)}
              />
            ))}
          </>
        )}

        <Text style={styles.footer}>
          Your plans are saved locally on this device.
        </Text>
      </ScrollView>

      <TaskFormModal
        visible={formVisible}
        mode="add"
        defaultType={formType}
        defaultDate={data.today}
        subjects={subjects}
        allowedTypes={ALLOWED_TYPES.dashboard}
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
    backgroundColor: palette.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  logoContainer: {
    flexGrow: 1,
    flexBasis: 185,
    maxWidth: '100%',
  },
  logo: {
    width: '100%',
    maxWidth: 250,
    height: 72,
  },
  brandCaption: {
    fontSize: 11,
    color: '#666078',
    marginTop: 3,
    paddingLeft: 7,
  },
  localBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#E5F4EE',
  },
  localDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.green,
  },
  localText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#176C56',
  },
  hero: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: palette.purpleDark,
  },
  heroDate: {
    color: '#DDD3FF',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 29,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.7,
  },
  heroDescription: {
    color: '#E6DFFF',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  heroButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 13,
    minHeight: 44,
    marginTop: 20,
  },
  heroButtonText: {
    color: palette.purpleDark,
    fontSize: 13,
    fontWeight: '700',
  },
  overviewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: palette.text,
    marginTop: 25,
    marginBottom: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  studySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.lavender,
    borderRadius: 17,
    padding: 17,
    marginTop: 12,
  },
  summaryText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.text,
  },
  summarySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#666078',
    marginTop: 5,
  },
  summaryNumber: {
    fontSize: 29,
    fontWeight: '800',
    color: palette.purpleDark,
  },
  progressCard: {
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: 14,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressNumber: {
    color: palette.purple,
    fontSize: 23,
    fontWeight: '800',
  },
  progressTrack: {
    height: 9,
    backgroundColor: palette.lavender,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 17,
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: palette.purple,
  },
  progressComplete: {
    backgroundColor: palette.green,
  },
  progressHint: {
    fontSize: 11,
    lineHeight: 17,
    color: '#666078',
    marginTop: 11,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAction: {
    flexGrow: 1,
    flexBasis: 90,
    backgroundColor: '#FFFFFF',
    padding: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: palette.border,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.lavender,
    marginBottom: 11,
  },
  actionSymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.purple,
  },
  actionTitle: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: '#666078',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.75,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 27,
    marginBottom: 14,
  },
  sectionText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#666078',
    marginTop: 4,
  },
  countBadge: {
    minWidth: 30,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: palette.lavender,
    alignItems: 'center',
  },
  countText: {
    color: palette.purpleDark,
    fontSize: 12,
    fontWeight: '700',
  },
  successCard: {
    backgroundColor: '#EAF6F0',
    borderRadius: 16,
    padding: 18,
  },
  successTitle: {
    color: '#176C56',
    fontWeight: '700',
    fontSize: 14,
  },
  successDescription: {
    color: '#41695A',
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },
  overdueNotice: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#FFF0F2',
    marginBottom: 12,
  },
  overdueText: {
    color: palette.red,
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    textAlign: 'center',
    color: '#666078',
    fontSize: 11,
    marginTop: 28,
    lineHeight: 18,
  },
});