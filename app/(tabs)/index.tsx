import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Menu as MenuIcon, Lightbulb, HelpCircle, CheckCircle, XCircle, BookOpen, Clock, ArrowRight, Sparkles, Target, TrendingUp } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import Menu from '@/components/ui/Menu';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';
import WelcomeFlow from '@/components/onboarding/WelcomeFlow';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

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

interface MedicalContent {
  id: string;
  title: string;
  category?: string;
  lastViewed: string;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dailyTip, setDailyTip] = useState<DailyTip | null>(null);
  const [showWelcomeFlow, setShowWelcomeFlow] = useState(false);
  const [dailyQuestion, setDailyQuestion] = useState<DailyQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentMedicalContents, setRecentMedicalContents] = useState<MedicalContent[]>([]);

  useEffect(() => {
    fetchDailyContent();
    loadRecentMedicalContents();
    checkOnboardingStatus();
  }, [user]);
  
  const checkOnboardingStatus = async () => {
    try {
      if (user) {
        const onboardingCompleted = await AsyncStorage.getItem(`onboarding_completed_${user.id}`);
        if (!onboardingCompleted) {
          setShowWelcomeFlow(true);
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };
  
  const handleOnboardingComplete = async () => {
    try {
      if (user) {
        await AsyncStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      }
      setShowWelcomeFlow(false);
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
      setShowWelcomeFlow(false);
    }
  };

  const loadRecentMedicalContents = () => {
    // Sample data - replace with actual data from database
    const sampleContents: MedicalContent[] = [
      { id: '1', title: 'Unipolare Depression', category: 'Psychiatrie', lastViewed: '2 Stunden' },
      { id: '2', title: 'Herzrhythmusstörungen', category: 'Kardiologie', lastViewed: '1 Tag' },
      { id: '3', title: 'Notfallmanagement - Grundlegende Prinzipien', category: 'Notfallmedizin', lastViewed: '2 Tage' },
      { id: '4', title: 'Astrozytome und Oligodendrogliome', category: 'Neurologie', lastViewed: '3 Tage' },
    ];
    setRecentMedicalContents(sampleContents);
  };

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
        colors={['#f8faff', '#e3f2fd', '#ffffff']}
        style={styles.gradientBackground}
      />
      
      {/* Modern Header */}
      <LinearGradient
        colors={['#4A90E2', '#357ABD', '#2E5B9A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.modernHeader}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuOpen(true)}
          >
            <MenuIcon size={24} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Logo size="medium" variant="medical" textColor="white" animated={true} />
          <UserAvatar size={32} />
        </View>
      </LinearGradient>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>
                Nur bei KP Med: Die einzige KI-Simulation,
              </Text>
              <Text style={styles.heroSubtitle}>
                die Dich wirklich auf die medizinische Prüfung in Deutschland vorbereitet
              </Text>
              <Text style={styles.heroDescription}>
                Keine Theorie. Keine Spielerei. Sondern echte Prüfungssimulation, personalisierte Lerninhalte und intelligente Auswertung – exklusiv entwickelt für internationale Ärzt:innen.
              </Text>
              <Text style={styles.heroTagline}>
                Starte nicht irgendwo. Starte da, wo Erfolg beginnt.
              </Text>
              
              <View style={styles.heroButtons}>
                <TouchableOpacity 
                  style={styles.primaryHeroButton}
                  onPress={() => router.push('/(tabs)/bibliothek')}
                >
                  <Text style={styles.primaryButtonText}>Jetzt lernen</Text>
                  <ArrowRight size={18} color="white" style={styles.buttonIcon} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.secondaryHeroButton}
                  onPress={() => router.push('/(tabs)/simulation')}
                >
                  <Text style={styles.secondaryButtonText}>Simulation starten</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* 3D-like floating elements */}
            <View style={styles.floatingElements}>
              <View style={[styles.floatingCube, styles.cube1]}>
                <Sparkles size={24} color="#4A90E2" />
              </View>
              <View style={[styles.floatingCube, styles.cube2]}>
                <Target size={20} color="#667eea" />
              </View>
              <View style={[styles.floatingCube, styles.cube3]}>
                <TrendingUp size={22} color="#764ba2" />
              </View>
              <View style={[styles.floatingCube, styles.cube4]}>
                <BookOpen size={18} color="#4A90E2" />
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        
        {/* Last Medical Contents */}
        {recentMedicalContents.length > 0 && (
          <View style={styles.medicalContentsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Letzte Kapitel</Text>
            </View>
            <View style={styles.contentsContainer}>
              {recentMedicalContents.map((content, index) => (
                <TouchableOpacity 
                  key={content.id} 
                  style={[
                    styles.contentItem,
                    index === recentMedicalContents.length - 1 && styles.lastContentItem
                  ]}
                >
                  <View style={styles.contentIcon}>
                    <BookOpen size={18} color={MEDICAL_COLORS.primary} />
                  </View>
                  <View style={styles.contentInfo}>
                    <Text style={styles.contentTitle}>{content.title}</Text>
                    <View style={styles.contentMeta}>
                      <Clock size={12} color={MEDICAL_COLORS.textSecondary} />
                      <Text style={styles.contentTime}>{content.lastViewed}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Daily Tip - Always show section */}
        <View style={styles.card}>
          <LinearGradient
            colors={[`${MEDICAL_COLORS.primary}15`, `${MEDICAL_COLORS.primary}08`]}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <Lightbulb size={24} color={MEDICAL_COLORS.primary} />
              <Text style={styles.cardTitle}>Tipp des Tages</Text>
            </View>
            
            {dailyTip ? (
              <>
                {dailyTip.title && (
                  <Text style={styles.tipTitleCard}>{dailyTip.title}</Text>
                )}
                
                <Text style={styles.tipContentCard}>
                  {dailyTip.content || dailyTip.tip_content || dailyTip.tip}
                </Text>
                
                {dailyTip.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{dailyTip.category}</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.noContentText}>
                Heute gibt es noch keinen Tipp. Schauen Sie später wieder vorbei!
              </Text>
            )}
          </LinearGradient>
        </View>

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

        {/* Empty State - only show if no daily question */}
        {!dailyQuestion && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Heute gibt es noch keine Frage. Schauen Sie später wieder vorbei!
            </Text>
          </View>
        )}

        {/* Medical Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <LinearGradient
            colors={[`${MEDICAL_COLORS.primary}08`, `${MEDICAL_COLORS.primary}05`]}
            style={styles.disclaimerGradient}
          >
            <View style={styles.disclaimerContent}>
              <View style={styles.disclaimerIcon}>
                <Text style={styles.disclaimerEmoji}>⚕️</Text>
              </View>
              <View style={styles.disclaimerTextContainer}>
                <Text style={styles.disclaimerTitle}>Medizinischer Haftungsausschluss</Text>
                <Text style={styles.disclaimerText}>
                  Diese Plattform stellt Lehrmaterialien ausschließlich für approbierte medizinische Fachkräfte zur Verfügung. Die Inhalte dienen der Prüfungsvorbereitung und stellen keine medizinische Beratung dar.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Menu */}
      <Menu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      
      {/* Welcome Flow for new users */}
      <WelcomeFlow
        visible={showWelcomeFlow}
        onComplete={handleOnboardingComplete}
        onDismiss={() => setShowWelcomeFlow(false)}
      />
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
  modernHeader: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
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
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 28,
    borderRadius: 24,
    backgroundColor: 'white',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.08)',
  },
  cardGradient: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 4,
  },
  cardTitle: {
    fontSize: 19,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    marginLeft: 14,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  questionText: {
    fontSize: 17,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.textPrimary,
    lineHeight: 26,
    marginBottom: 24,
    paddingHorizontal: 2,
  },
  answersContainer: {
    marginBottom: 20,
    gap: 4,
  },
  answerOption: {
    backgroundColor: '#f8faff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
    padding: 18,
    paddingVertical: 16,
  },
  optionLetter: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    marginRight: 14,
    minWidth: 26,
  },
  answerText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 22,
    paddingRight: 8,
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
  tipTitleCard: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 12,
    marginTop: 4,
  },
  tipContentCard: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  noContentText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 22,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: MEDICAL_COLORS.textSecondary,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  bottomPadding: {
    height: 24,
  },
  
  // Medical Disclaimer Styles
  disclaimerContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  disclaimerGradient: {
    borderRadius: 16,
    padding: 1,
  },
  disclaimerContent: {
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  disclaimerEmoji: {
    fontSize: 24,
  },
  disclaimerTextContainer: {
    flex: 1,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 6,
  },
  disclaimerText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 18,
    opacity: 0.9,
  },
  
  // Medical Contents Section
  medicalContentsSection: {
    marginBottom: 28,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  contentsContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.08)',
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: MEDICAL_COLORS.lightGray,
  },
  lastContentItem: {
    borderBottomWidth: 0,
  },
  contentIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${MEDICAL_COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    marginLeft: 4,
    opacity: 0.8,
  },
  
  // Hero Section Styles
  heroSection: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
  },
  heroGradient: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    minHeight: 280,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  heroTextContainer: {
    flex: 1,
    paddingRight: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: 'white',
    lineHeight: 38,
    marginBottom: 8,
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 38,
    marginBottom: 16,
    letterSpacing: -0.8,
  },
  heroDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 24,
    marginBottom: 16,
    maxWidth: '90%',
  },
  heroTagline: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 26,
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  primaryHeroButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    backdropFilter: 'blur(10px)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryHeroButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginRight: 8,
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  buttonIcon: {
    marginLeft: 4,
  },
  
  // Floating Elements
  floatingElements: {
    position: 'relative',
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCube: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cube1: {
    width: 60,
    height: 60,
    top: -10,
    right: 20,
    transform: [{ rotate: '15deg' }],
  },
  cube2: {
    width: 50,
    height: 50,
    bottom: 40,
    left: 0,
    transform: [{ rotate: '-10deg' }],
  },
  cube3: {
    width: 55,
    height: 55,
    top: 30,
    left: 30,
    transform: [{ rotate: '25deg' }],
  },
  cube4: {
    width: 45,
    height: 45,
    bottom: 0,
    right: 0,
    transform: [{ rotate: '-20deg' }],
  },
});