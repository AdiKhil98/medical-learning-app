import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Folder } from 'lucide-react-native';

interface FolderProps {
  title?: string;
  icon?: React.ComponentType<any>;
  gradient?: string[];
  hoverGradient?: string[];
  hasContent?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  showBadge?: boolean;
}

export default function Card({
  title = "Folder",
  icon: IconComponent = Folder,
  gradient = ['#0891b2', '#0e7490', '#155e75'],
  hoverGradient = ['#22d3ee', '#0891b2', '#0e7490'],
  hasContent = false,
  onPress,
  size = 'medium',
  showBadge = true
}: FolderProps) {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];
  const translateYAnim = useState(new Animated.Value(0))[0];
  const shadowAnim = useState(new Animated.Value(0))[0];

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.timing(translateYAnim, {
        toValue: -8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const shadowOpacity = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.25],
  });

  const shadowRadius = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 20],
  });

  const shadowOffset = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 12],
  });

  const sizeStyles = getSizeStyles(size);

  return (
    <Animated.View
      style={[
        styles.folderCard,
        sizeStyles.container,
        {
          transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
          shadowOpacity,
          shadowRadius,
          shadowOffset: [{
            width: 0,
            height: shadowOffset,
          }],
        },
      ]}
    >
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        activeOpacity={1}
        style={styles.folderCardButton}
        accessibilityRole="button"
        accessibilityLabel={`Navigate to ${title}`}
        accessibilityHint="Double tap to open this folder"
        accessible={true}
      >
        {/* Enhanced Folder Tab with Depth */}
        <View style={[styles.modernFolderTab, sizeStyles.tab]}>
          <LinearGradient
            colors={isPressed ? hoverGradient : gradient}
            style={styles.modernFolderTabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          {/* Highlight on top edge */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.1)']}
            style={styles.folderTabHighlight}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </View>

        {/* Enhanced Folder Body with Modern Gradient */}
        <LinearGradient
          colors={isPressed ? hoverGradient : gradient}
          style={[styles.modernFolderBody, sizeStyles.body]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.modernFolderContent}>
            {/* Translucent Glass Badge for Icon */}
            <View style={[styles.glassIconBadge, sizeStyles.iconBadge]}>
              <View style={[styles.glassIconRing, sizeStyles.iconRing]}>
                <IconComponent size={sizeStyles.iconSize} color="white" />
              </View>
            </View>

            {/* Modern READY Badge */}
            {hasContent && showBadge && (
              <View style={styles.modernStatusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.modernStatusText}>READY</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={[styles.modernFolderLabel, sizeStyles.label]} numberOfLines={2}>
        {title}
      </Text>
    </Animated.View>
  );
}

const getSizeStyles = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return {
        container: { width: 80 },
        tab: { height: 12 },
        body: { height: 70 },
        iconBadge: { width: 40, height: 40 },
        iconRing: { width: 32, height: 32 },
        iconSize: 18,
        label: { fontSize: 11 }
      };
    case 'large':
      return {
        container: { width: 140 },
        tab: { height: 20 },
        body: { height: 110 },
        iconBadge: { width: 70, height: 70 },
        iconRing: { width: 60, height: 60 },
        iconSize: 36,
        label: { fontSize: 15 }
      };
    case 'medium':
    default:
      return {
        container: { width: 110 },
        tab: { height: 16 },
        body: { height: 90 },
        iconBadge: { width: 56, height: 56 },
        iconRing: { width: 48, height: 48 },
        iconSize: 28,
        label: { fontSize: 13 }
      };
  }
};

const styles = StyleSheet.create({
  // Modern Polished Folder Card Styles
  folderCard: {
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  folderCardButton: {
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },

  // Enhanced Folder Tab with Depth
  modernFolderTab: {
    width: '65%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden',
    marginBottom: -2,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  modernFolderTabGradient: {
    flex: 1,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  folderTabHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },

  // Enhanced Folder Body with Modern Gradients
  modernFolderBody: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  modernFolderContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  // Translucent Glass Badge for Icon
  glassIconBadge: {
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: 'rgba(255, 255, 255, 0.5)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  glassIconRing: {
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },

  // Modern READY Badge as Rounded Pill
  modernStatusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginRight: 6,
  },
  modernStatusText: {
    color: 'white',
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Modern Clear Folder Label
  modernFolderLabel: {
    fontFamily: 'Inter-SemiBold',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 12,
    paddingHorizontal: 8,
    letterSpacing: -0.2,
  },
});