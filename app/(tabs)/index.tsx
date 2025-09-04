import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Menu as MenuIcon, Lightbulb, CheckCircle, BookOpen, Clock, ArrowRight, Sparkles, Target, TrendingUp, ChevronDown, BarChart3, Users } from 'lucide-react-native';
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
  
  // Scroll refs for smooth navigation
  const scrollViewRef = useRef<ScrollView>(null);
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchDailyContent();
    loadRecentMedicalContents();
    checkOnboardingStatus();
    startBounceAnimation();
  }, [user]);
  
  // Bounce animation for arrows
  const startBounceAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };
  
  // Smooth scroll to sections
  const scrollToSection = (sectionIndex: number) => {
    if (scrollViewRef.current) {
      const yPosition = sectionIndex * screenHeight;
      scrollViewRef.current.scrollTo({
        y: yPosition,
        animated: true,
      });
    }
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
      {/* Fixed Header */}
      <LinearGradient
        colors={['#4A90E2', '#357ABD', '#2E5B9A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fixedHeader}
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

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        pagingEnabled={false}
        decelerationRate="fast"
      >
        {/* Section 1: Hero */}
        <View style={[styles.section, styles.heroSection]}>
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
              
              {/* Floating elements */}
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
              </View>
            </View>
            
            {/* Scroll Arrow */}
            <Animated.View 
              style={[
                styles.scrollArrow, 
                {
                  transform: [{
                    translateY: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10]
                    })
                  }]
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.arrowButton}
                onPress={() => scrollToSection(1)}
              >
                <ChevronDown size={24} color="white" />
              </TouchableOpacity>
            </Animated.View>
          </LinearGradient>
        </View>

        {/* Section 2: Lernkapital */}
        <View style={[styles.section, styles.lernkapitalSection]}>
          <LinearGradient
            colors={['#f8faff', '#ffffff', '#f0f9ff']}
            style={styles.sectionGradient}
          >
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Letzte Kapitel</Text>
              <View style={styles.chaptersContainer}>
                {recentMedicalContents.map((content, index) => (
                  <TouchableOpacity key={content.id} style={styles.chapterCard}>
                    <View style={styles.chapterIcon}>
                      <BookOpen size={20} color={MEDICAL_COLORS.primary} />
                    </View>
                    <View style={styles.chapterInfo}>
                      <Text style={styles.chapterTitle}>{content.title}</Text>
                      <Text style={styles.chapterCategory}>{content.category}</Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${Math.random() * 100}%` }]} />
                      </View>
                    </View>
                    <View style={styles.chapterMeta}>
                      <Clock size={14} color={MEDICAL_COLORS.textSecondary} />
                      <Text style={styles.chapterTime}>{content.lastViewed}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Scroll Arrow */}
            <Animated.View 
              style={[
                styles.scrollArrow, 
                {
                  transform: [{
                    translateY: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10]
                    })
                  }]
                }
              ]}
            >
              <TouchableOpacity 
                style={[styles.arrowButton, styles.lightArrowButton]}
                onPress={() => scrollToSection(2)}
              >
                <ChevronDown size={24} color={MEDICAL_COLORS.primary} />
              </TouchableOpacity>
            </Animated.View>
          </LinearGradient>
        </View>

        {/* Section 3: Tipp des Tages */}
        <View style={[styles.section, styles.tipSection]}>
          <LinearGradient
            colors={['#fef3c7', '#fde68a', '#fed7aa']}
            style={styles.sectionGradient}
          >
            <View style={styles.sectionContent}>
              <View style={styles.tipHeader}>
                <Lightbulb size={28} color="#d97706" />
                <Text style={styles.sectionTitle}>Tipp des Tages</Text>
              </View>
              
              {dailyQuestion ? (
                <View style={styles.questionCard}>
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
                          <Text style={styles.optionLetter}>{option.toUpperCase()})</Text>
                          <Text style={styles.answerText}>{optionText}</Text>
                          {showResult && isCorrect && (
                            <CheckCircle size={20} color={MEDICAL_COLORS.success} />
                          )}
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
                </View>
              ) : (
                <View style={styles.noContentCard}>
                  <Text style={styles.noContentText}>
                    Heute gibt es noch keine Frage. Schauen Sie später wieder vorbei!
                  </Text>
                </View>
              )}
            </View>
            
            {/* Scroll Arrow */}
            <Animated.View 
              style={[
                styles.scrollArrow, 
                {
                  transform: [{
                    translateY: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10]
                    })
                  }]
                }
              ]}
            >
              <TouchableOpacity 
                style={[styles.arrowButton, styles.yellowArrowButton]}
                onPress={() => scrollToSection(3)}
              >
                <ChevronDown size={24} color="#d97706" />
              </TouchableOpacity>
            </Animated.View>
          </LinearGradient>
        </View>

        {/* Section 4: Dashboard Stats */}
        <View style={[styles.section, styles.dashboardSection]}>
          <LinearGradient
            colors={['#1f2937', '#374151', '#4b5563']}
            style={styles.sectionGradient}
          >
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionTitle, styles.darkSectionTitle]}>Ihre Statistiken</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <BarChart3 size={32} color="#10b981" />
                  <Text style={styles.statNumber}>87%</Text>
                  <Text style={styles.statLabel}>Fortschritt</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Target size={32} color="#3b82f6" />
                  <Text style={styles.statNumber}>142</Text>
                  <Text style={styles.statLabel}>Gelernte Kapitel</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Users size={32} color="#f59e0b" />
                  <Text style={styles.statNumber}>23</Text>
                  <Text style={styles.statLabel}>Simulationen</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Sparkles size={32} color="#ec4899" />
                  <Text style={styles.statNumber}>96%</Text>
                  <Text style={styles.statLabel}>Erfolgsrate</Text>
                </View>
              </View>
            </View>
            
            {/* Navigation Icons */}
            <View style={styles.bottomNavigation}>
              <TouchableOpacity 
                style={styles.navItem}
                onPress={() => router.push('/(tabs)')}
              >
                <Target size={24} color="white" />
                <Text style={styles.navLabel}>Dashboard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.navItem}
                onPress={() => router.push('/(tabs)/bibliothek')}
              >
                <BookOpen size={24} color="white" />
                <Text style={styles.navLabel}>Bibliothek</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.navItem}
                onPress={() => router.push('/(tabs)/simulation')}
              >
                <Sparkles size={24} color="white" />
                <Text style={styles.navLabel}>Simulation</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
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
  fixedHeader: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    height: screenHeight - 80, // Account for fixed header
    position: 'relative',
  },
  sectionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sectionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 40,
  },
  sectionTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  darkSectionTitle: {
    color: 'white',
  },
  
  // Scroll Arrow Styles
  scrollArrow: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    marginLeft: -30,
    zIndex: 10,
  },
  arrowButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  lightArrowButton: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderColor: 'rgba(74, 144, 226, 0.3)',
  },
  yellowArrowButton: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderColor: 'rgba(217, 119, 6, 0.3)',
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
  
  // Hero Section Styles
  heroSection: {
    backgroundColor: '#667eea',
  },
  heroGradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    paddingTop: 40,
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
    marginBottom: 8,
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 34,
    marginBottom: 16,
    letterSpacing: -0.6,
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
    width: 50,
    height: 50,
    top: -10,
    right: 10,
    transform: [{ rotate: '15deg' }],
  },
  cube2: {
    width: 40,
    height: 40,
    bottom: 20,
    left: 0,
    transform: [{ rotate: '-10deg' }],
  },
  cube3: {
    width: 45,
    height: 45,
    top: 20,
    left: 20,
    transform: [{ rotate: '25deg' }],
  },
  
  // Lernkapital Section Styles
  lernkapitalSection: {
    backgroundColor: '#f8faff',
  },
  chaptersContainer: {
    width: '100%',
    maxWidth: 600,
  },
  chapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.08)',
  },
  chapterIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${MEDICAL_COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 4,
  },
  chapterCategory: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f0f9ff',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: MEDICAL_COLORS.primary,
    borderRadius: 2,
  },
  chapterMeta: {
    alignItems: 'center',
    marginLeft: 12,
  },
  chapterTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Tip Section Styles
  tipSection: {
    backgroundColor: '#fef3c7',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 600,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  noContentCard: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
  },
  questionText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.textPrimary,
    lineHeight: 26,
    marginBottom: 20,
    textAlign: 'center',
  },
  answersContainer: {
    marginBottom: 16,
  },
  answerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8faff',
    borderRadius: 12,
    padding: 16,
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
  optionLetter: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    marginRight: 12,
    minWidth: 20,
  },
  answerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 20,
  },
  explanationContainer: {
    backgroundColor: `${MEDICAL_COLORS.primary}08`,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
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
  noContentText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  
  // Dashboard Section Styles
  dashboardSection: {
    backgroundColor: '#1f2937',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 600,
    marginBottom: 40,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  navItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'white',
    marginTop: 4,
  },
});