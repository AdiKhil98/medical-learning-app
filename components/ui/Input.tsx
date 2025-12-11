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
import { colors } from '@/constants/colors';

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
      borderWidth: isFocused ? 2 : 1,
      borderColor: error ? '#EF4444' : (isFocused ? '#D4A574' : '#E5E7EB'),
      borderRadius: 14,
      backgroundColor: '#ffffff',
      flexDirection: 'row',
      alignItems: 'center',
      height: 58,
    },
    input: {
      flex: 1,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      fontSize: 17,
      color: '#1F2937',
      paddingVertical: 0,
      paddingHorizontal: 18,
      backgroundColor: 'transparent',
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
      // Remove browser default focus outline on web
      ...(Platform.OS === 'web' && {
        outlineStyle: 'none',
        outline: 'none',
      }),
    },
    inputWithLeftIcon: {
      paddingLeft: 8,
    },
    inputWithRightIcon: {
      paddingRight: 8,
    },
    leftIcon: {
      paddingLeft: 16,
      paddingRight: 8,
    },
    rightIcon: {
      paddingLeft: 8,
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
          underlineColorAndroid="transparent"
          selectionColor="#D4A574"
          textContentType="none"
          importantForAutofill="no"
          // Remove web focus outline and ensure brown accent
          {...(Platform.OS === 'web' && {
            //@ts-ignore
            style: {
              outline: 'none',
              outlineStyle: 'none',
              boxShadow: 'none',
              accentColor: '#D4A574',
            }
          })}
          {...props}
        />
        {rightIcon && <View style={dynamicStyles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={dynamicStyles.errorText}>{error}</Text>}
    </View>
  );
}