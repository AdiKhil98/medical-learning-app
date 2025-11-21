import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle
} from 'react-native';
import { SPACING, BORDER_RADIUS, BORDER_WIDTH, TYPOGRAPHY } from '@/constants/tokens';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

// FIX: Wrap in React.memo to prevent unnecessary re-renders
export default React.memo(function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon
}: ButtonProps) {
  // FIX: Memoize style arrays to prevent recreation on every render
  const buttonStyles = React.useMemo(() => [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.button_disabled,
    style
  ], [variant, size, disabled, style]);

  const textStyles = React.useMemo(() => [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    disabled && styles.text_disabled,
    textStyle
  ], [variant, size, disabled, textStyle]);

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? 'white' : '#E2827F'}
          size="small"
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
});

// FIX: Use design tokens and medical colors instead of hardcoded values
const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  button_primary: {
    backgroundColor: MEDICAL_COLORS.primary,
  },
  button_secondary: {
    backgroundColor: MEDICAL_COLORS.secondary,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: BORDER_WIDTH.medium,
    borderColor: MEDICAL_COLORS.primary,
  },
  button_text: {
    backgroundColor: 'transparent',
  },
  button_sm: {
    paddingVertical: SPACING.xs + 2, // 6px
    paddingHorizontal: SPACING.md,
  },
  button_md: {
    paddingVertical: SPACING.sm + 2, // 10px
    paddingHorizontal: SPACING.lg,
  },
  button_lg: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
  },
  button_disabled: {
    backgroundColor: MEDICAL_COLORS.lightGray,
    borderColor: MEDICAL_COLORS.lightGray,
  },
  text: {
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  text_primary: {
    color: MEDICAL_COLORS.white,
  },
  text_secondary: {
    color: MEDICAL_COLORS.brownRust,
  },
  text_outline: {
    color: MEDICAL_COLORS.primary,
  },
  text_text: {
    color: MEDICAL_COLORS.primary,
  },
  text_sm: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  text_md: {
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  text_lg: {
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
  text_disabled: {
    color: MEDICAL_COLORS.textDisabled,
  },
});