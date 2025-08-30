import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Menu as MenuIcon, Lightbulb, HelpCircle, CheckCircle, XCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import Menu from '@/components/ui/Menu';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';

interface DailyTip {
  id?: string;
  date: string;
  title?: string;
  content?: string;
  tip_content?: string;
  tip?: string;
  category?: string;
}

interface DailyQuestion {
  id?: string;
  date: string;
  question: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  correct_answer?: 'a' | 'b' | 'c' | 'A' | 'B' | 'C';
  correct_choice?: 'a' | 'b' | 'c' | 'A' | 'B' | 'C';
  explanation?: string;
  category?: string;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dailyTip, setDailyTip] = useState<DailyTip | null>(null);
  const [dailyQuestion, setDailyQuestion] = useState<DailyQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyContent();
  }, []);

  const fetchDailyContent = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch daily tip - try today first, then most recent
      let { data: tipData } = await supabase
        .from('daily_tips')
        .select('*')
        .eq('date', today)
        .maybeSingle();

      if (!tipData) {
        // If no tip for today, get the most recent one
        const { data: recentTip } = await supabase
          .from('daily_tips')
          .select('*')
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
        tipData = recentTip;
      }

      if (tipData) {
        setDailyTip(tipData);
      }

      // Fetch daily question - try today first, then most recent
      let { data: questionData } = await supabase
        .from('daily_questions')
        .select('*')
        .eq('date', today)
        .maybeSingle();

      if (!questionData) {
        // If no question for today, get the most recent one
        const { data: recentQuestion } = await supabase
          .from('daily_questions')
          .select('*')
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
        questionData = recentQuestion;
      }

      if (questionData) {
        setDailyQuestion(questionData);
      }
    } catch (error) {
      console.error('Error fetching daily content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setShowAnswer(true);
  };

  const getCorrectAnswer = () => {
    if (!dailyQuestion) return '';
    
    const correctKey = dailyQuestion.correct_answer || dailyQuestion.correct_choice || '';
    const lowerKey = correctKey.toLowerCase();
    
    switch (lowerKey) {
      case 'a': return dailyQuestion.choice_a || dailyQuestion.option_a || '';
      case 'b': return dailyQuestion.choice_b || dailyQuestion.option_b || '';  
      case 'c': return dailyQuestion.choice_c || dailyQuestion.option_c || '';
      default: return '';
    }
  };

  const isCorrectAnswer = (answer: string) => {
    if (!dailyQuestion) return false;
    const correctKey = (dailyQuestion.correct_choice || dailyQuestion.correct_answer || '').toLowerCase();
    
    switch (answer) {
      case 'a': return correctKey === 'a';
      case 'b': return correctKey === 'b';
      case 'c': return correctKey === 'c';
      default: return false;
    }
  };

  const getUserDisplayName = () => {
    if (!user) return 'Nutzer';
    return user.name || user.email?.split('@')[0] || 'Nutzer';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[MEDICAL_COLORS.lightGradient[0], MEDICAL_COLORS.lightGradient[1], '#ffffff']}
          style={styles.gradientBackground}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Lade Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[MEDICAL_COLORS.lightGradient[0], MEDICAL_COLORS.lightGradient[1], '#ffffff']}
        style={styles.gradientBackground}
      />
      
      {/* Header */}
      <LinearGradient
        colors={[MEDICAL_COLORS.primaryGradient[0], MEDICAL_COLORS.primaryGradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuOpen(true)}
          >
            <MenuIcon size={24} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Logo size="medium" variant="premium" textColor="white" animated={true} />
          <UserAvatar size={32} />
        </View>
      </LinearGradient>

      {/* User Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Willkommen zurück</Text>
        <Text style={styles.userName}>{getUserDisplayName()}</Text>
        {user?.email && (
          <Text style={styles.userEmail}>{user.email}</Text>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Daily Tip Card */}
        {dailyTip && (
          <View style={styles.card}>
            <LinearGradient
              colors={[`${MEDICAL_COLORS.warning}15`, `${MEDICAL_COLORS.warning}08`]}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <Lightbulb size={24} color={MEDICAL_COLORS.warning} />
                <Text style={styles.cardTitle}>Tipp des Tages</Text>
              </View>
              
              {dailyTip.title && (
                <Text style={styles.tipTitle}>{dailyTip.title}</Text>
              )}
              
              <Text style={styles.tipContent}>
                {dailyTip.content || dailyTip.tip_content || dailyTip.tip}
              </Text>
              
              {dailyTip.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{dailyTip.category}</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Daily Question Card */}
        {dailyQuestion && (
          <View style={styles.card}>
            <LinearGradient
              colors={[`${MEDICAL_COLORS.primary}15`, `${MEDICAL_COLORS.primary}08`]}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <HelpCircle size={24} color={MEDICAL_COLORS.primary} />
                <Text style={styles.cardTitle}>Frage des Tages</Text>
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
                      onPress={() => !showAnswer && handleAnswerSelect(option)}
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
        )}

        {/* Empty State */}
        {!dailyTip && !dailyQuestion && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Heute gibt es noch keine täglichen Inhalte. Schauen Sie später wieder vorbei!
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Menu */}
      <Menu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: MEDICAL_COLORS.textSecondary,
    fontFamily: 'Inter-Regular',
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
  },
  welcomeSection: {
    padding: 20,
    paddingBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    color: MEDICAL_COLORS.textSecondary,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    color: MEDICAL_COLORS.textPrimary,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: MEDICAL_COLORS.gray,
    fontFamily: 'Inter-Regular',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    marginLeft: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 12,
  },
  tipContent: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.textPrimary,
    lineHeight: 24,
    marginBottom: 16,
  },
  answersContainer: {
    marginBottom: 16,
  },
  answerOption: {
    backgroundColor: MEDICAL_COLORS.offWhite,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: MEDICAL_COLORS.primary,
    backgroundColor: `${MEDICAL_COLORS.primary}10`,
  },
  correctOption: {
    borderColor: MEDICAL_COLORS.success,
    backgroundColor: `${MEDICAL_COLORS.success}15`,
  },
  incorrectOption: {
    borderColor: MEDICAL_COLORS.danger,
    backgroundColor: `${MEDICAL_COLORS.danger}15`,
  },
  answerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  optionLetter: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    marginRight: 12,
    minWidth: 24,
  },
  answerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 20,
  },
  correctAnswerText: {
    color: MEDICAL_COLORS.success,
    fontFamily: 'Inter-Medium',
  },
  incorrectAnswerText: {
    color: MEDICAL_COLORS.danger,
  },
  explanationContainer: {
    backgroundColor: `${MEDICAL_COLORS.primary}08`,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  explanationTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: MEDICAL_COLORS.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: MEDICAL_COLORS.textSecondary,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomPadding: {
    height: 40,
  },
});