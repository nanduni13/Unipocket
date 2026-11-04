import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

export default function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message || 'Please try again.'}</Text>
      {onRetry ? (
        <Pressable style={styles.btn} onPress={onRetry} accessibilityRole="button">
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  btnText: {
    ...typography.bodyBold,
    color: colors.white,
  },
});
