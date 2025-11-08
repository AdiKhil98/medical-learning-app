import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  score: number;
  maxScore: number;
  passed: boolean;
  evaluationType: string;
}

export default function ExaminerHeader({ score, maxScore, passed, evaluationType }: Props) {
  const borderColor = passed ? '#28a745' : '#dc3545';

  return (
    <LinearGradient
      colors={['#1e3a5f', '#2c5aa0']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { borderBottomColor: borderColor }]}
    >
      <View style={styles.headerContent}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Mündliche Prüfung Evaluationsbericht</Text>
          <Text style={styles.subtitle}>{evaluationType}</Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeScore}>{score}</Text>
          <Text style={styles.badgeMaxScore}>/{maxScore}</Text>
          <View style={[styles.badgeStatus, passed ? styles.badgePass : styles.badgeFail]}>
            <Text style={passed ? styles.badgePassText : styles.badgeFailText}>
              {passed ? 'BESTANDEN' : 'NICHT BESTANDEN'}
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 40,
    paddingHorizontal: 30,
    borderBottomWidth: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#e3f2fd',
  },
  badge: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    minWidth: 140,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  badgeScore: {
    fontSize: 56,
    fontFamily: 'Inter-Bold',
    color: '#1e3a5f',
    lineHeight: 56,
  },
  badgeMaxScore: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#6c757d',
    marginTop: 4,
  },
  badgeStatus: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgePass: {
    backgroundColor: '#d4edda',
  },
  badgeFail: {
    backgroundColor: '#f8d7da',
  },
  badgePassText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#155724',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badgeFailText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#721c24',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
