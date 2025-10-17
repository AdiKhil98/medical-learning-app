import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Menu as MenuIcon, X, Home, Crown, Settings, Info, ChevronDown, ClipboardCheck, BarChart2, Bell, Shield, Bookmark, User, LogOut, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MENU_WIDTH = SCREEN_WIDTH * 0.75;

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Menu({ isOpen, onClose }: MenuProps) {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const slideAnim = React.useRef(new Animated.Value(-MENU_WIDTH)).current;
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const submenuHeightAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : -MENU_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

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
      gradientColors: ['#60A5FA', '#3B82F6'] // Blue
    },
    {
      icon: Bell,
      label: 'Updates',
      subtitle: 'Neuigkeiten & Hinweise',
      route: '/updates',
      gradientColors: ['#A78BFA', '#8B5CF6'] // Purple
    },
    {
      icon: Crown,
      label: 'Subscription',
      subtitle: 'Ihr Abonnement verwalten',
      route: '/subscription',
      gradientColors: ['#FBBF24', '#F59E0B'] // Amber
    },
    {
      icon: Bookmark,
      label: 'Bookmarks',
      subtitle: 'Gespeicherte Inhalte',
      route: '/bookmarks',
      gradientColors: ['#F472B6', '#EC4899'] // Pink
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

  const gradientColors = isDarkMode
    ? ['#1F2937', '#111827', '#0F172A']
    : ['#ffffff', '#f1f5f9', '#e2e8f0'];

  const getUserInitials = () => {
    if (!user?.email) return '?';
    const email = user.email;
    return email.substring(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    onClose();
    router.push('/login');
  };

  const dynamicStyles = StyleSheet.create({
    menu: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      width: MENU_WIDTH,
      backgroundColor: colors.surface,
      shadowColor: '#000',
      shadowOffset: {
        width: 2,
        height: 0,
      },
      shadowOpacity: isDarkMode ? 0.5 : 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      overflow: 'hidden',
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
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
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
      <Pressable style={styles.overlay} onPress={onClose} />
      <Animated.View 
        style={[
          dynamicStyles.menu,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.menuGradient}
        />

        {/* Close Button */}
        <View style={styles.closeButtonContainer}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* User Header Section */}
        <View style={styles.userHeader}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.userAvatar}
          >
            <Text style={styles.userAvatarText}>{getUserInitials()}</Text>
          </LinearGradient>
          <View style={styles.userInfo}>
            <Text style={styles.userWelcome}>Willkommen</Text>
            <Text style={styles.userSubtitle}>Ihr KP Med Profil</Text>
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
              >
                <LinearGradient
                  colors={item.gradientColors}
                  style={styles.menuIconGradient}
                >
                  <item.icon size={24} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight size={20} color="#94A3B8" />
              </TouchableOpacity>
            ))}

            {user?.role === 'admin' && (
              <TouchableOpacity
                style={styles.modernMenuItem}
                onPress={() => handleMenuItemPress('/admin')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.menuIconGradient}
                >
                  <Shield size={24} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuItemLabel}>Admin Panel</Text>
                  <Text style={styles.menuItemSubtitle}>Verwaltung & Einstellungen</Text>
                </View>
                <ChevronRight size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}

            {/* Kontakt & Info - Expandable */}
            <TouchableOpacity
              style={styles.modernMenuItem}
              onPress={toggleSubmenu}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#06B6D4', '#0284C7']}
                style={styles.menuIconGradient}
              >
                <Info size={24} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemLabel}>Kontakt & Info</Text>
                <Text style={styles.menuItemSubtitle}>Hilfe & Support</Text>
              </View>
              <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                <ChevronDown size={20} color="#94A3B8" />
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
                >
                  <Text style={styles.submenuText}>{item.label}</Text>
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
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.logoutGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <LogOut size={20} color="#FFFFFF" />
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
    right: 0,
    bottom: 0,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.5)',
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  userAvatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userWelcome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  userSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 100, // Space for logout button
  },
  menuItems: {
    gap: 8,
  },
  modernMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  menuIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  submenu: {
    overflow: 'hidden',
    marginTop: 8,
    marginLeft: 64,
  },
  submenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  submenuText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  logoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  logoutButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});