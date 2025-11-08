import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { NextStep } from '@/types/evaluation';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Props {
  learningSteps: NextStep[];
  resources: string[];
}

export default function LearningResources({ learningSteps, resources }: Props) {
  const isMobile = SCREEN_WIDTH < 768;

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      {/* Learning Steps */}
      {learningSteps && learningSteps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>💪 Konkrete Lernschritte</Text>
          <View style={styles.stepsList}>
            {learningSteps.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <Text style={styles.stepNumber}>{index + 1}.</Text>
                <Text style={styles.stepText}>{step.action}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Resources */}
      {resources && resources.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>📖 Pflichtlektüre</Text>
          <View style={styles.resourcesList}>
            {resources.map((resource, index) => (
              <View key={index} style={styles.resourceItem}>
                <Text style={styles.resourceIcon}>📘</Text>
                <Text style={styles.resourceText}>{resource}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  containerMobile: {
    flexDirection: 'column',
  },
  section: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    padding: 25,
  },
  sectionHeading: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e3a5f',
    marginBottom: 16,
  },
  stepsList: {
    gap: 10,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 3,
    borderLeftColor: '#2c5aa0',
    borderRadius: 4,
  },
  stepNumber: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#1e3a5f',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#212529',
    lineHeight: 22,
  },
  resourcesList: {
    gap: 10,
  },
  resourceItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 3,
    borderLeftColor: '#6c757d',
    borderRadius: 4,
  },
  resourceIcon: {
    fontSize: 20,
  },
  resourceText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#212529',
    lineHeight: 20,
  },
});
