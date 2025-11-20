import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  ActivityIndicator, 
  StyleSheet,
  ViewStyle,
  TextStyle
} from 'react-native';

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

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 8
  },
  button_primary: {
    backgroundColor: '#E2827F',  // Burning Sand
  },
  button_secondary: {
    backgroundColor: '#E5877E',  // Tonys Pink
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#E2827F',  // Burning Sand
  },
  button_text: {
    backgroundColor: 'transparent',
  },
  button_sm: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  button_md: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  button_lg: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  button_disabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#E5E7EB',
  },
  text: {
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  text_primary: {
    color: 'white',
  },
  text_secondary: {
    color: '#B15740',  // Brown Rust
  },
  text_outline: {
    color: '#E2827F',  // Burning Sand
  },
  text_text: {
    color: '#E2827F',  // Burning Sand
  },
  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 18,
  },
  text_disabled: {
    color: '#9CA3AF',
  },
});