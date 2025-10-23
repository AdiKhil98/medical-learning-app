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
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Evaluation } from '@/types/evaluation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  evaluation: Evaluation;
  onClose: () => void;
}

export default function EvaluationDetailScreen({ evaluation, onClose }: Props) {
  // Safety checks
  useEffect(() => {
    console.log('EvaluationDetailScreen mounted');
    console.log('Evaluation data:', JSON.stringify(evaluation, null, 2));
  }, []);

  if (!evaluation) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={styles.errorTitle}>Fehler beim Laden</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Schließen</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Calculate stroke-dashoffset for circular progress (264 circumference)
  const percentage = evaluation.score.percentage || 0;
  const circumference = 264;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.caseTitle}>{evaluation.evaluationType}</Text>
            <Text style={styles.date}>
              {new Date(evaluation.timestamp).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })} um {new Date(evaluation.timestamp).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {/* Score Section with SVG Circle */}
          <View style={styles.scoreSection}>
            <View style={styles.scoreCircleWrapper}>
              <Svg width={140} height={140} viewBox="0 0 100 100" style={styles.circleBg}>
                {/* Trail Circle */}
                <Circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#E2E8F0"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress Circle */}
                <Circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#3B82F6"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin="50, 50"
                />
              </Svg>
              <View style={styles.scoreText}>
                <Text style={styles.scoreNumber}>{evaluation.score.total}</Text>
                <Text style={styles.scoreTotal}>/ {evaluation.score.maxScore}</Text>
              </View>
            </View>
            <Text style={styles.scoreLabel}>Gesamtbewertung</Text>
            <View style={styles.scorePercentageBadge}>
              <Text style={styles.scorePercentageText}>{percentage}%</Text>
            </View>
          </View>

          {/* Zusammenfassung */}
          {evaluation.summary.mainIssue && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, styles.sectionIconWarning]}>
                  <Text style={styles.iconEmoji}>⚠️</Text>
                </View>
                <Text style={styles.sectionTitle}>Zusammenfassung</Text>
              </View>
              <View style={styles.summaryText}>
                <Text style={styles.summaryTextContent}>{evaluation.summary.mainIssue}</Text>
              </View>
            </View>
          )}

          {/* Das haben Sie gut gemacht */}
          {evaluation.positives.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, styles.sectionIconSuccess]}>
                  <Text style={styles.iconEmoji}>✓</Text>
                </View>
                <Text style={styles.sectionTitle}>Das haben Sie gut gemacht</Text>
              </View>
              <View style={styles.itemList}>
                {evaluation.positives.map((positive, index) => (
                  <View key={index} style={styles.item}>
                    <View style={[styles.itemIcon, styles.itemIconSuccess]}>
                      <Text style={styles.itemIconText}>✓</Text>
                    </View>
                    <Text style={styles.itemText}>{positive}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Was besser sein könnte (Next Steps) */}
          {evaluation.nextSteps.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, styles.sectionIconImprove]}>
                  <Text style={styles.iconEmoji}>💡</Text>
                </View>
                <Text style={styles.sectionTitle}>Was besser sein könnte</Text>
              </View>
              <View style={styles.itemList}>
                {evaluation.nextSteps.map((step, index) => (
                  <View key={index} style={styles.item}>
                    <View style={[styles.itemIcon, styles.itemIconInfo]}>
                      <Text style={styles.itemIconText}>→</Text>
                    </View>
                    <Text style={styles.itemText}>
                      {step.action}: {step.details}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Kritische Fehler */}
          {evaluation.criticalErrors.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, styles.sectionIconError]}>
                  <Text style={styles.iconEmoji}>✕</Text>
                </View>
                <Text style={styles.sectionTitle}>
                  Kritische Fehler ({evaluation.criticalErrors.length})
                </Text>
              </View>

              {evaluation.criticalErrors.map((error, index) => (
                <View key={index} style={styles.errorItem}>
                  <View style={styles.errorHeader}>
                    <View style={styles.errorIconBadge}>
                      <Text style={styles.errorIconText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.errorTitle}>{error.title}</Text>
                  </View>
                  <View style={styles.errorContent}>
                    {error.examples.length > 0 && (
                      <>
                        <View style={styles.errorDetail}>
                          <Text style={styles.errorDetailLabel}>Was falsch war: </Text>
                          <Text style={styles.errorDetailText}>{error.examples[0].incorrect}</Text>
                        </View>
                        <View style={styles.errorDetail}>
                          <Text style={styles.errorDetailLabel}>Besser: </Text>
                          <Text style={styles.errorDetailText}>{error.examples[0].correct}</Text>
                        </View>
                      </>
                    )}
                    {error.whyProblematic && (
                      <View style={styles.errorDetail}>
                        <Text style={styles.errorDetailLabel}>Warum problematisch: </Text>
                        <Text style={styles.errorDetailText}>{error.whyProblematic}</Text>
                      </View>
                    )}
                    <View style={styles.errorPoints}>
                      <Text style={styles.errorPointsText}>-{error.pointDeduction} Punkte</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Fehlende Fragen (Missing Questions) */}
          {evaluation.missedQuestions && evaluation.missedQuestions.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, styles.sectionIconWarning]}>
                  <Text style={styles.iconEmoji}>❓</Text>
                </View>
                <Text style={styles.sectionTitle}>
                  Fehlende Fragen ({evaluation.missedQuestions.length})
                </Text>
              </View>

              {evaluation.missedQuestions.map((question, index) => (
                <View key={index} style={styles.missingQuestionItem}>
                  <View style={styles.missingQuestionHeader}>
                    <View style={[
                      styles.importanceBadge,
                      question.importance === 'critical' && styles.importanceCritical,
                      question.importance === 'important' && styles.importanceImportant,
                      question.importance === 'recommended' && styles.importanceRecommended,
                    ]}>
                      <Text style={styles.importanceText}>
                        {question.importance === 'critical' ? 'Kritisch' :
                         question.importance === 'important' ? 'Wichtig' : 'Empfohlen'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.missingQuestionCategory}>{question.category}</Text>

                  <View style={styles.missingQuestionDetail}>
                    <Text style={styles.missingQuestionLabel}>Warum wichtig: </Text>
                    <Text style={styles.missingQuestionText}>{question.reason}</Text>
                  </View>

                  {question.correctFormulations.length > 0 && (
                    <View style={styles.missingQuestionDetail}>
                      <Text style={styles.missingQuestionLabel}>Richtige Formulierung: </Text>
                      {question.correctFormulations.map((formulation, fIndex) => (
                        <Text key={fIndex} style={styles.formulationText}>
                          • {formulation}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Score Breakdown (Categories) */}
          {evaluation.scoreBreakdown.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, styles.sectionIconInfo]}>
                  <Text style={styles.iconEmoji}>📊</Text>
                </View>
                <Text style={styles.sectionTitle}>Kategorien</Text>
              </View>
              <View style={styles.categoryList}>
                {evaluation.scoreBreakdown.map((category, index) => (
                  <View key={index} style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>{category.category}</Text>
                      <Text style={[styles.categoryPercentage, { color: category.color }]}>
                        {category.percentage}%
                      </Text>
                    </View>
                    <View style={styles.categoryProgressBar}>
                      <View
                        style={[
                          styles.categoryProgressFill,
                          { width: `${category.percentage}%`, backgroundColor: category.color },
                        ]}
                      />
                    </View>
                    <Text style={styles.categoryScore}>
                      {category.score}/{category.maxScore}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Motivational Message */}
          {evaluation.motivationalMessage && (
            <View style={styles.motivationalCard}>
              <Text style={styles.motivationalIcon}>💪</Text>
              <Text style={styles.motivationalText}>{evaluation.motivationalMessage}</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },

  caseTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },

  date: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Score Section
  scoreSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  scoreCircleWrapper: {
    width: 140,
    height: 140,
    marginBottom: 20,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  circleBg: {
    transform: [{ rotate: '-90deg' }],
  },

  scoreText: {
    position: 'absolute',
    alignItems: 'center',
  },

  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#3B82F6',
    lineHeight: 48,
  },

  scoreTotal: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '500',
  },

  scoreLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    fontWeight: '600',
  },

  scorePercentageBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },

  scorePercentageText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },

  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sectionIconWarning: {
    backgroundColor: '#FEF3C7',
  },

  sectionIconSuccess: {
    backgroundColor: '#D1FAE5',
  },

  sectionIconImprove: {
    backgroundColor: '#DBEAFE',
  },

  sectionIconError: {
    backgroundColor: '#FEE2E2',
  },

  sectionIconInfo: {
    backgroundColor: '#DBEAFE',
  },

  iconEmoji: {
    fontSize: 18,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },

  // Summary Text
  summaryText: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },

  summaryTextContent: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 25.2, // 1.8 * 14
  },

  // Item List
  itemList: {
    gap: 12,
  },

  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
  },

  itemIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },

  itemIconSuccess: {
    backgroundColor: '#D1FAE5',
  },

  itemIconInfo: {
    backgroundColor: '#DBEAFE',
  },

  itemIconText: {
    fontSize: 14,
    fontWeight: '700',
  },

  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 21, // 1.5 * 14
  },

  // Error Item
  errorItem: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  errorIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  errorTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },

  errorContent: {
    paddingLeft: 38,
  },

  errorDetail: {
    marginBottom: 8,
  },

  errorDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },

  errorDetailText: {
    fontSize: 13,
    color: '#1E293B',
    marginTop: 2,
  },

  errorPoints: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },

  errorPointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Missing Questions
  missingQuestionItem: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  missingQuestionHeader: {
    marginBottom: 12,
  },

  importanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  importanceCritical: {
    backgroundColor: '#EF4444',
  },

  importanceImportant: {
    backgroundColor: '#F59E0B',
  },

  importanceRecommended: {
    backgroundColor: '#3B82F6',
  },

  importanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },

  missingQuestionCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },

  missingQuestionDetail: {
    marginBottom: 8,
  },

  missingQuestionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },

  missingQuestionText: {
    fontSize: 13,
    color: '#1E293B',
    marginTop: 2,
  },

  formulationText: {
    fontSize: 13,
    color: '#065F46',
    marginTop: 4,
    marginLeft: 8,
    fontStyle: 'italic',
  },

  // Category List
  categoryList: {
    gap: 16,
  },

  categoryItem: {
    paddingVertical: 8,
  },

  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },

  categoryPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },

  categoryProgressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },

  categoryProgressFill: {
    height: '100%',
    borderRadius: 4,
  },

  categoryScore: {
    fontSize: 12,
    color: '#64748B',
  },

  // Motivational Card
  motivationalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  motivationalIcon: {
    fontSize: 40,
    marginBottom: 16,
  },

  motivationalText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
  },

  // Error States
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    textAlign: 'center',
  },

  closeBtn: {
    marginTop: 24,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },

  closeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
