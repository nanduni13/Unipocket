import React, { useCallback, useRef, useState } from 'react';
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
import { useForegroundAndMidnightRefresh } from '../hooks/useForegroundAndMidnightRefresh';
import {
  deleteTask,
  getAllSubjects,
  getTaskById,
  setTaskStatus,
  updateTask,
} from '../database';
import { createRequestGate, shouldApplyLoadResult } from '../utils/asyncLoad';
import { formatDisplayDate, formatDisplayDateTime } from '../utils/dates';
import { annotateTaskLabels } from '../utils/filters';
import { ALLOWED_TYPES, typeLabel } from '../utils/taskTypes';
import { colors, radii, spacing, typography } from '../theme';

export default function TaskDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const taskId = route.params?.taskId;
  const { ready, refreshKey, refresh } = useData();

  const [task, setTask] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editVisible, setEditVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const gateRef = useRef(createRequestGate());
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!ready) return;
    const requestId = gateRef.current.next();
    if (taskId == null) {
      setError('Missing task id.');
      setTask(null);
      setLoading(false);
      return;
    }
    if (!task) setLoading(true);
    try {
      const [row, subjectRows] = await Promise.all([
        getTaskById(taskId),
        getAllSubjects(),
      ]);
      if (
        !shouldApplyLoadResult(requestId, gateRef.current.getLatest(), mountedRef.current)
      ) {
        return;
      }
      if (!row) {
        setTask(null);
        setError('This task was not found. It may have been deleted.');
      } else {
        setTask(annotateTaskLabels(row));
        setError(null);
      }
      setSubjects(subjectRows);
    } catch (err) {
      if (
        !shouldApplyLoadResult(requestId, gateRef.current.getLatest(), mountedRef.current)
      ) {
        return;
      }
      setError(err?.message || 'Failed to load task details.');
    } finally {
      if (shouldApplyLoadResult(requestId, gateRef.current.getLatest(), mountedRef.current)) {
        setLoading(false);
      }
    }
  }, [ready, taskId, task]);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      load();
      return () => {
        mountedRef.current = false;
      };
    }, [load, refreshKey]),
  );

  useForegroundAndMidnightRefresh(load);

  const onEditSave = async (payload) => {
    await updateTask(taskId, payload);
    refresh();
  };

  const onToggleStatus = async () => {
    if (!task || busy || editVisible || deleteVisible) return;
    setBusy(true);
    try {
      const next = task.status === 'completed' ? 'pending' : 'completed';
      await setTaskStatus(taskId, next);
      setError(null);
      refresh();
    } catch (err) {
      setError(err?.message || 'Could not update status.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteTask(taskId);
      setDeleteVisible(false);
      refresh();
      navigation.goBack();
    } catch (err) {
      setBusy(false);
      setDeleteVisible(false);
      setError(err?.message || 'Could not delete task.');
    }
  };

  if (!ready || (loading && !task)) return <LoadingState message="Loading task…" />;

  if (!task) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.missingWrap}>
          <ErrorState message={error || 'Task not found.'} />
          <PrimaryButton
            title="Go back"
            onPress={() => navigation.goBack()}
            style={styles.missingBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  const whenLabel =
    task.type === 'study'
      ? formatDisplayDate(task.scheduledDate)
      : formatDisplayDateTime(task.dueAt);

  const actionsLocked = busy || editVisible || deleteVisible;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.colorBar, { backgroundColor: task.subjectColor }]} />
        <Text style={styles.title}>{task.title}</Text>

        <View style={styles.chips}>
          <StatusChip label={typeLabel(task.type)} variant="type" />
          <StatusChip
            label={task.status === 'completed' ? 'Completed' : 'Pending'}
            variant={task.status === 'completed' ? 'completed' : 'pending'}
          />
          {task.displayLabel === 'Overdue' ? (
            <StatusChip label="Overdue" variant="overdue" />
          ) : null}
          {task.displayLabel === 'Past exam' ? (
            <StatusChip label="Past exam" variant="pastExam" />
          ) : null}
        </View>

        <DetailRow label="Subject" value={task.subjectName} />
        <DetailRow label="Type" value={typeLabel(task.type)} />
        <DetailRow
          label={task.type === 'study' ? 'Scheduled date' : 'Deadline / exam time'}
          value={whenLabel}
        />
        <DetailRow
          label="Description"
          value={task.description?.trim() ? task.description : 'No description'}
        />
        <DetailRow
          label="Status"
          value={task.status === 'completed' ? 'Completed' : 'Pending'}
        />

        <ErrorBanner message={error} onRetry={load} />

        <View style={styles.actions}>
          <PrimaryButton
            title="Edit"
            onPress={() => setEditVisible(true)}
            disabled={actionsLocked}
          />
          <PrimaryButton
            title={
              task.status === 'completed' ? 'Mark as pending' : 'Mark as completed'
            }
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
          if (!busy) setDeleteVisible(false);
        }}
        onConfirm={onDelete}
      />
    </SafeAreaView>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
    color: colors.textSecondary,
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
