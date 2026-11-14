import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import FormModalScaffold from './FormModalScaffold';
import PrimaryButton from './PrimaryButton';
import { useAppTheme } from '../theme/ThemeContext';

export default function ProfileViewModal({
  visible,
  profile,
  onClose,
  onEdit,
}) {
  const { colors } = useAppTheme();
  const muted = colors.muted ?? colors.textSecondary ?? colors.text;
  const name = profile?.name?.trim();

  const details = [
    { label: 'University', value: profile?.university },
    { label: 'Degree', value: profile?.degree },
    { label: 'Year / Semester', value: profile?.yearSemester },
  ].filter(({ value }) => value?.trim());

  const cardColors = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  return (
    <FormModalScaffold
      visible={visible}
      title="Student Profile"
      onRequestClose={onClose}
      footer={
        <PrimaryButton
          title={name ? 'Edit Profile' : 'Create Profile'}
          onPress={onEdit}
        />
      }
    >
      <View style={[styles.card, styles.header, cardColors]}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.lavender ?? colors.background },
          ]}
        >
          <Ionicons name="person-outline" size={32} color={colors.primary} />
        </View>

        <Text style={[styles.name, { color: colors.text }]}>
          {name || 'No profile yet'}
        </Text>
      </View>

      {name
        ? details.map(({ label, value }) => (
            <View key={label} style={[styles.card, cardColors]}>
              <Text style={[styles.label, { color: muted }]}>{label}</Text>
              <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
            </View>
          ))
        : null}
    </FormModalScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    alignItems: 'center',
    padding: 24,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
});