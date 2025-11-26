import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Settings, Shield, Bell, Eye, Database, Cookie } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PrivacySettings {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  dataSharing: boolean;
  notifications: boolean;
}

export default function DataProtectionSettingsScreen() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const [settings, setSettings] = useState<PrivacySettings>({
    analytics: false,
    marketing: false,
    functional: true,
    dataSharing: false,
    notifications: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('privacy-settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      logger.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof PrivacySettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await AsyncStorage.setItem('privacy-settings', JSON.stringify(newSettings));
    } catch (error) {
      logger.error('Error saving privacy settings:', error);
      Alert.alert('Fehler', 'Einstellungen konnten nicht gespeichert werden.');
    }
  };

  const resetAllSettings = () => {
    Alert.alert(
      'Einstellungen zurücksetzen',
      'Möchten Sie wirklich alle Datenschutzeinstellungen auf die Standardwerte zurücksetzen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Zurücksetzen', 
          style: 'destructive',
          onPress: async () => {
            const defaultSettings: PrivacySettings = {
              analytics: false,
              marketing: false,
              functional: true,
              dataSharing: false,
              notifications: true,
            };
            setSettings(defaultSettings);
            try {
              await AsyncStorage.setItem('privacy-settings', JSON.stringify(defaultSettings));
            } catch (error) {
              logger.error('Error resetting privacy settings:', error);
            }
          }
        }
      ]
    );
  };

  const dynamicStyles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: colors.background 
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingTop: 60,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: isDarkMode ? 'rgba(31,41,55,0.9)' : 'rgba(255,255,255,0.9)',
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: 'rgba(249, 246, 242, 0.95)',
      shadowColor: 'rgba(181,87,64,0.3)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    backTxt: {
      marginLeft: 8,
      fontSize: 16,
      color: '#B87E70',
      fontFamily: 'Inter-Medium',
      fontWeight: '600',
    },
    content: { 
      flex: 1, 
      padding: 24 
    },
    pageTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 28,
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 32,
      lineHeight: 24,
    },
    settingCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    settingIcon: {
      marginRight: 16,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 16,
      color: colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    resetButton: {
      backgroundColor: MEDICAL_COLORS.danger,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 24,
    },
    resetButtonText: {
      color: 'white',
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
    },
    infoBox: {
      backgroundColor: `${MEDICAL_COLORS.primary}10`,
      borderLeftWidth: 4,
      borderLeftColor: MEDICAL_COLORS.primary,
      padding: 16,
      marginBottom: 24,
      borderRadius: 8,
    },
    infoText: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
  });

  const gradient = isDarkMode
    ? ['#1F2937', '#111827', '#0F172A']
    : ['#f8faff', '#e3f2fd', '#ffffff'];

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <LinearGradient colors={gradient} style={styles.gradientBackground} />
        <View style={styles.loadingContainer}>
          <Text style={dynamicStyles.subtitle}>Einstellungen werden geladen...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient colors={gradient} style={styles.gradientBackground} />

      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backBtn}>
          <ChevronLeft size={24} color={colors.primary} />
          <Text style={dynamicStyles.backTxt}>Zurück</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Settings size={32} color={MEDICAL_COLORS.primary} />
          <Text style={dynamicStyles.pageTitle}>Datenschutzeinstellungen</Text>
        </View>
        
        <Text style={dynamicStyles.subtitle}>
          Verwalten Sie Ihre Datenschutz- und Cookie-Einstellungen. Sie können jederzeit ändern, welche Daten erfasst und wie sie verwendet werden.
        </Text>

        <View style={dynamicStyles.infoBox}>
          <Text style={dynamicStyles.infoText}>
            ℹ️ Ihre Privatsphäre ist uns wichtig. Diese Einstellungen helfen Ihnen zu kontrollieren, wie Ihre Daten verwendet werden.
          </Text>
        </View>

        {/* Essential/Functional Cookies */}
        <View style={dynamicStyles.settingCard}>
          <View style={dynamicStyles.settingRow}>
            <Shield size={24} color={MEDICAL_COLORS.success} style={dynamicStyles.settingIcon} />
            <View style={dynamicStyles.settingContent}>
              <Text style={dynamicStyles.settingTitle}>Notwendige Cookies</Text>
              <Text style={dynamicStyles.settingDescription}>
                Diese Cookies sind für das Funktionieren der Plattform erforderlich und können nicht deaktiviert werden.
              </Text>
            </View>
            <Switch
              value={settings.functional}
              onValueChange={(value) => updateSetting('functional', value)}
              trackColor={{ false: colors.border, true: MEDICAL_COLORS.success }}
              thumbColor={'#FFFFFF'}
              disabled={true}
            />
          </View>
        </View>

        {/* Analytics */}
        <View style={dynamicStyles.settingCard}>
          <View style={dynamicStyles.settingRow}>
            <Database size={24} color={MEDICAL_COLORS.primary} style={dynamicStyles.settingIcon} />
            <View style={dynamicStyles.settingContent}>
              <Text style={dynamicStyles.settingTitle}>Analyse-Cookies</Text>
              <Text style={dynamicStyles.settingDescription}>
                Helfen uns zu verstehen, wie die Plattform genutzt wird, um sie zu verbessern.
              </Text>
            </View>
            <Switch
              value={settings.analytics}
              onValueChange={(value) => updateSetting('analytics', value)}
              trackColor={{ false: colors.border, true: MEDICAL_COLORS.primary }}
              thumbColor={'#FFFFFF'}
            />
          </View>
        </View>

        {/* Marketing */}
        <View style={dynamicStyles.settingCard}>
          <View style={dynamicStyles.settingRow}>
            <Eye size={24} color={MEDICAL_COLORS.warning} style={dynamicStyles.settingIcon} />
            <View style={dynamicStyles.settingContent}>
              <Text style={dynamicStyles.settingTitle}>Marketing-Cookies</Text>
              <Text style={dynamicStyles.settingDescription}>
                Werden verwendet, um Ihnen relevante Inhalte und Angebote zu zeigen.
              </Text>
            </View>
            <Switch
              value={settings.marketing}
              onValueChange={(value) => updateSetting('marketing', value)}
              trackColor={{ false: colors.border, true: MEDICAL_COLORS.warning }}
              thumbColor={'#FFFFFF'}
            />
          </View>
        </View>

        {/* Data Sharing */}
        <View style={dynamicStyles.settingCard}>
          <View style={dynamicStyles.settingRow}>
            <Cookie size={24} color={MEDICAL_COLORS.info} style={dynamicStyles.settingIcon} />
            <View style={dynamicStyles.settingContent}>
              <Text style={dynamicStyles.settingTitle}>Datenfreigabe</Text>
              <Text style={dynamicStyles.settingDescription}>
                Erlauben Sie die Weitergabe anonymisierter Daten für Forschungszwecke.
              </Text>
            </View>
            <Switch
              value={settings.dataSharing}
              onValueChange={(value) => updateSetting('dataSharing', value)}
              trackColor={{ false: colors.border, true: MEDICAL_COLORS.info }}
              thumbColor={'#FFFFFF'}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={dynamicStyles.settingCard}>
          <View style={dynamicStyles.settingRow}>
            <Bell size={24} color={MEDICAL_COLORS.secondary} style={dynamicStyles.settingIcon} />
            <View style={dynamicStyles.settingContent}>
              <Text style={dynamicStyles.settingTitle}>Benachrichtigungs-Tracking</Text>
              <Text style={dynamicStyles.settingDescription}>
                Erfassung der Interaktion mit Benachrichtigungen zur Verbesserung des Services.
              </Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={(value) => updateSetting('notifications', value)}
              trackColor={{ false: colors.border, true: MEDICAL_COLORS.secondary }}
              thumbColor={'#FFFFFF'}
            />
          </View>
        </View>

        <TouchableOpacity style={dynamicStyles.resetButton} onPress={resetAllSettings}>
          <Text style={dynamicStyles.resetButtonText}>Alle Einstellungen zurücksetzen</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomPadding: {
    height: 32,
  },
});