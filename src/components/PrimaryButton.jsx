import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { radii, spacing, typography } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';

export default function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';
  const isDisabled = Boolean(disabled || loading);

  const labelColor = isSecondary
    ? colors.text
    : isDanger
      ? colors.onDanger ?? colors.onError ?? colors.white ?? '#FFFFFF'
      : colors.onPrimary ?? colors.white ?? '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isSecondary && styles.secondary,
        isDanger && styles.danger,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={[styles.text, { color: labelColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    base: {
      backgroundColor: colors.primary,
      minHeight: 48,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    secondary: {
      backgroundColor: colors.primarySoft ?? colors.lavender ?? colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    danger: {
      backgroundColor: colors.danger ?? colors.error ?? '#B42336',
    },
    disabled: {
      opacity: 0.55,
    },
    pressed: {
      opacity: 0.85,
    },
    text: {
      ...typography.bodyBold,
      textAlign: 'center',
    },
  });
}