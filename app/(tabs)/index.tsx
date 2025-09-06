import React, { useState, useRef, useMemo, useEffect } from 'react';
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
import { 
  QuickAccessSection,
  DailyTipSection, 
  DailyQuestionSection, 
  RecentChaptersSection,
  MedicalContent 
} from '@/components/dashboard/sections';

// Types are now imported from the custom hook and sections
import type { DailyTip, DailyQuestion } from '@/hooks/useDailyContent';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Enhanced hooks for better state management
  const { dailyTip, dailyQuestion, loading: contentLoading, error: contentError, refetch } = useDailyContent();
  const { showWelcome: showWelcomeFlow, loading: onboardingLoading, completeOnboarding } = useOnboarding();
  
  // Debug: Add manual trigger for welcome flow
  const [debugShowWelcome, setDebugShowWelcome] = useState(false);
  
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
          <TouchableOpacity
            style={{ padding: 8 }}
            onPress={() => setDebugShowWelcome(true)}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>Test Welcome</Text>
          </TouchableOpacity>
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
        {/* Optimized Memoized Sections */}
        <View style={styles.sectionContainer}>
          <QuickAccessSection />
        </View>
        
        <View style={styles.sectionContainer}>
          <DailyTipSection 
            dailyTip={dailyTip}
            loading={contentLoading}
            bounceAnim={bounceAnim}
          />
        </View>
        
        <View style={styles.sectionContainer}>
          <DailyQuestionSection 
            dailyQuestion={dailyQuestion}
            loading={contentLoading}
          />
        </View>
        
        <View style={styles.sectionContainer}>
          <RecentChaptersSection 
            recentMedicalContents={recentMedicalContents}
          />
        </View>
      </ScrollView>


      {/* Menu */}
      <Menu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      
      {/* Welcome Flow for new users */}
      <WelcomeFlow
        visible={showWelcomeFlow || debugShowWelcome}
        onComplete={() => {
          handleOnboardingComplete();
          setDebugShowWelcome(false);
        }}
        onDismiss={() => {
          completeOnboarding();
          setDebugShowWelcome(false);
        }}
      />
    </SafeAreaView>
  );
}

// Use the extracted dashboard styles
const styles = dashboardStyles;
