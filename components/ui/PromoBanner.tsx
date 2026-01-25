import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;
const isSmallMobile = screenWidth < 375;

const STORAGE_KEY = 'facebook-banner-dismissed';

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;

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

  const handleClose = async () => {
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
      <LinearGradient
        colors={['#F97316', '#FB923C', '#FBBF24', '#FCD34D', '#FDE047']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {/* Static Text Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
            Folgen Sie uns auf Facebook und verpassen Sie keine Neuigkeiten!
          </Text>
        </View>

        {/* Close Button */}
        <View style={styles.actionsContainer}>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1001,
    width: '100%',
    ...(Platform.OS === 'web' && {
      position: 'sticky' as any,
      top: 0,
    }),
  },
  gradient: {
    width: '100%',
    height: isMobile ? (isSmallMobile ? 44 : 48) : 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isMobile ? (isSmallMobile ? 8 : 12) : 20,
    overflow: 'hidden',
    position: 'relative',
  },
  contentContainer: {
    flex: 1,
    marginLeft: isMobile ? (isSmallMobile ? 12 : 16) : 20,
    marginRight: isMobile ? (isSmallMobile ? 50 : 60) : 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#000000',
    fontSize: isMobile ? (isSmallMobile ? 12 : 13) : 15,
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
    right: isMobile ? (isSmallMobile ? 8 : 12) : 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: isMobile ? (isSmallMobile ? 4 : 8) : 12,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.2s ease' as any,
    }),
  },
});
