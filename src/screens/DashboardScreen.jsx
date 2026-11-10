import React, { useCallback, useRef, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DashboardBento from '../components/DashboardBento';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import PrimaryButton from '../components/PrimaryButton';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';

import { useData } from '../context/DataContext';
import { createTask, getAllSubjects, getDashboardData } from '../database';
import { useForegroundAndMidnightRefresh } from '../hooks/useForegroundAndMidnightRefresh';
import { studentCard, studentUi as ui } from '../theme/studentUi';
import { createRequestGate, shouldApplyLoadResult } from '../utils/asyncLoad';
import { formatDisplayDate, getGreeting } from '../utils/dates';
import { calcCompletionProgress } from '../utils/filters';
import { ALLOWED_TYPES } from '../utils/taskTypes';

function TaskSection({
  title,
  tasks,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  onOpenTask,
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>{tasks.length}</Text>
        </View>
      </View>

      {tasks.length > 0 ? (
        tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onPress={() => onOpenTask(task)}
          />
        ))
      ) : (
        <View style={styles.emptyCard}>
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            message={emptyMessage}
          />
        </View>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { ready, refreshKey, refresh } = useData();

  const [data, setData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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
      if (canApply()) {
        setError(err?.message || 'Could not load the dashboard.');
      }
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

  const openTask = (task) => {
    navigation.navigate('TaskDetails', { taskId: task.id });
  };

  const openAddForm = (type) => {
    setFormType(type);
    setFormVisible(true);
  };

  const saveTask = async (payload) => {
    await createTask(payload);
    refresh();
  };

  if (!ready || (loading && !data)) {
    return <LoadingState message="Loading your dashboard…" />;
  }

  if (!data) {
    return (
      <ErrorState
        message={error || 'Could not load the dashboard.'}
        onRetry={load}
      />
    );
  }

  const todayTasks = data.todayStudyTasks ?? [];
  const upcoming = data.upcoming ?? [];
  const overdue = data.overdueAssignments ?? [];

  const focusTask =
    todayTasks.find((task) => task.status === 'pending') ?? null;

  const progress = calcCompletionProgress(todayTasks);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            colors={[ui.primary]}
            tintColor={ui.primary}
          />
        }
      >
        <View style={styles.brandHeader}>
          <Image
            source={require('../../assets/unipocket-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessible
            accessibilityLabel="UniPocket"
          />
        </View>

        <View style={styles.greeting}>
          <Text style={styles.date}>{formatDisplayDate(data.today)}</Text>
          <Text style={styles.greetingTitle}>{getGreeting()}!</Text>
          <Text style={styles.subtitle}>Here’s your study plan for today.</Text>
        </View>

        <ErrorBanner message={error} onRetry={load} />

        <DashboardBento
          focusTask={focusTask}
          pendingAssignments={data.counts?.pendingAssignments}
          upcomingExams={data.counts?.upcomingExams}
          progress={progress.percent}
          onOpenTask={openTask}
          onOpenPlanner={() => navigation.navigate('StudyPlanner')}
        />

        <View style={styles.addRow}>
          <PrimaryButton
            title="+ Assignment"
            onPress={() => openAddForm('assignment')}
            style={styles.addButton}
          />
          <PrimaryButton
            title="+ Exam"
            variant="secondary"
            onPress={() => openAddForm('exam')}
            style={styles.addButton}
          />
          <PrimaryButton
            title="+ Study Task"
            variant="secondary"
            onPress={() => openAddForm('study')}
            style={styles.addButton}
          />
        </View>

        <TaskSection
          title="Today's study tasks"
          tasks={todayTasks}
          emptyIcon="book-outline"
          emptyTitle="No study tasks today"
          emptyMessage="Add a study task to plan your next session."
          onOpenTask={openTask}
        />

        {overdue.length > 0 ? (
          <TaskSection
            title="Overdue assignments"
            tasks={overdue}
            emptyIcon="time-outline"
            emptyTitle="No overdue assignments"
            emptyMessage=""
            onOpenTask={openTask}
          />
        ) : null}

        <TaskSection
          title="Upcoming deadlines"
          tasks={upcoming}
          emptyIcon="calendar-outline"
          emptyTitle="No upcoming deadlines"
          emptyMessage="Add an assignment or exam to see it here."
          onOpenTask={openTask}
        />
      </ScrollView>

      <TaskFormModal
        visible={formVisible}
        mode="add"
        defaultType={formType}
        defaultDate={data.today}
        subjects={subjects}
        allowedTypes={ALLOWED_TYPES.dashboard}
        onSubmit={saveTask}
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
    backgroundColor: ui.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
  },
  brandHeader: {
    alignItems: 'flex-start',
  },
  logo: {
    width: 176,
    height: 52,
  },
  greeting: {
    marginTop: 12,
    marginBottom: 18,
  },
  date: {
    color: ui.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  greetingTitle: {
    color: ui.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    color: ui.muted,
    fontSize: 14,
    marginTop: 4,
  },
  addRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  addButton: {
    flexGrow: 1,
    flexBasis: 100,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    flex: 1,
    color: ui.text,
    fontSize: 18,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: ui.lavender,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  countText: {
    color: ui.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: studentCard,
});