import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Platform
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
  const [isFocused, setIsFocused] = useState(false);

  const dynamicStyles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 8,
      color: '#374151',
    },
    inputContainer: {
      borderWidth: 2,
      borderColor: error ? '#EF4444' : (isFocused ? '#10b981' : '#E5E7EB'),
      borderRadius: 12,
      backgroundColor: '#ffffff',
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      fontSize: 16,
      color: '#1F2937',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    inputWithLeftIcon: {
      paddingLeft: 8,
    },
    inputWithRightIcon: {
      paddingRight: 8,
    },
    leftIcon: {
      paddingLeft: 16,
    },
    rightIcon: {
      paddingRight: 16,
    },
    inputDisabled: {
      backgroundColor: '#F3F4F6',
      borderColor: '#D1D5DB',
    },
    errorText: {
      color: '#EF4444',
      fontSize: 12,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      marginTop: 6,
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
          placeholderTextColor="#9CA3AF"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {rightIcon && <View style={dynamicStyles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={dynamicStyles.errorText}>{error}</Text>}
    </View>
  );
}