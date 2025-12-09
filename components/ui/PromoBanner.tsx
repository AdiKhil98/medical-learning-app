import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'promo-banner-2025-dismissed';

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    checkDismissed();
  }, []);

  const checkDismissed = async () => {
    try {
      const dismissed = await AsyncStorage.getItem(STORAGE_KEY);
      if (dismissed === 'true') {
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Error checking banner dismissal:', error);
    }
  };

  const handleClose = async (e?: any) => {
    if (e) {
      e.stopPropagation();
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsVisible(false));
    } catch (error) {
      console.error('Error saving banner dismissal:', error);
      setIsVisible(false);
    }
  };

  const handleBannerPress = () => {
    router.push('/subscription');
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.95} onPress={handleBannerPress} style={styles.touchable}>
        <LinearGradient
          colors={['#F97316', '#FB923C', '#FBBF24', '#FCD34D', '#FDE047']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {/* Special Offer Badge */}
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Sonderangebot</Text>
            </View>
          </View>

          {/* Static Text Content */}
          <View style={styles.contentContainer}>
            <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
              Letzte Chance: 50% Rabatt bis 31.12.2025 – Jetzt Premium sichern!
            </Text>
          </View>

          {/* Right Actions */}
          <View style={styles.actionsContainer}>
            <ChevronRight size={20} color="#000000" strokeWidth={2.5} />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color="#000000" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: Platform.OS === 'web' ? ('sticky' as any) : 'relative',
    top: 0,
    zIndex: 1001,
    width: '100%',
    ...(Platform.OS === 'web' && {
      position: 'sticky' as any,
    }),
  },
  touchable: {
    width: '100%',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  gradient: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
  },
  badge: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  contentContainer: {
    flex: 1,
    marginLeft: 180,
    marginRight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      userSelect: 'none' as any,
    }),
  },
  actionsContainer: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.2s ease' as any,
    }),
  },

  // Responsive styles for mobile
  ...(Platform.OS !== 'web' &&
    Dimensions.get('window').width < 768 && {
      gradient: {
        height: 45,
        paddingHorizontal: 12,
      },
      badgeContainer: {
        left: 12,
      },
      badge: {
        paddingHorizontal: 14,
        paddingVertical: 6,
      },
      badgeText: {
        fontSize: 12,
      },
      contentContainer: {
        marginLeft: 140,
        marginRight: 80,
      },
      text: {
        fontSize: 13,
      },
      actionsContainer: {
        right: 12,
        gap: 8,
      },
    }),
});
