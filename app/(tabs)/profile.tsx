import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, SafeAreaView, Alert, ScrollView, Linking, Animated } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { supabase } from '@/lib/supabase';
import { CommonActions } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { 
  LogOut, 
  Moon, 
  User, 
  ChevronRight, 
  Settings,
  Lock,
  Shield,
  Type,
  Bell,
  Volume2,
  FileText,
  HelpCircle,
  Info,
  Award,
  Send
} from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const { user, signOut, session } = useAuth();
  const { isDarkMode, toggleTheme, colors, fontSize, showFontSizeSelector, fontScale } = useTheme();
  const {
    pushNotificationsEnabled,
    soundVibrationEnabled,
    setPushNotificationsEnabled,
    setSoundVibrationEnabled,
    sendTestNotification,
    hasPermission,
    loading: notificationLoading,
    // Daily notifications
    dailyNotificationsConfig,
    updateDailyNotificationsConfig,
    sendTestTipNotification,
    sendTestQuestionNotification,
  } = useNotifications();

  const router = useRouter();
  
  // State declarations
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [updatingNotifications, setUpdatingNotifications] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Listen for session changes and redirect when logged out
  useEffect(() => {
    if (!loading && !session) {
      console.log('🔄 Session is null, redirecting to login...');
      try {
        router.replace('/auth/login');
        console.log('✅ Router replace called successfully');
      } catch (error) {
        console.error('❌ Router replace failed:', error);
        // Fallback: try router.push
        router.push('/auth/login');
      }
    }
  }, [session, loading, router]);

  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true);
        
        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
            
          if (error) {
            console.error('Error loading user data:', error);
            // Don't throw error, just use auth user data
            setUserData({
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              email: user.email
            });
          } else if (data) {
            setUserData(data);
          } else {
            // User doesn't exist in database, use auth data
            setUserData({
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              email: user.email
            });
          }
        }
      } catch (error) {
        console.error('Error loading user data', error);
        // Use fallback data from auth
        if (user) {
          setUserData({
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            email: user.email
          });
        }
      } finally {
        setLoading(false);
      }
    }
    
    loadUserData();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [user, fadeAnim]);

  const handleSignOut = async () => {
    console.log('handleSignOut called');
    console.log('Current user:', user?.email);
    console.log('Current session:', !!session);
    console.log('About to show Alert.alert confirmation dialog...');
    
    try {
      console.log('Calling Alert.alert...');
      
      // For web platform, use window.confirm as a fallback
      if (Platform.OS === 'web') {
        console.log('Using web confirm dialog...');
        const confirmed = window.confirm('Möchten Sie sich wirklich abmelden?');
        console.log('Web confirm result:', confirmed);
        
        if (confirmed) {
          console.log('Web confirmation confirmed, calling performSignOut...');
          await performSignOut();
        } else {
          console.log('Web confirmation cancelled');
        }
        return;
      }
      
      // For mobile platforms, use Alert.alert
      Alert.alert(
        'Abmelden',
        'Möchten Sie sich wirklich abmelden?',
        [
          { 
            text: 'Abbrechen', 
            style: 'cancel',
            onPress: () => {
              console.log('Mobile logout cancelled by user');
            }
          },
          { 
            text: 'Abmelden', 
            onPress: async () => {
              console.log('Mobile alert confirmation pressed');
              console.log('About to call performSignOut...');
              await performSignOut();
            },
            style: 'destructive'
          },
        ],
        { cancelable: false }
      );
      console.log('Mobile Alert.alert has been called');
      
    } catch (error) {
      console.error('Error with Alert.alert:', error);
      // Fallback to direct logout if Alert fails
      console.log('Alert failed, falling back to direct logout...');
      await performSignOut();
    }
  };

  const performSignOut = async () => {
    console.log('performSignOut called');
    console.log('About to start logout process...');
    
    try {
      setSigningOut(true);
      console.log('Starting logout process...');
      console.log('signingOut state set to true');
      
      // Add a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Call the signOut function from context
      console.log('Calling signOut from context...');
      console.log('🔍 signOut function type:', typeof signOut);
      
      // Let the AuthContext handle navigation after signOut completes
      console.log('📍 Skipping pre-emptive navigation - will let AuthContext handle it');
      
      console.log('🔍 signOut function:', signOut);
      console.log('🔍 useAuth hook result:', { user: !!user, session: !!session, loading, signOut: typeof signOut });
      
      if (!signOut) {
        throw new Error('signOut function is not available from useAuth');
      }
      
      console.log('✅ About to call signOut() function...');
      console.log('⏰ Time before signOut call:', new Date().toISOString());
      await signOut();
      console.log('✅ signOut() call completed successfully');
      console.log('⏰ Time after signOut call:', new Date().toISOString());
      
      console.log('✅ Logout successful, navigation should have already occurred');
      
    } catch (error: any) {
      console.error('Error during logout:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Note: We don't clear state here because that should be handled by AuthContext
      
      Alert.alert(
        'Abmeldung', 
        `Es gab einen Fehler beim Abmelden: ${error.message || 'Unbekannter Fehler'}. Versuchen Sie es erneut.`,
        [{ text: 'OK' }]
      );
    } finally {
      console.log('performSignOut finally block');
      setSigningOut(false);
    }
  };

  // Direct logout function for testing (bypasses Alert.alert)
  const handleDirectSignOut = async () => {
    console.log('🧪 Direct logout called (bypassing Alert.alert)');
    console.log('Current user:', user?.email);
    console.log('Current session:', !!session);
    
    try {
      console.log('Calling performSignOut directly...');
      await performSignOut();
      console.log('Direct logout completed');
    } catch (error) {
      console.error('Direct logout error:', error);
      Alert.alert('Error', 'Direct logout failed: ' + error.message);
    }
  };

  const handlePushNotificationToggle = async (value: boolean) => {
    try {
      setUpdatingNotifications(true);
      console.log('Toggle push notifications to:', value);
      await setPushNotificationsEnabled(value);
      console.log('Push notifications toggle completed');
    } catch (error: any) {
      console.error('Error toggling push notifications:', error);
      Alert.alert(
        'Fehler',
        error.message || 'Benachrichtigungseinstellungen konnten nicht aktualisiert werden.'
      );
    } finally {
      setUpdatingNotifications(false);
    }
  };

  const handleSoundVibrationToggle = async (value: boolean) => {
    try {
      setUpdatingNotifications(true);
      console.log('Toggle sound/vibration to:', value);
      await setSoundVibrationEnabled(value);
      console.log('Sound/vibration toggle completed');
    } catch (error: any) {
      console.error('Error toggling sound/vibration:', error);
      Alert.alert(
        'Fehler',
        error.message || 'Ton- und Vibrationseinstellungen konnten nicht aktualisiert werden.'
      );
    } finally {
      setUpdatingNotifications(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
      Alert.alert(
        'Test-Benachrichtigung gesendet',
        'Sie sollten in Kürze eine Test-Benachrichtigung erhalten.'
      );
    } catch (error: any) {
      Alert.alert(
        'Fehler',
        error.message || 'Test-Benachrichtigung konnte nicht gesendet werden.'
      );
    }
  };

  const openExternalLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Fehler', 'Link konnte nicht geöffnet werden.');
    }
  };

  const navigateTo = (route: string) => {
    router.push(route);
  };

  const getFontSizeDisplayText = () => {
    switch (fontSize) {
      case 'small': return 'Klein';
      case 'medium': return 'Mittel';
      case 'large': return 'Groß';
      default: return 'Mittel';
    }
  };

  const SettingItem = ({ 
    icon: IconComponent, 
    title, 
    onPress, 
    showArrow = true, 
    rightComponent 
  }: {
    icon: any;
    title: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity 
      style={dynamicStyles.settingItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={dynamicStyles.settingLeft}>
        <IconComponent size={20} color={colors.textSecondary} />
        <Text style={dynamicStyles.settingLabel}>{title}</Text>
      </View>
      {rightComponent || (showArrow && (
        <ChevronRight size={20} color={colors.textSecondary} />
      ))}
    </TouchableOpacity>
  );

  const gradientColors = isDarkMode 
    ? ['#1F2937', '#111827', '#0F172A']
    : ['#e0f2fe', '#f0f9ff', '#ffffff'];

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    gradientBackground: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: '100%',
    },
    title: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(28),
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(16),
      color: colors.textSecondary,
      marginBottom: 24,
      lineHeight: fontScale(24),
    },
    profileCard: {
      marginBottom: 32,
      borderRadius: 16,
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    profileName: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(20),
      color: colors.text,
      marginBottom: 4,
    },
    profileEmail: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(14),
      color: colors.textSecondary,
    },
    sectionCard: {
      marginBottom: 32,
      borderRadius: 12,
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    sectionTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(20),
      color: colors.primary,
      marginBottom: 16,
      marginTop: 24,
    },
    firstSectionTitle: {
      marginTop: 0,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      minHeight: 56,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingLabel: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(16),
      color: colors.text,
      marginLeft: 12,
    },
    lastSettingItem: {
      borderBottomWidth: 0,
    },
    versionText: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(14),
      color: colors.textSecondary,
    },
    logoutButton: {
      marginTop: 24,
      marginBottom: 32,
      borderColor: '#EF4444',
      borderRadius: 16,
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
      height: 56,
    },
    logoutText: {
      color: '#EF4444',
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(16),
    },
    fontSizeValue: {
      fontFamily: 'Inter-Medium',
      fontSize: fontScale(14),
      color: colors.textSecondary,
      marginRight: 8,
    },
    testButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginLeft: 8,
    },
    testButtonText: {
      color: '#FFFFFF',
      fontFamily: 'Inter-Medium',
      fontSize: fontScale(12),
    },
    permissionWarning: {
      backgroundColor: colors.warning + '20',
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
      marginHorizontal: 16,
    },
    permissionWarningText: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(14),
      color: colors.warning,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient
        colors={gradientColors}
        style={dynamicStyles.gradientBackground}
      />
      
      <Animated.ScrollView 
        style={[styles.scrollContainer, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <Text style={dynamicStyles.title}>Einstellungen</Text>
          <Text style={dynamicStyles.subtitle}>Verwalten Sie Ihr Konto und Ihre Präferenzen</Text>
        </View>

        {/* Profile Card */}
        <Card style={dynamicStyles.profileCard}>
          <View style={styles.profileHeader}>
            <LinearGradient
              colors={['#0077B6', '#0096C7']}
              style={styles.avatarContainer}
            >
              <Text style={styles.avatarText}>
                {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={dynamicStyles.profileName}>{userData?.name || 'Benutzer'}</Text>
              <Text style={dynamicStyles.profileEmail}>{userData?.email || user?.email || ''}</Text>
            </View>
          </View>
        </Card>

        {/* Konto Section */}
        <Text style={[dynamicStyles.sectionTitle, dynamicStyles.firstSectionTitle]}>Konto</Text>
        <Card style={dynamicStyles.sectionCard}>
          <SettingItem
            icon={User}
            title="Persönliche Daten"
            onPress={() => navigateTo('/konto/persoenliche-daten')}
          />
          <SettingItem
            icon={Lock}
            title="Passwort ändern"
            onPress={() => navigateTo('/konto/passwort-aendern')}
          />
          <SettingItem
            icon={Shield}
            title="Zwei-Faktor-Authentifizierung"
            onPress={() => navigateTo('/settings/2fa')}
            showArrow={false}
            rightComponent={<View style={[styles.lastSettingItem, dynamicStyles.lastSettingItem]} />}
          />
        </Card>

        {/* Darstellung Section */}
        <Text style={dynamicStyles.sectionTitle}>Darstellung</Text>
        <Card style={dynamicStyles.sectionCard}>
          <SettingItem
            icon={Moon}
            title="Dunkelmodus"
            showArrow={false}
            rightComponent={
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#FFFFFF'}
              />
            }
          />
          <SettingItem
            icon={Type}
            title="Schriftgröße"
            onPress={showFontSizeSelector}
            rightComponent={
              <View style={styles.fontSizeContainer}>
                <Text style={dynamicStyles.fontSizeValue}>{getFontSizeDisplayText()}</Text>
                <ChevronRight size={20} color={colors.textSecondary} />
              </View>
            }
          />
        </Card>

        {/* Benachrichtigungen Section */}
        <Text style={dynamicStyles.sectionTitle}>Benachrichtigungen</Text>
        <Card style={dynamicStyles.sectionCard}>
          <SettingItem
            icon={Bell}
            title="Push-Benachrichtigungen"
            showArrow={false}
            rightComponent={
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {pushNotificationsEnabled && (
                  <TouchableOpacity
                    style={dynamicStyles.testButton}
                    onPress={handleTestNotification}
                    disabled={updatingNotifications}
                  >
                    <Send size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
                <Switch
                  value={pushNotificationsEnabled}
                  onValueChange={handlePushNotificationToggle}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={'#FFFFFF'}
                  disabled={updatingNotifications || notificationLoading}
                />
              </View>
            }
          />
          <SettingItem
            icon={Volume2}
            title="Ton & Vibration"
            showArrow={false}
            rightComponent={
              <Switch
                value={soundVibrationEnabled}
                onValueChange={handleSoundVibrationToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#FFFFFF'}
                disabled={updatingNotifications || notificationLoading}
              />
            }
          />
        </Card>

        {/* Show permission warning if push notifications are enabled but permission not granted */}
        {pushNotificationsEnabled && !hasPermission && (
          <View style={dynamicStyles.permissionWarning}>
            <Text style={dynamicStyles.permissionWarningText}>
              Push-Benachrichtigungen sind aktiviert, aber die Berechtigung wurde nicht erteilt. 
              Bitte aktivieren Sie Benachrichtigungen in den Systemeinstellungen.
            </Text>
          </View>
        )}

        {/* Tägliche Benachrichtigungen Section */}
        <Text style={dynamicStyles.sectionTitle}>Tägliche Erinnerungen</Text>
        <Card style={dynamicStyles.sectionCard}>
          <SettingItem
            icon={Bell}
            title="Tägliche Benachrichtigungen"
            showArrow={false}
            rightComponent={
              <Switch
                value={dailyNotificationsConfig.enabled}
                onValueChange={async (value) => {
                  try {
                    await updateDailyNotificationsConfig({ enabled: value });
                  } catch (error: any) {
                    Alert.alert('Fehler', 'Einstellungen konnten nicht aktualisiert werden: ' + error.message);
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#FFFFFF'}
                disabled={updatingNotifications || notificationLoading}
              />
            }
          />
          
          {dailyNotificationsConfig.enabled && (
            <>
              <SettingItem
                icon={Type}
                title={`Tipp des Tages (${String(dailyNotificationsConfig.tipNotificationTime.hour).padStart(2, '0')}:${String(dailyNotificationsConfig.tipNotificationTime.minute).padStart(2, '0')})`}
                onPress={() => {
                  Alert.alert(
                    'Tipp-Zeit einstellen',
                    'Wählen Sie die Zeit für den täglichen Tipp:',
                    [
                      { text: '09:00', onPress: () => updateDailyNotificationsConfig({ tipNotificationTime: { hour: 9, minute: 0 } }) },
                      { text: '10:00', onPress: () => updateDailyNotificationsConfig({ tipNotificationTime: { hour: 10, minute: 0 } }) },
                      { text: '11:00', onPress: () => updateDailyNotificationsConfig({ tipNotificationTime: { hour: 11, minute: 0 } }) },
                      { text: '12:00', onPress: () => updateDailyNotificationsConfig({ tipNotificationTime: { hour: 12, minute: 0 } }) },
                      { text: 'Abbrechen', style: 'cancel' }
                    ]
                  );
                }}
                rightComponent={
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[dynamicStyles.testButton, { backgroundColor: '#F59E0B' }]}
                      onPress={async () => {
                        try {
                          await sendTestTipNotification();
                          Alert.alert('Test gesendet', 'Test-Tipp-Benachrichtigung wurde gesendet!');
                        } catch (error: any) {
                          Alert.alert('Fehler', error.message);
                        }
                      }}
                      disabled={updatingNotifications}
                    >
                      <Send size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                    <ChevronRight size={20} color={colors.textSecondary} />
                  </View>
                }
              />
              
              <SettingItem
                icon={HelpCircle}
                title={`Tagesfrage (${String(dailyNotificationsConfig.questionNotificationTime.hour).padStart(2, '0')}:${String(dailyNotificationsConfig.questionNotificationTime.minute).padStart(2, '0')})`}
                onPress={() => {
                  Alert.alert(
                    'Frage-Zeit einstellen',
                    'Wählen Sie die Zeit für die tägliche Frage:',
                    [
                      { text: '17:00', onPress: () => updateDailyNotificationsConfig({ questionNotificationTime: { hour: 17, minute: 0 } }) },
                      { text: '18:00', onPress: () => updateDailyNotificationsConfig({ questionNotificationTime: { hour: 18, minute: 0 } }) },
                      { text: '19:00', onPress: () => updateDailyNotificationsConfig({ questionNotificationTime: { hour: 19, minute: 0 } }) },
                      { text: '20:00', onPress: () => updateDailyNotificationsConfig({ questionNotificationTime: { hour: 20, minute: 0 } }) },
                      { text: 'Abbrechen', style: 'cancel' }
                    ]
                  );
                }}
                rightComponent={
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[dynamicStyles.testButton, { backgroundColor: '#8B5CF6' }]}
                      onPress={async () => {
                        try {
                          await sendTestQuestionNotification();
                          Alert.alert('Test gesendet', 'Test-Frage-Benachrichtigung wurde gesendet!');
                        } catch (error: any) {
                          Alert.alert('Fehler', error.message);
                        }
                      }}
                      disabled={updatingNotifications}
                    >
                      <Send size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                    <ChevronRight size={20} color={colors.textSecondary} />
                  </View>
                }
              />
            </>
          )}
        </Card>

        {/* Rechtliches & Hilfe Section */}
        <Text style={dynamicStyles.sectionTitle}>Rechtliches & Hilfe</Text>
        <Card style={dynamicStyles.sectionCard}>
          <SettingItem
            icon={HelpCircle}
            title="Hilfe & Support"
            onPress={() => navigateTo('/help')}
          />
          <SettingItem
            icon={FileText}
            title="Datenschutz & AGB"
            onPress={() => navigateTo('/konto/datenschutz-agb')}
          />
          <SettingItem
            icon={Info}
            title="Impressum"
            onPress={() => openExternalLink('https://yourapp.com/impressum')}
            showArrow={false}
            rightComponent={<View style={[styles.lastSettingItem, dynamicStyles.lastSettingItem]} />}
          />
        </Card>

        {/* Über die App Section */}
        <Text style={dynamicStyles.sectionTitle}>Über die App</Text>
        <Card style={dynamicStyles.sectionCard}>
          <SettingItem
            icon={Info}
            title="Version"
            showArrow={false}
            rightComponent={<Text style={dynamicStyles.versionText}>1.0.0</Text>}
          />
          <SettingItem
            icon={Award}
            title="Lizenzen"
            onPress={() => navigateTo('/settings/licenses')}
            showArrow={false}
            rightComponent={<View style={[styles.lastSettingItem, dynamicStyles.lastSettingItem]} />}
          />
        </Card>

        {/* Logout Button */}
        <Button
          title={signingOut ? "Wird abgemeldet..." : "Abmelden"}
          onPress={handleSignOut}
          variant="outline"
          icon={<LogOut size={20} color="#EF4444" />}
          style={dynamicStyles.logoutButton}
          textStyle={dynamicStyles.logoutText}
          disabled={signingOut}
          loading={signingOut}
        />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  lastSettingItem: {
    borderBottomWidth: 0,
  },
  fontSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});