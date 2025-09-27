import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronRight, Award, TrendingUp, AlertTriangle, CheckCircle2, Target, BookOpen } from 'lucide-react-native';

interface EvaluationSection {
  title: string;
  content: string;
  type: 'critical' | 'improvement' | 'strength' | 'recommendation';
  priority: number;
}

interface EvaluationCardProps {
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

const SECTION_COLORS = {
  critical: {
    bg: '#FEF2F2',
    border: '#FCA5A5',
    text: '#DC2626',
    icon: '#EF4444'
  },
  improvement: {
    bg: '#FEF3C7',
    border: '#FBBF24',
    text: '#D97706',
    icon: '#F59E0B'
  },
  strength: {
    bg: '#ECFDF5',
    border: '#86EFAC',
    text: '#059669',
    icon: '#10B981'
  },
  recommendation: {
    bg: '#EFF6FF',
    border: '#93C5FD',
    text: '#2563EB',
    icon: '#3B82F6'
  }
};

const SECTION_ICONS = {
  critical: AlertTriangle,
  improvement: TrendingUp,
  strength: CheckCircle2,
  recommendation: BookOpen
};

export function EvaluationCard({ evaluation, onPress }: EvaluationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const scoreColor = evaluation.score >= 60 ? '#10B981' : '#EF4444';
  const scoreBg = evaluation.score >= 60 ? '#ECFDF5' : '#FEF2F2';

  const parseEvaluationIntoSections = (text: string): EvaluationSection[] => {
    const sections: EvaluationSection[] = [];

    // Parse different types of feedback sections
    const criticalMatches = text.match(/(?:kritische|fehler|problem|schwerwiegend)[^.]*[.!?]/gi) || [];
    const improvementMatches = text.match(/(?:verbesserung|übung|empfehlung|nächste schritte)[^.]*[.!?]/gi) || [];
    const strengthMatches = text.match(/(?:stärken|gut|richtig|korrekt|positiv)[^.]*[.!?]/gi) || [];

    // Add critical issues
    criticalMatches.forEach((match, index) => {
      sections.push({
        title: 'Kritische Bereiche',
        content: match.trim(),
        type: 'critical',
        priority: 1
      });
    });

    // Add improvement areas
    improvementMatches.forEach((match, index) => {
      sections.push({
        title: 'Verbesserungsbereiche',
        content: match.trim(),
        type: 'improvement',
        priority: 2
      });
    });

    // Add strengths
    strengthMatches.forEach((match, index) => {
      sections.push({
        title: 'Ihre Stärken',
        content: match.trim(),
        type: 'strength',
        priority: 3
      });
    });

    // If no structured sections found, create general sections
    if (sections.length === 0) {
      const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 20);

      sections.push({
        title: evaluation.exam_type === 'KP' ? 'Klinische Bewertung' : 'Sprachliche Bewertung',
        content: sentences.slice(0, 2).join('. ') + '.',
        type: evaluation.score >= 60 ? 'strength' : 'improvement',
        priority: 1
      });

      if (sentences.length > 2) {
        sections.push({
          title: 'Empfohlene Lernressourcen',
          content: sentences.slice(2).join('. ') + '.',
          type: 'recommendation',
          priority: 2
        });
      }
    }

    return sections.sort((a, b) => a.priority - b.priority);
  };

  const sections = parseEvaluationIntoSections(evaluation.evaluation);

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const renderSectionIcon = (type: EvaluationSection['type']) => {
    const IconComponent = SECTION_ICONS[type];
    const colors = SECTION_COLORS[type];
    return <IconComponent size={20} color={colors.icon} />;
  };

  const getSectionSummary = (sections: EvaluationSection[]) => {
    const counts = {
      critical: sections.filter(s => s.type === 'critical').length,
      improvement: sections.filter(s => s.type === 'improvement').length,
      strength: sections.filter(s => s.type === 'strength').length,
      recommendation: sections.filter(s => s.type === 'recommendation').length
    };

    return counts;
  };

  const sectionCounts = getSectionSummary(sections);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={styles.gradient}
      >
        {/* Header */}
        <TouchableOpacity
          style={styles.header}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
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
              <Text style={styles.date}>
                {new Date(evaluation.created_at).toLocaleDateString('de-DE')}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {isExpanded ? (
              <ChevronDown size={24} color="#6B7280" />
            ) : (
              <ChevronRight size={24} color="#6B7280" />
            )}
          </View>
        </TouchableOpacity>

        {/* Summary Preview */}
        {!isExpanded && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              {sectionCounts.critical > 0 && (
                <View style={[styles.summaryBadge, { backgroundColor: SECTION_COLORS.critical.bg }]}>
                  <AlertTriangle size={14} color={SECTION_COLORS.critical.icon} />
                  <Text style={[styles.summaryBadgeText, { color: SECTION_COLORS.critical.text }]}>
                    {sectionCounts.critical} Kritisch
                  </Text>
                </View>
              )}

              {sectionCounts.improvement > 0 && (
                <View style={[styles.summaryBadge, { backgroundColor: SECTION_COLORS.improvement.bg }]}>
                  <TrendingUp size={14} color={SECTION_COLORS.improvement.icon} />
                  <Text style={[styles.summaryBadgeText, { color: SECTION_COLORS.improvement.text }]}>
                    {sectionCounts.improvement} Verbesserung
                  </Text>
                </View>
              )}

              {sectionCounts.strength > 0 && (
                <View style={[styles.summaryBadge, { backgroundColor: SECTION_COLORS.strength.bg }]}>
                  <CheckCircle2 size={14} color={SECTION_COLORS.strength.icon} />
                  <Text style={[styles.summaryBadgeText, { color: SECTION_COLORS.strength.text }]}>
                    {sectionCounts.strength} Stärken
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Score Detail */}
            <View style={styles.scoreDetailContainer}>
              <LinearGradient
                colors={[scoreColor + '15', scoreColor + '05']}
                style={styles.scoreDetailGradient}
              >
                <Award size={24} color={scoreColor} />
                <Text style={[styles.scoreDetailText, { color: scoreColor }]}>
                  {evaluation.score >= 60 ? 'Bestanden' : 'Nicht bestanden'} - {evaluation.score}/100
                </Text>
              </LinearGradient>
            </View>

            {/* Feedback Sections */}
            {sections.map((section, index) => {
              const colors = SECTION_COLORS[section.type];
              const isExpanded = expandedSections.has(index);

              return (
                <View key={index} style={styles.sectionContainer}>
                  <TouchableOpacity
                    style={[styles.sectionHeader, { borderLeftColor: colors.border }]}
                    onPress={() => toggleSection(index)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sectionHeaderLeft}>
                      {renderSectionIcon(section.type)}
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        {section.title}
                      </Text>
                    </View>
                    {isExpanded ? (
                      <ChevronDown size={20} color={colors.text} />
                    ) : (
                      <ChevronRight size={20} color={colors.text} />
                    )}
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[styles.sectionContent, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.sectionText, { color: colors.text }]}>
                        {section.content}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={onPress}>
                <Target size={20} color="#3B82F6" />
                <Text style={styles.actionButtonText}>Details anzeigen</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradient: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scoreContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerInfo: {
    flex: 1,
  },
  examType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerRight: {
    padding: 4,
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  scoreDetailContainer: {
    marginBottom: 16,
  },
  scoreDetailGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  scoreDetailText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  sectionContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  sectionContent: {
    padding: 12,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  actionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});