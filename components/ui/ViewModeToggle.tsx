import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

type ViewMode = 'html' | 'improved' | 'json' | 'details';

interface ViewModeOption {
  key: ViewMode;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
}

interface ViewModeToggleProps {
  modes: ViewModeOption[];
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export default function ViewModeToggle({ modes, currentMode, onModeChange }: ViewModeToggleProps) {
  const { colors, isDarkMode } = useTheme();

  if (modes.length <= 1) return null;

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 8,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      fontFamily: 'Inter-Medium',
    },
    modesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    modeButton: {
      flex: 1,
      minWidth: 120,
      borderRadius: 12,
      overflow: 'hidden',
    },
    modeButtonActive: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    modeButtonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      minHeight: 48,
    },
    modeButtonContent: {
      flex: 1,
      marginLeft: 8,
    },
    modeLabel: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'Inter-Medium',
    },
    modeDescription: {
      fontSize: 11,
      marginTop: 2,
      fontFamily: 'Inter-Regular',
      lineHeight: 14,
    },
    activeModeText: {
      color: '#ffffff',
    },
    inactiveModeText: {
      color: colors.text,
    },
    activeModeDescription: {
      color: 'rgba(255, 255, 255, 0.8)',
    },
    inactiveModeDescription: {
      color: colors.textSecondary,
    },
  });

  const getGradientColors = (isActive: boolean) => {
    if (isActive) {
      return [colors.primary, `${colors.primary}CC`];
    }
    return isDarkMode 
      ? ['rgba(75, 85, 99, 0.3)', 'rgba(55, 65, 81, 0.2)']
      : ['rgba(249, 250, 251, 0.8)', 'rgba(243, 244, 246, 0.6)'];
  };

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle}>Ansichtsmodus</Text>
      </View>
      
      <View style={dynamicStyles.modesContainer}>
        {modes.map((mode) => {
          const isActive = currentMode === mode.key;
          const IconComponent = mode.icon;
          
          return (
            <TouchableOpacity
              key={mode.key}
              style={[
                dynamicStyles.modeButton,
                isActive && dynamicStyles.modeButtonActive
              ]}
              onPress={() => onModeChange(mode.key)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={getGradientColors(isActive)}
                style={dynamicStyles.modeButtonInner}
              >
                <IconComponent 
                  size={20} 
                  color={isActive ? '#ffffff' : colors.primary} 
                />
                <View style={dynamicStyles.modeButtonContent}>
                  <Text 
                    style={[
                      dynamicStyles.modeLabel,
                      isActive ? dynamicStyles.activeModeText : dynamicStyles.inactiveModeText
                    ]}
                    numberOfLines={1}
                  >
                    {mode.label}
                  </Text>
                  <Text 
                    style={[
                      dynamicStyles.modeDescription,
                      isActive ? dynamicStyles.activeModeDescription : dynamicStyles.inactiveModeDescription
                    ]}
                    numberOfLines={2}
                  >
                    {mode.description}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}