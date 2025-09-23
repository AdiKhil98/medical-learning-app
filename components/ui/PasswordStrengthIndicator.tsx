import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface PasswordStrengthIndicatorProps {
  password: string;
  visible?: boolean;
}

interface StrengthCheck {
  label: string;
  met: boolean;
}

export default function PasswordStrengthIndicator({ 
  password, 
  visible = true 
}: PasswordStrengthIndicatorProps) {
  if (!visible) return null;

  const checks: StrengthCheck[] = [
    {
      label: 'Mindestens 8 Zeichen',
      met: password.length >= 8
    },
    {
      label: 'Mindestens ein Großbuchstabe',
      met: /[A-Z]/.test(password)
    },
    {
      label: 'Mindestens ein Kleinbuchstabe',
      met: /[a-z]/.test(password)
    },
    {
      label: 'Mindestens eine Zahl',
      met: /\d/.test(password)
    },
    {
      label: 'Mindestens ein Sonderzeichen',
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
  ];

  const metCount = checks.filter(check => check.met).length;
  const strengthPercentage = (metCount / checks.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercentage >= 80) return '#B87E70'; // Coral - Strong
    if (strengthPercentage >= 60) return '#E2827F'; // Light Coral - Good
    if (strengthPercentage >= 40) return '#F97316'; // Orange - Medium
    return '#EF4444'; // Red - Weak
  };

  const getStrengthLabel = () => {
    if (strengthPercentage >= 80) return 'Stark';
    if (strengthPercentage >= 60) return 'Gut';
    if (strengthPercentage >= 40) return 'Mittel';
    return 'Schwach';
  };

  return (
    <View style={styles.container}>
      {password.length > 0 && (
        <>
          <View style={styles.strengthBar}>
            <View style={styles.strengthBarBackground}>
              <View 
                style={[
                  styles.strengthBarFill,
                  { 
                    width: `${strengthPercentage}%`,
                    backgroundColor: getStrengthColor()
                  }
                ]} 
              />
            </View>
            <Text style={[styles.strengthLabel, { color: getStrengthColor() }]}>
              {getStrengthLabel()}
            </Text>
          </View>

          <View style={styles.requirements}>
            {checks.map((check, index) => (
              <View key={index} style={styles.requirement}>
                <View style={[
                  styles.checkIcon,
                  { backgroundColor: check.met ? '#B87E70' : '#E5E7EB' }
                ]}>
                  <Text style={[
                    styles.checkMark,
                    { color: check.met ? '#ffffff' : '#9CA3AF' }
                  ]}>
                    ✓
                  </Text>
                </View>
                <Text style={[
                  styles.requirementText,
                  { color: check.met ? '#374151' : '#9CA3AF' }
                ]}>
                  {check.label}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  strengthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  strengthBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  requirements: {
    gap: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  requirementText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});