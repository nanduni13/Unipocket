import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import FormField from './FormField';
import FormModalScaffold from './FormModalScaffold';
import PrimaryButton from './PrimaryButton';
import {
  getLocalDateString,
  getLocalDateTimeString,
  parseLocalDateTime,
} from '../utils/dates';
import { interpretDatePickerEvent } from '../utils/pickerEvents';
import { ALL_TASK_TYPES, buildTaskSavePayload, typeLabel } from '../utils/taskTypes';
import { validateTaskForm } from '../utils/validation';
import { colors, radii, spacing, typography } from '../theme';

function buildInitial(initialValues, defaultType, defaultDate, allowedTypes) {
  const requested = initialValues?.type || defaultType || 'assignment';
  const type = allowedTypes.includes(requested) ? requested : allowedTypes[0];
  const dueDate =
    parseLocalDateTime(initialValues?.dueAt) ||
    parseLocalDateTime(`${defaultDate}T09:00:00`) ||
    new Date();
  const scheduled =
    parseLocalDateTime(initialValues?.scheduledDate) ||
    parseLocalDateTime(defaultDate) ||
    new Date();

  return {
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    subjectId: initialValues?.subjectId ? String(initialValues.subjectId) : '',
    type,
    dueDate,
    scheduledDate: scheduled,
  };
}

export default function TaskFormModal({
  visible,
  mode = 'add',
  defaultType = 'assignment',
  defaultDate,
  initialValues,
  subjects = [],
  allowedTypes = ALL_TASK_TYPES,
  lockType = false,
  onSubmit,
  onClose,
  onCreateSubject,
}) {
  const today = defaultDate || getLocalDateString();
  const [form, setForm] = useState(() =>
    buildInitial(initialValues, defaultType, today, allowedTypes),
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState(null);
  const [pickerMode, setPickerMode] = useState(null);
  const pickerTimerRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      if (pickerTimerRef.current) {
        clearTimeout(pickerTimerRef.current);
        pickerTimerRef.current = null;
      }
      setPickerMode(null);
      return undefined;
    }
    const next = buildInitial(initialValues, defaultType, today, allowedTypes);
    setForm(next);
    setBaseline({
      title: next.title,
      description: next.description,
      subjectId: next.subjectId,
      type: next.type,
      dueKey: getLocalDateTimeString(next.dueDate),
      scheduledKey: getLocalDateString(next.scheduledDate),
    });
    setErrors({});
    setSaving(false);
    setPickerMode(null);
    return () => {
      if (pickerTimerRef.current) {
        clearTimeout(pickerTimerRef.current);
        pickerTimerRef.current = null;
      }
    };
  }, [visible, initialValues, defaultType, today, allowedTypes]);

  const isDirty = useMemo(() => {
    if (!baseline) return false;
    return (
      form.title !== baseline.title ||
      form.description !== baseline.description ||
      form.subjectId !== baseline.subjectId ||
      form.type !== baseline.type ||
      getLocalDateTimeString(form.dueDate) !== baseline.dueKey ||
      getLocalDateString(form.scheduledDate) !== baseline.scheduledKey
    );
  }, [form, baseline]);

  const requestClose = () => {
    if (saving) return;
    if (isDirty) {
      Alert.alert('Discard changes?', 'You have unsaved changes.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onClose },
      ]);
      return;
    }
    onClose();
  };

  const changeType = (type) => {
    if (lockType || !allowedTypes.includes(type)) return;
    setForm((f) => ({ ...f, type }));
    setErrors((e) => {
      const next = { ...e };
      delete next.dueAt;
      delete next.scheduledDate;
      delete next.type;
      return next;
    });
  };

  const handleSave = async () => {
    const built = buildTaskSavePayload(
      {
        title: form.title,
        description: form.description,
        subjectId: form.subjectId ? Number(form.subjectId) : null,
        type: form.type,
        dueAt: getLocalDateTimeString(form.dueDate),
        scheduledDate: getLocalDateString(form.scheduledDate),
        status: initialValues?.status || 'pending',
      },
      { allowedTypes },
    );

    if (!built.ok) {
      setErrors({ type: built.error });
      return;
    }

    const { errors: nextErrors, isValid, values } = validateTaskForm(
      built.payload,
      { allowedTypes },
    );
    setErrors(nextErrors);
    if (!isValid || saving) return;

    setSaving(true);
    try {
      await onSubmit({
        ...values,
        dueAt: built.payload.dueAt,
        scheduledDate: built.payload.scheduledDate,
        subjectId: built.payload.subjectId,
        type: built.payload.type,
        status: built.payload.status,
      });
      onClose();
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        form: error?.message || 'Could not save task.',
      }));
    } finally {
      setSaving(false);
    }
  };

  const onPickerChange = (event, selected) => {
    const result = interpretDatePickerEvent(event, selected, Platform.OS);
    if (Platform.OS === 'android') {
      setPickerMode(null);
    }
    if (result.action !== 'set') {
      return;
    }

    if (pickerMode === 'dueDate') {
      setForm((f) => {
        const next = new Date(f.dueDate);
        next.setFullYear(
          result.date.getFullYear(),
          result.date.getMonth(),
          result.date.getDate(),
        );
        return { ...f, dueDate: next };
      });
    } else if (pickerMode === 'dueTime') {
      setForm((f) => {
        const next = new Date(f.dueDate);
        next.setHours(result.date.getHours(), result.date.getMinutes(), 0, 0);
        return { ...f, dueDate: next };
      });
    } else if (pickerMode === 'scheduled') {
      setForm((f) => ({ ...f, scheduledDate: result.date }));
    }
  };

  const heading =
    mode === 'edit'
      ? 'Edit Task'
      : defaultType === 'exam'
        ? 'Add Exam'
        : defaultType === 'study'
          ? 'Add Study Task'
          : 'Add Assignment';

  const typeLocked = lockType || allowedTypes.length === 1;

  return (
    <FormModalScaffold
      visible={visible}
      title={heading}
      onRequestClose={requestClose}
      footer={
        <PrimaryButton
          title="Save"
          onPress={handleSave}
          loading={saving}
          disabled={saving || subjects.length === 0}
        />
      }
    >
      <FormField
        label="Title *"
        value={form.title}
        onChangeText={(title) => setForm((f) => ({ ...f, title }))}
        error={errors.title}
        placeholder="Enter a clear task title"
      />

      <Text style={styles.label}>Subject *</Text>
      {subjects.length === 0 ? (
        <View style={styles.emptySubjects}>
          <Text style={styles.emptyText}>
            Add a subject first. Tasks must be linked to an existing subject.
          </Text>
          {onCreateSubject ? (
            <PrimaryButton
              title="Create a subject"
              onPress={onCreateSubject}
              style={styles.emptyBtn}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.chips}>
          {subjects.map((s) => {
            const selected = String(s.id) === String(form.subjectId);
            return (
              <Pressable
                key={s.id}
                onPress={() => setForm((f) => ({ ...f, subjectId: String(s.id) }))}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <View style={[styles.dot, { backgroundColor: s.color }]} />
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                  numberOfLines={2}
                >
                  {s.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {errors.subjectId ? <Text style={styles.error}>{errors.subjectId}</Text> : null}

      <Text style={styles.label}>Type *</Text>
      {lockType ? (
        <Text style={styles.lockHint}>
          Type is locked to {typeLabel(form.type)} for this screen.
        </Text>
      ) : mode === 'edit' ? (
        <Text style={styles.lockHint}>
          Changing type moves this task to the matching screen and clears the unused date field.
        </Text>
      ) : null}
      <View style={styles.typeRow}>
        {allowedTypes.map((type) => {
          const selected = form.type === type;
          const disabled = lockType && !selected;
          return (
            <Pressable
              key={type}
              onPress={() => changeType(type)}
              disabled={disabled}
              style={[
                styles.typeChip,
                selected && styles.typeSelected,
                disabled && styles.typeDisabled,
              ]}
            >
              <Text
                style={[styles.typeText, selected && styles.typeTextSelected]}
                numberOfLines={1}
              >
                {typeLabel(type)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {errors.type ? <Text style={styles.error}>{errors.type}</Text> : null}

      {form.type === 'study' ? (
        <View style={styles.block}>
          <Text style={styles.label}>Scheduled date *</Text>
          <Pressable style={styles.dateBtn} onPress={() => setPickerMode('scheduled')}>
            <Text style={styles.dateText}>{getLocalDateString(form.scheduledDate)}</Text>
          </Pressable>
          {errors.scheduledDate ? (
            <Text style={styles.error}>{errors.scheduledDate}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.block}>
          <Text style={styles.label}>Date and time *</Text>
          <View style={styles.dateRow}>
            <Pressable
              style={[styles.dateBtn, styles.flex]}
              onPress={() => setPickerMode('dueDate')}
            >
              <Text style={styles.dateText}>{getLocalDateString(form.dueDate)}</Text>
            </Pressable>
            <Pressable
              style={[styles.dateBtn, styles.flex]}
              onPress={() => setPickerMode('dueTime')}
            >
              <Text style={styles.dateText}>
                {String(form.dueDate.getHours()).padStart(2, '0')}:
                {String(form.dueDate.getMinutes()).padStart(2, '0')}
              </Text>
            </Pressable>
          </View>
          {errors.dueAt ? <Text style={styles.error}>{errors.dueAt}</Text> : null}
        </View>
      )}

      <FormField
        label="Description (optional)"
        value={form.description}
        onChangeText={(description) => setForm((f) => ({ ...f, description }))}
        placeholder="Notes, requirements, room…"
        multiline
      />

      {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}

      {pickerMode ? (
        <DateTimePicker
          value={
            pickerMode === 'scheduled'
              ? form.scheduledDate
              : form.dueDate
          }
          mode={pickerMode === 'dueTime' ? 'time' : 'date'}
          display="default"
          onChange={onPickerChange}
        />
      ) : null}
    </FormModalScaffold>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: '100%',
    flexShrink: 1,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  chipText: {
    ...typography.caption,
    color: colors.text,
    flexShrink: 1,
    maxWidth: 240,
  },
  chipTextSelected: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  emptySubjects: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyBtn: {
    alignSelf: 'flex-start',
  },
  lockHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeChip: {
    flexGrow: 1,
    minWidth: 96,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
  },
  typeSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeDisabled: {
    opacity: 0.55,
  },
  typeText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  typeTextSelected: {
    color: colors.white,
  },
  block: {
    marginBottom: spacing.lg,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  dateText: {
    ...typography.body,
    color: colors.text,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
});
