import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Menu as MenuIcon, X, Crown, Settings, Info, ChevronDown, ClipboardCheck, BarChart2, Bell, Shield, Bug, LogOut, Loader2 } from 'lucide-react-native';
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
  const { user, signOut } = useAuth();
  const slideAnim = React.useRef(new Animated.Value(-MENU_WIDTH)).current;
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
    { icon: Bell, label: 'Updates', route: '/updates' },
    { icon: Crown, label: 'Subscription', route: '/subscription' },
    { icon: Settings, label: 'Profil', route: '/profile' },
  ];


  const submenuItems = [
    { label: 'Hilfe & Support', route: '/help' },
    { label: 'AGB', route: '/terms' },
    { label: 'Haftung', route: '/liability' },
    { label: 'Datenschutz', route: '/privacy' },
    { label: 'Impressum', route: '/imprint' },
    { label: 'Datenschutzeinstellungen', route: '/privacy-settings' },
  ];

  const handleMenuItemPress = (route: string) => {
    onClose();
    router.push(route);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      onClose();
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
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
    : ['#e0f2fe', '#f0f9ff', '#ffffff'];

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
      shadowOpacity: isDarkMode ? 0.3 : 0.05,
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
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    logoutText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: '#EF4444',
      marginLeft: 16,
      flex: 1,
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
        
        <View style={styles.header}>
          <Text style={dynamicStyles.headerTitle}>Menu</Text>
          <TouchableOpacity onPress={onClose} style={dynamicStyles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
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
                style={dynamicStyles.menuItem}
                onPress={() => handleMenuItemPress(item.route)}
              >
                <item.icon size={20} color={colors.text} />
                <Text style={dynamicStyles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={dynamicStyles.menuItem}
              onPress={() => handleMenuItemPress('/progress')}
            >
              <BarChart2 size={20} color={colors.text} />
              <Text style={dynamicStyles.menuItemText}>Fortschritt</Text>
            </TouchableOpacity>


            {user?.role === 'admin' && (
              <TouchableOpacity
                style={dynamicStyles.menuItem}
                onPress={() => handleMenuItemPress('/admin')}
              >
                <Shield size={20} color={colors.text} />
                <Text style={dynamicStyles.menuItemText}>Admin Panel</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={dynamicStyles.menuItem}
              onPress={() => handleMenuItemPress('/feedback')}
            >
              <Bug size={20} color={colors.text} />
              <Text style={dynamicStyles.menuItemText}>Fehler melden</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={dynamicStyles.menuItem}
              onPress={toggleSubmenu}
            >
              <Info size={20} color={colors.text} />
              <Text style={dynamicStyles.menuItemText}>Kontakt & Info</Text>
              <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                <ChevronDown size={20} color={colors.text} />
              </Animated.View>
            </TouchableOpacity>

            <Animated.View style={[styles.submenu, { height: submenuHeightInterpolate }]}>
              {submenuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={dynamicStyles.submenuItem}
                  onPress={() => handleMenuItemPress(item.route)}
                >
                  <Text style={dynamicStyles.submenuText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          </View>
        </ScrollView>
        
        {/* Logout Button at Bottom */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={[dynamicStyles.logoutButton, isLoggingOut && { opacity: 0.7 }]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <Loader2 size={20} color="#EF4444" />
            ) : (
              <LogOut size={20} color="#EF4444" />
            )}
            <Text style={dynamicStyles.logoutText}>
              {isLoggingOut ? 'Abmelden...' : 'Abmelden'}
            </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  menuGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  menuItems: {
    gap: 8,
  },
  submenu: {
    overflow: 'hidden',
  },
  logoutContainer: {
    padding: 16,
    paddingTop: 0,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
});