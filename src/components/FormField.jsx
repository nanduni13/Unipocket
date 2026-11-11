import React, { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { radii, spacing, typography } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';

export default function FormField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  multiline,
  editable = true,
  ...rest
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeholderColor =
    colors.textMuted ?? colors.muted ?? colors.textSecondary ?? colors.text;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={[
          styles.input,
          multiline && styles.multiline,
          error && styles.inputError,
          !editable && styles.disabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        multiline={multiline}
        editable={editable}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...rest}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors) {
  const muted =
    colors.textSecondary ?? colors.muted ?? colors.textMuted ?? colors.text;
  const danger = colors.danger ?? colors.error ?? colors.text;

  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.lg,
    },
    label: {
      ...typography.bodyBold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    input: {
      ...typography.body,
      color: colors.text,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      minHeight: 48,
    },
    multiline: {
      minHeight: 96,
      paddingTop: spacing.md,
    },
    inputError: {
      borderColor: danger,
    },
    disabled: {
      backgroundColor: colors.background,
      color: muted,
    },
    error: {
      ...typography.caption,
      color: danger,
      marginTop: spacing.xs,
    },
  });
}