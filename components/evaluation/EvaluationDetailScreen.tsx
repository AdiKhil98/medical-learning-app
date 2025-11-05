import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Evaluation } from '@/types/evaluation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  evaluation: Evaluation;
  onClose: () => void;
}

export default function EvaluationDetailScreen({ evaluation, onClose }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('EvaluationDetailScreen mounted with new design');
    console.log('Evaluation data:', JSON.stringify(evaluation, null, 2));

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!evaluation) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={styles.errorTitle}>Fehler beim Laden</Text>
          <TouchableOpacity onPress={onClose} style={styles.btn}>
            <Text style={styles.btnText}>Schließen</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handlePDFDownload = () => {
    Alert.alert('PDF Download', 'PDF Download-Funktion wird bald verfügbar sein.');
  };

  const handleNewAttempt = () => {
    onClose();
  };

  // Determine status colors
  const statusColor = evaluation.passed ? '#4caf50' : '#f44336';
  const statusBgColor = evaluation.passed ? '#d4edda' : '#f8d7da';
  const statusTextColor = evaluation.passed ? '#155724' : '#721c24';

  return (
    <View style={styles.container}>
      {/* Close Button (Top Right) */}
      <TouchableOpacity onPress={onClose} style={styles.closeButtonTop}>
        <Ionicons name="close" size={32} color="#64748B" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* DANGEROUS ERROR ALERT - If Present */}
          {evaluation.hasDangerousError && evaluation.dangerousErrorText && (
            <View style={styles.dangerousErrorAlert}>
              <View style={styles.dangerousErrorHeader}>
                <Text style={styles.dangerousErrorIcon}>🚨🚨🚨</Text>
                <Text style={styles.dangerousErrorTitle}>GEFÄHRLICHER FEHLER</Text>
              </View>
              <Text style={styles.dangerousErrorText}>{evaluation.dangerousErrorText}</Text>
            </View>
          )}

          {/* HEADER SECTION */}
          <View style={styles.evalHeader}>
            {/* Phase Badge */}
            {evaluation.phase && (
              <View style={styles.phaseBadge}>
                <Text style={styles.phaseBadgeText}>📋 {evaluation.phase}</Text>
              </View>
            )}

            {/* Score Display */}
            <View style={styles.scoreDisplay}>
              <Text style={[styles.scoreNumber, { color: statusColor }]}>
                {evaluation.score.total}
              </Text>
              <Text style={styles.scoreLabel}>/ {evaluation.score.maxScore} Punkte</Text>
            </View>

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
              <Text style={[styles.statusBadgeText, { color: statusTextColor }]}>
                {evaluation.passed ? '✅ Bestanden' : '✗ Nicht Bestanden'}
              </Text>
            </View>
          </View>

          {/* ZUSAMMENFASSUNG */}
          {evaluation.summary.mainIssue && (
            <View style={styles.evalSection}>
              <Text style={styles.sectionTitle}>Zusammenfassung</Text>
              <Text style={styles.summaryText}>{evaluation.summary.mainIssue}</Text>
            </View>
          )}

          {/* PUNKTEVERTEILUNG (Score Breakdown) */}
          {evaluation.scoreBreakdown.length > 0 && (
            <View style={styles.evalSection}>
              <Text style={styles.sectionTitle}>Punkteverteilung</Text>
              {evaluation.scoreBreakdown.map((category, index) => (
                <View key={index} style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>{category.category}</Text>
                    <Text style={[styles.categoryScore, { color: category.color }]}>
                      {category.score}/{category.maxScore}
                    </Text>
                  </View>
                  <View style={styles.categoryBar}>
                    <Animated.View
                      style={[
                        styles.categoryFill,
                        {
                          width: `${category.percentage}%`,
                          backgroundColor: category.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}

              {/* Deductions Note */}
              {evaluation.deductions && evaluation.deductions > 0 && (
                <View style={styles.deductionsNote}>
                  <Text style={styles.deductionsText}>
                    <Text style={{ fontWeight: '600' }}>Abzüge:</Text> -{evaluation.deductions} Punkte
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ✅ DAS HABEN SIE GUT GEMACHT (Strengths) */}
          {evaluation.positives.length > 0 && (
            <View style={styles.evalSection}>
              <Text style={styles.sectionTitleIcon}>✅ Das haben Sie gut gemacht</Text>
              {evaluation.positives.map((positive, index) => {
                // Check if the positive has a bold title (format: **Title:** text)
                const match = positive.match(/^\*\*([^*:]+):\*\*\s*(.+)$/);

                return (
                  <View key={index} style={styles.feedbackItem}>
                    {match ? (
                      <>
                        <Text style={styles.feedbackStrong}>{match[1]}:</Text>
                        <Text style={styles.feedbackText}> {match[2]}</Text>
                      </>
                    ) : (
                      <Text style={styles.feedbackText}>{positive}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* ❓ WAS FEHLT NOCH (Missing Questions) */}
          {evaluation.missedQuestions && evaluation.missedQuestions.length > 0 && (
            <View style={styles.evalSection}>
              <Text style={styles.sectionTitleIcon}>❓ Was fehlt noch</Text>
              {evaluation.missedQuestions.map((question, index) => (
                <View key={index} style={styles.missingItem}>
                  <Text style={styles.missingStrong}>{question.category}:</Text>
                  <Text style={styles.missingText}> {question.reason}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 📚 LERNPRIORITÄTEN (Learning Priorities) */}
          {evaluation.priorities.length > 0 && (
            <View style={styles.evalSection}>
              <Text style={styles.sectionTitleIcon}>📚 Lernprioritäten</Text>
              {evaluation.priorities.map((priority, index) => (
                <View key={index} style={styles.priorityItem}>
                  <View style={[
                    styles.priorityBadge,
                    priority.level === 'DRINGEND' && styles.priorityDringend,
                    priority.level === 'WICHTIG' && styles.priorityWichtig,
                    priority.level === 'OPTIONAL' && styles.priorityOptional,
                  ]}>
                    <Text style={styles.priorityBadgeText}>
                      {priority.emoji} {priority.level}
                    </Text>
                  </View>
                  <Text style={styles.priorityText}>{priority.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 💪 NÄCHSTE SCHRITTE (Next Steps) */}
          {evaluation.nextSteps.length > 0 && (
            <View style={styles.evalSection}>
              <Text style={styles.sectionTitleIcon}>💪 Nächste Schritte</Text>
              {evaluation.nextSteps.map((step, index) => (
                <View key={index} style={styles.feedbackItem}>
                  <Text style={styles.feedbackStrong}>{index + 1}.</Text>
                  <Text style={styles.feedbackText}> {step.action}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 📖 EMPFOHLENE LEITLINIEN (Resources) */}
          {evaluation.resources.length > 0 && (
            <View style={styles.evalSection}>
              <Text style={styles.sectionTitleIcon}>📖 Empfohlene Leitlinien</Text>
              {evaluation.resources.map((resource, index) => (
                <View key={index} style={styles.resourceItem}>
                  <Text style={styles.resourceText}>{resource}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 💡 KONTEXTHINWEIS (Context Hint) */}
          {evaluation.contextHint && (
            <View style={styles.contextHint}>
              <Text style={styles.contextHintText}>💡 {evaluation.contextHint}</Text>
            </View>
          )}

          {/* ACTION BUTTONS */}
          <View style={styles.evalActions}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handlePDFDownload}>
              <Text style={styles.btnPrimaryText}>📥 PDF Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleNewAttempt}>
              <Text style={styles.btnSecondaryText}>🔄 Neuer Versuch</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  closeButtonTop: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 100,
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },

  // Dangerous Error Alert
  dangerousErrorAlert: {
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },

  dangerousErrorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },

  dangerousErrorIcon: {
    fontSize: 24,
  },

  dangerousErrorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ef4444',
  },

  dangerousErrorText: {
    fontSize: 15,
    color: '#7f1d1d',
    lineHeight: 22,
  },

  // Header Section
  evalHeader: {
    textAlign: 'center',
    alignItems: 'center',
    paddingBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    marginBottom: 30,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },

  phaseBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },

  phaseBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },

  scoreDisplay: {
    marginVertical: 20,
    alignItems: 'center',
  },

  scoreNumber: {
    fontSize: 64,
    fontWeight: '700',
    lineHeight: 64,
  },

  scoreLabel: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
  },

  statusBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 15,
  },

  statusBadgeText: {
    fontWeight: '600',
    fontSize: 16,
  },

  // Section
  evalSection: {
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    color: '#333',
  },

  sectionTitleIcon: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    color: '#333',
  },

  summaryText: {
    color: '#666',
    fontSize: 16,
    lineHeight: 24,
  },

  // Category Item
  categoryItem: {
    marginBottom: 20,
  },

  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  categoryName: {
    fontWeight: '600',
    color: '#333',
    fontSize: 15,
  },

  categoryScore: {
    fontWeight: '600',
    fontSize: 15,
  },

  categoryBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },

  categoryFill: {
    height: '100%',
    borderRadius: 4,
  },

  deductionsNote: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 6,
  },

  deductionsText: {
    color: '#856404',
    fontSize: 14,
  },

  // Feedback Item (Strengths)
  feedbackItem: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  feedbackStrong: {
    fontWeight: '700',
    color: '#000',
    fontSize: 14,
  },

  feedbackText: {
    color: '#333',
    fontSize: 14,
    flex: 1,
  },

  // Missing Item
  missingItem: {
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  missingStrong: {
    fontWeight: '700',
    color: '#856404',
    fontSize: 14,
  },

  missingText: {
    color: '#856404',
    fontSize: 14,
    flex: 1,
  },

  // Priority Item
  priorityItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },

  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 100,
  },

  priorityDringend: {
    backgroundColor: '#f44336',
  },

  priorityWichtig: {
    backgroundColor: '#ffc107',
  },

  priorityOptional: {
    backgroundColor: '#4caf50',
  },

  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  priorityText: {
    color: '#333',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },

  // Resource Item
  resourceItem: {
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
    marginBottom: 10,
  },

  resourceText: {
    color: '#1976d2',
    fontWeight: '500',
    fontSize: 14,
  },

  // Context Hint
  contextHint: {
    padding: 20,
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    marginVertical: 30,
    alignItems: 'center',
  },

  contextHintText: {
    color: '#2e7d32',
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },

  // Action Buttons
  evalActions: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 12,
    paddingTop: 30,
    justifyContent: 'center',
  },

  btn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#1976d2',
    alignItems: 'center',
  },

  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  btnPrimary: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    flex: Platform.OS === 'web' ? undefined : 1,
  },

  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  btnSecondary: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1976d2',
    alignItems: 'center',
    flex: Platform.OS === 'web' ? undefined : 1,
  },

  btnSecondaryText: {
    color: '#1976d2',
    fontSize: 16,
    fontWeight: '600',
  },

  // Error States
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    textAlign: 'center',
  },
});
