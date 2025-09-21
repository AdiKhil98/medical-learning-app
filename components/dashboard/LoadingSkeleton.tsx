import React from 'react';
import { View, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

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
          backgroundColor: '#E5E7EB',
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
      <SkeletonItem width={40} height={40} borderRadius={20} />
      <SkeletonItem width={200} height={24} style={{ marginLeft: 12 }} />
    </View>
    <View style={styles.card}>
      <SkeletonItem height={60} style={{ marginBottom: 16 }} />
      <SkeletonItem height={20} width="80%" style={{ marginBottom: 8 }} />
      <SkeletonItem height={20} width="60%" />
    </View>
  </View>
);

export const QuestionSkeleton: React.FC = () => (
  <View style={styles.questionContainer}>
    <View style={styles.questionHeader}>
      <SkeletonItem width={52} height={52} borderRadius={26} />
      <View style={styles.headerInfo}>
        <SkeletonItem height={20} width="70%" style={{ marginBottom: 8 }} />
        <SkeletonItem height={16} width="50%" />
      </View>
    </View>
    <SkeletonItem height={60} style={{ marginBottom: 20 }} />
    <SkeletonItem height={50} style={{ marginBottom: 12 }} />
    <SkeletonItem height={50} style={{ marginBottom: 12 }} />
    <SkeletonItem height={50} />
  </View>
);

const styles = {
  container: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  card: {
    padding: 20,
    backgroundColor: '#F8F3E8', // White Linen background
    borderRadius: 12,
  },
  questionContainer: {
    padding: 24,
    backgroundColor: '#E2827F',
    borderRadius: 20,
    margin: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
};