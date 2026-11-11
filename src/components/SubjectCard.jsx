import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radii, spacing, typography } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';

export default function SubjectCard({ subject, onEdit, onDelete }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const taskCount = Number(subject.taskCount) || 0;
  const danger = colors.danger ?? colors.error ?? colors.text;

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.swatch,
          { backgroundColor: subject.color || colors.primary },
        ]}
      />

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {subject.name}
        </Text>

        {subject.code ? (
          <Text style={styles.code} numberOfLines={1}>
            {subject.code}
          </Text>
        ) : (
          <Text style={[styles.code, styles.codeMuted]}>
            No subject code
          </Text>
        )}

        <Text style={styles.count}>
          {taskCount} linked {taskCount === 1 ? 'task' : 'tasks'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${subject.name}`}
        >
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </Pressable>

        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${subject.name}`}
        >
          <Ionicons name="trash-outline" size={22} color={danger} />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors) {
  const muted =
    colors.muted ?? colors.textSecondary ?? colors.textMuted ?? colors.text;

  return StyleSheet.create({
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
      minWidth: 0,
      paddingRight: spacing.sm,
    },
    name: {
      ...typography.bodyBold,
      color: colors.text,
    },
    code: {
      ...typography.caption,
      color: muted,
      marginTop: 2,
    },
    codeMuted: {
      fontStyle: 'italic',
    },
    count: {
      ...typography.small,
      color: colors.text,
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
}