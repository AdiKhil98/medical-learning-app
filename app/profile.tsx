import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Lock,
  CreditCard,
  Type,
  Heart,
  HelpCircle,
  FileText,
  Info,
  LogOut,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import { colors } from '@/constants/colors';
import { logger } from '@/utils/logger';
import { supabase } from '@/lib/supabase';

interface SettingsItemProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightComponent?: React.ReactNode;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  iconBg,
  title,
  subtitle,
  value,
  onPress,
  showArrow = true,
  rightComponent,
}) => {
  return (
    <TouchableOpacity
      style={[styles.settingsItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress && !rightComponent}
    >
      <View style={styles.settingsItemLeft}>
        <View style={[styles.settingsIcon, { backgroundColor: iconBg }]}>{icon}</View>
        <View style={styles.settingsText}>
          <Text style={[styles.settingsTitle, { color: colors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingsItemRight}>
        {rightComponent}
        {value && <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>{value}</Text>}
        {showArrow && !rightComponent && <ChevronRight size={20} color={colors.textSecondary} />}
      </View>
    </TouchableOpacity>
  );
};

const ToggleSwitch: React.FC<{ active: boolean; onToggle: () => void }> = ({ active, onToggle }) => {
  return (
    <TouchableOpacity
      style={[styles.toggleSwitch, active && styles.toggleSwitchActive]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.toggleThumb, active && styles.toggleThumbActive]} />
    </TouchableOpacity>
  );
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [fontSize, setFontSize] = useState<'Klein' | 'Mittel' | 'Groß'>('Mittel');
  const [subscriptionTier, setSubscriptionTier] = useState<string>('Kostenlos');
  const [loading, setLoading] = useState(true);

  // Load user preferences on mount
  useEffect(() => {
    loadUserPreferences();
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Load font size preference
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('font_size_preference, subscription_tier')
        .eq('id', user.id)
        .single();

      if (userError) {
        logger.error('Error loading user preferences:', userError);
      } else if (userData) {
        // Set font size
        if (userData.font_size_preference) {
          setFontSize(userData.font_size_preference as 'Klein' | 'Mittel' | 'Groß');
        }
      }

      // Load subscription tier from quota system
      const { data: quotaData, error: quotaError } = await supabase.rpc('get_user_quota_status', {
        p_user_id: user.id,
      });

      if (quotaError) {
        logger.error('Error loading subscription tier:', quotaError);
      } else if (quotaData) {
        const tier = mapSubscriptionTier(quotaData);
        setSubscriptionTier(tier);
      }
    } catch (error) {
      logger.error('Error in loadUserPreferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapSubscriptionTier = (quotaData: any): string => {
    const totalSims = quotaData.total_simulations || 0;
    const tier = quotaData.subscription_tier || 'free';

    if (totalSims >= 60 || tier === 'premium' || tier === 'profi') {
      return 'Premium Plan (60 Simulationen)';
    } else if (totalSims >= 30 || tier === 'basic' || tier === 'basis') {
      return 'Basis Plan (30 Simulationen)';
    } else {
      return 'Kostenlos (3 Simulationen)';
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 1).toUpperCase();
  };

  const getDisplayName = () => {
    return user?.email?.split('@')[0] || 'Benutzer';
  };

  // Navigate to personal data page
  const handlePersonalData = () => {
    // Use setTimeout to fix web navigation issues with nested routes
    setTimeout(() => {
      router.push('/konto/persoenliche-daten' as any);
    }, 0);
  };

  // Navigate to password change page
  const handleChangePassword = () => {
    setTimeout(() => {
      router.push('/konto/passwort-aendern' as any);
    }, 0);
  };

  // Navigate to subscription page
  const handleSubscription = () => {
    setTimeout(() => {
      router.push('/subscription' as any);
    }, 0);
  };

  // Toggle font size with cycling (Klein → Mittel → Groß → Klein)
  const handleFontSize = async () => {
    const fontSizes: ('Klein' | 'Mittel' | 'Groß')[] = ['Klein', 'Mittel', 'Groß'];
    const currentIndex = fontSizes.indexOf(fontSize);
    const nextIndex = (currentIndex + 1) % fontSizes.length;
    const nextSize = fontSizes[nextIndex];

    // Update state immediately for responsive UI
    setFontSize(nextSize);

    // Save to database
    try {
      const { error } = await supabase.from('users').update({ font_size_preference: nextSize }).eq('id', user?.id);

      if (error) {
        logger.error('Error updating font size:', error);
        // Revert on error
        setFontSize(fontSize);
        Alert.alert('Fehler', 'Schriftgröße konnte nicht gespeichert werden.');
      }
    } catch (error) {
      logger.error('Error in handleFontSize:', error);
      setFontSize(fontSize);
      Alert.alert('Fehler', 'Schriftgröße konnte nicht gespeichert werden.');
    }
  };

  // Navigate to saved content page
  const handleSavedContent = () => {
    setTimeout(() => {
      router.push('/gespeicherte-notizen' as any);
    }, 0);
  };

  // Navigate to help page
  const handleHelpSupport = () => {
    setTimeout(() => {
      router.push('/help' as any);
    }, 0);
  };

  // Navigate to privacy terms page
  const handlePrivacyTerms = () => {
    setTimeout(() => {
      router.push('/konto/datenschutz-agb' as any);
    }, 0);
  };

  // Navigate to impressum page
  const handleImprint = () => {
    setTimeout(() => {
      router.push('/impressum' as any);
    }, 0);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Möchten Sie sich wirklich abmelden?')) {
        signOut().then(() => {
          router.replace('/auth/login');
        });
      }
    } else {
      Alert.alert('Abmelden', 'Möchten Sie sich wirklich abmelden?', [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abmelden',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth/login');
          },
        },
      ]);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={MEDICAL_COLORS.warmOrangeDark} />
          <Text style={styles.backButtonText}>Zurück</Text>
        </TouchableOpacity>

        <LinearGradient colors={MEDICAL_COLORS.warmOrangeGradient} style={styles.headerLogo}>
          <Text style={styles.headerLogoText}>+ KP MED</Text>
        </LinearGradient>

        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{getUserInitials()}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Profil</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Verwalten Sie Ihr Konto und Ihre Präferenzen
          </Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <LinearGradient colors={['#EF4444', '#F87171']} style={styles.profileAvatarLarge}>
            <Text style={styles.profileAvatarText}>{getUserInitials()}</Text>
          </LinearGradient>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{getDisplayName()}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={MEDICAL_COLORS.warmOrangeDark} />
          </View>
        ) : (
          <>
            {/* Account Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <User size={20} color={MEDICAL_COLORS.warmOrangeDark} />
                <Text style={[styles.sectionTitle, { color: MEDICAL_COLORS.warmOrangeDark }]}>Konto</Text>
              </View>
              <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
                <SettingsItem
                  icon={<User size={24} color="#3B82F6" />}
                  iconBg="rgba(59, 130, 246, 0.15)"
                  title="Persönliche Daten"
                  subtitle="Name, E-Mail und mehr"
                  onPress={handlePersonalData}
                />
                <SettingsItem
                  icon={<Lock size={24} color="#8B5CF6" />}
                  iconBg="rgba(139, 92, 246, 0.15)"
                  title="Passwort ändern"
                  subtitle="Ihr Konto schützen"
                  onPress={handleChangePassword}
                />
                <SettingsItem
                  icon={<CreditCard size={24} color="#F59E0B" />}
                  iconBg="rgba(245, 158, 11, 0.15)"
                  title="Abonnement"
                  subtitle={subscriptionTier}
                  onPress={handleSubscription}
                />
              </View>
            </View>

            {/* Settings Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <User size={20} color={MEDICAL_COLORS.warmOrangeDark} />
                <Text style={[styles.sectionTitle, { color: MEDICAL_COLORS.warmOrangeDark }]}>Einstellungen</Text>
              </View>
              <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
                <SettingsItem
                  icon={<Type size={24} color="#3B82F6" />}
                  iconBg="rgba(59, 130, 246, 0.15)"
                  title="Schriftgröße"
                  value={fontSize}
                  onPress={handleFontSize}
                />
              </View>
            </View>

            {/* Support & Legal Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <HelpCircle size={20} color={MEDICAL_COLORS.warmOrangeDark} />
                <Text style={[styles.sectionTitle, { color: MEDICAL_COLORS.warmOrangeDark }]}>
                  Support & Rechtliches
                </Text>
              </View>
              <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
                <SettingsItem
                  icon={<Heart size={24} color="#EC4899" />}
                  iconBg="rgba(236, 72, 153, 0.15)"
                  title="Gespeicherte Inhalte"
                  subtitle="Ihre Favoriten"
                  onPress={handleSavedContent}
                />
                <SettingsItem
                  icon={<HelpCircle size={24} color="#3B82F6" />}
                  iconBg="rgba(59, 130, 246, 0.15)"
                  title="Hilfe & Support"
                  subtitle="FAQ und Kontakt"
                  onPress={handleHelpSupport}
                />
                <SettingsItem
                  icon={<FileText size={24} color="#6B7280" />}
                  iconBg="rgba(107, 114, 128, 0.15)"
                  title="Datenschutz & AGB"
                  onPress={handlePrivacyTerms}
                />
                <SettingsItem
                  icon={<Info size={24} color="#6B7280" />}
                  iconBg="rgba(107, 114, 128, 0.15)"
                  title="Impressum"
                  onPress={handleImprint}
                />
              </View>
            </View>
          </>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <LinearGradient colors={['#EF4444', '#F87171']} style={styles.logoutGradient}>
            <LogOut size={24} color="white" />
            <Text style={styles.logoutText}>Abmelden</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: MEDICAL_COLORS.warmOrangeDark,
    fontSize: 15,
    fontWeight: '500',
  },
  headerLogo: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  headerLogoText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#10B981',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 15,
  },
  profileCard: {
    borderRadius: 20,
    padding: 32,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  profileAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  profileAvatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '700',
  },
  profileInfo: {
    marginBottom: 0,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 15,
  },
  editProfileButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  editProfileGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  editProfileText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  settingsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsText: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingsSubtitle: {
    fontSize: 13,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsValue: {
    fontSize: 14,
  },
  toggleSwitch: {
    width: 52,
    height: 28,
    backgroundColor: '#E5E7EB',
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#10B981',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    backgroundColor: 'white',
    borderRadius: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 24 }],
  },
  logoutButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  logoutGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
