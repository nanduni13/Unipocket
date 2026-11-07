import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';

import FormField from './FormField';
import FormModalScaffold from './FormModalScaffold';
import PrimaryButton from './PrimaryButton';

import {
  getLocalDateString,
  getLocalDateTimeString,
  parseLocalDateTime,
} from '../utils/dates';
import {
  ALL_TASK_TYPES,
  buildTaskSavePayload,
  typeLabel,
} from '../utils/taskTypes';
import { validateTaskForm } from '../utils/validation';
import { colors, radii, spacing, typography } from '../theme';

function validDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function buildInitial(initialValues, defaultType, defaultDate, allowedTypes) {
  const requested = initialValues?.type || defaultType || 'assignment';

  const type = allowedTypes.includes(requested)
    ? requested
    : allowedTypes[0];

  const dueDate =
    parseLocalDateTime(initialValues?.dueAt) ||
    parseLocalDateTime(`${defaultDate}T09:00:00`) ||
    new Date();

  const scheduledDate =
    parseLocalDateTime(initialValues?.scheduledDate) ||
    parseLocalDateTime(defaultDate) ||
    new Date();

  return {
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    subjectId: initialValues?.subjectId
      ? String(initialValues.subjectId)
      : '',
    type,
    dueDate,
    scheduledDate,
  };
}

function formSnapshot(form) {
  return {
    title: form.title,
    description: form.description,
    subjectId: form.subjectId,
    type: form.type,
    dueKey: getLocalDateTimeString(form.dueDate),
    scheduledKey: getLocalDateString(form.scheduledDate),
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

  const savingRef = useRef(false);
  const aliveRef = useRef(true);
  const visibleRef = useRef(visible);
  const androidPickerRef = useRef(null);
  const sessionRef = useRef(0);
  const wasVisibleRef = useRef(false);
  const editingIdRef = useRef(null);

  visibleRef.current = visible;

  const closePickers = () => {
    setPickerMode(null);

    if (Platform.OS === 'android' && androidPickerRef.current) {
      const nativeMode = androidPickerRef.current;
      androidPickerRef.current = null;

      try {
        Promise.resolve(
          DateTimePickerAndroid.dismiss(nativeMode),
        ).catch(() => {});
      } catch {
        // The native dialog may already have closed.
      }
    }
  };

  useEffect(() => {
    aliveRef.current = true;

    return () => {
      aliveRef.current = false;
      sessionRef.current += 1;

      if (Platform.OS === 'android' && androidPickerRef.current) {
        const nativeMode = androidPickerRef.current;
        androidPickerRef.current = null;

        try {
          Promise.resolve(
            DateTimePickerAndroid.dismiss(nativeMode),
          ).catch(() => {});
        } catch {
          // No active native dialog to dismiss.
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;
      editingIdRef.current = null;
      sessionRef.current += 1;
      closePickers();
      return;
    }

    const editingId =
      mode === 'edit' ? initialValues?.id ?? null : null;

    const opening = !wasVisibleRef.current;
    const differentTask =
      mode === 'edit' && editingIdRef.current !== editingId;

    // Do not reset user input when parent data refreshes.
    if (opening || differentTask) {
      sessionRef.current += 1;
      closePickers();

      const next = buildInitial(
        initialValues,
        defaultType,
        today,
        allowedTypes,
      );

      setForm(next);
      setBaseline(formSnapshot(next));
      setErrors({});
      setSaving(false);
      savingRef.current = false;
    }

    wasVisibleRef.current = true;
    editingIdRef.current = editingId;
  }, [
    visible,
    mode,
    initialValues,
    defaultType,
    today,
    allowedTypes,
  ]);

  const isDirty = useMemo(() => {
    if (!baseline) return false;

    const current = formSnapshot(form);

    return Object.keys(baseline).some(
      (key) => current[key] !== baseline[key],
    );
  }, [form, baseline]);

  const finishClose = () => {
    sessionRef.current += 1;
    closePickers();
    onClose();
  };

  const requestClose = () => {
    if (savingRef.current) return;

    if (isDirty) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes.',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: finishClose,
          },
        ],
      );
      return;
    }

    finishClose();
  };

  const requestCreateSubject = () => {
    if (savingRef.current || !onCreateSubject) return;

    const proceed = () => {
      sessionRef.current += 1;
      closePickers();
      onCreateSubject();
    };

    if (isDirty) {
      Alert.alert(
        'Leave this form?',
        'Your unsaved task changes will be discarded.',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Continue',
            onPress: proceed,
          },
        ],
      );
      return;
    }

    proceed();
  };

  const changeType = (type) => {
    if (
      savingRef.current ||
      lockType ||
      !allowedTypes.includes(type)
    ) {
      return;
    }

    closePickers();
    setForm((current) => ({ ...current, type }));

    setErrors((current) => {
      const next = { ...current };
      delete next.type;
      delete next.dueAt;
      delete next.scheduledDate;
      delete next.picker;
      return next;
    });
  };

  const applyPickerValue = (target, selected) => {
    if (!validDate(selected)) return;

    setForm((current) => {
      if (target === 'scheduled') {
        return {
          ...current,
          scheduledDate: new Date(
            selected.getFullYear(),
            selected.getMonth(),
            selected.getDate(),
          ),
        };
      }

      const next = new Date(current.dueDate);

      if (target === 'dueDate') {
        next.setFullYear(
          selected.getFullYear(),
          selected.getMonth(),
          selected.getDate(),
        );
      } else if (target === 'dueTime') {
        next.setHours(
          selected.getHours(),
          selected.getMinutes(),
          0,
          0,
        );
      } else {
        return current;
      }

      return { ...current, dueDate: next };
    });

    setErrors((current) => {
      const next = { ...current };
      delete next.dueAt;
      delete next.scheduledDate;
      delete next.picker;
      return next;
    });
  };

  const openPicker = (target) => {
    if (!visibleRef.current || savingRef.current) return;

    Keyboard.dismiss();

    const value =
      target === 'scheduled'
        ? form.scheduledDate
        : form.dueDate;

    if (!validDate(value)) {
      setErrors((current) => ({
        ...current,
        picker: 'Invalid date. Close this form and open it again.',
      }));
      return;
    }

    if (Platform.OS === 'ios') {
      setPickerMode(target);
      return;
    }

    if (Platform.OS !== 'android') {
      Alert.alert(
        'Date picker',
        'Please use the Android or iOS app to select a date and time.',
      );
      return;
    }

    if (androidPickerRef.current) return;

    const nativeMode = target === 'dueTime' ? 'time' : 'date';
    const currentSession = sessionRef.current;

    androidPickerRef.current = nativeMode;

    try {
      DateTimePickerAndroid.open({
        value: new Date(value.getTime()),
        mode: nativeMode,
        display: 'default',
        is24Hour: true,
        onChange: (event, selected) => {
          if (
            !aliveRef.current ||
            !visibleRef.current ||
            currentSession !== sessionRef.current
          ) {
            return;
          }

          androidPickerRef.current = null;

          // Android Back/Cancel must leave the form unchanged.
          if (event.type !== 'set' || !selected) return;

          applyPickerValue(target, selected);
        },
      });
    } catch (error) {
      androidPickerRef.current = null;

      const message =
        error?.message || 'Could not open the date/time picker.';

      setErrors((current) => ({
        ...current,
        picker: message,
      }));

      Alert.alert('Could not open picker', message);
    }
  };

  const onIOSPickerChange = (event, selected) => {
    if (event.type === 'dismissed' || !selected) return;
    applyPickerValue(pickerMode, selected);
  };

  const handleSave = async () => {
    if (savingRef.current) return;

    if (
      !validDate(form.dueDate) ||
      !validDate(form.scheduledDate)
    ) {
      setErrors({
        form: 'Please select a valid date and time.',
      });
      return;
    }

    const built = buildTaskSavePayload(
      {
        title: form.title,
        description: form.description,
        subjectId: form.subjectId
          ? Number(form.subjectId)
          : null,
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

    const {
      errors: nextErrors,
      isValid,
      values,
    } = validateTaskForm(built.payload, { allowedTypes });

    if (
      !subjects.some(
        (subject) =>
          Number(subject.id) === Number(built.payload.subjectId),
      )
    ) {
      setErrors({
        ...nextErrors,
        subjectId: 'Please select an existing subject.',
      });
      return;
    }

    setErrors(nextErrors);
    if (!isValid) return;

    savingRef.current = true;
    setSaving(true);
    closePickers();

    const currentSession = sessionRef.current;

    try {
      await onSubmit({
        ...values,
        dueAt: built.payload.dueAt,
        scheduledDate: built.payload.scheduledDate,
        subjectId: built.payload.subjectId,
        type: built.payload.type,
        status: built.payload.status,
      });

      if (
        aliveRef.current &&
        visibleRef.current &&
        currentSession === sessionRef.current
      ) {
        finishClose();
      }
    } catch (error) {
      if (
        aliveRef.current &&
        visibleRef.current &&
        currentSession === sessionRef.current
      ) {
        setErrors((current) => ({
          ...current,
          form: error?.message || 'Could not save task.',
        }));
      }
    } finally {
      if (
        aliveRef.current &&
        currentSession === sessionRef.current
      ) {
        savingRef.current = false;
        setSaving(false);
      }
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

  const timeLabel =
    `${String(form.dueDate.getHours()).padStart(2, '0')}:` +
    String(form.dueDate.getMinutes()).padStart(2, '0');

  return (
    <FormModalScaffold
      visible={visible}
      title={heading}
      onRequestClose={requestClose}
      footer={
        <PrimaryButton
          title={mode === 'edit' ? 'Save Changes' : 'Save Task'}
          onPress={handleSave}
          loading={saving}
          disabled={saving || subjects.length === 0}
        />
      }
    >
      <FormField
        label="Title *"
        value={form.title}
        onChangeText={(title) =>
          setForm((current) => ({ ...current, title }))
        }
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
              onPress={requestCreateSubject}
              disabled={saving}
              style={styles.emptyBtn}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.chips}>
          {subjects.map((subject) => {
            const selected =
              String(subject.id) === String(form.subjectId);

            return (
              <Pressable
                key={subject.id}
                disabled={saving}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: saving }}
                onPress={() =>
                  setForm((current) => ({
                    ...current,
                    subjectId: String(subject.id),
                  }))
                }
                style={[
                  styles.chip,
                  selected && styles.chipSelected,
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: subject.color },
                  ]}
                />

                <Text
                  style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
                  ]}
                  numberOfLines={2}
                >
                  {subject.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {errors.subjectId ? (
        <Text style={styles.error}>{errors.subjectId}</Text>
      ) : null}

      <Text style={styles.label}>Type *</Text>

      {lockType ? (
        <Text style={styles.lockHint}>
          Type is locked to {typeLabel(form.type)} for this screen.
        </Text>
      ) : mode === 'edit' ? (
        <Text style={styles.lockHint}>
          Changing type moves this task to the matching screen and
          clears the unused date field.
        </Text>
      ) : null}

      <View style={styles.typeRow}>
        {allowedTypes.map((type) => {
          const selected = form.type === type;
          const disabled = saving || (lockType && !selected);

          return (
            <Pressable
              key={type}
              onPress={() => changeType(type)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              style={[
                styles.typeChip,
                selected && styles.typeSelected,
                disabled && styles.typeDisabled,
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  selected && styles.typeTextSelected,
                ]}
              >
                {typeLabel(type)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {errors.type ? (
        <Text style={styles.error}>{errors.type}</Text>
      ) : null}

      {form.type === 'study' ? (
        <View style={styles.block}>
          <Text style={styles.label}>Scheduled date *</Text>

          <Pressable
            style={styles.dateBtn}
            onPress={() => openPicker('scheduled')}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Choose scheduled date"
          >
            <Text style={styles.dateCaption}>SELECT DATE</Text>
            <Text style={styles.dateText}>
              {getLocalDateString(form.scheduledDate)}
            </Text>
          </Pressable>

          {errors.scheduledDate ? (
            <Text style={styles.error}>
              {errors.scheduledDate}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.block}>
          <Text style={styles.label}>
            {form.type === 'exam' ? 'Exam date and time *' : 'Deadline *'}
          </Text>

          <View style={styles.dateRow}>
            <Pressable
              style={[styles.dateBtn, styles.dateColumn]}
              onPress={() => openPicker('dueDate')}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Choose date"
            >
              <Text style={styles.dateCaption}>DATE</Text>
              <Text style={styles.dateText}>
                {getLocalDateString(form.dueDate)}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.dateBtn, styles.dateColumn]}
              onPress={() => openPicker('dueTime')}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Choose time"
            >
              <Text style={styles.dateCaption}>TIME</Text>
              <Text style={styles.dateText}>{timeLabel}</Text>
            </Pressable>
          </View>

          <Text style={styles.dateHint}>
            Tap the date or time to change it.
          </Text>

          {errors.dueAt ? (
            <Text style={styles.error}>{errors.dueAt}</Text>
          ) : null}
        </View>
      )}

      {errors.picker ? (
        <Text style={styles.error}>{errors.picker}</Text>
      ) : null}

      {Platform.OS === 'ios' && pickerMode ? (
        <View style={styles.iosPicker}>
          <DateTimePicker
            value={
              pickerMode === 'scheduled'
                ? form.scheduledDate
                : form.dueDate
            }
            mode={pickerMode === 'dueTime' ? 'time' : 'date'}
            display="spinner"
            onChange={onIOSPickerChange}
          />

          <PrimaryButton
            title="Done"
            variant="secondary"
            onPress={() => setPickerMode(null)}
          />
        </View>
      ) : null}

      <FormField
        label="Description (optional)"
        value={form.description}
        onChangeText={(description) =>
          setForm((current) => ({
            ...current,
            description,
          }))
        }
        placeholder="Notes, requirements, room…"
        multiline
      />

      {errors.form ? (
        <Text style={styles.error}>{errors.form}</Text>
      ) : null}
    </FormModalScaffold>
  );
}

const styles = StyleSheet.create({
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
    minHeight: 44,
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
    paddingVertical: spacing.sm,
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
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dateColumn: {
    flexGrow: 1,
    flexBasis: 130,
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    minHeight: 70,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateCaption: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  dateText: {
    ...typography.body,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  dateHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  iosPicker: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
});