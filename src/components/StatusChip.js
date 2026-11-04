import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

const VARIANTS = {
  pending: {
    bg: colors.chipPending,
    text: colors.chipPendingText,
  },
  completed: {
    bg: colors.chipCompleted,
    text: colors.chipCompletedText,
  },
  overdue: {
    bg: colors.chipOverdue,
    text: colors.chipOverdueText,
  },
  pastExam: {
    bg: colors.chipPastExam,
    text: colors.chipPastExamText,
  },
  type: {
    bg: colors.primarySoft,
    text: colors.primaryDark,
  },
};

export default function StatusChip({ label, variant = 'pending' }) {
  const palette = VARIANTS[variant] || VARIANTS.pending;
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.small,
  },
});
