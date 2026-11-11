import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import StatusChip from './StatusChip';
import { radii, spacing, typography } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { formatDisplayDate, formatDisplayDateTime } from '../utils/dates';
import { typeLabel } from '../utils/taskTypes';

function typeIcon(type) {
  if (type === 'exam') return 'school-outline';
  if (type === 'study') return 'book-outline';
  return 'document-text-outline';
}

export default function TaskCard({
  task,
  onPress,
  showCheckbox = false,
  onToggleComplete,
  completeDisabled = false,
}) {
  const { colors } = useAppTheme();
  const muted =
    colors.muted ?? colors.textSecondary ?? colors.textMuted ?? colors.text;
  const styles = useMemo(() => createStyles(colors, muted), [colors, muted]);

  const isCompleted = task.status === 'completed';
  const dateText =
    task.type === 'study'
      ? formatDisplayDate(task.scheduledDate)
      : formatDisplayDateTime(task.dueAt);

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.colorBar,
          { backgroundColor: task.subjectColor || colors.primary },
        ]}
      />

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <View style={styles.topRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={2}>
              {task.title}
            </Text>
            <Text style={styles.subject} numberOfLines={1}>
              {task.subjectName}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.typeRow}>
            <Ionicons name={typeIcon(task.type)} size={14} color={muted} />
            <Text style={styles.metaText}>{typeLabel(task.type)}</Text>
          </View>
          <Text style={styles.metaText} numberOfLines={1}>
            {dateText}
          </Text>
        </View>

        <View style={styles.chips}>
          <StatusChip
            label={isCompleted ? 'Completed' : 'Pending'}
            variant={isCompleted ? 'completed' : 'pending'}
          />
          {task.displayLabel === 'Overdue' && (
            <StatusChip label="Overdue" variant="overdue" />
          )}
          {task.displayLabel === 'Past exam' && (
            <StatusChip label="Past exam" variant="pastExam" />
          )}
        </View>
      </Pressable>

      {showCheckbox && (
        <Pressable
          onPress={() => onToggleComplete?.(task)}
          disabled={completeDisabled}
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityLabel={`${task.title} completion`}
          accessibilityState={{
            checked: isCompleted,
            disabled: completeDisabled,
          }}
          style={[styles.checkbox, completeDisabled && styles.checkboxDisabled]}
        >
          <Ionicons
            name={isCompleted ? 'checkbox' : 'square-outline'}
            size={26}
            color={isCompleted ? (colors.success ?? colors.primary) : muted}
          />
        </Pressable>
      )}
    </View>
  );
}

function createStyles(colors, muted) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
      overflow: 'hidden',
      minHeight: 96,
    },
    pressed: {
      opacity: 0.92,
    },
    colorBar: {
      width: 6,
    },
    body: {
      flex: 1,
      minWidth: 0,
      padding: spacing.md,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    titleBlock: {
      flex: 1,
      paddingRight: spacing.sm,
    },
    title: {
      ...typography.bodyBold,
      color: colors.text,
    },
    subject: {
      ...typography.caption,
      color: muted,
      marginTop: 2,
    },
    checkbox: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingRight: spacing.sm,
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
    },
    checkboxDisabled: {
      opacity: 0.45,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    typeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      ...typography.caption,
      color: muted,
      flexShrink: 1,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
  });
}