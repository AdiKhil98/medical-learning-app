import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, BookOpen, Library, Menu as MenuIcon, Lightbulb, HelpCircle, CheckCircle, XCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import Menu from '@/components/ui/Menu';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from '@/components/ui/Logo';

interface DailyTip {
  id: string;
  date: string;
  title: string;
  content: string;
  category: string;
}

interface DailyQuestion {
  id: string;
  date: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  correct_answer: 'A' | 'B' | 'C';
  explanation: string;
  category: string;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dailyTip, setDailyTip] = useState<DailyTip | null>(null);
  const [dailyQuestion, setDailyQuestion] = useState<DailyQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        
        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
            
          if (error) throw error;
          setUserData(data);
        }

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        console.log('Fetching daily content for date:', today);

        // Fetch today's tip - direct query only
        const { data: tipData, error: tipError } = await supabase
          .from('daily_tips')
          .select('*')
          .eq('date', today)
          .maybeSingle();

        if (tipError) {
          console.error('Error fetching daily tip:', tipError);
        }
        
        setDailyTip(tipData); // Will be null if no tip exists for today

        // Fetch today's question - direct query only  
        const { data: questionData, error: questionError } = await supabase
          .from('daily_questions')
          .select('*')
          .eq('date', today)
          .maybeSingle();

        if (questionError) {
          console.error('Error fetching daily question:', questionError);
        }
        
        setDailyQuestion(questionData); // Will be null if no question exists for today
        
        console.log('Daily content found:', { 
          tipExists: !!tipData, 
          questionExists: !!questionData 
        });
      } catch (error) {
        console.error('Error loading dashboard data', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadDashboardData();
  }, [user]);

  // Get user's first name from full name
  const getFirstName = () => {
    if (!userData || !userData.name) return '';
    return userData.name.split(' ')[0];
  };

  const handleAnswerSelect = (answer: 'A' | 'B' | 'C') => {
    if (showResult) return; // Prevent changing answer after showing result
    
    setSelectedAnswer(answer);
    setShowResult(true);
  };

  const resetQuestion = () => {
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const getAnswerButtonStyle = (option: 'A' | 'B' | 'C') => {
    if (!showResult) {
      return selectedAnswer === option ? styles.selectedAnswer : styles.answerButton;
    }
    
    if (option === dailyQuestion?.correct_answer) {
      return styles.correctAnswer;
    }
    
    if (selectedAnswer === option && option !== dailyQuestion?.correct_answer) {
      return styles.wrongAnswer;
    }
    
    return styles.disabledAnswer;
  };

  const getAnswerIcon = (option: 'A' | 'B' | 'C') => {
    if (!showResult) return null;
    
    if (option === dailyQuestion?.correct_answer) {
      return <CheckCircle size={20} color="#FFFFFF" />;
    }
    
    if (selectedAnswer === option && option !== dailyQuestion?.correct_answer) {
      return <XCircle size={20} color="#FFFFFF" />;
    }
    
    return null;
  };

  const gradientColors = isDarkMode 
    ? ['#1F2937', '#111827', '#0F172A']
    : ['#e0f2fe', '#f0f9ff', '#ffffff'];

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    welcomeSection: {
      backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      padding: 20,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 24,
      borderRadius: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    welcomeText: {
      fontFamily: 'Inter-Bold',
      fontSize: 18,
      color: colors.text,
      marginBottom: 8,
    },
    welcomeSubtext: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    sectionTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 20,
      color: colors.text,
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    tipCard: {
      marginHorizontal: 16,
      marginBottom: 24,
      backgroundColor: colors.card,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    tipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    tipIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F59E0B',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    tipTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 18,
      color: colors.text,
      flex: 1,
    },
    tipCategory: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      color: '#F59E0B',
      backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#FFFBEB',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    tipContent: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
    },
    questionCard: {
      marginHorizontal: 16,
      marginBottom: 32,
      backgroundColor: colors.card,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    questionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    questionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#0077B6',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    questionTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 18,
      color: colors.text,
      flex: 1,
    },
    questionCategory: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      color: '#0077B6',
      backgroundColor: isDarkMode ? 'rgba(0, 119, 182, 0.2)' : '#E6F1F8',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    questionText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
      marginBottom: 20,
    },
    answersContainer: {
      gap: 12,
      marginBottom: 16,
    },
    explanationContainer: {
      marginTop: 16,
      padding: 16,
      backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : '#F0FDF4',
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#22C55E',
    },
    explanationText: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    resetButton: {
      marginTop: 12,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    resetButtonText: {
      color: colors.primary,
      fontFamily: 'Inter-Medium',
    },
    emptyStateCard: {
      marginHorizontal: 16,
      marginBottom: 24,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    emptyStateText: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
      />
      
      {/* Header */}
      <View style={dynamicStyles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => setIsMenuOpen(true)}
            style={styles.menuButtonContainer}
          >
            <MenuIcon size={24} color={colors.primary} />
          </TouchableOpacity>
          <Logo size="medium" textColor={isDarkMode ? '#FFFFFF' : undefined} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={dynamicStyles.welcomeSection}>
          <Text style={dynamicStyles.welcomeText}>
            👋 Willkommen{userData ? ` zurück, ${getFirstName()}` : ''}! Bereit für deine nächste Lerneinheit?
          </Text>
          <Text style={dynamicStyles.welcomeSubtext}>
            „Schritt für Schritt zur Kenntnisprüfung"
          </Text>
        </View>

        {/* Tipp des Tages */}
        <Text style={dynamicStyles.sectionTitle}>💡 Tipp des Tages</Text>
        {dailyTip ? (
          <Card style={dynamicStyles.tipCard}>
            <View style={dynamicStyles.tipHeader}>
              <View style={dynamicStyles.tipIcon}>
                <Lightbulb size={20} color="#FFFFFF" />
              </View>
              <Text style={dynamicStyles.tipTitle}>{dailyTip.title}</Text>
              {dailyTip.category && (
                <Text style={dynamicStyles.tipCategory}>{dailyTip.category}</Text>
              )}
            </View>
            <Text style={dynamicStyles.tipContent}>{dailyTip.content}</Text>
          </Card>
        ) : (
          <Card style={dynamicStyles.emptyStateCard}>
            <Lightbulb size={48} color={colors.textSecondary} />
            <Text style={dynamicStyles.emptyStateText}>
              Kein Tipp für heute verfügbar
            </Text>
          </Card>
        )}

        {/* Frage des Tages */}
        <Text style={dynamicStyles.sectionTitle}>❓ Frage des Tages</Text>
        {dailyQuestion ? (
          <Card style={dynamicStyles.questionCard}>
            <View style={dynamicStyles.questionHeader}>
              <View style={dynamicStyles.questionIcon}>
                <HelpCircle size={20} color="#FFFFFF" />
              </View>
              <Text style={dynamicStyles.questionTitle}>Frage des Tages</Text>
              {dailyQuestion.category && (
                <Text style={dynamicStyles.questionCategory}>{dailyQuestion.category}</Text>
              )}
            </View>
            <Text style={dynamicStyles.questionText}>{dailyQuestion.question}</Text>
            
            <View style={dynamicStyles.answersContainer}>
              <TouchableOpacity
                style={getAnswerButtonStyle('A')}
                onPress={() => handleAnswerSelect('A')}
                disabled={showResult}
              >
                <View style={styles.answerContent}>
                  <Text style={styles.answerLabel}>A</Text>
                  <Text style={styles.answerText}>{dailyQuestion.option_a}</Text>
                  {getAnswerIcon('A')}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={getAnswerButtonStyle('B')}
                onPress={() => handleAnswerSelect('B')}
                disabled={showResult}
              >
                <View style={styles.answerContent}>
                  <Text style={styles.answerLabel}>B</Text>
                  <Text style={styles.answerText}>{dailyQuestion.option_b}</Text>
                  {getAnswerIcon('B')}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={getAnswerButtonStyle('C')}
                onPress={() => handleAnswerSelect('C')}
                disabled={showResult}
              >
                <View style={styles.answerContent}>
                  <Text style={styles.answerLabel}>C</Text>
                  <Text style={styles.answerText}>{dailyQuestion.option_c}</Text>
                  {getAnswerIcon('C')}
                </View>
              </TouchableOpacity>
            </View>

            {showResult && dailyQuestion.explanation && (
              <View style={dynamicStyles.explanationContainer}>
                <Text style={dynamicStyles.explanationText}>
                  <Text style={{ fontFamily: 'Inter-Bold' }}>Erklärung: </Text>
                  {dailyQuestion.explanation}
                </Text>
                <Button
                  title="Neue Frage"
                  onPress={resetQuestion}
                  variant="outline"
                  size="sm"
                  style={dynamicStyles.resetButton}
                  textStyle={dynamicStyles.resetButtonText}
                />
              </View>
            )}
          </Card>
        ) : (
          <Card style={dynamicStyles.emptyStateCard}>
            <HelpCircle size={48} color={colors.textSecondary} />
            <Text style={dynamicStyles.emptyStateText}>
              Keine Frage für heute verfügbar
            </Text>
          </Card>
        )}
      </ScrollView>

      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  menuButtonContainer: {
    marginRight: 16,
    padding: 8,
  },
  answerButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAnswer: {
    backgroundColor: '#E6F1F8',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#0077B6',
  },
  correctAnswer: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#16A34A',
  },
  wrongAnswer: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  disabledAnswer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    opacity: 0.6,
  },
  answerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  answerLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1F2937',
    marginRight: 12,
    minWidth: 20,
  },
  answerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
});