import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  totalScore: number;
  maxScore: number;
  deductions: number | null;
  passed: boolean;
  motivationalMessage: string;
}

export default function FinalCertificate({ totalScore, maxScore, deductions, passed, motivationalMessage }: Props) {
  const categoryPoints = deductions !== null && deductions > 0 ? totalScore + deductions : totalScore;
  const percentage = Math.round((totalScore / maxScore) * 100);

  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={['#f8f9fa', '#e9ecef']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.certificateBorder}>
          {/* Header */}
          <LinearGradient
            colors={['#1e3a5f', '#2c5aa0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.certificateHeader}
          >
            <Text style={styles.headerText}>FINALE PUNKTZAHL</Text>
          </LinearGradient>

          {/* Calculation Body */}
          <View style={styles.certificateBody}>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>KATEGORIENPUNKTE:</Text>
              <Text style={styles.calcValue}>{categoryPoints}/{maxScore}</Text>
            </View>

            {deductions !== null && deductions > 0 && (
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>ABZÜGE:</Text>
                <Text style={[styles.calcValue, styles.deductionValue]}>-{deductions}</Text>
              </View>
            )}

            <View style={styles.calcDivider} />

            <View style={[styles.calcRow, styles.finalRow]}>
              <Text style={styles.calcLabel}>ENDPUNKTZAHL:</Text>
              <Text style={[styles.calcValue, styles.finalValue]}>{totalScore}/{maxScore}</Text>
            </View>
          </View>

          {/* Result Section */}
          <LinearGradient
            colors={passed ? ['#d4edda', '#c3e6cb'] : ['#f8d7da', '#f5c6cb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.certificateResult}
          >
            <Text style={styles.resultScore}>{totalScore}/{maxScore}</Text>
            <Text style={styles.resultPercentage}>({percentage}%)</Text>

            <View style={[styles.resultStatus, passed ? styles.passStatus : styles.failStatus]}>
              <Text style={styles.resultStatusText}>
                {passed ? '✅ BESTANDEN' : '❌ NICHT BESTANDEN'}
              </Text>
            </View>

            <Text style={styles.resultMessage}>{motivationalMessage}</Text>
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginVertical: 40,
    marginHorizontal: 20,
  },
  container: {
    borderRadius: 8,
    padding: 30,
  },
  certificateBorder: {
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  certificateHeader: {
    padding: 20,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  certificateBody: {
    padding: 30,
    backgroundColor: '#f8f9fa',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  finalRow: {
    paddingTop: 15,
  },
  calcLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#495057',
  },
  calcValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1e3a5f',
  },
  deductionValue: {
    color: '#dc3545',
  },
  finalValue: {
    fontSize: 20,
    color: '#1e3a5f',
  },
  calcDivider: {
    height: 2,
    backgroundColor: '#dee2e6',
    marginVertical: 15,
  },
  certificateResult: {
    padding: 40,
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: '#dee2e6',
  },
  resultScore: {
    fontSize: 72,
    fontFamily: 'Inter-ExtraBold',
    color: '#1e3a5f',
    lineHeight: 72,
  },
  resultPercentage: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#6c757d',
    marginTop: 10,
  },
  resultStatus: {
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  passStatus: {
    backgroundColor: '#28a745',
  },
  failStatus: {
    backgroundColor: '#dc3545',
  },
  resultStatusText: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  resultMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#495057',
    textAlign: 'center',
    lineHeight: 28,
    marginTop: 10,
  },
});
