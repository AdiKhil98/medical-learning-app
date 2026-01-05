/**
 * HomepageSkeleton
 *
 * PERFORMANCE FIX: Skeleton UI that displays immediately while data loads.
 * This prevents CLS (Cumulative Layout Shift) by reserving space for content.
 *
 * Shows animated placeholder boxes that pulse while content is loading.
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, SafeAreaView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import { SPACING } from '@/constants/tokens';

interface SkeletonBoxProps {
  width: number | string;
  height: number;
  style?: any;
  borderRadius?: number;
}

/**
 * Animated skeleton box with pulse effect
 */
const SkeletonBox = ({ width, height, style, borderRadius = 8 }: SkeletonBoxProps) => {
  const animatedValue = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#E5E7EB',
          borderRadius,
          opacity: animatedValue,
        },
        style,
      ]}
    />
  );
};

/**
 * Homepage skeleton that matches SlidingHomepage layout
 */
export const HomepageSkeleton = () => {
  const IS_WEB = Platform.OS === 'web';

  return (
    <SafeAreaView style={styles.container}>
      {/* Background gradient - matches SlidingHomepage */}
      <LinearGradient colors={MEDICAL_COLORS.backgroundGradient as any} style={styles.backgroundGradient} />

      {/* Header skeleton */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <SkeletonBox width={44} height={44} borderRadius={12} />
            <SkeletonBox width={100} height={28} style={{ marginLeft: 12 }} />
          </View>
          <SkeletonBox width={40} height={40} borderRadius={20} />
        </View>
      </View>

      {/* Main content skeleton */}
      <View style={styles.content}>
        {/* Hero card skeleton */}
        <View style={styles.heroCard}>
          {/* Icon placeholder */}
          <SkeletonBox width={80} height={80} borderRadius={20} style={{ alignSelf: 'center', marginBottom: 24 }} />

          {/* Title placeholder */}
          <SkeletonBox width="80%" height={32} style={{ alignSelf: 'center', marginBottom: 12 }} />
          <SkeletonBox width="60%" height={32} style={{ alignSelf: 'center', marginBottom: 16 }} />

          {/* Subtitle placeholder */}
          <SkeletonBox width="70%" height={20} style={{ alignSelf: 'center', marginBottom: 32 }} />

          {/* Button placeholders */}
          <SkeletonBox width="100%" height={52} borderRadius={14} style={{ marginBottom: 12 }} />
          <SkeletonBox width="100%" height={52} borderRadius={14} style={{ marginBottom: 12 }} />
          <SkeletonBox width="100%" height={52} borderRadius={14} />
        </View>

        {/* Web-only: Additional sections skeleton */}
        {IS_WEB && (
          <>
            {/* Recent content section */}
            <View style={styles.section}>
              <SkeletonBox width={180} height={28} style={{ marginBottom: 24 }} />
              <View style={styles.recentCard}>
                <View style={styles.recentCardContent}>
                  <SkeletonBox width={48} height={48} borderRadius={12} />
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <SkeletonBox width="60%" height={20} style={{ marginBottom: 8 }} />
                    <SkeletonBox width="40%" height={16} />
                  </View>
                </View>
              </View>
              <View style={[styles.recentCard, { marginTop: 12 }]}>
                <View style={styles.recentCardContent}>
                  <SkeletonBox width={48} height={48} borderRadius={12} />
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <SkeletonBox width="70%" height={20} style={{ marginBottom: 8 }} />
                    <SkeletonBox width="35%" height={16} />
                  </View>
                </View>
              </View>
            </View>

            {/* Tip of the day skeleton */}
            <View style={styles.section}>
              <View style={styles.tipCard}>
                <View style={styles.tipHeader}>
                  <SkeletonBox width={48} height={48} borderRadius={12} />
                  <SkeletonBox width={120} height={20} style={{ marginLeft: 12 }} />
                </View>
                <View style={styles.tipContentBox}>
                  <SkeletonBox width="100%" height={24} style={{ marginBottom: 8 }} />
                  <SkeletonBox width="80%" height={24} />
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MEDICAL_COLORS.slate50,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: 60,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.xl,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  heroCard: {
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: SPACING.xl,
    padding: SPACING.xxxl,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
  },
  section: {
    marginTop: SPACING.xxxl,
  },
  recentCard: {
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: SPACING.lg,
    padding: SPACING.xl,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  recentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipCard: {
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: SPACING.xxl,
    padding: SPACING.xxxl,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  tipContentBox: {
    backgroundColor: MEDICAL_COLORS.warmYellowBg,
    borderRadius: SPACING.lg,
    padding: SPACING.xl,
  },
});

export default HomepageSkeleton;
