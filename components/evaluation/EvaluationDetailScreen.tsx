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
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Evaluation } from '@/types/evaluation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  evaluation: Evaluation;
  onClose: () => void;
  theme?: 'patient' | 'examiner'; // Add theme prop
}

export default function EvaluationDetailScreen({ evaluation, onClose, theme = 'patient' }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  // Theme colors
  const isExaminer = theme === 'examiner';

  // DEBUG LOGGING
  console.log('='.repeat(50));
  console.log('EvaluationDetailScreen RENDER');
  console.log('Theme prop received:', theme);
  console.log('isExaminer:', isExaminer);
  console.log('='.repeat(50));

  const colors = {
    // Hero background gradient
    heroBg: isExaminer ? ['#1e3a5f', '#2c5aa0'] : ['#667eea', '#764ba2'],
    // Hero top line
    heroTopLine: isExaminer ? ['#2c5aa0', '#4a90e2'] : ['#4caf50', '#8bc34a'],
    // Circle progress stroke
    circleStroke: isExaminer ? '#2c5aa0' : '#4caf50',
    // Circle score number
    circleNumber: isExaminer ? '#1e3a5f' : '#4caf50',
    // Category score badge gradient
    categoryScore: isExaminer ? ['#2c5aa0', '#4a90e2'] : ['#667eea', '#764ba2'],
    // Category progress bar gradient
    categoryBar: isExaminer ? ['#2c5aa0', '#4a90e2'] : ['#4caf50', '#8bc34a'],
    // Phase badge gradient
    phaseBadge: isExaminer ? ['#1e3a5f', '#2c5aa0'] : ['#667eea', '#764ba2'],
    // Primary button gradient
    primaryBtn: isExaminer ? ['#1e3a5f', '#2c5aa0'] : ['#667eea', '#764ba2'],
    // Primary button shadow color
    primaryBtnShadow: isExaminer ? '#1e3a5f' : '#667eea',
    // Secondary button border color
    secondaryBtnBorder: isExaminer ? '#2c5aa0' : '#667eea',
    // Secondary button text color
    secondaryBtnText: isExaminer ? '#2c5aa0' : '#667eea',
    // Resource card gradient
    resourceCard: isExaminer ? ['#e8eaf6', '#c5cae9'] : ['#e3f2fd', '#bbdefb'],
    // Resource card border
    resourceCardBorder: isExaminer ? '#2c5aa0' : '#1976d2',
    // Resource text color
    resourceText: isExaminer ? '#2c5aa0' : '#1565c0',
    // Context hint gradient
    contextHint: isExaminer ? ['#e3f2fd', '#bbdefb'] : ['#e8f5e9', '#c8e6c9'],
    // Context hint border
    contextHintBorder: isExaminer ? '#2c5aa0' : '#4caf50',
    // Context hint text
    contextHintText: isExaminer ? '#1565c0' : '#1b5e20',
  };

  console.log('Colors object created:');
  console.log('  heroBg:', colors.heroBg);
  console.log('  circleStroke:', colors.circleStroke);
  console.log('  categoryBar:', colors.categoryBar);

  useEffect(() => {
    console.log('EvaluationDetailScreen mounted with MODERN ENHANCED design');
    console.log('Theme:', theme);
    console.log('Evaluation data:', JSON.stringify(evaluation, null, 2));

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scoreAnim, {
        toValue: 1,
        duration: 1500,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
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
    Alert.alert('PDF Download', 'PDF wird generiert...');
  };

  const handleNewAttempt = () => {
    onClose();
  };

  // Determine celebration message based on score
  let celebrationMessage = 'Gute Leistung!';
  let celebrationEmoji = '👍';
  if (evaluation.score.percentage >= 90) {
    celebrationMessage = 'Hervorragende Leistung!';
    celebrationEmoji = '🎉';
  } else if (evaluation.score.percentage >= 75) {
    celebrationMessage = 'Sehr gute Arbeit!';
    celebrationEmoji = '✨';
  } else if (evaluation.score.percentage >= 60) {
    celebrationMessage = 'Bestanden!';
    celebrationEmoji = '✅';
  } else {
    celebrationMessage = 'Weiter üben!';
    celebrationEmoji = '💪';
  }

  // Calculate stroke-dashoffset for circular progress
  const percentage = evaluation.score.percentage || 0;
  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Animated stroke dashoffset
  const animatedStrokeDashoffset = scoreAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, strokeDashoffset],
  });

  return (
    <LinearGradient
      colors={colors.heroBg}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Close Button (Top Right) */}
      <TouchableOpacity onPress={onClose} style={styles.closeButtonTop}>
        <Ionicons name="close" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* TEMPORARY DEBUG: Show current theme */}
      <View style={{
        position: 'absolute',
        top: Platform.OS === 'ios' ? 90 : 60,
        left: 20,
        backgroundColor: theme === 'examiner' ? '#1e3a5f' : '#667eea',
        padding: 10,
        borderRadius: 8,
        zIndex: 100,
      }}>
        <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
          THEME: {theme.toUpperCase()}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* HERO CARD */}
          <View style={styles.heroCard}>
            {/* Top gradient line */}
            <LinearGradient
              colors={colors.heroTopLine}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heroTopLine}
            />

            {/* Phase Badge */}
            {evaluation.phase && (
              <LinearGradient
                colors={colors.phaseBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.phaseBadge}
              >
                <Text style={styles.phaseBadgeText}>📋 {evaluation.phase.toUpperCase()}</Text>
              </LinearGradient>
            )}

            {/* Score Circle Container */}
            <View style={styles.scoreCircleContainer}>
              {/* Animated Score Circle */}
              <View style={styles.scoreCircle}>
                <Svg width={180} height={180}>
                  {/* Background Circle */}
                  <Circle
                    cx="90"
                    cy="90"
                    r="80"
                    stroke="#e0e0e0"
                    strokeWidth="12"
                    fill="none"
                  />
                  {/* Progress Circle */}
                  <Circle
                    cx="90"
                    cy="90"
                    r="80"
                    stroke={colors.circleStroke}
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={animatedStrokeDashoffset}
                    rotation="-90"
                    origin="90, 90"
                  />
                </Svg>
                <View style={styles.scoreText}>
                  <Text style={[styles.scoreNumber, { color: colors.circleNumber }]}>{evaluation.score.total}</Text>
                  <Text style={styles.scoreLabel}>/{evaluation.score.maxScore}</Text>
                </View>
              </View>

              {/* Status Info */}
              <View style={styles.statusInfo}>
                <Text style={styles.celebrationMessage}>
                  {celebrationEmoji} {celebrationMessage}
                </Text>
                <View style={[
                  styles.statusBadge,
                  !evaluation.passed && styles.statusBadgeFail
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {evaluation.passed ? '✅ Bestanden' : '✗ Nicht Bestanden'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ZUSAMMENFASSUNG */}
          {evaluation.summary.mainIssue && (
            <View style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>📝 Zusammenfassung</Text>
              <Text style={styles.summaryText}>{evaluation.summary.mainIssue}</Text>
            </View>
          )}

          {/* CATEGORY GRID */}
          {evaluation.scoreBreakdown.length > 0 && (
            <View style={styles.categoryGrid}>
              {evaluation.scoreBreakdown.map((category, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.categoryCard,
                    {
                      opacity: fadeAnim,
                      transform: [{
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      }],
                    },
                  ]}
                >
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>{category.category}</Text>
                    <LinearGradient
                      colors={colors.categoryScore}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ borderRadius: 4 }}
                    >
                      <Text style={styles.categoryScore}>
                        {category.score}/{category.maxScore}
                      </Text>
                    </LinearGradient>
                  </View>
                  <View style={styles.categoryBar}>
                    <LinearGradient
                      colors={colors.categoryBar}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.categoryFill,
                        { width: `${category.percentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryPercentage}>{category.percentage}% erreicht</Text>
                </Animated.View>
              ))}
            </View>
          )}

          {/* Deductions Badge */}
          {evaluation.deductions && evaluation.deductions > 0 && (
            <View style={styles.deductionsContainer}>
              <View style={styles.deductionsBadge}>
                <Text style={styles.deductionsText}>
                  ⚠️ Abzüge: -{evaluation.deductions} Punkte
                </Text>
              </View>
            </View>
          )}

          {/* ✅ STRENGTHS */}
          {evaluation.positives.length > 0 && (
            <View style={styles.feedbackSection}>
              <Text style={styles.sectionTitle}>✅ Das haben Sie hervorragend gemacht</Text>
              <View style={styles.feedbackGrid}>
                {evaluation.positives.map((positive, index) => {
                  const match = positive.match(/^\*\*([^*:]+):\*\*\s*(.+)$/);
                  return (
                    <LinearGradient
                      key={index}
                      colors={['#f8f9fa', '#e9ecef']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.feedbackItem}
                    >
                      {match ? (
                        <>
                          <Text style={styles.feedbackStrong}>{match[1]}</Text>
                          <Text style={styles.feedbackText}>{match[2]}</Text>
                        </>
                      ) : (
                        <Text style={styles.feedbackText}>{positive}</Text>
                      )}
                    </LinearGradient>
                  );
                })}
              </View>
            </View>
          )}

          {/* ❓ MISSING QUESTIONS */}
          {evaluation.missedQuestions && evaluation.missedQuestions.length > 0 && (
            <View style={styles.feedbackSection}>
              <Text style={styles.sectionTitle}>❓ Verbesserungspotenzial</Text>
              {evaluation.missedQuestions.map((question, index) => (
                <View key={index} style={styles.warningItem}>
                  <Text style={styles.warningStrong}>{question.category}</Text>
                  <Text style={styles.warningText}>{question.reason}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 📚 PRIORITIES */}
          {evaluation.priorities.length > 0 && (
            <View style={styles.feedbackSection}>
              <Text style={styles.sectionTitle}>📚 Ihre Lernprioritäten</Text>
              <View style={styles.priorityContainer}>
                {evaluation.priorities.map((priority, index) => {
                  const gradientColors =
                    priority.level === 'DRINGEND'
                      ? ['#ff6b6b', '#ee5a6f']
                      : priority.level === 'WICHTIG'
                      ? ['#ffd93d', '#ffc107']
                      : ['#6bcf7f', '#4caf50'];

                  const labelColor =
                    priority.level === 'DRINGEND'
                      ? '#dc3545'
                      : priority.level === 'WICHTIG'
                      ? '#ffc107'
                      : '#28a745';

                  return (
                    <View key={index} style={styles.priorityCard}>
                      <LinearGradient
                        colors={gradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.priorityIcon}
                      >
                        <Text style={styles.priorityEmoji}>{priority.emoji}</Text>
                      </LinearGradient>
                      <View style={styles.priorityContent}>
                        <Text style={[styles.priorityLabel, { color: labelColor }]}>
                          {priority.level}
                        </Text>
                        <Text style={styles.priorityText}>{priority.text}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* 📖 RESOURCES */}
          {evaluation.resources.length > 0 && (
            <View style={styles.feedbackSection}>
              <Text style={styles.sectionTitle}>📖 Empfohlene Leitlinien</Text>
              <View style={styles.resourceGrid}>
                {evaluation.resources.map((resource, index) => (
                  <LinearGradient
                    key={index}
                    colors={colors.resourceCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.resourceCard}
                  >
                    <Text style={styles.resourceIcon}>📘</Text>
                    <Text style={[styles.resourceText, { color: colors.resourceText }]}>{resource}</Text>
                  </LinearGradient>
                ))}
              </View>
            </View>
          )}

          {/* 💡 CONTEXT HINT */}
          {evaluation.contextHint && (
            <LinearGradient
              colors={colors.contextHint}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.contextHint, { borderColor: colors.contextHintBorder }]}
            >
              <Text style={[styles.contextHintText, { color: colors.contextHintText }]}>
                💡 <Text style={{ fontWeight: '700' }}>Hinweis:</Text> {evaluation.contextHint}
              </Text>
            </LinearGradient>
          )}

          {/* ACTION BUTTONS */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={handlePDFDownload}>
              <LinearGradient
                colors={colors.primaryBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.btnPrimary, { shadowColor: colors.primaryBtnShadow }]}
              >
                <Text style={styles.btnPrimaryText}>📥 Als PDF herunterladen</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNewAttempt}
              style={[styles.btnSecondary, { borderColor: colors.secondaryBtnBorder }]}
            >
              <Text style={[styles.btnSecondaryText, { color: colors.secondaryBtnText }]}>🔄 Neuer Versuch</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  closeButtonTop: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 100,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 40,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
    elevation: 20,
    position: 'relative',
    overflow: 'hidden',
  },

  heroTopLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },

  phaseBadge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },

  phaseBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  scoreCircleContainer: {
    flexDirection: SCREEN_WIDTH > 768 ? 'row' : 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 60,
  },

  scoreCircle: {
    width: 180,
    height: 180,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scoreText: {
    position: 'absolute',
    alignItems: 'center',
  },

  scoreNumber: {
    fontSize: 56,
    fontWeight: '800',
    color: '#4caf50',
    lineHeight: 56,
  },

  scoreLabel: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },

  statusInfo: {
    alignItems: 'center',
  },

  celebrationMessage: {
    fontSize: 32,
    color: '#1a1a1a',
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },

  statusBadge: {
    backgroundColor: '#d4edda',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },

  statusBadgeFail: {
    backgroundColor: '#f8d7da',
    shadowColor: '#dc3545',
  },

  statusBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#155724',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 35,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },

  sectionTitle: {
    fontSize: 20,
    color: '#1a1a1a',
    fontWeight: '700',
    marginBottom: 15,
  },

  summaryText: {
    color: '#555',
    lineHeight: 28,
    fontSize: 16,
  },

  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 30,
    marginBottom: 30,
  },

  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    flex: 1,
    minWidth: SCREEN_WIDTH > 768 ? 300 : '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },

  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },

  categoryScore: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  categoryBar: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
  },

  categoryFill: {
    height: '100%',
    borderRadius: 10,
  },

  categoryPercentage: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontWeight: '600',
  },

  // Deductions
  deductionsContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },

  deductionsBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffc107',
  },

  deductionsText: {
    color: '#856404',
    fontWeight: '600',
    fontSize: 15,
  },

  // Feedback Section
  feedbackSection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 35,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },

  feedbackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },

  feedbackItem: {
    padding: 18,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
    flex: 1,
    minWidth: SCREEN_WIDTH > 768 ? 300 : '100%',
  },

  feedbackStrong: {
    color: '#1a1a1a',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },

  feedbackText: {
    color: '#555',
    fontSize: 14,
    lineHeight: 22,
  },

  // Warning Items
  warningItem: {
    padding: 20,
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    marginBottom: 15,
  },

  warningStrong: {
    color: '#856404',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },

  warningText: {
    color: '#856404',
    fontSize: 14,
    lineHeight: 22,
  },

  // Priority Container
  priorityContainer: {
    gap: 20,
  },

  priorityCard: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },

  priorityIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 6,
  },

  priorityEmoji: {
    fontSize: 28,
  },

  priorityContent: {
    flex: 1,
  },

  priorityLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },

  priorityText: {
    color: '#333',
    fontSize: 15,
    lineHeight: 24,
  },

  // Resources
  resourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },

  resourceCard: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: SCREEN_WIDTH > 768 ? 250 : '100%',
    borderWidth: 2,
    borderColor: 'transparent',
  },

  resourceIcon: {
    fontSize: 24,
  },

  resourceText: {
    color: '#1565c0',
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
  },

  // Context Hint
  contextHint: {
    padding: 30,
    borderRadius: 20,
    marginVertical: 30,
    borderWidth: 2,
    borderColor: '#4caf50',
  },

  contextHintText: {
    color: '#1b5e20',
    fontSize: 16,
    lineHeight: 28,
    textAlign: 'center',
  },

  // Actions
  actions: {
    flexDirection: SCREEN_WIDTH > 768 ? 'row' : 'column',
    gap: 20,
    justifyContent: 'center',
    marginTop: 40,
  },

  btnPrimary: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },

  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  btnSecondary: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#667eea',
    alignItems: 'center',
  },

  btnSecondaryText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '700',
  },

  // Error States
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    textAlign: 'center',
  },

  btn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    marginTop: 20,
  },

  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
