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
            
            {/* Intelligent Scroll Arrow */}
            <Animated.View 
              style={[
                styles.scrollArrow,
                {
                  transform: [{
                    translateY: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -12]
                    })
                  }],
                  opacity: isScrolling ? 0.3 : 1
                }
              ]}
            >
              <TouchableOpacity 
                onPress={scrollToNextSection}
                style={styles.arrowTouchable}
              >
                <View style={styles.arrowContainer}>
                  <ChevronDown size={24} color="white" />
                  <Text style={styles.arrowText}>Weiter</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        
        {/* Section 1: Last Medical Contents */}
        {recentMedicalContents.length > 0 && (
          <View style={styles.sectionContainer}>
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
                onPress={() => scrollToSection(2)}
                style={styles.sectionArrowTouchable}
              >
                <View style={styles.sectionArrowContainer}>
                  <ChevronDown size={18} color={MEDICAL_COLORS.primary} />
                  <View style={styles.arrowPulse} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {/* Section 2: Tipp des Tages */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tipp des Tages</Text>
          </View>
          
          <View style={styles.card}>
            <LinearGradient
              colors={[`${MEDICAL_COLORS.primary}15`, `${MEDICAL_COLORS.primary}08`]}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <Lightbulb size={24} color={MEDICAL_COLORS.primary} />
                <Text style={styles.cardTitle}>Medizinisches Wissen</Text>
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

        {/* Section 3: Frage des Tages */}
        {dailyQuestion && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Frage des Tages</Text>
            </View>
            
            <View style={styles.card}>
              <LinearGradient
                colors={[`${MEDICAL_COLORS.primary}15`, `${MEDICAL_COLORS.primary}08`]}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <HelpCircle size={24} color={MEDICAL_COLORS.primary} />
                  <Text style={styles.cardTitle}>Prüfungssimulation</Text>
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
  
  // Hero Section Styles
  heroSection: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
  },
  heroGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    minHeight: 180,
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
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: 'white',
    lineHeight: 34,
    marginBottom: 6,
    letterSpacing: -0.7,
  },
  heroSubtitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 34,
    marginBottom: 12,
    letterSpacing: -0.7,
  },
  heroDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 10,
    maxWidth: '95%',
  },
  heroTagline: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 22,
    marginBottom: 20,
    letterSpacing: -0.4,
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
});