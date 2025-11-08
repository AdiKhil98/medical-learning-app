import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  summary: string;
}

export default function SummaryBox({ summary }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>📋 Zusammenfassung</Text>
      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>{summary}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 30,
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1e3a5f',
    marginBottom: 16,
  },
  summaryBox: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: '#2c5aa0',
    borderRadius: 4,
    padding: 24,
  },
  summaryText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#212529',
    lineHeight: 28,
  },
});
