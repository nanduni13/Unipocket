import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../theme';

export default function SubjectCard({ subject, onEdit, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={[styles.swatch, { backgroundColor: subject.color }]} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {subject.name}
        </Text>
        {subject.code ? (
          <Text style={styles.code} numberOfLines={1}>
            {subject.code}
          </Text>
        ) : (
          <Text style={styles.codeMuted}>No subject code</Text>
        )}
        <Text style={styles.count}>
          {Number(subject.taskCount || 0)} linked task
          {Number(subject.taskCount || 0) === 1 ? '' : 's'}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Edit subject"
        >
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </Pressable>
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Delete subject"
        >
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: spacing.md,
  },
  body: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  name: {
    ...typography.bodyBold,
    color: colors.text,
  },
  code: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  codeMuted: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  count: {
    ...typography.small,
    color: colors.primaryDark,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
