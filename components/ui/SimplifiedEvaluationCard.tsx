import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronRight, Award, Target, CheckCircle2, AlertTriangle, TrendingUp, Eye } from 'lucide-react-native';

interface SimplifiedEvaluationCardProps {
  evaluation: {
    id: string;
    score: number;
    exam_type: string;
    conversation_type: string;
    evaluation: string;
    created_at: string;
  };
  onPress?: () => void;
}

interface FocusArea {
  title: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

export function SimplifiedEvaluationCard({ evaluation, onPress }: SimplifiedEvaluationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const scoreColor = evaluation.score >= 60 ? '#10B981' : '#EF4444';
  const scoreBg = evaluation.score >= 60 ? '#ECFDF5' : '#FEF2F2';
  const scoreStatus = evaluation.score >= 60 ? 'Bestanden' : 'Zu wiederholen';

  // Smart content extraction for simplified view
  const extractKeyInsights = (text: string) => {
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 15);

    // Extract main focus area (most critical improvement)
    const criticalPattern = /(?:kritisch|fehler|problem|mangel|schwäche)/i;
    const mainFocus = sentences.find(s => criticalPattern.test(s)) || sentences[0] || 'Keine spezifischen Verbesserungen identifiziert';

    // Extract strength (positive feedback)
    const strengthPattern = /(?:gut|richtig|korrekt|positiv|stark|erfolgreich)/i;
    const strength = sentences.find(s => strengthPattern.test(s)) || 'Kontinuierliche Entwicklung erkennbar';

    // Extract actionable steps
    const actionPattern = /(?:sollten|empfehlung|nächste|üben|lernen|fokus)/i;
    const nextSteps = sentences.filter(s => actionPattern.test(s)).slice(0, 2);

    return {
      mainFocus: cleanupText(mainFocus),
      strength: cleanupText(strength),
      nextSteps: nextSteps.map(cleanupText).filter(Boolean),
      fullText: text
    };
  };

  const cleanupText = (text: string): string => {
    return text
      .replace(/^\s*[-•*]\s*/, '') // Remove bullet points
      .replace(/^\s*\d+\.\s*/, '') // Remove numbers
      .trim()
      .replace(/^[a-z]/, (match) => match.toUpperCase()); // Capitalize first letter
  };

  const insights = extractKeyInsights(evaluation.evaluation);

  // Generate actionable next steps
  const generateActionableSteps = (): FocusArea[] => {
    const steps: FocusArea[] = [];

    if (evaluation.score < 60) {
      steps.push({
        title: 'Hauptfokus',
        action: insights.mainFocus.length > 80
          ? insights.mainFocus.substring(0, 80) + '...'
          : insights.mainFocus,
        priority: 'high'
      });
    }

    if (insights.nextSteps.length > 0) {
      steps.push({
        title: 'Nächste Schritte',
        action: insights.nextSteps[0].length > 80
          ? insights.nextSteps[0].substring(0, 80) + '...'
          : insights.nextSteps[0],
        priority: 'medium'
      });
    } else {
      steps.push({
        title: 'Nächste Schritte',
        action: evaluation.exam_type === 'KP'
          ? 'Wiederholung der klinischen Grundlagen empfohlen'
          : 'Fokus auf Sprachpräzision und Fachterminologie',
        priority: 'medium'
      });
    }

    steps.push({
      title: 'Ihre Stärke',
      action: insights.strength.length > 80
        ? insights.strength.substring(0, 80) + '...'
        : insights.strength,
      priority: 'low'
    });

    return steps.slice(0, 3); // Maximum 3 focus areas
  };

  const focusAreas = generateActionableSteps();

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle size={16} color="#EF4444" />;
      case 'medium': return <TrendingUp size={16} color="#F59E0B" />;
      case 'low': return <CheckCircle2 size={16} color="#10B981" />;
      default: return <Target size={16} color="#6B7280" />;
    }
  };

  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case 'high': return { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' };
      case 'medium': return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' };
      case 'low': return { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' };
      default: return { bg: '#F9FAFB', border: '#D1D5DB', text: '#374151' };
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#FAFBFC']}
        style={styles.gradient}
      >
        {/* Compact Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.scoreContainer, { backgroundColor: scoreBg }]}>
              <Text style={[styles.scoreText, { color: scoreColor }]}>
                {evaluation.score}
              </Text>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.examType}>
                {evaluation.exam_type} - {evaluation.conversation_type === 'patient' ? 'Patient' : 'Prüfer'}
              </Text>
              <Text style={[styles.statusText, { color: scoreColor }]}>
                {scoreStatus}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setIsExpanded(!isExpanded)}
            activeOpacity={0.7}
          >
            {isExpanded ? (
              <ChevronDown size={20} color="#6B7280" />
            ) : (
              <ChevronRight size={20} color="#6B7280" />
            )}
          </TouchableOpacity>
        </View>

        {/* Simplified Summary Cards */}
        <View style={styles.summaryGrid}>
          {focusAreas.map((area, index) => {
            const colors = getPriorityColors(area.priority);

            return (
              <View
                key={index}
                style={[
                  styles.focusCard,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border
                  }
                ]}
              >
                <View style={styles.focusHeader}>
                  {getPriorityIcon(area.priority)}
                  <Text style={[styles.focusTitle, { color: colors.text }]}>
                    {area.title}
                  </Text>
                </View>
                <Text style={[styles.focusAction, { color: colors.text }]} numberOfLines={2}>
                  {area.action}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Detailed View (Collapsed by Default) */}
        {isExpanded && (
          <View style={styles.detailsContainer}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Vollständige Bewertung</Text>
            </View>

            <View style={styles.detailsContent}>
              <Text style={styles.detailsText} numberOfLines={6}>
                {insights.fullText}
              </Text>
            </View>
          </View>
        )}

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <Eye size={18} color="#3B82F6" />
            <Text style={styles.detailsButtonText}>
              Vollständige Analyse anzeigen
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  gradient: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scoreContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerInfo: {
    flex: 1,
  },
  examType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  expandButton: {
    padding: 6,
  },
  summaryGrid: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  focusCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  focusTitle: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  focusAction: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  detailsContainer: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  detailsHeader: {
    marginBottom: 8,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  detailsContent: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailsText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#4B5563',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  actionContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 8,
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});