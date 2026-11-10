import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { studentUi as ui } from '../theme/studentUi';

export default function DashboardBento({
  focusTask,
  pendingAssignments,
  upcomingExams,
  progress,
  onOpenTask,
  onOpenPlanner,
}) {
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
          <Ionicons name="book-outline" size={34} color={ui.primary} />
        </View>
      </Pressable>

      <View style={styles.row}>
        <Metric
          icon="clipboard-outline"
          label="Pending assignments"
          value={pendingAssignments}
          backgroundColor={ui.mint}
        />
        <Metric
          icon="calendar-outline"
          label="Upcoming exams"
          value={upcomingExams}
          backgroundColor={ui.peach}
        />
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeading}>
          <Text style={styles.label}>Today’s study progress</Text>
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

function Metric({ icon, label, value, backgroundColor }) {
  return (
    <View style={[styles.metric, { backgroundColor }]}>
      <Ionicons name={icon} size={21} color={ui.text} />
      <Text style={styles.number}>{value ?? 0}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12, marginBottom: 16 },
  focus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    borderRadius: ui.radius,
    backgroundColor: ui.primary,
    elevation: 2,
  },
  pressed: { opacity: 0.85 },
  focusCopy: { flex: 1, minWidth: 0 },
  focusLabel: {
    color: '#F0E5FF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  focusTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 7,
  },
  focusHint: {
    color: '#F0E5FF',
    fontSize: 13,
    marginTop: 10,
  },
  illustration: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: ui.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: 12 },
  metric: { flex: 1, padding: 14, borderRadius: ui.radius },
  number: {
    color: ui.text,
    fontSize: 26,
    fontWeight: '800',
    marginVertical: 4,
  },
  label: { color: ui.text, fontSize: 13, fontWeight: '600' },
  progressCard: {
    padding: 16,
    borderRadius: ui.radius,
    backgroundColor: ui.lavender,
  },
  progressHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  percent: { color: ui.primary, fontSize: 17, fontWeight: '800' },
  track: {
    height: 9,
    borderRadius: 8,
    backgroundColor: '#D8C8F3',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: ui.primary,
  },
});