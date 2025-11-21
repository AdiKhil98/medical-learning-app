import React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useEffect, useRef } from 'react';
import { SPACING, BORDER_RADIUS } from '@/constants/tokens';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const SkeletonItem: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  style 
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: MEDICAL_COLORS.lightGray,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SectionSkeleton: React.FC = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <SkeletonItem width={40} height={40} borderRadius={BORDER_RADIUS['2xl']} />
      <SkeletonItem width={200} height={24} style={{ marginLeft: SPACING.md }} />
    </View>
    <View style={styles.card}>
      <SkeletonItem height={60} style={{ marginBottom: SPACING.lg }} />
      <SkeletonItem height={20} width="80%" style={{ marginBottom: SPACING.sm }} />
      <SkeletonItem height={20} width="60%" />
    </View>
  </View>
);

export const QuestionSkeleton: React.FC = () => (
  <View style={styles.questionContainer}>
    <View style={styles.questionHeader}>
      <SkeletonItem width={52} height={52} borderRadius={BORDER_RADIUS.full} />
      <View style={styles.headerInfo}>
        <SkeletonItem height={20} width="70%" style={{ marginBottom: SPACING.sm }} />
        <SkeletonItem height={16} width="50%" />
      </View>
    </View>
    <SkeletonItem height={60} style={{ marginBottom: SPACING.xl }} />
    <SkeletonItem height={50} style={{ marginBottom: SPACING.md }} />
    <SkeletonItem height={50} style={{ marginBottom: SPACING.md }} />
    <SkeletonItem height={50} />
  </View>
);

// FIX: Wrap in StyleSheet.create() for performance optimization
// FIX: Use design tokens for spacing, border radius, and colors
const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    margin: SPACING.lg,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: SPACING.lg,
  },
  card: {
    padding: SPACING.xl,
    backgroundColor: MEDICAL_COLORS.offWhite,
    borderRadius: BORDER_RADIUS.lg,
  },
  questionContainer: {
    padding: SPACING.xxl,
    backgroundColor: MEDICAL_COLORS.primary,
    borderRadius: BORDER_RADIUS['2xl'],
    margin: SPACING.lg,
  },
  questionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: SPACING.lg,
  },
  headerInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
});