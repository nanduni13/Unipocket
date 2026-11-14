import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

import FormField from './FormField';
import FormModalScaffold from './FormModalScaffold';
import PrimaryButton from './PrimaryButton';
import { useAppTheme } from '../theme/ThemeContext';

const PROFILE_KEY = 'unipocket.studentProfile.v1';

const EMPTY_PROFILE = {
  name: '',
  university: '',
  degree: '',
  yearSemester: '',
};

export async function loadStudentProfile() {
  const saved = await Storage.getItem(PROFILE_KEY);
  return saved ? JSON.parse(saved) : null;
}

export default function ProfileModal({
  visible,
  profile,
  onClose,
  onSaved,
}) {
  const { colors } = useAppTheme();
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [nameError, setNameError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;

    setForm({ ...EMPTY_PROFILE, ...profile });
    setNameError('');
    setSaveError('');
  }, [visible, profile]);

  const isDirty = Object.keys(EMPTY_PROFILE).some(
    (field) => form[field] !== (profile?.[field] ?? ''),
  );

  const changeField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaveError('');

    if (field === 'name') {
      setNameError('');
    }
  };

  const requestClose = () => {
    if (savingRef.current) return;

    if (!isDirty) {
      onClose();
      return;
    }

    Alert.alert('Discard changes?', 'You have unsaved profile changes.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onClose },
    ]);
  };

  const handleSave = async () => {
    if (savingRef.current) return;

    const nextProfile = {
      name: form.name.trim(),
      university: form.university.trim(),
      degree: form.degree.trim(),
      yearSemester: form.yearSemester.trim(),
    };

    if (!nextProfile.name) {
      setNameError('Please enter your name.');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setSaveError('');

    try {
      await Storage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
      onSaved(nextProfile);
      onClose();
    } catch {
      setSaveError('Could not save your profile. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <FormModalScaffold
      visible={visible}
      title="Student Profile"
      onRequestClose={requestClose}
      footer={
        <PrimaryButton
          title="Save Profile"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
        />
      }
    >
      <FormField
        label="Name *"
        value={form.name}
        onChangeText={(value) => changeField('name', value)}
        placeholder="Enter your name"
        error={nameError}
        autoCapitalize="words"
        maxLength={60}
        editable={!saving}
      />

      <FormField
        label="University (optional)"
        value={form.university}
        onChangeText={(value) => changeField('university', value)}
        placeholder="e.g. University of Vavuniya"
        maxLength={100}
        editable={!saving}
      />

      <FormField
        label="Degree (optional)"
        value={form.degree}
        onChangeText={(value) => changeField('degree', value)}
        placeholder="e.g. BSc in IT"
        maxLength={100}
        editable={!saving}
      />

      <FormField
        label="Year / Semester (optional)"
        value={form.yearSemester}
        onChangeText={(value) => changeField('yearSemester', value)}
        placeholder="e.g. Year 3, Semester 1"
        maxLength={50}
        editable={!saving}
      />

      {saveError ? (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.danger ?? colors.error ?? colors.text }}
        >
          {saveError}
        </Text>
      ) : null}
    </FormModalScaffold>
  );
}