import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Menu as MenuIcon, Lightbulb, HelpCircle, CheckCircle, XCircle, BookOpen, Clock, ArrowRight, Sparkles, Target, TrendingUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import Menu from '@/components/ui/Menu';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';
import WelcomeFlow from '@/components/onboarding/WelcomeFlow';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  
  // Horizontal scroll navigation
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const sections = ['Quick Access', 'Daily Tip', 'Daily Question', 'Recent Chapters'];
  
  // Animation for bounce effect
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchDailyContent();
    loadRecentMedicalContents();
    checkOnboardingStatus();
    startBounceAnimation();
  }, [user]);
  
  // Start bounce animation for arrows
  const startBounceAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };
  
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

  // Horizontal scroll navigation functions
  const handleHorizontalScroll = (event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const section = Math.round(scrollX / screenWidth);
    setCurrentSection(section);
  };

  const scrollToSection = (sectionIndex: number) => {
    if (scrollViewRef.current && sectionIndex >= 0 && sectionIndex < sections.length) {
      scrollViewRef.current.scrollTo({
        x: sectionIndex * screenWidth,
        animated: true,
      });
      setCurrentSection(sectionIndex);
    }
  };

  const scrollToPrevious = () => {
    if (currentSection > 0) {
      scrollToSection(currentSection - 1);
    }
  };

  const scrollToNext = () => {
    if (currentSection < sections.length - 1) {
      scrollToSection(currentSection + 1);
    }
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

      {/* Simplified Hero Section */}
      <View style={styles.simplifiedHeroSection}>
        <View style={styles.heroContainer}>
          <View style={styles.heroContent}>
                <View style={styles.heroTitleContainer}>
                  <Text style={styles.splitScreenHeroTitle}>
                    Nur bei KP Med: Die einzige KI-Simulation,
                  </Text>
                </View>
                
                <View style={styles.heroSubtitleContainer}>
                  <Text style={styles.splitScreenHeroSubtitle}>
                    die Dich wirklich auf die medizinische Prüfung in Deutschland vorbereitet
                  </Text>
                </View>
                
                <View style={styles.heroDescriptionContainer}>
                  <Text style={styles.splitScreenHeroDescription}>
                    Keine Theorie. Keine Spielerei. Sondern echte Prüfungssimulation, 
                    personalisierte Lerninhalte und intelligente Auswertung – exklusiv 
                    entwickelt für internationale Ärzt:innen.
                  </Text>
                </View>
                
                <View style={styles.heroTaglineContainer}>
                  <Text style={styles.splitScreenHeroTagline}>
                    Starte nicht irgendwo. Starte da, wo Erfolg beginnt.
                  </Text>
                </View>
                
                <View style={styles.heroButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.primaryButton}
                    onPress={() => router.push('/(tabs)/simulation')}
                  >
                    <Text style={styles.primaryButtonText}>Simulation starten</Text>
                    <ArrowRight size={18} color="white" style={styles.buttonIcon} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={() => router.push('/(tabs)/bibliothek')}
                  >
                    <Text style={styles.secondaryButtonText}>Jetzt lernen</Text>
                  </TouchableOpacity>
                </View>
          </View>
        </View>
      </View>

      {/* Horizontal Content Sections with Navigation */}
      <View style={styles.horizontalContentContainer}>
        <ScrollView 
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.horizontalScrollContent}
          onScroll={handleHorizontalScroll}
          scrollEventThrottle={16}
        >
          {/* Section 1: Quick Access Cards */}
          <View style={[styles.contentSection, { width: screenWidth }]}>
          {/* Section 1: Quick Access Cards */}
          <View style={styles.quickAccessSection}>
            <View style={styles.quickAccessSectionHeader}>
              <View style={styles.quickAccessTitleRow}>
                <Text style={styles.modernSectionTitle}>Schnellzugriff</Text>
                <View style={styles.quickAccessBadge}>
                  <Text style={styles.quickAccessBadgeText}>Neu</Text>
                </View>
              </View>
              <Text style={styles.modernSectionSubtitle}>Setze dein Lernen nahtlos fort</Text>
            </View>
            
            <View style={styles.quickAccessGrid}>
              <TouchableOpacity 
                style={styles.quickAccessCard}
                onPress={() => router.push('/(tabs)/bibliothek')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#667EEA', '#7C3AED', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickCardGradient}
                >
                  <BookOpen size={24} color="white" />
                  <Text style={styles.quickCardTitle}>Bibliothek</Text>
                  <Text style={styles.quickCardSubtitle}>Lernmaterialien</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickAccessCard}
                onPress={() => router.push('/(tabs)/simulation')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8', '#1E40AF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickCardGradient}
                >
                  <Target size={24} color="white" />
                  <Text style={styles.quickCardTitle}>Simulation</Text>
                  <Text style={styles.quickCardSubtitle}>Prüfungstraining</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickAccessCard}
                onPress={() => router.push('/(tabs)/progress')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#10B981', '#059669', '#047857']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickCardGradient}
                >
                  <TrendingUp size={24} color="white" />
                  <Text style={styles.quickCardTitle}>Fortschritt</Text>
                  <Text style={styles.quickCardSubtitle}>Deine Statistiken</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
          </View>
          
          {/* Section 2: Recent Chapters */}
          <View style={[styles.contentSection, { width: screenWidth }]}>
          {/* Section 2: Letzte Kapitel - Enhanced Card Layout */}
          {recentMedicalContents.length > 0 && (
            <View style={styles.letzteKapitelSection}>
              <View style={styles.modernStructuredSectionHeader}>
                <View style={styles.modernSectionTitleContainer}>
                  <View style={styles.sectionIconWrapper}>
                    <BookOpen size={26} color="#4A90E2" />
                  </View>
                  <View style={styles.titleAndBadgeContainer}>
                    <Text style={styles.modernStructuredSectionTitle}>Letzte Kapitel</Text>
                    <View style={styles.chapterCountBadge}>
                      <Text style={styles.chapterCountText}>{recentMedicalContents.length}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.modernStructuredSectionSubtitle}>Setze dein Lernen dort fort, wo du aufgehört hast</Text>
                <View style={styles.sectionActions}>
                  <TouchableOpacity 
                    style={styles.modernViewAllButton}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modernViewAllText}>Alle anzeigen</Text>
                    <ArrowRight size={18} color="#4A90E2" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.filterButton}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.filterButtonText}>Filter</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.chapterCardsGrid}>
                {recentMedicalContents.slice(0, 4).map((content, index) => (
                  <Animated.View key={content.id}>
                    <TouchableOpacity 
                      style={styles.chapterCard}
                      activeOpacity={0.95}
                      onPressIn={() => {
                        // Scale down animation on press
                        Animated.spring(new Animated.Value(1), {
                          toValue: 0.97,
                          duration: 150,
                          useNativeDriver: true,
                        }).start();
                      }}
                      onPressOut={() => {
                        // Scale back up animation on release
                        Animated.spring(new Animated.Value(0.97), {
                          toValue: 1,
                          duration: 150,
                          useNativeDriver: true,
                        }).start();
                      }}
                    >
                    <LinearGradient
                      colors={['#ffffff', '#f8faff', '#f1f5f9']}
                      style={styles.chapterCardGradient}
                    >
                      <View style={styles.modernChapterCardHeader}>
                        <View style={styles.modernChapterIconContainer}>
                          <BookOpen size={20} color="#4A90E2" />
                        </View>
                        <View style={styles.chapterStatusRow}>
                          <View style={styles.difficultyBadge}>
                            <Text style={styles.difficultyText}>FSP</Text>
                          </View>
                          <View style={styles.modernProgressBadge}>
                            <Text style={styles.modernProgressText}>{Math.floor(Math.random() * 100)}%</Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.modernChapterCardContent}>
                        <View style={styles.chapterTitleRow}>
                          <Text style={styles.modernChapterTitle} numberOfLines={2}>
                            {content.title}
                          </Text>
                          <View style={styles.chapterTypeIndicator}>
                            <Text style={styles.chapterTypeText}>Kapitel</Text>
                          </View>
                        </View>
                        
                        <View style={styles.chapterCategoryRow}>
                          <Text style={styles.modernChapterCategory}>
                            {content.category}
                          </Text>
                          <View style={styles.estimatedTimeContainer}>
                            <Clock size={14} color="#10B981" />
                            <Text style={styles.estimatedTimeText}>~15 min</Text>
                          </View>
                        </View>
                        
                        <View style={styles.chapterStatsRow}>
                          <View style={styles.statItem}>
                            <Text style={styles.statNumber}>24</Text>
                            <Text style={styles.statLabel}>Fragen</Text>
                          </View>
                          <View style={styles.statDivider} />
                          <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{Math.floor(Math.random() * 5) + 3}</Text>
                            <Text style={styles.statLabel}>Versuche</Text>
                          </View>
                          <View style={styles.statDivider} />
                          <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{content.lastViewed}</Text>
                            <Text style={styles.statLabel}>Zuletzt</Text>
                          </View>
                        </View>
                        
                        <View style={styles.modernProgressContainer}>
                          <View style={styles.progressLabelRow}>
                            <Text style={styles.progressLabel}>Fortschritt</Text>
                            <Text style={styles.progressPercentage}>{Math.floor(Math.random() * 100)}%</Text>
                          </View>
                          <View style={styles.modernProgressBar}>
                            <View style={[styles.modernProgressFill, { width: `${Math.random() * 100}%` }]} />
                            <View style={styles.progressGlow} />
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.modernChapterCardFooter}>
                        <View style={styles.footerLeftSection}>
                          <View style={styles.lastActivityIndicator}>
                            <View style={styles.activityDot} />
                            <Text style={styles.lastActivityText}>Vor 2 Stunden</Text>
                          </View>
                        </View>
                        <View style={styles.footerRightSection}>
                          <TouchableOpacity 
                            style={styles.modernContinueButton}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.modernContinueText}>Fortsetzen</Text>
                            <ArrowRight size={16} color="#4A90E2" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
              
              {recentMedicalContents.length === 0 && (
                <View style={styles.noChaptersContainer}>
                  <View style={styles.noChaptersIcon}>
                    <BookOpen size={32} color={MEDICAL_COLORS.textSecondary} opacity={0.5} />
                  </View>
                  <Text style={styles.noChaptersTitle}>Noch keine Kapitel begonnen</Text>
                  <Text style={styles.noChaptersSubtitle}>Starte dein erstes Kapitel in der Bibliothek</Text>
                  <TouchableOpacity 
                    style={styles.startLearningButton}
                    onPress={() => router.push('/(tabs)/bibliothek')}
                  >
                    <Text style={styles.startLearningText}>Jetzt starten</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
        </View>

        {/* Section 3: Daily Tip */}
        <View style={[styles.contentSection, { width: screenWidth }]}>
        {/* Section 3: Tipp des Tages - Enhanced Card Layout */}
        <View style={styles.structuredSection}>
          <View style={styles.structuredSectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Lightbulb size={24} color="#F59E0B" />
              <Text style={styles.structuredSectionTitle}>Tipp des Tages</Text>
            </View>
            <Text style={styles.structuredSectionSubtitle}>Erweitere dein medizinisches Wissen täglich</Text>
          </View>
          
          <View style={styles.tipCard}>
            <LinearGradient
              colors={['#FEF3C7', '#FDE68A', '#FBBF24']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tipCardGradient}
            >
              <View style={styles.tipCardIcon}>
                <View style={styles.tipIconBg}>
                  <Lightbulb size={28} color="white" />
                </View>
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
          
          {/* Enhanced Navigation Arrow */}
          <Animated.View 
            style={[
              styles.sectionArrow,
              {
                transform: [{
                  translateY: bounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -8]
                  })
                }],
                opacity: 1
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.sectionArrowTouchable}
            >
              <View style={styles.sectionArrowContainer}>
                <ChevronDown size={18} color={MEDICAL_COLORS.primary} />
                <View style={styles.arrowPulse} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
        </View>

        {/* Section 4: Daily Question */}
        <View style={[styles.contentSection, { width: screenWidth }]}>
        {/* Section 4: Frage des Tages - Enhanced Card Layout */}
        {dailyQuestion && (
          <View style={styles.structuredSection}>
            <View style={styles.structuredSectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <HelpCircle size={24} color="#8B5CF6" />
                <Text style={styles.structuredSectionTitle}>Frage des Tages</Text>
              </View>
              <Text style={styles.structuredSectionSubtitle}>Teste dein Wissen mit einer täglichen Prüfungsfrage</Text>
            </View>
            
            <View style={styles.questionCard}>
              <LinearGradient
                colors={['#EDE9FE', '#DDD6FE', '#8B5CF6']}
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
            
            {/* Section completed indicator */}
            <View style={styles.sectionCompleteBadge}>
              <CheckCircle size={16} color={MEDICAL_COLORS.success} />
              <Text style={styles.sectionCompleteText}>Sektion abgeschlossen</Text>
            </View>
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
        </View>

        {/* Section 5: Medical Disclaimer */}
        <View style={[styles.contentSection, { width: screenWidth }]}>
        {/* Section 5: Medical Disclaimer - Enhanced Card Layout */}
        <View style={styles.structuredSection}>
          <View style={styles.disclaimerCard}>
            <LinearGradient
              colors={['#F0F9FF', '#E0F2FE', '#0EA5E9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.disclaimerCardGradient}
            >
              <View style={styles.disclaimerCardHeader}>
                <View style={styles.disclaimerIconBg}>
                  <Text style={styles.disclaimerEmoji}>⚕️</Text>
                </View>
                <Text style={styles.disclaimerCardTitle}>Medizinischer Haftungsausschluss</Text>
              </View>
              <Text style={styles.disclaimerCardText}>
                Diese Plattform stellt Lehrmaterialien ausschließlich für approbierte medizinische Fachkräfte zur Verfügung. Die Inhalte dienen der Prüfungsvorbereitung und stellen keine medizinische Beratung dar.
              </Text>
            </LinearGradient>
          </View>
        </View>
        </View>
        
        </ScrollView>
        
        {/* Navigation Arrows */}
        {currentSection > 0 && (
          <TouchableOpacity
            style={[styles.navArrow, styles.leftArrow]}
            onPress={scrollToPrevious}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
        )}
        
        {currentSection < sections.length - 1 && (
          <TouchableOpacity
            style={[styles.navArrow, styles.rightArrow]}
            onPress={scrollToNext}
            activeOpacity={0.7}
          >
            <ChevronRight size={24} color="white" />
          </TouchableOpacity>
        )}
        
        {/* Section Indicators */}
        <View style={styles.sectionIndicators}>
          {sections.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.indicator,
                currentSection === index && styles.activeIndicator
              ]}
              onPress={() => scrollToSection(index)}
            />
          ))}
        </View>
      </View>


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
  
  // Horizontal Content Styles
  horizontalContentContainer: {
    flex: 1,
    position: 'relative',
  },
  horizontalScroll: {
    flex: 1,
  },
  horizontalScrollContent: {
    flexDirection: 'row',
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  
  // Navigation Arrow Styles
  navArrow: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(74, 144, 226, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ translateY: -25 }],
  },
  leftArrow: {
    left: 20,
  },
  rightArrow: {
    right: 20,
  },
  
  // Section Indicators
  sectionIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(74, 144, 226, 0.3)',
  },
  activeIndicator: {
    backgroundColor: '#4A90E2',
    width: 16,
  },
  
  // Simplified Hero Section Styles
  simplifiedHeroSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 32,
    minHeight: 400,
  },
  heroContainer: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    minHeight: 350,
    justifyContent: 'center',
  },
  heroContent: {
    paddingVertical: 24,
    minHeight: 300,
    justifyContent: 'space-evenly',
  },
  heroSplitContainer: {
    flexDirection: screenWidth > 768 ? 'row' : 'column',
    minHeight: screenWidth > 768 ? 320 : 480,
    alignItems: screenWidth > 768 ? 'stretch' : 'center',
  },
  heroLeftSide: {
    flex: 1,
    backgroundColor: '#ffffff',
    minHeight: screenWidth > 768 ? 'auto' : 280,
    width: screenWidth > 768 ? 'auto' : '100%',
  },
  heroRightSide: {
    flex: screenWidth > 768 ? 1 : 0.8,
    backgroundColor: '#667eea',
    minHeight: screenWidth > 768 ? 'auto' : 140,
    width: screenWidth > 768 ? 'auto' : '100%',
    marginTop: screenWidth > 768 ? 0 : -20,
  },
  heroContentGradient: {
    flex: 1,
    flexDirection: 'column',
    padding: screenWidth > 768 ? 40 : 24,
    paddingTop: screenWidth > 768 ? 40 : 32,
    paddingBottom: screenWidth > 768 ? 40 : 28,
    justifyContent: screenWidth > 768 ? 'center' : 'flex-start',
    alignItems: screenWidth > 768 ? 'flex-start' : 'center',
  },
  heroTextContent: {
    maxWidth: '100%',
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  heroTitleContainer: {
    width: '100%',
    marginBottom: screenWidth > 768 ? 24 : 20,
    flexDirection: 'column',
    paddingVertical: 4,
  },
  heroSubtitleContainer: {
    width: '100%',
    marginBottom: screenWidth > 768 ? 20 : 18,
    flexDirection: 'column',
    paddingVertical: 4,
  },
  heroDescriptionContainer: {
    width: '100%',
    marginBottom: screenWidth > 768 ? 20 : 18,
    flexDirection: 'column',
    paddingVertical: 4,
  },
  heroTaglineContainer: {
    width: '100%',
    marginBottom: screenWidth > 768 ? 24 : 20,
    flexDirection: 'column',
    paddingVertical: 4,
  },
  heroButtonsContainer: {
    flexDirection: screenWidth > 768 ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: 'rgba(74, 144, 226, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  secondaryButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.2)',
  },
  badgeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#4A90E2',
    letterSpacing: 0.3,
  },
  modernHeroTitle: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    lineHeight: 44,
    marginBottom: 20,
    letterSpacing: -0.8,
  },
  modernHeroDescription: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 28,
    marginBottom: 32,
    opacity: 0.9,
  },
  heroFeaturesList: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.textPrimary,
  },
  modernHeroButtons: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  primaryModernButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  secondaryModernButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryModernButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginRight: 8,
  },
  secondaryModernButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  
  // Enhanced Split-Screen Hero Text Styles with Mobile Optimization
  splitScreenHeroTitle: {
    fontSize: screenWidth > 768 ? 36 : 28,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    lineHeight: screenWidth > 768 ? 1.5 : 1.6,
    letterSpacing: -0.8,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  splitScreenHeroSubtitle: {
    fontSize: screenWidth > 768 ? 20 : 18,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.primary,
    lineHeight: screenWidth > 768 ? 1.6 : 1.7,
    letterSpacing: -0.4,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  splitScreenHeroDescription: {
    fontSize: screenWidth > 768 ? 16 : 15,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: screenWidth > 768 ? 1.8 : 1.9,
    opacity: 0.85,
    fontWeight: '400',
    textAlign: 'center',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingVertical: 4,
  },
  splitScreenHeroTagline: {
    fontSize: screenWidth > 768 ? 17 : 16,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.textPrimary,
    lineHeight: screenWidth > 768 ? 1.7 : 1.8,
    fontStyle: 'italic',
    opacity: 0.9,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  splitScreenHeroButtons: {
    flexDirection: screenWidth > 768 ? 'row' : 'column',
    flexWrap: 'wrap',
    alignItems: screenWidth > 768 ? 'flex-start' : 'center',
    justifyContent: screenWidth > 768 ? 'flex-start' : 'center',
    width: '100%',
    marginTop: screenWidth > 768 ? 4 : 8,
  },
  primarySplitButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: screenWidth > 768 ? 36 : 32,
    paddingVertical: screenWidth > 768 ? 18 : 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: 'rgba(74, 144, 226, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
    minWidth: screenWidth > 768 ? 180 : '100%',
    maxWidth: screenWidth > 768 ? 'auto' : 280,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minHeight: 56,
    marginRight: screenWidth > 768 ? 12 : 0,
    marginBottom: screenWidth > 768 ? 0 : 10,
  },
  primarySplitButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginRight: 8,
  },
  secondarySplitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: screenWidth > 768 ? 36 : 32,
    paddingVertical: screenWidth > 768 ? 18 : 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(74, 144, 226, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: screenWidth > 768 ? 180 : '100%',
    maxWidth: screenWidth > 768 ? 'auto' : 280,
    justifyContent: 'center',
    shadowColor: 'rgba(74, 144, 226, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 56,
  },
  secondarySplitButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  
  // Hero Right Side - Professional Illustration Styles
  heroImageGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: screenWidth > 768 ? 40 : 20,
    paddingVertical: screenWidth > 768 ? 40 : 24,
  },
  heroIllustrationContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicalIllustration: {
    position: 'relative',
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Illustration Elements
  illustrationElement1: {
    position: 'absolute',
    top: 40,
    left: 40,
    alignItems: 'center',
  },
  medicalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  medicalEmoji: {
    fontSize: 36,
  },
  progressRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  
  illustrationElement2: {
    position: 'absolute',
    bottom: 60,
    right: 30,
  },
  bookStack: {
    alignItems: 'center',
  },
  book: {
    width: 60,
    height: 8,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  book1: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  book2: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginLeft: 8,
  },
  bookText: {
    fontSize: 8,
    fontFamily: 'Inter-Bold',
    color: '#667eea',
  },
  
  illustrationElement3: {
    position: 'absolute',
    top: 80,
    right: 60,
  },
  aiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  aiText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginLeft: 6,
  },
  
  floatingStats: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    gap: 12,
  },
  statBubble: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Modern Content Sections Styles
  modernContentContainer: {
    backgroundColor: '#f8fafc',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  quickAccessSection: {
    marginBottom: screenWidth > 768 ? 60 : 48,
    paddingHorizontal: screenWidth > 768 ? 0 : 4,
  },
  modernSectionTitle: {
    fontSize: screenWidth > 768 ? 36 : 28,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: screenWidth > 768 ? 12 : 10,
    letterSpacing: -0.8,
    lineHeight: 1.2,
    fontWeight: '700',
  },
  modernSectionSubtitle: {
    fontSize: screenWidth > 768 ? 19 : 17,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    marginBottom: screenWidth > 768 ? 36 : 32,
    opacity: 0.8,
    lineHeight: 1.45,
    fontWeight: '400',
  },
  quickAccessGrid: {
    flexDirection: screenWidth > 768 ? 'row' : 'column',
    gap: screenWidth > 768 ? 20 : 14,
    justifyContent: screenWidth > 768 ? 'space-between' : 'flex-start',
    alignItems: screenWidth > 768 ? 'flex-start' : 'stretch',
    marginTop: screenWidth > 768 ? 0 : 4,
  },
  quickAccessCard: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: 'rgba(59, 130, 246, 0.2)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    transform: [{ translateY: 0 }],
  },
  quickCardGradient: {
    padding: screenWidth > 768 ? 28 : 24,
    alignItems: 'center',
    minHeight: screenWidth > 768 ? 150 : 140,
    justifyContent: 'center',
    borderRadius: 20,
  },
  quickCardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  quickCardSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  
  // Recent Content Section
  recentContentSection: {
    marginBottom: 40,
  },
  recentContentList: {
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
  },
  modernContentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  modernContentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modernContentInfo: {
    flex: 1,
    marginRight: 16,
  },
  modernContentTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 4,
    lineHeight: 22,
  },
  modernContentCategory: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#4A90E2',
    marginBottom: 6,
  },
  modernContentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernContentTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    marginLeft: 6,
    opacity: 0.7,
  },
  contentProgress: {
    alignItems: 'flex-end',
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: '#e8ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFillBar: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  
  // Floating Elements
  floatingElements: {
    position: 'relative',
    width: 120,
    height: 120,
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
    width: 48,
    height: 48,
    top: -5,
    right: 15,
    transform: [{ rotate: '15deg' }],
  },
  cube2: {
    width: 40,
    height: 40,
    bottom: 25,
    left: 0,
    transform: [{ rotate: '-10deg' }],
  },
  cube3: {
    width: 44,
    height: 44,
    top: 20,
    left: 20,
    transform: [{ rotate: '25deg' }],
  },
  cube4: {
    width: 36,
    height: 36,
    bottom: 0,
    right: 0,
    transform: [{ rotate: '-20deg' }],
  },
  
  
  // Enhanced section styles
  sectionContainer: {
    position: 'relative',
    paddingBottom: 80,
    paddingTop: 32,
    minHeight: screenHeight * 0.65, // More spacious sections for better content display
    backgroundColor: 'rgba(249, 250, 251, 0.95)',
    marginVertical: 12,
    marginHorizontal: 8,
    borderRadius: 20,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  
  sectionArrow: {
    alignSelf: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.15)',
    borderRadius: 20,
    padding: 12,
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 144, 226, 0.3)',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  
  
  // Enhanced Arrow Styles
  arrowTouchable: {
    padding: 8,
  },
  
  arrowContainer: {
    alignItems: 'center',
    gap: 4,
  },
  
  arrowText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.9,
  },
  
  sectionArrowTouchable: {
    padding: 6,
  },
  
  sectionArrowContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  arrowPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    opacity: 0.6,
  },
  
  // Section Completion Badge Styles
  sectionCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${MEDICAL_COLORS.success}15`,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: `${MEDICAL_COLORS.success}30`,
  },
  
  sectionCompleteText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.success,
    marginLeft: 6,
    letterSpacing: 0.3,
  },

  // Premium Structured Content Section Styles with Professional Design
  structuredSection: {
    marginHorizontal: screenWidth > 768 ? 32 : 24,
    marginBottom: screenWidth > 768 ? 56 : 44,
    paddingTop: screenWidth > 768 ? 12 : 8,
    paddingHorizontal: screenWidth > 768 ? 8 : 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  structuredSectionHeader: {
    marginBottom: screenWidth > 768 ? 32 : 28,
    paddingBottom: screenWidth > 768 ? 8 : 6,
    paddingTop: screenWidth > 768 ? 24 : 20,
    paddingHorizontal: screenWidth > 768 ? 16 : 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenWidth > 768 ? 12 : 10,
  },
  structuredSectionTitle: {
    fontSize: screenWidth > 768 ? 28 : 24,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    marginLeft: 16,
    letterSpacing: -0.8,
    fontWeight: '700',
    lineHeight: 1.2,
  },
  structuredSectionSubtitle: {
    fontSize: screenWidth > 768 ? 17 : 15,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 1.5,
    opacity: 0.75,
    marginLeft: 40,
    fontWeight: '400',
    marginTop: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: screenWidth > 768 ? 12 : 10,
    paddingHorizontal: screenWidth > 768 ? 20 : 16,
    borderRadius: 14,
    backgroundColor: 'rgba(74, 144, 226, 0.06)',
    marginTop: screenWidth > 768 ? 20 : 16,
    marginBottom: screenWidth > 768 ? 8 : 6,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.12)',
    shadowColor: 'rgba(74, 144, 226, 0.15)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  viewAllText: {
    fontSize: screenWidth > 768 ? 15 : 14,
    fontFamily: 'Inter-Medium',
    color: '#4A90E2',
    marginRight: 6,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Premium Letzte Kapitel (Chapter Cards) Styles with Professional Design
  letzteKapitelSection: {
    marginHorizontal: screenWidth > 768 ? 32 : 24,
    marginBottom: screenWidth > 768 ? 56 : 44,
    paddingTop: screenWidth > 768 ? 12 : 8,
    paddingHorizontal: screenWidth > 768 ? 8 : 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  chapterCardsGrid: {
    flexDirection: screenWidth > 768 ? 'row' : 'column',
    flexWrap: screenWidth > 768 ? 'wrap' : 'nowrap',
    justifyContent: screenWidth > 768 ? 'space-between' : 'flex-start',
    gap: screenWidth > 768 ? 20 : 14,
    marginTop: 4,
    alignItems: screenWidth > 768 ? 'flex-start' : 'stretch',
  },
  chapterCard: {
    width: screenWidth > 768 ? '48%' : '100%',
    borderRadius: 22,
    shadowColor: 'rgba(59, 130, 246, 0.25)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
    marginBottom: screenWidth > 768 ? 14 : 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    minHeight: screenWidth > 768 ? 'auto' : 200,
    transform: [{ translateY: 0 }],
  },
  chapterCardGradient: {
    flex: 1,
    padding: 0,
    borderRadius: 20,
  },
  chapterCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: screenWidth > 768 ? 20 : 18,
    paddingBottom: screenWidth > 768 ? 16 : 14,
  },
  chapterIconContainer: {
    width: screenWidth > 768 ? 44 : 40,
    height: screenWidth > 768 ? 44 : 40,
    borderRadius: screenWidth > 768 ? 22 : 20,
    backgroundColor: 'rgba(74, 144, 226, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(74, 144, 226, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.15)',
  },
  chapterProgressBadge: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: screenWidth > 768 ? 12 : 10,
    paddingVertical: screenWidth > 768 ? 6 : 5,
    borderRadius: 16,
    shadowColor: 'rgba(74, 144, 226, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  chapterProgressText: {
    fontSize: screenWidth > 768 ? 13 : 12,
    fontFamily: 'Inter-Bold',
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  chapterCardContent: {
    paddingHorizontal: screenWidth > 768 ? 20 : 18,
    paddingBottom: screenWidth > 768 ? 16 : 14,
    backgroundColor: 'rgba(248, 250, 255, 0.7)',
    marginHorizontal: screenWidth > 768 ? 8 : 6,
    marginBottom: screenWidth > 768 ? 8 : 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.08)',
  },
  chapterCardTitle: {
    fontSize: screenWidth > 768 ? 18 : 16,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.textPrimary,
    lineHeight: 1.35,
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  chapterCardCategory: {
    fontSize: screenWidth > 768 ? 14 : 13,
    fontFamily: 'Inter-Medium',
    color: '#4A90E2',
    marginBottom: screenWidth > 768 ? 14 : 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '500',
  },
  chapterCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chapterMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chapterMetaText: {
    fontSize: screenWidth > 768 ? 13 : 12,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    marginLeft: 4,
    fontWeight: '400',
    opacity: 0.8,
  },
  chapterProgressContainer: {
    marginBottom: 4,
  },
  chapterProgressBar: {
    height: 6,
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  chapterProgressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 3,
  },
  chapterCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: screenWidth > 768 ? 20 : 18,
    paddingVertical: screenWidth > 768 ? 16 : 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 144, 226, 0.05)',
    backgroundColor: 'rgba(244, 248, 255, 0.8)',
    marginTop: 4,
  },
  continueText: {
    fontSize: screenWidth > 768 ? 15 : 14,
    fontFamily: 'Inter-Medium',
    color: '#4A90E2',
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Modern Chapter Card Styles for Enhanced Scannability
  modernChapterCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: screenWidth > 768 ? 24 : 20,
    paddingBottom: screenWidth > 768 ? 16 : 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 144, 226, 0.08)',
  },
  modernChapterIconContainer: {
    width: screenWidth > 768 ? 52 : 48,
    height: screenWidth > 768 ? 52 : 48,
    borderRadius: screenWidth > 768 ? 26 : 24,
    backgroundColor: 'rgba(74, 144, 226, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(74, 144, 226, 0.15)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 144, 226, 0.12)',
  },
  chapterStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: screenWidth > 768 ? 12 : 10,
  },
  difficultyBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: screenWidth > 768 ? 10 : 8,
    paddingVertical: screenWidth > 768 ? 6 : 5,
    borderRadius: 12,
    shadowColor: 'rgba(245, 158, 11, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  difficultyText: {
    fontSize: screenWidth > 768 ? 13 : 12,
    fontFamily: 'Inter-Bold',
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modernProgressBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: screenWidth > 768 ? 12 : 10,
    paddingVertical: screenWidth > 768 ? 6 : 5,
    borderRadius: 14,
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modernProgressText: {
    fontSize: screenWidth > 768 ? 13 : 12,
    fontFamily: 'Inter-Bold',
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  modernChapterCardContent: {
    paddingHorizontal: screenWidth > 768 ? 24 : 20,
    paddingVertical: screenWidth > 768 ? 20 : 18,
    gap: screenWidth > 768 ? 16 : 14,
  },
  chapterTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  modernChapterTitle: {
    fontSize: screenWidth > 768 ? 18 : 16,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.textPrimary,
    lineHeight: 1.35,
    fontWeight: '600',
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 12,
  },
  chapterTypeIndicator: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  chapterTypeText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  chapterCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modernChapterCategory: {
    fontSize: screenWidth > 768 ? 15 : 14,
    fontFamily: 'Inter-Medium',
    color: '#4A90E2',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  estimatedTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  estimatedTimeText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
    fontWeight: '500',
  },

  chapterStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(248, 250, 255, 0.8)',
    paddingVertical: screenWidth > 768 ? 14 : 12,
    paddingHorizontal: screenWidth > 768 ? 16 : 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.05)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: screenWidth > 768 ? 16 : 15,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(74, 144, 226, 0.15)',
    marginHorizontal: 8,
  },

  modernProgressContainer: {
    marginTop: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.textSecondary,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  progressPercentage: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
    fontWeight: '700',
  },
  modernProgressBar: {
    height: 8,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  modernProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 4,
  },

  modernChapterCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: screenWidth > 768 ? 24 : 20,
    paddingVertical: screenWidth > 768 ? 18 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 144, 226, 0.05)',
    backgroundColor: 'rgba(244, 248, 255, 0.6)',
  },
  footerLeftSection: {
    flex: 1,
  },
  lastActivityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    shadowColor: 'rgba(16, 185, 129, 0.4)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  lastActivityText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.textSecondary,
    fontWeight: '500',
    opacity: 0.8,
  },
  footerRightSection: {
    alignItems: 'flex-end',
  },
  modernContinueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.08)',
    paddingHorizontal: screenWidth > 768 ? 16 : 14,
    paddingVertical: screenWidth > 768 ? 10 : 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.15)',
    shadowColor: 'rgba(74, 144, 226, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
    gap: 6,
  },
  modernContinueText: {
    fontSize: screenWidth > 768 ? 14 : 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4A90E2',
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // Enhanced Section Header Styles for Better Scannability
  modernStructuredSectionHeader: {
    marginBottom: screenWidth > 768 ? 32 : 28,
    paddingBottom: screenWidth > 768 ? 12 : 10,
    paddingTop: screenWidth > 768 ? 28 : 24,
    paddingHorizontal: screenWidth > 768 ? 20 : 16,
    backgroundColor: 'rgba(248, 250, 255, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.08)',
  },
  modernSectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenWidth > 768 ? 16 : 14,
    gap: screenWidth > 768 ? 16 : 14,
  },
  sectionIconWrapper: {
    width: screenWidth > 768 ? 56 : 52,
    height: screenWidth > 768 ? 56 : 52,
    borderRadius: screenWidth > 768 ? 28 : 26,
    backgroundColor: 'rgba(74, 144, 226, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(74, 144, 226, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 144, 226, 0.15)',
  },
  titleAndBadgeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modernStructuredSectionTitle: {
    fontSize: screenWidth > 768 ? 30 : 26,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    letterSpacing: -0.8,
    fontWeight: '700',
    lineHeight: 1.2,
  },
  chapterCountBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: screenWidth > 768 ? 12 : 10,
    paddingVertical: screenWidth > 768 ? 6 : 5,
    borderRadius: 12,
    shadowColor: 'rgba(245, 158, 11, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  chapterCountText: {
    fontSize: screenWidth > 768 ? 14 : 13,
    fontFamily: 'Inter-Bold',
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modernStructuredSectionSubtitle: {
    fontSize: screenWidth > 768 ? 17 : 15,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 1.5,
    opacity: 0.85,
    fontWeight: '400',
    marginBottom: screenWidth > 768 ? 16 : 14,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: screenWidth > 768 ? 12 : 10,
  },
  modernViewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.06)',
    paddingVertical: screenWidth > 768 ? 12 : 10,
    paddingHorizontal: screenWidth > 768 ? 20 : 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.12)',
    shadowColor: 'rgba(74, 144, 226, 0.15)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  modernViewAllText: {
    fontSize: screenWidth > 768 ? 15 : 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4A90E2',
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  filterButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    paddingVertical: screenWidth > 768 ? 12 : 10,
    paddingHorizontal: screenWidth > 768 ? 16 : 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    shadowColor: 'rgba(139, 92, 246, 0.2)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  filterButtonText: {
    fontSize: screenWidth > 768 ? 14 : 13,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Enhanced Quick Access Section Header
  quickAccessSectionHeader: {
    marginBottom: screenWidth > 768 ? 24 : 20,
    paddingHorizontal: screenWidth > 768 ? 0 : 2,
  },
  quickAccessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  quickAccessBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickAccessBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // No Chapters State
  noChaptersContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  noChaptersIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  noChaptersTitle: {
    fontSize: screenWidth > 768 ? 20 : 18,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 1.3,
  },
  noChaptersSubtitle: {
    fontSize: screenWidth > 768 ? 16 : 15,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: screenWidth > 768 ? 24 : 20,
    lineHeight: 1.45,
    fontWeight: '400',
    opacity: 0.8,
  },
  startLearningButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startLearningText: {
    fontSize: screenWidth > 768 ? 17 : 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // Premium Tip Card Styles
  tipCard: {
    borderRadius: 20,
    shadowColor: 'rgba(245, 158, 11, 0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    marginBottom: screenWidth > 768 ? 20 : 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  tipCardGradient: {
    padding: screenWidth > 768 ? 28 : 24,
    position: 'relative',
    borderRadius: 20,
  },
  tipCardIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  tipIconBg: {
    width: screenWidth > 768 ? 56 : 52,
    height: screenWidth > 768 ? 56 : 52,
    borderRadius: screenWidth > 768 ? 28 : 26,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: 'rgba(245, 158, 11, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },

  // Premium Question Card Styles
  questionCard: {
    borderRadius: 20,
    shadowColor: 'rgba(139, 92, 246, 0.25)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
    marginBottom: screenWidth > 768 ? 20 : 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  questionCardGradient: {
    padding: screenWidth > 768 ? 32 : 28,
    position: 'relative',
    borderRadius: 20,
  },
  questionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionIconBg: {
    width: screenWidth > 768 ? 56 : 52,
    height: screenWidth > 768 ? 56 : 52,
    borderRadius: screenWidth > 768 ? 28 : 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginRight: screenWidth > 768 ? 16 : 12,
    shadowColor: 'rgba(255, 255, 255, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  questionHeaderInfo: {
    flex: 1,
  },
  questionCardTitle: {
    fontSize: screenWidth > 768 ? 22 : 20,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginBottom: 6,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 1.2,
  },
  questionCardSubtitle: {
    fontSize: screenWidth > 768 ? 16 : 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    lineHeight: 1.4,
  },

  // Premium Disclaimer Card Styles
  disclaimerCard: {
    borderRadius: 20,
    shadowColor: 'rgba(14, 165, 233, 0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    marginBottom: screenWidth > 768 ? 32 : 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  disclaimerCardGradient: {
    padding: screenWidth > 768 ? 28 : 24,
    borderRadius: 20,
  },
  disclaimerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  disclaimerIconBg: {
    width: screenWidth > 768 ? 48 : 44,
    height: screenWidth > 768 ? 48 : 44,
    borderRadius: screenWidth > 768 ? 24 : 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: screenWidth > 768 ? 16 : 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: 'rgba(255, 255, 255, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  disclaimerCardTitle: {
    fontSize: screenWidth > 768 ? 18 : 16,
    fontFamily: 'Inter-Bold',
    color: 'white',
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 1.3,
  },
  disclaimerCardText: {
    fontSize: screenWidth > 768 ? 15 : 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 1.5,
    fontWeight: '400',
    marginTop: 2,
  },
});