import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { HelpCircle, CheckCircle, XCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { dashboardStyles as styles } from '@/styles/dashboard';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import { SectionErrorBoundary } from '../ErrorBoundary';
import { QuestionSkeleton } from '../LoadingSkeleton';
import type { DailyQuestion } from '@/hooks/useDailyContent';

interface DailyQuestionSectionProps {
  dailyQuestion: DailyQuestion | null;
  loading?: boolean;
}

const DailyQuestionSection = React.memo<DailyQuestionSectionProps>(({ 
  dailyQuestion, 
  loading = false 
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const isCorrectAnswer = useMemo(() => (answer: string) => {
    if (!dailyQuestion) return false;
    const correctKey = (dailyQuestion.correct_choice || dailyQuestion.correct_answer || '').toLowerCase();
    
    switch (answer) {
      case 'a': return correctKey === 'a';
      case 'b': return correctKey === 'b';
      case 'c': return correctKey === 'c';
      default: return false;
    }
  }, [dailyQuestion]);

  const handleAnswerSelect = (answer: string) => {
    if (showAnswer) return;
    setSelectedAnswer(answer);
    setShowAnswer(true);
  };

  if (loading) {
    return <QuestionSkeleton />;
  }

  if (!dailyQuestion) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHero}>
          <View style={styles.heroContent}>
            <View style={styles.heroTitleContainer}>
              <Text style={styles.splitScreenHeroTitle}>
                Frage des Tages
              </Text>
            </View>
            <View style={styles.heroSubtitleContainer}>
              <Text style={styles.splitScreenHeroSubtitle}>
                Teste dein Wissen mit einer täglichen Prüfungsfrage
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.sectionContentInner}>
          <View style={styles.structuredSection}>
            <View style={styles.structuredSectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <HelpCircle size={24} color={MEDICAL_COLORS.primary} />
                <Text style={styles.structuredSectionTitle}>Frage des Tages</Text>
              </View>
            </View>
            
            <View style={styles.questionCard}>
              <LinearGradient
                colors={MEDICAL_COLORS.purpleCoralGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.questionCardGradient}
              >
                <Text style={styles.noContentText}>
                  Heute gibt es noch keine Frage. Schauen Sie später wieder vorbei!
                </Text>
              </LinearGradient>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SectionErrorBoundary>
      <View style={styles.section}>
        {/* Hero for Section 3 */}
        <View style={styles.sectionHero}>
          <View style={styles.heroContent}>
            <View style={styles.heroTitleContainer}>
              <Text style={styles.splitScreenHeroTitle}>
                Frage des Tages
              </Text>
            </View>
            <View style={styles.heroSubtitleContainer}>
              <Text style={styles.splitScreenHeroSubtitle}>
                Teste dein Wissen mit einer täglichen Prüfungsfrage
              </Text>
            </View>
          </View>
        </View>
        
        {/* Section content */}
        <View style={styles.sectionContentInner}>
          <View style={styles.structuredSection}>
            <View style={styles.structuredSectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <HelpCircle size={24} color={MEDICAL_COLORS.primary} />
                <Text style={styles.structuredSectionTitle}>Frage des Tages</Text>
              </View>
            </View>
            
            <View style={styles.questionCard}>
              <LinearGradient
                colors={MEDICAL_COLORS.purpleCoralGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.questionCardGradient}
              >
                <View style={styles.questionCardHeader}>
                  <View style={styles.questionIconBg}>
                    <HelpCircle size={28} color="white" />
                  </View>
                  <View style={styles.questionHeaderInfo}>
                    <Text style={styles.questionCardTitle}>Prüfungssimulation</Text>
                    <Text style={styles.questionCardSubtitle}>Bereite dich auf die echte Prüfung vor</Text>
                  </View>
                </View>
                
                <Text style={styles.questionText}>{dailyQuestion.question}</Text>
                
                <View style={styles.answersContainer}>
                  {['a', 'b', 'c'].map((option) => {
                    const optionText = dailyQuestion[`choice_${option}` as keyof DailyQuestion] || 
                                     dailyQuestion[`option_${option}` as keyof DailyQuestion];
                    
                    if (!optionText) return null;
                    
                    const isSelected = selectedAnswer === option;
                    const isCorrect = isCorrectAnswer(option);
                    const showResult = showAnswer;
                    
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.answerOption,
                          isSelected && styles.selectedOption,
                          showResult && isCorrect && styles.correctOption,
                          showResult && isSelected && !isCorrect && styles.incorrectOption,
                        ]}
                        onPress={() => handleAnswerSelect(option)}
                        disabled={showAnswer}
                      >
                        <View style={styles.answerContent}>
                          <Text style={styles.optionLetter}>{option.toUpperCase()})</Text>
                          <Text style={[
                            styles.answerText,
                            showResult && isCorrect && styles.correctAnswerText,
                            showResult && isSelected && !isCorrect && styles.incorrectAnswerText,
                          ]}>
                            {optionText}
                          </Text>
                          {showResult && isCorrect && (
                            <CheckCircle size={20} color={MEDICAL_COLORS.success} />
                          )}
                          {showResult && isSelected && !isCorrect && (
                            <XCircle size={20} color={MEDICAL_COLORS.danger} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                
                {showAnswer && dailyQuestion.explanation && (
                  <View style={styles.explanationContainer}>
                    <Text style={styles.explanationTitle}>Erklärung:</Text>
                    <Text style={styles.explanationText}>{dailyQuestion.explanation}</Text>
                  </View>
                )}
                
                {dailyQuestion.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{dailyQuestion.category}</Text>
                  </View>
                )}
              </LinearGradient>
            </View>
            
            {/* Section completed indicator */}
            {showAnswer && (
              <View style={styles.sectionCompleteBadge}>
                <CheckCircle size={16} color={MEDICAL_COLORS.success} />
                <Text style={styles.sectionCompleteText}>Sektion abgeschlossen</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </SectionErrorBoundary>
  );
});

DailyQuestionSection.displayName = 'DailyQuestionSection';

export default DailyQuestionSection;