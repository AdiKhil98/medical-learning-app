import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/hooks/useSubscription';

interface UserAvatarProps {
  size?: 'small' | 'medium' | 'large';
}

export default function UserAvatar({ 
  size = 'medium'
}: UserAvatarProps) {
  const { user, signOut } = useAuth();
  const { isDarkMode } = useTheme();
  const { getSimulationStatusText } = useSubscription();
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

  // Removed menu items - only show user info in dropdown

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
        </LinearGradient>
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
                <Text style={styles.userName}>
                  {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Nutzer'}
                </Text>
                <Text style={styles.userEmail}>{user?.email || 'nutzer@example.com'}</Text>
              </View>
            </LinearGradient>

            {/* Simulation status */}
            <View style={styles.infoContainer}>
              <Text style={styles.simulationStatusText}>
                {getSimulationStatusText()}
              </Text>
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