import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Settings, LogOut, Trophy, BarChart3, Book } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface UserAvatarProps {
  size?: 'small' | 'medium' | 'large';
  showLevel?: boolean;
  showXP?: boolean;
  userStats?: {
    totalXP: number;
    level: number;
    rank: string;
  };
}

export default function UserAvatar({ 
  size = 'medium', 
  showLevel = true,
  showXP = true,
  userStats = { totalXP: 2450, level: 5, rank: 'Medizinstudent' }
}: UserAvatarProps) {
  const { user, signOut } = useAuth();
  const { isDarkMode } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  const getInitials = () => {
    if (!user?.email) return 'ZA'; // Default for Zaid57
    const email = user.email;
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const getAvatarSize = () => {
    switch (size) {
      case 'small':
        return 32;
      case 'large':
        return 48;
      case 'medium':
      default:
        return 40;
    }
  };

  const avatarSize = getAvatarSize();

  const menuItems = [
    {
      icon: User,
      title: 'Profil',
      subtitle: 'Persönliche Daten',
      action: () => {
        setShowDropdown(false);
        // Navigate to profile
      }
    },
    {
      icon: BarChart3,
      title: 'Fortschritt',
      subtitle: 'Statistiken & Erfolge',
      action: () => {
        setShowDropdown(false);
        // Navigate to progress
      }
    },
    {
      icon: Book,
      title: 'Meine Kurse',
      subtitle: 'Lernmaterialien',
      action: () => {
        setShowDropdown(false);
        // Navigate to courses
      }
    },
    {
      icon: Settings,
      title: 'Einstellungen',
      subtitle: 'App-Konfiguration',
      action: () => {
        setShowDropdown(false);
        // Navigate to settings
      }
    },
    {
      icon: LogOut,
      title: 'Abmelden',
      subtitle: 'Sitzung beenden',
      action: () => {
        setShowDropdown(false);
        signOut();
      },
      isDestructive: true
    }
  ];

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={() => setShowDropdown(true)}
        style={styles.avatarTouchable}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#4CAF50', '#66BB6A', '#81C784']}
          style={[styles.avatar, { width: avatarSize, height: avatarSize }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.initials, { fontSize: avatarSize * 0.35 }]}>
            {getInitials()}
          </Text>
          {showLevel && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{userStats.level}</Text>
            </View>
          )}
        </LinearGradient>
        
        {showXP && (
          <View style={styles.xpContainer}>
            <Text style={styles.xpText}>{userStats.totalXP}</Text>
            <Text style={styles.xpLabel}>XP</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            {/* User Info Header */}
            <LinearGradient
              colors={['#4CAF50', '#66BB6A']}
              style={styles.userInfoHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <LinearGradient
                colors={['#4CAF50', '#66BB6A', '#81C784']}
                style={styles.avatarLarge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.initialsLarge}>{getInitials()}</Text>
              </LinearGradient>
              <View style={styles.userInfo}>
                <Text style={styles.userEmail}>{user?.email || 'Zaid57@example.com'}</Text>
                <Text style={styles.userRank}>{userStats.rank}</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>Level {userStats.level}</Text>
                    <Text style={styles.statLabel}>Aktuell</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userStats.totalXP}</Text>
                    <Text style={styles.statLabel}>Gesamt XP</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Menu Items */}
            <View style={styles.menuContainer}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    item.isDestructive && styles.destructiveMenuItem
                  ]}
                  onPress={item.action}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.menuIcon,
                    item.isDestructive && styles.destructiveIcon
                  ]}>
                    <item.icon 
                      size={20} 
                      color={item.isDestructive ? '#EF5350' : '#4CAF50'} 
                    />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={[
                      styles.menuTitle,
                      item.isDestructive && styles.destructiveText
                    ]}>
                      {item.title}
                    </Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatarTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  initials: {
    color: 'white',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  levelBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EAB308',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  levelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  xpContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
  },
  xpText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  xpLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: -1,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 20,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: 280,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  userInfoHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsLarge: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userRank: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  menuContainer: {
    padding: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  destructiveMenuItem: {
    backgroundColor: 'rgba(239, 83, 80, 0.05)',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  destructiveIcon: {
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  destructiveText: {
    color: '#EF5350',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});