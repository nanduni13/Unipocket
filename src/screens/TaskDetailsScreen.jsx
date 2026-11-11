import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfirmDialog from '../components/ConfirmDialog';
import ErrorBanner from '../components/ErrorBanner';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import PrimaryButton from '../components/PrimaryButton';
import StatusChip from '../components/StatusChip';
import TaskFormModal from '../components/TaskFormModal';
import { useData } from '../context/DataContext';
import {
  deleteTask,
  getAllSubjects,
  getTaskById,
  setTaskStatus,
  updateTask,
} from '../database';
import { useForegroundAndMidnightRefresh } from '../hooks/useForegroundAndMidnightRefresh';
import { radii, spacing, typography } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { createRequestGate, shouldApplyLoadResult } from '../utils/asyncLoad';
import { formatDisplayDate, formatDisplayDateTime } from '../utils/dates';
import { annotateTaskLabels } from '../utils/filters';
import { ALLOWED_TYPES, typeLabel } from '../utils/taskTypes';

function DetailRow({ styles, label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function TaskDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const taskId = route.params?.taskId;
  const { ready, refreshKey, refresh } = useData();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [task, setTask] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editVisible, setEditVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const gateRef = useRef(createRequestGate());
  const activeRef = useRef(false);
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    if (!ready || !activeRef.current) return;

    const requestId = gateRef.current.next();
    const canApply = () =>
      shouldApplyLoadResult(
        requestId,
        gateRef.current.getLatest(),
        activeRef.current,
      );

    if (taskId == null) {
      setTask(null);
      setError('Missing task id.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [row, subjectRows] = await Promise.all([
        getTaskById(taskId),
        getAllSubjects(),
      ]);

      if (!canApply()) return;

      setSubjects(subjectRows);

      if (row) {
        setTask(annotateTaskLabels(row));
        setError(null);
      } else {
        setTask(null);
        setError('This task was not found. It may have been deleted.');
      }
    } catch (err) {
      if (canApply()) {
        setError(err?.message || 'Failed to load task details.');
      }
    } finally {
      if (canApply()) {
        setLoading(false);
      }
    }
  }, [ready, taskId]);

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

  const onEditSave = async (payload) => {
    await updateTask(taskId, payload);
    refresh();
  };

  const onToggleStatus = async () => {
    if (!task || busyRef.current || editVisible || deleteVisible) return;

    busyRef.current = true;
    setBusy(true);

    try {
      const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
      await setTaskStatus(taskId, nextStatus);
      await load();
      refresh();
    } catch (err) {
      setError(err?.message || 'Could not update status.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!deleteVisible || taskId == null || busyRef.current) return;

    busyRef.current = true;
    setBusy(true);

    try {
      await deleteTask(taskId);
      setDeleteVisible(false);
      refresh();
      navigation.goBack();
    } catch (err) {
      setDeleteVisible(false);
      setError(err?.message || 'Could not delete task.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (!ready || (loading && !task)) {
    return (
      <View style={styles.safe}>
        <LoadingState message="Loading task…" />
      </View>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.missingWrap}>
          <ErrorState message={error || 'Task not found.'} onRetry={load} />
          <PrimaryButton
            title="Go back"
            onPress={() => navigation.goBack()}
            style={styles.missingBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isStudy = task.type === 'study';
  const isCompleted = task.status === 'completed';
  const statusLabel = isCompleted ? 'Completed' : 'Pending';
  const taskTypeLabel = typeLabel(task.type);
  const whenLabel = isStudy
    ? formatDisplayDate(task.scheduledDate)
    : formatDisplayDateTime(task.dueAt);
  const actionsLocked = busy || editVisible || deleteVisible;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.colorBar,
            { backgroundColor: task.subjectColor || colors.primary },
          ]}
        />

        <Text style={styles.title}>{task.title}</Text>

        <View style={styles.chips}>
          <StatusChip label={taskTypeLabel} variant="type" />
          <StatusChip
            label={statusLabel}
            variant={isCompleted ? 'completed' : 'pending'}
          />
          {task.displayLabel === 'Overdue' && (
            <StatusChip label="Overdue" variant="overdue" />
          )}
          {task.displayLabel === 'Past exam' && (
            <StatusChip label="Past exam" variant="pastExam" />
          )}
        </View>

        <DetailRow styles={styles} label="Subject" value={task.subjectName} />
        <DetailRow styles={styles} label="Type" value={taskTypeLabel} />
        <DetailRow
          styles={styles}
          label={isStudy ? 'Scheduled date' : 'Deadline / exam time'}
          value={whenLabel}
        />
        <DetailRow
          styles={styles}
          label="Description"
          value={task.description?.trim() ? task.description : 'No description'}
        />
        <DetailRow styles={styles} label="Status" value={statusLabel} />

        <ErrorBanner message={error} onRetry={load} />

        <View style={styles.actions}>
          <PrimaryButton
            title="Edit"
            onPress={() => setEditVisible(true)}
            disabled={actionsLocked}
          />
          <PrimaryButton
            title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
            variant="secondary"
            onPress={onToggleStatus}
            loading={busy && !deleteVisible}
            disabled={actionsLocked}
          />
          <PrimaryButton
            title="Delete"
            variant="danger"
            onPress={() => setDeleteVisible(true)}
            disabled={actionsLocked}
          />
        </View>
      </ScrollView>

      <TaskFormModal
        visible={editVisible}
        mode="edit"
        initialValues={task}
        subjects={subjects}
        allowedTypes={ALLOWED_TYPES.details}
        onSubmit={onEditSave}
        onClose={() => setEditVisible(false)}
        onCreateSubject={() => {
          setEditVisible(false);
          navigation.navigate('MainTabs', { screen: 'Subjects' });
        }}
      />

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete task?"
        message={`Delete "${task.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={busy}
        onCancel={() => {
          if (!busyRef.current) setDeleteVisible(false);
        }}
        onConfirm={onDelete}
      />
    </SafeAreaView>
  );
}

function createStyles(colors) {
  const muted =
    colors.muted ?? colors.textSecondary ?? colors.textMuted ?? colors.text;

  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    colorBar: {
      height: 6,
      borderRadius: radii.pill,
      marginBottom: spacing.md,
    },
    title: {
      ...typography.screenTitle,
      color: colors.text,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
      marginBottom: spacing.xl,
    },
    row: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    label: {
      ...typography.small,
      color: muted,
      marginBottom: 4,
    },
    value: {
      ...typography.body,
      color: colors.text,
    },
    actions: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    missingWrap: {
      flex: 1,
    },
    missingBtn: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.xxxl,
    },
  });
}