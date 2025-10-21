import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import EvaluationDetailScreen from '@/components/evaluation/EvaluationDetailScreen';
import { parseEvaluation } from '@/utils/parseEvaluation';
import { MOCK_EVALUATION, MOCK_EXCELLENT_EVALUATION, MOCK_EVALUATION_RAW_TEXT } from '@/data/mockEvaluationData';

export default function EvaluationDemoScreen() {
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState(MOCK_EVALUATION);

  const showMockEvaluation = () => {
    setCurrentEvaluation(MOCK_EVALUATION);
    setShowEvaluation(true);
  };

  const showExcellentEvaluation = () => {
    setCurrentEvaluation(MOCK_EXCELLENT_EVALUATION);
    setShowEvaluation(true);
  };

  const showParsedEvaluation = () => {
    const parsed = parseEvaluation(MOCK_EVALUATION_RAW_TEXT, 'demo_parsed', new Date().toISOString());
    setCurrentEvaluation(parsed);
    setShowEvaluation(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#F8FAFC', '#FFFFFF', '#EFF6FF']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name="flask" size={48} color="#3B82F6" />
            <Text style={styles.title}>Evaluation Demo</Text>
            <Text style={styles.subtitle}>Test the new evaluation display component</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.demoButton} onPress={showMockEvaluation}>
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.buttonGradient}
              >
                <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
                <View style={styles.buttonText}>
                  <Text style={styles.buttonTitle}>Poor Performance</Text>
                  <Text style={styles.buttonSubtitle}>42/100 - Needs Work</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.demoButton} onPress={showExcellentEvaluation}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.buttonGradient}
              >
                <Ionicons name="trophy" size={24} color="#FFFFFF" />
                <View style={styles.buttonText}>
                  <Text style={styles.buttonTitle}>Excellent Performance</Text>
                  <Text style={styles.buttonSubtitle}>92/100 - Outstanding</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.demoButton} onPress={showParsedEvaluation}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.buttonGradient}
              >
                <Ionicons name="code-slash" size={24} color="#FFFFFF" />
                <View style={styles.buttonText}>
                  <Text style={styles.buttonTitle}>Test Parser</Text>
                  <Text style={styles.buttonSubtitle}>From Raw Text</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              Diese Demo zeigt das neue Design für Prüfungsevaluationen mit modernem UI,
              detailliertem Feedback und motivierenden Elementen.
            </Text>
          </View>
        </View>
      </LinearGradient>

      <Modal
        visible={showEvaluation}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <EvaluationDetailScreen
          evaluation={currentEvaluation}
          onClose={() => setShowEvaluation(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 32,
  },
  demoButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  buttonText: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E40AF',
    lineHeight: 20,
  },
});
