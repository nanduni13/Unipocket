import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import FormField from './FormField';
import FormModalScaffold from './FormModalScaffold';
import PrimaryButton from './PrimaryButton';
import { colors, radii, spacing, subjectColorOptions, typography } from '../theme';
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

  const isDirty = useMemo(
    () =>
      form.name !== baseline.name ||
      form.code !== baseline.code ||
      form.color !== baseline.color,
    [form, baseline],
  );

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
    const { errors: nextErrors, isValid, values } = validateSubjectForm(
      form,
      existingSubjects,
      mode === 'edit' ? initialValues?.id : null,
    );
    setErrors(nextErrors);
    if (!isValid || saving) return;

    setSaving(true);
    try {
      await onSubmit({
        name: values.name,
        code: form.code,
        color: form.color,
      });
      onClose();
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
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
        onChangeText={(name) => setForm((f) => ({ ...f, name }))}
        error={errors.name}
        placeholder="e.g. Mobile Application Development"
      />
      <FormField
        label="Subject code (optional)"
        value={form.code}
        onChangeText={(code) => setForm((f) => ({ ...f, code }))}
        placeholder="Leave empty if none"
      />

      <Text style={styles.label}>Colour *</Text>
      <View style={styles.colors}>
        {subjectColorOptions.map((color) => (
          <Pressable
            key={color}
            onPress={() => setForm((f) => ({ ...f, color }))}
            style={[
              styles.colorDot,
              { backgroundColor: color },
              form.color === color && styles.colorSelected,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Colour ${color}`}
          />
        ))}
      </View>
      {errors.color ? <Text style={styles.error}>{errors.color}</Text> : null}
      {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}
    </FormModalScaffold>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  colors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.sm,
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
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
