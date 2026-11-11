import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeContext';
import { studentUi } from '../theme/studentUi';

export default function DashboardBento({
  focusTask,
  pendingAssignments,
  upcomingExams,
  progress,
  onOpenTask,
  onOpenPlanner,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const percent = Math.max(0, Math.min(100, Number(progress) || 0));

  return (
    <View style={styles.grid}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (focusTask) {
            onOpenTask(focusTask);
          } else {
            onOpenPlanner();
          }
        }}
        style={({ pressed }) => [styles.focus, pressed && styles.pressed]}
      >
        <View style={styles.focusCopy}>
          <Text style={styles.focusLabel}>TODAY’S FOCUS</Text>
          <Text style={styles.focusTitle} numberOfLines={2}>
            {focusTask?.title || 'Plan your next study session'}
          </Text>
          <Text style={styles.focusHint}>
            {focusTask ? 'View task →' : 'Open study planner →'}
          </Text>
        </View>

        <View style={styles.illustration}>
          <Ionicons name="book-outline" size={34} color={colors.primary} />
        </View>
      </Pressable>

      <View style={styles.row}>
        <Metric
          icon="clipboard-outline"
          label="Pending assignments"
          value={pendingAssignments}
          accent={colors.primary}
          styles={styles}
        />
        <Metric
          icon="calendar-outline"
          label="Upcoming exams"
          value={upcomingExams}
          accent={colors.warning ?? colors.primary}
          styles={styles}
        />
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeading}>
          <Text style={[styles.label, styles.progressLabel]}>
            Today’s study progress
          </Text>
          <Text style={styles.percent}>{percent}%</Text>
        </View>

        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Today’s study progress"
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          style={styles.track}
        >
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
      </View>
    </View>
  );
}

function Metric({ icon, label, value, accent, styles }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={21} color={accent} />
      <Text style={styles.number}>{value ?? 0}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function createStyles(colors) {
  const radius = studentUi.radius;
  const muted =
    colors.muted ?? colors.textSecondary ?? colors.textMuted ?? colors.text;
  const accentSurface = colors.lavender ?? colors.surface;

  return StyleSheet.create({
    grid: {
      gap: 12,
      marginBottom: 16,
    },
    focus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 20,
      borderRadius: radius,
      backgroundColor: accentSurface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.85,
    },
    focusCopy: {
      flex: 1,
      minWidth: 0,
    },
    focusLabel: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
    },
    focusTitle: {
      color: colors.text,
      fontSize: 21,
      fontWeight: '800',
      marginTop: 7,
    },
    focusHint: {
      color: muted,
      fontSize: 13,
      marginTop: 10,
    },
    illustration: {
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    metric: {
      flex: 1,
      minWidth: 0,
      padding: 14,
      borderRadius: radius,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    number: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '800',
      marginVertical: 4,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    progressCard: {
      padding: 16,
      borderRadius: radius,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    progressHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 10,
    },
    progressLabel: {
      flex: 1,
    },
    percent: {
      color: colors.primary,
      fontSize: 17,
      fontWeight: '800',
    },
    track: {
      height: 9,
      borderRadius: 8,
      backgroundColor: colors.lavender ?? colors.border ?? colors.background,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
  });
}