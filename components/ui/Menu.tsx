import React, { useState, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  Crown,
  Info,
  ChevronDown,
  Bell,
  Shield,
  Bookmark,
  User,
  LogOut,
  ChevronRight,
  StickyNote,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, BORDER_RADIUS, BORDER_WIDTH, TYPOGRAPHY, SHADOWS } from '@/constants/tokens';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useResponsive } from '@/hooks/useResponsive';

// Temporary constants for StyleSheet (will be refactored to dynamic styles)
const TEMP_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 1024;
const TEMP_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : 768;
const MENU_WIDTH = TEMP_WIDTH * 0.75;
const SCREEN_HEIGHT = TEMP_HEIGHT;

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Menu({ isOpen, onClose }: MenuProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { width } = useResponsive();

  // Calculate menu width responsively (75% of screen width)
  const MENU_WIDTH_RATIO = 0.75;
  const dynamicMenuWidth = width * MENU_WIDTH_RATIO;

  const slideAnim = React.useRef(new Animated.Value(-dynamicMenuWidth)).current;
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const submenuHeightAnim = React.useRef(new Animated.Value(0)).current;
  const [subscriptionTier, setSubscriptionTier] = useState<string>('Ihr Abonnement verwalten');

  // Helper function to map quota data to tier string
  const mapSubscriptionTier = useCallback((quotaData: any): string => {
    const totalSims = quotaData.total_simulations || 0;
    const tier = quotaData.subscription_tier || 'free';

    if (totalSims >= 60 || tier === 'premium' || tier === 'profi') {
      return 'Premium Plan (60 Simulationen)';
    } else if (totalSims >= 30 || tier === 'basic' || tier === 'basis') {
      return 'Basis Plan (30 Simulationen)';
    } else {
      return 'Kostenlos (3 Simulationen)';
    }
  }, []);

  const loadSubscriptionTier = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: quotaData, error } = await supabase.rpc('get_user_quota_status', {
        p_user_id: user.id,
      });

      if (error) {
        logger.error('Error loading subscription tier in menu:', error);
        return;
      }

      if (quotaData) {
        const tier = mapSubscriptionTier(quotaData);
        setSubscriptionTier(tier);
      }
    } catch (error) {
      logger.error('Error in loadSubscriptionTier:', error);
    }
  }, [user?.id, mapSubscriptionTier]);

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : -dynamicMenuWidth,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen, dynamicMenuWidth, slideAnim]);

  // Load subscription tier
  React.useEffect(() => {
    if (user?.id) {
      loadSubscriptionTier();
    }
  }, [user?.id, loadSubscriptionTier]);

  const toggleSubmenu = () => {
    const toValue = isSubmenuOpen ? 0 : 1;
    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(submenuHeightAnim, {
        toValue,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
    setIsSubmenuOpen(!isSubmenuOpen);
  };

  const menuItems = [
    {
      icon: User,
      label: 'Profil',
      subtitle: 'Ihre persönlichen Daten',
      route: '/profile',
      gradientColors: MEDICAL_COLORS.blueGradient,
    },
    {
      icon: Bell,
      label: 'Updates',
      subtitle: 'Neuigkeiten & Hinweise',
      route: '/updates',
      gradientColors: MEDICAL_COLORS.purpleGradient,
    },
    {
      icon: Crown,
      label: 'Subscription',
      subtitle: subscriptionTier,
      route: '/subscription',
      gradientColors: MEDICAL_COLORS.amberGradient,
    },
    {
      icon: Bookmark,
      label: 'Bookmarks',
      subtitle: 'Gespeicherte Inhalte',
      route: '/bookmarks',
      gradientColors: MEDICAL_COLORS.pinkGradient,
    },
    {
      icon: StickyNote,
      label: 'Gespeicherte Notizen',
      subtitle: 'Ihre persönlichen Notizen',
      route: '/gespeicherte-notizen',
      gradientColors: MEDICAL_COLORS.orangeGradient,
    },
  ];

  const submenuItems = [
    { label: 'Hilfe & Support', route: '/help' },
    { label: 'Fehler melden', route: '/feedback' },
    { label: 'AGB', route: '/konto/datenschutz-agb' },
    { label: 'Haftung', route: '/haftung' },
    { label: 'Datenschutz', route: '/konto/datenschutz-agb' },
    { label: 'Impressum', route: '/impressum' },
    { label: 'Datenschutzeinstellungen', route: '/datenschutz-einstellungen' },
  ];

  const handleMenuItemPress = (route: string) => {
    onClose();
    router.push(route);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const submenuHeightInterpolate = submenuHeightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, submenuItems.length * 44],
  });

  const gradientColors = MEDICAL_COLORS.lightMenuGradient;

  const getUserInitials = () => {
    if (!user?.email) return '?';
    const email = user.email;
    return email.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      onClose();
      await signOut();
      // Use replace instead of push to prevent going back to authenticated screens
      router.replace('/auth/login');
    } catch (error) {
      logger.error('Logout error:', error);
      // If logout fails, still try to navigate to login for security
      router.replace('/auth/login');
    }
  };

  const dynamicStyles = StyleSheet.create({
    menu: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      width: dynamicMenuWidth,
      backgroundColor: colors.surface,
      shadowColor: '#000',
      shadowOffset: {
        width: 2,
        height: 0,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      overflow: 'hidden',
      // Additional web-specific overflow fix
      ...(typeof window !== 'undefined' && {
        clipPath: 'inset(0)',
      }),
    },
    headerTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 24,
      color: colors.text,
    },
    closeButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.border,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    menuItemText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.text,
      marginLeft: 16,
      flex: 1,
    },
    submenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      paddingLeft: 52,
    },
    submenuText: {
      fontFamily: 'Inter-Regular',
      fontSize: 15,
      color: colors.textSecondary,
    },
  });

  if (!isOpen) return null;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Menü schließen"
        accessibilityHint="Tippen Sie, um das Menü zu schließen"
      />
      <Animated.View
        style={[dynamicStyles.menu, { transform: [{ translateX: slideAnim }] }]}
        accessible={true}
        accessibilityRole="menu"
        accessibilityLabel="Hauptmenü"
      >
        <LinearGradient colors={gradientColors} style={styles.menuGradient} />

        {/* Close Button */}
        <View style={styles.closeButtonContainer}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Menü schließen"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={24} color={MEDICAL_COLORS.slate500} />
          </TouchableOpacity>
        </View>

        {/* User Header Section */}
        <View style={styles.userHeader}>
          <LinearGradient colors={MEDICAL_COLORS.greenGradient} style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{getUserInitials()}</Text>
          </LinearGradient>
          <View style={styles.userInfo}>
            <Text style={styles.userWelcome}>Willkommen</Text>
            <Text style={styles.userSubtitle}>Ihr MedMeister Profil</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.menuItems}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.modernMenuItem}
                onPress={() => handleMenuItemPress(item.route)}
                activeOpacity={0.7}
                accessibilityRole="menuitem"
                accessibilityLabel={`${item.label}, ${item.subtitle}`}
                accessibilityHint={`Navigiert zu ${item.label}`}
              >
                <LinearGradient colors={item.gradientColors} style={styles.menuIconGradient}>
                  <item.icon size={24} color={MEDICAL_COLORS.white} />
                </LinearGradient>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight size={20} color={MEDICAL_COLORS.slate400} />
              </TouchableOpacity>
            ))}

            {user?.role === 'admin' && (
              <TouchableOpacity
                style={styles.modernMenuItem}
                onPress={() => handleMenuItemPress('/admin')}
                activeOpacity={0.7}
                accessibilityRole="menuitem"
                accessibilityLabel="Admin Panel, Verwaltung & Einstellungen"
                accessibilityHint="Navigiert zum Admin-Bereich"
              >
                <LinearGradient colors={MEDICAL_COLORS.redGradient} style={styles.menuIconGradient}>
                  <Shield size={24} color={MEDICAL_COLORS.white} />
                </LinearGradient>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuItemLabel}>Admin Panel</Text>
                  <Text style={styles.menuItemSubtitle}>Verwaltung & Einstellungen</Text>
                </View>
                <ChevronRight size={20} color={MEDICAL_COLORS.slate400} />
              </TouchableOpacity>
            )}

            {/* Kontakt & Info - Expandable */}
            <TouchableOpacity
              style={styles.modernMenuItem}
              onPress={toggleSubmenu}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Kontakt & Info, Hilfe & Support"
              accessibilityHint={
                isSubmenuOpen ? 'Tippen Sie, um das Untermenü zu schließen' : 'Tippen Sie, um das Untermenü zu öffnen'
              }
              accessibilityState={{ expanded: isSubmenuOpen }}
            >
              <LinearGradient colors={MEDICAL_COLORS.cyanGradient} style={styles.menuIconGradient}>
                <Info size={24} color={MEDICAL_COLORS.white} />
              </LinearGradient>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemLabel}>Kontakt & Info</Text>
                <Text style={styles.menuItemSubtitle}>Hilfe & Support</Text>
              </View>
              <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                <ChevronDown size={20} color={MEDICAL_COLORS.slate400} />
              </Animated.View>
            </TouchableOpacity>

            {/* Submenu */}
            <Animated.View style={[styles.submenu, { height: submenuHeightInterpolate }]}>
              {submenuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.submenuItem}
                  onPress={() => handleMenuItemPress(item.route)}
                  activeOpacity={0.7}
                  accessibilityRole="menuitem"
                  accessibilityLabel={item.label}
                  accessibilityHint={`Navigiert zu ${item.label}`}
                >
                  <Text style={styles.submenuText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          </View>
        </ScrollView>

        {/* Logout Button at Bottom */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Abmelden"
            accessibilityHint="Melden Sie sich von Ihrem Konto ab"
          >
            <LinearGradient
              colors={MEDICAL_COLORS.redGradient}
              style={styles.logoutGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <LogOut size={20} color={MEDICAL_COLORS.white} />
              <Text style={styles.logoutText}>Abmelden</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: MEDICAL_COLORS.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.xxxl,
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxl,
    borderBottomWidth: BORDER_WIDTH.thin,
    borderBottomColor: 'rgba(226, 232, 240, 0.5)',
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: MEDICAL_COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  userAvatarText: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.white,
  },
  userInfo: {
    marginLeft: SPACING.lg,
    flex: 1,
  },
  userWelcome: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.slate900,
    marginBottom: 2,
  },
  userSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: MEDICAL_COLORS.slate500,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  scrollContent: {
    paddingTop: SPACING.xxl,
    paddingBottom: 100,
  },
  menuItems: {
    gap: SPACING.sm,
  },
  modernMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...SHADOWS.md,
  },
  menuIconGradient: {
    width: SPACING.xxxxxl,
    height: SPACING.xxxxxl,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: SPACING.lg,
  },
  menuItemLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: MEDICAL_COLORS.slate900,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: MEDICAL_COLORS.slate500,
  },
  submenu: {
    overflow: 'hidden',
    marginTop: SPACING.sm,
    marginLeft: 64,
  },
  submenuItem: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: SPACING.xs,
  },
  submenuText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: MEDICAL_COLORS.slate600,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  logoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.xxl,
    borderTopWidth: BORDER_WIDTH.thin,
    borderTopColor: 'rgba(226, 232, 240, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  logoutButton: {
    borderRadius: SPACING.lg,
    overflow: 'hidden',
    shadowColor: MEDICAL_COLORS.warmRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    gap: SPACING.sm,
  },
  logoutText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: MEDICAL_COLORS.white,
  },
});
