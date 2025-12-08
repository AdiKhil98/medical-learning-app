import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/hooks/useSubscription';

interface UserAvatarProps {
  size?: 'small' | 'medium' | 'large';
}

export default function UserAvatar({ size = 'medium' }: UserAvatarProps) {
  const { user, signOut } = useAuth();
  const { isDarkMode } = useTheme();
  const { getSubscriptionInfo } = useSubscription(user?.id);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
        return 36;
      case 'large':
        return 56;
      case 'medium':
      default:
        return 48; // Increased from 40 to 48 for better prominence
    }
  };

  const avatarSize = getAvatarSize();

  // Hover handlers for micro-interactions
  const handleMouseEnter = () => {
    setIsHovered(true);
    Animated.spring(scaleAnim, {
      toValue: 1.1,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setShowDropdown(true)}
        style={styles.avatarTouchable}
        activeOpacity={0.8}
        {...(Platform.OS === 'web' && {
          onMouseEnter: handleMouseEnter,
          onMouseLeave: handleMouseLeave,
          style: { cursor: 'pointer' } as any,
        })}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={['#10B981', '#059669', '#047857']} // Keep green for user avatar but with modern shades
            style={[
              styles.avatar,
              {
                width: avatarSize,
                height: avatarSize,
                ...(isHovered &&
                  Platform.OS === 'web' && {
                    shadowColor: '#10B981',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: 8,
                  }),
              },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.initials, { fontSize: avatarSize * 0.35 }]}>{getInitials()}</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDropdown(false)}>
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
                <Text style={styles.userName}>
                  {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Nutzer'}
                </Text>
                <Text style={styles.userEmail}>{user?.email || 'nutzer@example.com'}</Text>
              </View>
            </LinearGradient>

            {/* Simulation status */}
            <View style={styles.infoContainer}>
              <Text style={styles.simulationStatusText}>{getSubscriptionInfo()?.message || 'Loading...'}</Text>
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
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.4)', // More prominent white border
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease' as any,
    }),
  },
  initials: {
    color: 'white',
    fontWeight: '800',
    letterSpacing: 0.5,
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
  userName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
    numberOfLines: 1,
    ellipsizeMode: 'tail',
  },
  infoContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  simulationStatusText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});
