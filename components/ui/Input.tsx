import React from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet,
  TextInputProps,
  ViewStyle
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  containerStyle,
  leftIcon,
  rightIcon,
  ...props
}: InputProps) {
  const { colors } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      marginBottom: 6,
      color: colors.textSecondary,
    },
    inputContainer: {
      borderWidth: 1.5,
      borderColor: error ? colors.error : colors.border,
      borderRadius: 8,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.text,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    inputWithLeftIcon: {
      paddingLeft: 8,
    },
    inputWithRightIcon: {
      paddingRight: 8,
    },
    leftIcon: {
      paddingLeft: 12,
    },
    rightIcon: {
      paddingRight: 12,
    },
    inputDisabled: {
      backgroundColor: colors.border,
      borderColor: colors.border,
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      marginTop: 4,
    },
  });

  return (
    <View style={[dynamicStyles.container, containerStyle]}>
      {label && <Text style={dynamicStyles.label}>{label}</Text>}
      <View style={[
        dynamicStyles.inputContainer,
        props.editable === false ? dynamicStyles.inputDisabled : null
      ]}>
        {leftIcon && <View style={dynamicStyles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            dynamicStyles.input,
            leftIcon ? dynamicStyles.inputWithLeftIcon : null,
            rightIcon ? dynamicStyles.inputWithRightIcon : null
          ]}
          placeholderTextColor={colors.textSecondary}
          {...props}
        />
        {rightIcon && <View style={dynamicStyles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={dynamicStyles.errorText}>{error}</Text>}
    </View>
  );
}