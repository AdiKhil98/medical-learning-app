import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MissedQuestion } from '@/types/evaluation';

interface Props {
  missedQuestions: MissedQuestion[];
}

export default function MissingAnswers({ missedQuestions }: Props) {
  if (!missedQuestions || missedQuestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>❓ Fehlende Antworten</Text>

      <View style={styles.list}>
        {missedQuestions.map((item, index) => (
          <View key={index} style={styles.missingItem}>
            <View style={styles.missingIcon}>
              <Text style={styles.questionMark}>?</Text>
            </View>
            <View style={styles.missingContent}>
              <Text style={styles.missingTitle}>{item.category}</Text>
              <Text style={styles.missingDesc}>{item.reason}</Text>
              {item.correctFormulations && item.correctFormulations.length > 0 && (
                <View style={styles.formulationsContainer}>
                  <Text style={styles.formulationsLabel}>Korrekte Formulierungen:</Text>
                  {item.correctFormulations.map((formulation, fIndex) => (
                    <Text key={fIndex} style={styles.formulationText}>• {formulation}</Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1e3a5f',
    marginBottom: 16,
  },
  list: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    padding: 20,
    gap: 12,
  },
  missingItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
    borderRadius: 4,
  },
  missingIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffc107',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionMark: {
    color: '#856404',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  missingContent: {
    flex: 1,
  },
  missingTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#856404',
    marginBottom: 6,
  },
  missingDesc: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#856404',
    lineHeight: 20,
  },
  formulationsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ffeaa7',
  },
  formulationsLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#856404',
    marginBottom: 4,
  },
  formulationText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#856404',
    lineHeight: 18,
    marginLeft: 8,
  },
});
