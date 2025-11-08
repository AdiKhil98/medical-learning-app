import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  answers: string[];
}

export default function CorrectAnswers({ answers }: Props) {
  if (!answers || answers.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>✅ Richtig beantwortet</Text>

      <View style={styles.grid}>
        {answers.map((answer, index) => {
          // Parse "**Title:** Description" format
          const match = answer.match(/\*{2,}([^:*]+?)[\s:*]+(.+)/);
          const title = match ? match[1].trim() : answer;
          const description = match ? match[2].trim() : '';

          return (
            <View key={index} style={styles.answerItem}>
              <View style={styles.answerIcon}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
              <View style={styles.answerContent}>
                <Text style={styles.answerTitle}>{title}</Text>
                {description && <Text style={styles.answerDesc}>{description}</Text>}
              </View>
            </View>
          );
        })}
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
  grid: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    padding: 20,
    gap: 12,
  },
  answerItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#f1f8e9',
    borderLeftWidth: 3,
    borderLeftColor: '#28a745',
    borderRadius: 4,
  },
  answerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  answerContent: {
    flex: 1,
  },
  answerTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#1e3a5f',
    marginBottom: 4,
  },
  answerDesc: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6c757d',
    lineHeight: 20,
  },
});
