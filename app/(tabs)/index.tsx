import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Menu as MenuIcon, Lightbulb, HelpCircle, CheckCircle, XCircle, BookOpen, Clock, ArrowRight, Sparkles, Target, TrendingUp, ChevronDown } from 'lucide-react-native';
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
  
  // Scroll ref for section navigation
  const scrollViewRef = useRef<ScrollView>(null);
  
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

  // Advanced scroll tracking and momentum
  const [currentSection, setCurrentSection] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  // Improved section positions for better content display (Hero=0, Lernkapital=1, Tipp=2, Frage=3)
  const sectionPositions = [0, 480, 960, 1440]; 
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Scroll to specific section
  const scrollToSection = (sectionIndex: number) => {
    if (scrollViewRef.current && sectionIndex < sectionPositions.length) {
      scrollViewRef.current.scrollTo({
        y: sectionPositions[sectionIndex],
        animated: true,
      });
      setCurrentSection(sectionIndex);
    }
  };
  
  // Scroll to next section
  const scrollToNextSection = () => {
    const nextSection = currentSection + 1;
    if (nextSection < sectionPositions.length) {
      scrollToSection(nextSection);
    }
  };
  
  // Enhanced scroll handling with momentum and progress tracking
  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const containerHeight = event.nativeEvent.layoutMeasurement.height;
    
    // Calculate scroll progress (0 to 1)
    const progress = Math.min(scrollY / (contentHeight - containerHeight), 1);
    setScrollProgress(progress);
    
    // Set scrolling state
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Enhanced timeout for better momentum detection
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      snapToNearestSection(scrollY);
    }, 200);
    
    // Find which section we're closest to
    let closestSection = 0;
    let minDistance = Math.abs(scrollY - sectionPositions[0]);
    
    for (let i = 1; i < sectionPositions.length; i++) {
      const distance = Math.abs(scrollY - sectionPositions[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestSection = i;
      }
    }
    
    if (closestSection !== currentSection) {
      setCurrentSection(closestSection);
    }
  };
  
  // Enhanced snap to nearest section with better detection
  const snapToNearestSection = (scrollY: number) => {
    let closestSection = 0;
    let minDistance = Math.abs(scrollY - sectionPositions[0]);
    
    for (let i = 1; i < sectionPositions.length; i++) {
      const distance = Math.abs(scrollY - sectionPositions[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestSection = i;
      }
    }
    
    // More responsive snapping with improved threshold
    if (minDistance > 80) {
      setTimeout(() => {
        scrollToSection(closestSection);
      }, 150);
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

      {/* Modern Split-Screen Hero Section */}
      <View style={styles.modernHeroSection}>
        <View style={styles.heroSplitContainer}>
          {/* Left Side - Content */}
          <View style={styles.heroLeftSide}>
            <LinearGradient
              colors={['rgba(102, 126, 234, 0.05)', 'rgba(118, 75, 162, 0.08)', 'rgba(255, 255, 255, 0.95)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroContentGradient}
            >
              <View style={styles.heroTextContent}>
                <Text style={styles.splitScreenHeroTitle}>
                  Nur bei KP Med: Die einzige KI-Simulation,
                </Text>
                <Text style={styles.splitScreenHeroSubtitle}>
                  die Dich wirklich auf die medizinische Prüfung in Deutschland vorbereitet
                </Text>
                
                <Text style={styles.splitScreenHeroDescription}>
                  Keine Theorie. Keine Spielerei. Sondern echte Prüfungssimulation, 
                  personalisierte Lerninhalte und intelligente Auswertung – exklusiv 
                  entwickelt für internationale Ärzt:innen.
                </Text>
                
                <Text style={styles.splitScreenHeroTagline}>
                  Starte nicht irgendwo. Starte da, wo Erfolg beginnt.
                </Text>
                
                <View style={styles.splitScreenHeroButtons}>
                  <TouchableOpacity 
                    style={styles.primarySplitButton}
                    onPress={() => router.push('/(tabs)/simulation')}
                  >
                    <Text style={styles.primarySplitButtonText}>Simulation starten</Text>
                    <ArrowRight size={18} color="white" style={styles.buttonIcon} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.secondarySplitButton}
                    onPress={() => router.push('/(tabs)/bibliothek')}
                  >
                    <Text style={styles.secondarySplitButtonText}>Jetzt lernen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>
          
          {/* Right Side - Professional Illustration */}
          <View style={styles.heroRightSide}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroImageGradient}
            >
              <View style={styles.heroIllustrationContainer}>
                {/* Medical Education Illustration */}
                <View style={styles.medicalIllustration}>
                  <View style={styles.illustrationElement1}>
                    <View style={styles.medicalIcon}>
                      <Text style={styles.medicalEmoji}>⚕️</Text>
                    </View>
                    <View style={styles.progressRing}>
                      <View style={styles.innerRing}></View>
                    </View>
                  </View>
                  
                  <View style={styles.illustrationElement2}>
                    <View style={styles.bookStack}>
                      <View style={[styles.book, styles.book1]}>
                        <Text style={styles.bookText}>FSP</Text>
                      </View>
                      <View style={[styles.book, styles.book2]}>
                        <Text style={styles.bookText}>KP</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.illustrationElement3}>
                    <View style={styles.aiChip}>
                      <Sparkles size={20} color="white" />
                      <Text style={styles.aiText}>KI</Text>
                    </View>
                  </View>
                  
                  <View style={styles.floatingStats}>
                    <View style={styles.statBubble}>
                      <Text style={styles.statNumber}>95%</Text>
                      <Text style={styles.statLabel}>Erfolgsrate</Text>
                    </View>
                    <View style={styles.statBubble}>
                      <Text style={styles.statNumber}>1000+</Text>
                      <Text style={styles.statLabel}>Fragen</Text>
                    </View>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        
        {/* Modern Content Sections with Enhanced Spacing */}
        <View style={[styles.modernContentContainer, { paddingTop: screenWidth > 768 ? 24 : 16 }]}>
          {/* Section 1: Quick Access Cards */}
          <View style={styles.quickAccessSection}>
            <Text style={styles.modernSectionTitle}>Schnellzugriff</Text>
            <Text style={styles.modernSectionSubtitle}>Setze dein Lernen nahtlos fort</Text>
            
            <View style={styles.quickAccessGrid}>
              <TouchableOpacity 
                style={styles.quickAccessCard}
                onPress={() => router.push('/(tabs)/bibliothek')}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
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
              >
                <LinearGradient
                  colors={['#4A90E2', '#357ABD']}
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
              >
                <LinearGradient
                  colors={['#52C41A', '#389E0D']}
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
          
          {/* Section 2: Letzte Kapitel - Enhanced Card Layout */}
          {recentMedicalContents.length > 0 && (
            <View style={styles.letzteKapitelSection}>
              <View style={styles.structuredSectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <BookOpen size={24} color="#4A90E2" />
                  <Text style={styles.structuredSectionTitle}>Letzte Kapitel</Text>
                </View>
                <Text style={styles.structuredSectionSubtitle}>Setze dein Lernen dort fort, wo du aufgehört hast</Text>
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>Alle anzeigen</Text>
                  <ArrowRight size={16} color="#4A90E2" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.chapterCardsGrid}>
                {recentMedicalContents.slice(0, 4).map((content, index) => (
                  <TouchableOpacity 
                    key={content.id} 
                    style={styles.chapterCard}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#ffffff', '#f8fafe']}
                      style={styles.chapterCardGradient}
                    >
                      <View style={styles.chapterCardHeader}>
                        <View style={styles.chapterIconContainer}>
                          <BookOpen size={18} color="#4A90E2" />
                        </View>
                        <View style={styles.chapterProgressBadge}>
                          <Text style={styles.chapterProgressText}>{Math.floor(Math.random() * 100)}%</Text>
                        </View>
                      </View>
                      
                      <View style={styles.chapterCardContent}>
                        <Text style={styles.chapterCardTitle} numberOfLines={2}>
                          {content.title}
                        </Text>
                        <Text style={styles.chapterCardCategory}>
                          {content.category}
                        </Text>
                        
                        <View style={styles.chapterCardMeta}>
                          <View style={styles.chapterMetaItem}>
                            <Clock size={12} color={MEDICAL_COLORS.textSecondary} />
                            <Text style={styles.chapterMetaText}>{content.lastViewed}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.chapterProgressContainer}>
                          <View style={styles.chapterProgressBar}>
                            <View style={[styles.chapterProgressFill, { width: `${Math.random() * 100}%` }]} />
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.chapterCardFooter}>
                        <Text style={styles.continueText}>Weiter lernen</Text>
                        <ArrowRight size={14} color="#4A90E2" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
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
                opacity: isScrolling ? 0.4 : 1
              }
            ]}
          >
            <TouchableOpacity 
              onPress={() => scrollToSection(3)}
              style={styles.sectionArrowTouchable}
            >
              <View style={styles.sectionArrowContainer}>
                <ChevronDown size={18} color={MEDICAL_COLORS.primary} />
                <View style={styles.arrowPulse} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

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
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Enhanced Section Indicators with Progress */}
      <View style={styles.sectionIndicators}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  height: `${scrollProgress * 100}%`,
                  opacity: isScrolling ? 0.8 : 0.4
                }
              ]} 
            />
          </View>
        </View>
        
        {/* Section Dots */}
        <View style={styles.dotsContainer}>
          {sectionPositions.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => scrollToSection(index)}
              onPressIn={() => {
                Animated.spring(scaleAnim, {
                  toValue: 1.3,
                  useNativeDriver: true,
                }).start();
              }}
              onPressOut={() => {
                Animated.spring(scaleAnim, {
                  toValue: 1,
                  useNativeDriver: true,
                }).start();
              }}
            >
              <Animated.View
                style={[
                  styles.sectionDot,
                  currentSection === index && styles.activeSectionDot,
                  { 
                    transform: [{ scale: currentSection === index ? 1.2 : scaleAnim }],
                    opacity: isScrolling && currentSection !== index ? 0.6 : 1
                  }
                ]}
              />
            </TouchableOpacity>
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
  
  // Modern Split-Screen Hero Section Styles
  modernHeroSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 0,
    marginBottom: 0,
  },
  heroSplitContainer: {
    flexDirection: screenWidth > 768 ? 'row' : 'column',
    minHeight: screenWidth > 768 ? 312 : 384,
  },
  heroLeftSide: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  heroRightSide: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  heroContentGradient: {
    flex: 1,
    padding: 40,
    justifyContent: 'center',
  },
  heroTextContent: {
    maxWidth: 480,
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
  
  // Enhanced Split-Screen Hero Text Styles with Modern Typography
  splitScreenHeroTitle: {
    fontSize: screenWidth > 768 ? 42 : 32,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    lineHeight: screenWidth > 768 ? 1.15 : 1.2,
    marginBottom: screenWidth > 768 ? 20 : 16,
    letterSpacing: -1.0,
    fontWeight: '800',
  },
  splitScreenHeroSubtitle: {
    fontSize: screenWidth > 768 ? 26 : 22,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.primary,
    lineHeight: screenWidth > 768 ? 1.25 : 1.3,
    marginBottom: screenWidth > 768 ? 28 : 24,
    letterSpacing: -0.6,
    fontWeight: '600',
  },
  splitScreenHeroDescription: {
    fontSize: screenWidth > 768 ? 18 : 16,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 1.6,
    marginBottom: screenWidth > 768 ? 20 : 18,
    opacity: 0.85,
    fontWeight: '400',
  },
  splitScreenHeroTagline: {
    fontSize: screenWidth > 768 ? 20 : 18,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.textPrimary,
    lineHeight: 1.4,
    marginBottom: screenWidth > 768 ? 40 : 36,
    fontStyle: 'italic',
    opacity: 0.9,
    fontWeight: '500',
  },
  splitScreenHeroButtons: {
    flexDirection: screenWidth > 768 ? 'row' : 'column',
    gap: 16,
    flexWrap: 'wrap',
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
    minWidth: screenWidth > 768 ? 180 : 160,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
    minWidth: screenWidth > 768 ? 180 : 160,
    justifyContent: 'center',
    shadowColor: 'rgba(74, 144, 226, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
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
    padding: 40,
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
    marginBottom: 60,
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
    gap: 20,
    justifyContent: 'space-between',
  },
  quickAccessCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
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
  
  // Simple scroll arrow
  scrollArrow: {
    position: 'absolute',
    top: '50%',
    right: 20,
    transform: [{ translateY: -16 }],
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
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
  
  // Enhanced Section Indicators with Premium Design
  sectionIndicators: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -50 }],
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 144, 226, 0.25)',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 16,
  },
  
  progressContainer: {
    marginRight: 12,
  },
  
  progressTrack: {
    width: 4,
    height: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(74, 144, 226, 0.2)',
  },
  
  progressFill: {
    width: '100%',
    backgroundColor: MEDICAL_COLORS.primary,
    borderRadius: 3,
    shadowColor: MEDICAL_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  
  dotsContainer: {
    gap: 16,
  },
  
  sectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 2,
    borderColor: 'rgba(74, 144, 226, 0.5)',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  
  activeSectionDot: {
    backgroundColor: MEDICAL_COLORS.primary,
    borderColor: MEDICAL_COLORS.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowColor: MEDICAL_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: screenWidth > 768 ? 20 : 16,
    marginTop: 4,
  },
  chapterCard: {
    width: screenWidth > 768 ? '48%' : '100%',
    borderRadius: 20,
    shadowColor: 'rgba(74, 144, 226, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
    marginBottom: screenWidth > 768 ? 12 : 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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