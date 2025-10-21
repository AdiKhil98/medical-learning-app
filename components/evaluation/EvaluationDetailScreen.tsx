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
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Evaluation } from '@/types/evaluation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  evaluation: Evaluation;
  onClose: () => void;
}

export default function EvaluationDetailScreen({ evaluation, onClose }: Props) {
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set([0]));
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scoreAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleError = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getStatusColor = () => {
    switch (evaluation.score.status) {
      case 'excellent':
        return '#10B981';
      case 'good':
        return '#3B82F6';
      case 'needsWork':
        return '#F59E0B';
      case 'critical':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.evaluationBadge}>
              <Ionicons name="medical" size={16} color="#3B82F6" />
              <Text style={styles.evaluationBadgeText}>{evaluation.evaluationType}</Text>
            </View>
            <Text style={styles.headerDate}>
              {new Date(evaluation.timestamp).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#64748B" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Hero Score Card */}
          <Animated.View style={[styles.scoreHero, { transform: [{ scale: scoreAnim }] }]}>
            <LinearGradient
              colors={[getStatusColor() + '15', getStatusColor() + '08']}
              style={styles.scoreHeroGradient}
            >
              <View style={styles.scoreCircleContainer}>
                <View style={[styles.scoreCircle, { borderColor: getStatusColor() }]}>
                  <Text style={[styles.scoreNumber, { color: getStatusColor() }]}>
                    {evaluation.score.total}
                  </Text>
                  <Text style={styles.scoreMax}>/ {evaluation.score.maxScore}</Text>
                </View>
                <View style={[styles.scoreRing, { borderColor: getStatusColor() }]} />
              </View>

              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.statusText}>
                  {evaluation.score.statusText} {evaluation.score.statusEmoji}
                </Text>
              </View>

              <Text style={styles.scorePercentage}>{evaluation.score.percentage}%</Text>
            </LinearGradient>
          </Animated.View>

          {/* Score Breakdown Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detaillierte Bewertung</Text>
            <View style={styles.breakdownGrid}>
              {evaluation.scoreBreakdown.map((item, index) => (
                <View key={index} style={styles.breakdownCard}>
                  <View style={styles.breakdownHeader}>
                    <View style={[styles.breakdownIcon, { backgroundColor: item.color + '20' }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <Text style={styles.breakdownCategory}>{item.category}</Text>
                  </View>

                  <View style={styles.breakdownScore}>
                    <Text style={styles.breakdownScoreText}>
                      {item.score}/{item.maxScore}
                    </Text>
                    <Text style={[styles.breakdownPercentage, { color: item.color }]}>
                      {item.percentage}%
                    </Text>
                  </View>

                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                      <LinearGradient
                        colors={[item.color, item.color + 'CC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressBarFill, { width: `${item.percentage}%` }]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Summary Card */}
          <View style={styles.section}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="document-text" size={24} color="#3B82F6" />
                <Text style={styles.summaryTitle}>Zusammenfassung</Text>
              </View>

              <View style={styles.summaryContent}>
                <View style={styles.mainIssueBox}>
                  <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                  <Text style={styles.mainIssueText}>{evaluation.summary.mainIssue}</Text>
                </View>

                {evaluation.summary.strengths.length > 0 && (
                  <View style={styles.strengthsBox}>
                    <Text style={styles.strengthsTitle}>Stärken:</Text>
                    {evaluation.summary.strengths.slice(0, 3).map((strength, index) => (
                      <View key={index} style={styles.strengthItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.strengthText}>{strength}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.criticalGapsBox}>
                  <Ionicons name="warning" size={18} color="#EF4444" />
                  <Text style={styles.criticalGapsText}>
                    {evaluation.summary.criticalGapsCount} kritische{' '}
                    {evaluation.summary.criticalGapsCount === 1 ? 'Fehler' : 'Fehler'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Critical Errors Section */}
          {evaluation.criticalErrors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Fehleranalyse ({evaluation.criticalErrors.length})
              </Text>

              {evaluation.criticalErrors.map((error, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.errorCard,
                    {
                      borderLeftColor:
                        error.severity === 'critical'
                          ? '#EF4444'
                          : error.severity === 'major'
                          ? '#F59E0B'
                          : '#FCD34D',
                    },
                  ]}
                  onPress={() => toggleError(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.errorHeader}>
                    <View style={styles.errorHeaderLeft}>
                      <View
                        style={[
                          styles.severityBadge,
                          {
                            backgroundColor:
                              error.severity === 'critical'
                                ? '#FEE2E2'
                                : error.severity === 'major'
                                ? '#FEF3C7'
                                : '#FEF9C3',
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            error.severity === 'critical'
                              ? 'warning'
                              : error.severity === 'major'
                              ? 'alert-circle'
                              : 'information-circle'
                          }
                          size={14}
                          color={
                            error.severity === 'critical'
                              ? '#EF4444'
                              : error.severity === 'major'
                              ? '#F59E0B'
                              : '#FCD34D'
                          }
                        />
                        <Text
                          style={[
                            styles.severityText,
                            {
                              color:
                                error.severity === 'critical'
                                  ? '#991B1B'
                                  : error.severity === 'major'
                                  ? '#92400E'
                                  : '#854D0E',
                            },
                          ]}
                        >
                          {error.severity === 'critical'
                            ? 'Kritisch'
                            : error.severity === 'major'
                            ? 'Wichtig'
                            : 'Hinweis'}
                        </Text>
                      </View>

                      <View style={styles.pointDeduction}>
                        <Text style={styles.pointDeductionText}>-{error.pointDeduction}</Text>
                        <Text style={styles.pointDeductionLabel}>Pkt</Text>
                      </View>
                    </View>

                    <Ionicons
                      name={expandedErrors.has(index) ? 'chevron-up' : 'chevron-down'}
                      size={24}
                      color="#94A3B8"
                    />
                  </View>

                  <Text style={styles.errorTitle}>{error.title}</Text>

                  {expandedErrors.has(index) && (
                    <View style={styles.errorDetails}>
                      {error.examples.length > 0 && (
                        <View style={styles.comparisonBox}>
                          <View style={styles.incorrectBox}>
                            <View style={styles.comparisonHeader}>
                              <Ionicons name="close-circle" size={18} color="#EF4444" />
                              <Text style={styles.comparisonLabel}>Falsch:</Text>
                            </View>
                            <Text style={styles.incorrectText}>{error.examples[0].incorrect}</Text>
                          </View>

                          <View style={styles.correctBox}>
                            <View style={styles.comparisonHeader}>
                              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                              <Text style={styles.comparisonLabel}>Richtig:</Text>
                            </View>
                            <Text style={styles.correctText}>{error.examples[0].correct}</Text>
                          </View>
                        </View>
                      )}

                      {error.whyProblematic && (
                        <View style={styles.explanationBox}>
                          <Text style={styles.explanationTitle}>
                            <Ionicons name="help-circle" size={16} color="#8B5CF6" /> Warum
                            problematisch:
                          </Text>
                          <Text style={styles.explanationText}>{error.whyProblematic}</Text>
                        </View>
                      )}

                      {error.betterApproach && (
                        <View style={styles.explanationBox}>
                          <Text style={styles.explanationTitle}>
                            <Ionicons name="bulb" size={16} color="#F59E0B" /> Besserer Ansatz:
                          </Text>
                          <Text style={styles.explanationText}>{error.betterApproach}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Positive Aspects */}
          {evaluation.positives.length > 0 && (
            <View style={styles.section}>
              <View style={styles.positivesCard}>
                <LinearGradient
                  colors={['#D1FAE5', '#ECFDF5']}
                  style={styles.positivesGradient}
                >
                  <View style={styles.positivesHeader}>
                    <Ionicons name="checkmark-done-circle" size={32} color="#059669" />
                    <Text style={styles.positivesTitle}>Das haben Sie gut gemacht!</Text>
                  </View>

                  {evaluation.positives.map((positive, index) => (
                    <View key={index} style={styles.positiveItem}>
                      <Ionicons name="checkmark" size={20} color="#059669" />
                      <Text style={styles.positiveText}>{positive}</Text>
                    </View>
                  ))}
                </LinearGradient>
              </View>
            </View>
          )}

          {/* Next Steps */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nächste Schritte</Text>

            {evaluation.nextSteps.map((step, index) => (
              <View key={index} style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{step.priority}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepAction}>{step.action}</Text>
                    <Text style={styles.stepDetails}>{step.details}</Text>
                  </View>
                </View>

                {step.exerciseLink && (
                  <TouchableOpacity style={styles.stepButton}>
                    <Text style={styles.stepButtonText}>Jetzt üben</Text>
                    <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Motivational Footer */}
          <View style={styles.motivationalCard}>
            <LinearGradient
              colors={['#EDE9FE', '#F3E8FF', '#EDE9FE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.motivationalGradient}
            >
              <Ionicons name="bulb" size={48} color="#8B5CF6" />
              <Text style={styles.motivationalText}>{evaluation.motivationalMessage}</Text>

              <TouchableOpacity style={styles.ctaButton}>
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaButtonGradient}
                >
                  <Text style={styles.ctaButtonText}>Weiter üben</Text>
                  <Ionicons name="arrow-forward-circle" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
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

  // Header Styles
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  evaluationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  evaluationBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
  },
  headerDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  closeButton: {
    padding: 4,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },

  // Hero Score Card
  scoreHero: {
    marginBottom: 32,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  scoreHeroGradient: {
    padding: 40,
    alignItems: 'center',
  },
  scoreCircleContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  scoreRing: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 2,
    opacity: 0.2,
  },
  scoreNumber: {
    fontSize: 56,
    fontFamily: 'Inter-Bold',
    letterSpacing: -2,
  },
  scoreMax: {
    fontSize: 20,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: -4,
  },
  statusBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  scorePercentage: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },

  // Section Styles
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 16,
  },

  // Score Breakdown Grid
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  breakdownCard: {
    width: (SCREEN_WIDTH - 64) / 2,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  breakdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownCategory: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    flex: 1,
  },
  breakdownScore: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  breakdownScoreText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  breakdownPercentage: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  summaryContent: {
    gap: 16,
  },
  mainIssueBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  mainIssueText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 22,
  },
  strengthsBox: {
    gap: 8,
  },
  strengthsTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  strengthText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    flex: 1,
  },
  criticalGapsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  criticalGapsText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#991B1B',
  },

  // Error Card
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  pointDeduction: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pointDeductionText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
  },
  pointDeductionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  errorDetails: {
    marginTop: 16,
    gap: 12,
  },
  comparisonBox: {
    gap: 12,
  },
  incorrectBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  correctBox: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  comparisonLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  incorrectText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#991B1B',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  correctText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#065F46',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  explanationBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  explanationTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#475569',
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },

  // Positives Card
  positivesCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  positivesGradient: {
    padding: 20,
  },
  positivesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  positivesTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#065F46',
  },
  positiveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  positiveText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#047857',
    lineHeight: 22,
  },

  // Next Steps
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepAction: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 6,
  },
  stepDetails: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 22,
  },
  stepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  stepButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
  },

  // Motivational Footer
  motivationalCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  motivationalGradient: {
    padding: 32,
    alignItems: 'center',
  },
  motivationalText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B21A8',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 24,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  ctaButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});
