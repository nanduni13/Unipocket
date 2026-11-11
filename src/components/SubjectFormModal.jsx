import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import FormField from './FormField';
import FormModalScaffold from './FormModalScaffold';
import PrimaryButton from './PrimaryButton';
import { spacing, subjectColorOptions, typography } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { validateSubjectForm } from '../utils/validation';

const emptyForm = {
  name: '',
  code: '',
  color: subjectColorOptions[0],
};

export default function SubjectFormModal({
  visible,
  mode = 'add',
  initialValues,
  existingSubjects = [],
  onSubmit,
  onClose,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState(emptyForm);

  useEffect(() => {
    if (!visible) return;

    const next = {
      name: initialValues?.name || '',
      code: initialValues?.code || '',
      color: initialValues?.color || subjectColorOptions[0],
    };

    setForm(next);
    setBaseline(next);
    setErrors({});
    setSaving(false);
  }, [visible, initialValues]);

  const isDirty =
    form.name !== baseline.name ||
    form.code !== baseline.code ||
    form.color !== baseline.color;

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

  const handleSave = async () => {
    if (saving) return;

    const { errors: nextErrors, isValid, values } = validateSubjectForm(
      form,
      existingSubjects,
      mode === 'edit' ? initialValues?.id : null,
    );

    setErrors(nextErrors);
    if (!isValid) return;

    setSaving(true);

    try {
      await onSubmit({
        name: values.name,
        code: form.code,
        color: form.color,
      });
      onClose();
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        form: error?.message || 'Could not save subject.',
      }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModalScaffold
      visible={visible}
      title={mode === 'edit' ? 'Edit Subject' : 'Add Subject'}
      onRequestClose={requestClose}
      footer={
        <PrimaryButton
          title="Save"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
        />
      }
    >
      <FormField
        label="Subject name *"
        value={form.name}
        onChangeText={(name) => setForm((current) => ({ ...current, name }))}
        error={errors.name}
        placeholder="e.g. Mobile Application Development"
      />

      <FormField
        label="Subject code (optional)"
        value={form.code}
        onChangeText={(code) => setForm((current) => ({ ...current, code }))}
        placeholder="Leave empty if none"
      />

      <Text style={styles.label}>Colour *</Text>

      <View style={styles.colorOptions}>
        {subjectColorOptions.map((color) => {
          const selected = form.color === color;

          return (
            <Pressable
              key={color}
              onPress={() => setForm((current) => ({ ...current, color }))}
              style={styles.colorButton}
              accessibilityRole="button"
              accessibilityLabel={`Colour ${color}`}
              accessibilityState={{ selected }}
            >
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: color },
                  selected && styles.colorSelected,
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {errors.color ? <Text style={styles.error}>{errors.color}</Text> : null}
      {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}
    </FormModalScaffold>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    label: {
      ...typography.bodyBold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    colorOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    colorButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorSelected: {
      borderColor: colors.text,
    },
    error: {
      ...typography.caption,
      color: colors.danger ?? colors.error ?? colors.text,
      marginBottom: spacing.md,
    },
  });
}