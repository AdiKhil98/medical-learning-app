import React, { useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Menu as MenuIcon, Lightbulb, HelpCircle, CheckCircle, XCircle, BookOpen, Clock, ArrowRight, Sparkles, Target, TrendingUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import Menu from '@/components/ui/Menu';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';
import WelcomeFlow from '@/components/onboarding/WelcomeFlow';

// Enhanced imports
import { useDailyContent } from '@/hooks/useDailyContent';
import { useOnboarding } from '@/hooks/useOnboarding';
import { SectionErrorBoundary } from '@/components/dashboard/ErrorBoundary';
import { SectionSkeleton, QuestionSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { dashboardStyles, screenWidth, screenHeight } from '@/styles/dashboard';

// Types are now imported from the custom hook
import type { DailyTip, DailyQuestion } from '@/hooks/useDailyContent';

interface MedicalContent {
  id: string;
  title: string;
  category?: string;
  lastViewed: string;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Enhanced hooks for better state management
  const { dailyTip, dailyQuestion, loading: contentLoading, error: contentError, refetch } = useDailyContent();
  const { showWelcome: showWelcomeFlow, loading: onboardingLoading, completeOnboarding } = useOnboarding();
  
  // Local state
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [recentMedicalContents, setRecentMedicalContents] = useState<MedicalContent[]>([]);
  
  // Horizontal scrolling state
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const sections = ['Quick Access', 'Daily Tip', 'Daily Question', 'Recent Chapters'];
  
  // Animation for bounce effect
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Combined loading state
  const loading = contentLoading || onboardingLoading;

  useEffect(() => {
    loadRecentMedicalContents();
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
  
  // Onboarding completion handler
  const handleOnboardingComplete = () => {
    completeOnboarding();
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

  // Data fetching is now handled by custom hooks

  // Horizontal navigation functions
  const scrollToPrevious = () => {
    const previousSection = Math.max(0, currentSection - 1);
    scrollViewRef.current?.scrollTo({
      x: previousSection * screenWidth,
      animated: true
    });
    setCurrentSection(previousSection);
  };

  const scrollToNext = () => {
    const nextSection = Math.min(sections.length - 1, currentSection + 1);
    scrollViewRef.current?.scrollTo({
      x: nextSection * screenWidth,
      animated: true
    });
    setCurrentSection(nextSection);
  };

  const handleHorizontalScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const sectionIndex = Math.round(contentOffset.x / screenWidth);
    setCurrentSection(sectionIndex);
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
          <UserAvatar size="medium" />
        </View>
      </LinearGradient>

      {/* Navigation Arrows */}
      {currentSection > 0 && (
        <TouchableOpacity
          style={[styles.navigationArrow, styles.leftArrow]}
          onPress={scrollToPrevious}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['rgba(67, 56, 202, 0.9)', 'rgba(99, 102, 241, 0.9)']}
            style={styles.arrowGradient}
          >
            <ChevronLeft size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {currentSection < sections.length - 1 && (
        <TouchableOpacity
          style={[styles.navigationArrow, styles.rightArrow]}
          onPress={scrollToNext}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['rgba(67, 56, 202, 0.9)', 'rgba(99, 102, 241, 0.9)']}
            style={styles.arrowGradient}
          >
            <ChevronRight size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Section Indicators */}
      <View style={styles.sectionIndicators}>
        {sections.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              currentSection === index && styles.activeIndicator
            ]}
          />
        ))}
      </View>

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
        {/* Section 1: Quick Access */}
        <View style={styles.section}>
          {/* Hero for Section 1 */}
          <View style={styles.sectionHero}>
            <View style={styles.heroContent}>
              <View style={styles.heroTitleContainer}>
                <Text style={styles.splitScreenHeroTitle}>
                  Schnellzugriff zu deinen Lernmaterialien
                </Text>
            </View>
              <View style={styles.heroSubtitleContainer}>
                <Text style={styles.splitScreenHeroSubtitle}>
                  Setze dein Lernen nahtlos fort
                </Text>
            </View>
              <View style={styles.heroButtonsContainer}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => router.push('/(tabs)/bibliothek')}
                >
                  <Text style={styles.primaryButtonText}>Zur Bibliothek</Text>
                  <ArrowRight size={18} color="white" style={styles.buttonIcon} />
                </TouchableOpacity>
            </View>
          </View>
          </View>
          
          {/* Section content */}
          <View style={styles.sectionContentInner}>
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
                          useNativeDriver: true,
                        }).start();
                      }}
                      onPressOut={() => {
                        // Scale back up animation on release
                        Animated.spring(new Animated.Value(0.97), {
                          toValue: 1,
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
        
        {/* Section 2: Daily Tip */}
        <View style={styles.section}>
          {/* Hero for Section 2 */}
            <View style={styles.sectionHero}>
              <View style={styles.heroContent}>
                <View style={styles.heroTitleContainer}>
                  <Text style={styles.splitScreenHeroTitle}>
                    Tipp des Tages
                  </Text>
              </View>
                <View style={styles.heroSubtitleContainer}>
                  <Text style={styles.splitScreenHeroSubtitle}>
                    Erweitere dein medizinisches Wissen täglich
                  </Text>
              </View>
            </View>
          </View>
            
          {/* Section content */}
            <View style={styles.sectionContentInner}>
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

        </View>
        
        {/* Section 3: Daily Question */}
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
            {dailyQuestion && (
              <View style={styles.structuredSection}>
            <View style={styles.structuredSectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <HelpCircle size={24} color="#8B5CF6" />
                <Text style={styles.structuredSectionTitle}>Frage des Tages</Text>
            </View>
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

        </View>
        
        {/* Section 4: Recent Chapters */}
        <View style={styles.section}>
          
          {/* Hero for Section 4 */}
            <View style={styles.sectionHero}>
              <View style={styles.heroContent}>
                <View style={styles.heroTitleContainer}>
                  <Text style={styles.splitScreenHeroTitle}>
                    Letzte Kapitel
                  </Text>
              </View>
                <View style={styles.heroSubtitleContainer}>
                  <Text style={styles.splitScreenHeroSubtitle}>
                    Setze dort fort, wo du aufgehört hast
                  </Text>
              </View>
                <View style={styles.heroButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.primaryButton}
                    onPress={() => router.push('/(tabs)/bibliothek')}
                  >
                    <Text style={styles.primaryButtonText}>Alle Kapitel</Text>
                    <ArrowRight size={18} color="white" style={styles.buttonIcon} />
                  </TouchableOpacity>
              </View>
            </View>
          </View>
            
          {/* Section content */}
            <View style={styles.sectionContentInner}>
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
                  <Text style={styles.modernStructuredSectionSubtitle}>Setze dort fort, wo du aufgehört hast</Text>
              </View>
                
                <View style={styles.modernChapterCardsContainer}>
                  {recentMedicalContents.map((content, index) => (
                    <View key={content.id} style={styles.modernChapterCard}>
                      <LinearGradient
                        colors={['#ffffff', '#f8fafc', '#e2e8f0']}
                        style={styles.modernChapterCardGradient}
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
                        
                        <View style={styles.modernChapterCardBody}>
                          <Text style={styles.modernChapterTitle}>{content.title}</Text>
                          <View style={styles.modernChapterMetaContainer}>
                            <View style={styles.modernChapterMeta}>
                              <Clock size={14} color="#64748B" />
                              <Text style={styles.modernChapterMetaText}>{content.lastViewed}</Text>
                          </View>
                            {content.category && (
                              <View style={styles.modernChapterCategory}>
                                <Text style={styles.modernChapterCategoryText}>{content.category}</Text>
                            </View>
                            )}
                        </View>
                      </View>
                        
                        <View style={styles.modernChapterCardFooter}>
                          <TouchableOpacity style={styles.modernChapterButton}>
                            <Text style={styles.modernChapterButtonText}>Fortsetzen</Text>
                            <ArrowRight size={16} color="#4A90E2" />
                          </TouchableOpacity>
                      </View>
                      </LinearGradient>
                  </View>
                  ))}
              </View>
            </View>
            )}
          </View>

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

// Use the extracted dashboard styles
const styles = dashboardStyles;
