import React, { useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, Animated, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Evaluation } from '@/types/evaluation';
import ExaminerHeader from './ExaminerHeader';
import SummaryBox from './SummaryBox';
import CategoryTable from './CategoryTable';
import CorrectAnswers from './CorrectAnswers';
import MissingAnswers from './MissingAnswers';
import LearningPriorities from './LearningPriorities';
import LearningResources from './LearningResources';
import DetailedBreakdown from './DetailedBreakdown';
import FinalCertificate from './FinalCertificate';

interface Props {
  evaluation: Evaluation;
  onClose: () => void;
}

export default function ExaminerEvaluationScreen({ evaluation, onClose }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    logger.info('ExaminerEvaluationScreen mounted with professional design');
    logger.info('Evaluation data:', JSON.stringify(evaluation, null, 2));

    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!evaluation) {
    return null;
  }

  const handlePDFDownload = () => {
    Alert.alert('PDF Download', 'PDF wird generiert...');
  };

  const handleNewAttempt = () => {
    onClose();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
        {/* Close Button (Top Right) */}
        <TouchableOpacity onPress={onClose} style={styles.closeButtonTop}>
          <Ionicons name="close" size={28} color="#1e3a5f" />
        </TouchableOpacity>

        {/* Header with Score Badge */}
        <ExaminerHeader
          score={evaluation.score.total}
          maxScore={evaluation.score.maxScore}
          passed={evaluation.passed}
          evaluationType={evaluation.evaluationType}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary */}
          {evaluation.summary?.mainIssue && (
            <SummaryBox summary={evaluation.summary.mainIssue} />
          )}

          {/* Category Breakdown Table */}
          <CategoryTable
            categories={evaluation.scoreBreakdown}
            deductions={evaluation.deductions}
            deductionReason={evaluation.contextHint || undefined}
            finalScore={evaluation.score.total}
            maxScore={evaluation.score.maxScore}
          />

          {/* Correct Answers */}
          {evaluation.positives && evaluation.positives.length > 0 && (
            <CorrectAnswers answers={evaluation.positives} />
          )}

          {/* Missing Answers */}
          {evaluation.missedQuestions && evaluation.missedQuestions.length > 0 && (
            <MissingAnswers missedQuestions={evaluation.missedQuestions} />
          )}

          {/* Context Hint (if standalone and not used in CategoryTable) */}
          {evaluation.contextHint && !evaluation.deductions && (
            <SummaryBox summary={`💡 ${evaluation.contextHint}`} />
          )}

          {/* Learning Priorities */}
          {evaluation.priorities && evaluation.priorities.length > 0 && (
            <LearningPriorities priorities={evaluation.priorities} />
          )}

          {/* Learning Steps & Resources */}
          <LearningResources
            learningSteps={evaluation.nextSteps}
            resources={evaluation.resources}
          />

          {/* Detailed Breakdown (Collapsible) */}
          <DetailedBreakdown categories={evaluation.scoreBreakdown} />

          {/* Final Certificate */}
          <FinalCertificate
            totalScore={evaluation.score.total}
            maxScore={evaluation.score.maxScore}
            deductions={evaluation.deductions}
            passed={evaluation.passed}
            motivationalMessage={evaluation.motivationalMessage}
          />

          {/* Action Buttons */}
          <TouchableOpacity style={styles.primaryButton} onPress={handlePDFDownload}>
            <Ionicons name="download-outline" size={20} color="#ffffff" />
            <Animated.Text style={styles.primaryButtonText}>Als PDF herunterladen</Animated.Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleNewAttempt}>
            <Animated.Text style={styles.secondaryButtonText}>Neuer Versuch</Animated.Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  animatedContainer: {
    flex: 1,
  },
  closeButtonTop: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
    backgroundColor: '#ffffff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1e3a5f',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1e3a5f',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1e3a5f',
  },
});
