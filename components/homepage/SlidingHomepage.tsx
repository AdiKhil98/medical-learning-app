import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
} from 'react-native';
import { colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  Heart,
  Clock,
  FileText,
  Lightbulb,
  HelpCircle,
} from 'lucide-react-native';
import Menu from '@/components/ui/Menu';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';
import AboutUsModal from '@/components/ui/AboutUsModal';
import PromoBanner from '@/components/ui/PromoBanner';
import { useRouter } from 'expo-router';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, BREAKPOINTS, isCompact } from '@/constants/tokens';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

import { useAuth } from '@/contexts/AuthContext';
import { useDailyContent } from '@/hooks/useDailyContent';
import { useRecentContentForHomepage } from '@/hooks/useRecentContent';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const IS_MOBILE = isCompact(screenWidth);
const IS_WEB = Platform.OS === 'web';

interface SlidingHomepageProps {
  onGetStarted?: () => void;
}

export default function SlidingHomepage({ onGetStarted }: SlidingHomepageProps) {
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Fetch daily content and recent content
  const { dailyTip, dailyQuestion, loading: dailyLoading } = useDailyContent();
  const { recentContent, loading: recentLoading } = useRecentContentForHomepage(user?.id);

  const totalSlides = 4;

  // Scroll behavior for glassmorphism header effect (web only)
  useEffect(() => {
    if (IS_WEB && typeof window !== 'undefined') {
      const handleScroll = () => {
        const scrollY = window.scrollY || window.pageYOffset;
        setIsScrolled(scrollY > 20);
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const nextSlide = () => {
    const nextIndex = (currentSlide + 1) % totalSlides;
    scrollViewRef.current?.scrollTo({ x: nextIndex * screenWidth, animated: true });
    setCurrentSlide(nextIndex);
  };

  const prevSlide = () => {
    const prevIndex = (currentSlide - 1 + totalSlides) % totalSlides;
    scrollViewRef.current?.scrollTo({ x: prevIndex * screenWidth, animated: true });
    setCurrentSlide(prevIndex);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / screenWidth);
    setCurrentSlide(index);
  };

  const scrollToSlide = (index: number) => {
    scrollViewRef.current?.scrollTo({ x: index * screenWidth, animated: true });
    setCurrentSlide(index);
  };

  // Handle answer selection for daily question
  const handleAnswerSelect = (option: string) => {
    setSelectedAnswer(option);
  };

  // Check if selected answer is correct
  const isCorrectAnswer = (option: string) => {
    if (!dailyQuestion || !selectedAnswer) return null;
    const correctAnswer = (dailyQuestion.correct_answer || dailyQuestion.correct_choice || '').toLowerCase();
    return option.toLowerCase() === correctAnswer;
  };

  // Navigate to recent content page
  const handleRecentContentClick = (slug: string) => {
    router.push(`/(tabs)/bibliothek/content/${slug}`);
  };

  // Navigate to all content (Bibliothek)
  const handleViewAllContent = () => {
    router.push('/(tabs)/bibliothek');
  };

  // Dynamic styles for dark mode support
  const dynamicStyles = StyleSheet.create({
    container: {
      ...styles.container,
      backgroundColor: colors.background,
    },
    heroCard: {
      ...styles.heroCard,
      backgroundColor: colors.card,
    },
    recentCard: {
      ...styles.recentCard,
      backgroundColor: colors.card,
    },
    tipCard: {
      ...styles.tipCard,
      backgroundColor: colors.card,
    },
    questionCard: {
      ...styles.questionCard,
      backgroundColor: colors.card,
    },
  });

  // Gradient colors
  const backgroundGradient = MEDICAL_COLORS.backgroundGradient;
  const headerGradient = MEDICAL_COLORS.headerGradient;

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Promotional Banner */}
      <PromoBanner />

      {/* Clean gradient background */}
      <LinearGradient colors={backgroundGradient as any} style={styles.backgroundGradient} />

      {/* Modern Header - Redesigned with Glassmorphism */}
      <View
        style={[
          styles.modernHeader,
          IS_WEB && {
            position: 'sticky' as any,
            top: 0,
            zIndex: 1000,
            ...(isScrolled && IS_WEB
              ? {
                  backdropFilter: 'blur(12px)' as any,
                  WebkitBackdropFilter: 'blur(12px)' as any,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                }
              : {}),
          },
        ]}
      >
        {/* Gradient accent line at top of header */}
        {IS_WEB && (
          <LinearGradient
            colors={['#FF8C42', '#FF6B6B', '#FFA66B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 3, width: '100%' }}
          />
        )}
        <LinearGradient
          colors={
            isScrolled && IS_WEB
              ? ['rgba(255, 255, 255, 0)' as any, 'rgba(255, 255, 255, 0)' as any]
              : (headerGradient as any)
          }
          style={[
            styles.headerGradient,
            isScrolled &&
              IS_WEB && {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 8,
              },
          ]}
        >
          <View style={styles.headerContent}>
            {/* Left Section: Menu + Logo */}
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.menuButton} onPress={() => setMenuOpen(true)} activeOpacity={0.7}>
                <LinearGradient
                  colors={['rgba(251, 146, 60, 0.15)', 'rgba(239, 68, 68, 0.10)']}
                  style={styles.menuButtonGradient}
                >
                  <MenuIcon size={22} color={MEDICAL_COLORS.warmOrange} />
                </LinearGradient>
              </TouchableOpacity>
              <Logo size="medium" variant="medical" textColor={MEDICAL_COLORS.warmOrange} animated={false} />
            </View>
            {/* Right Section: User Avatar */}
            <UserAvatar size="medium" />
          </View>
        </LinearGradient>
      </View>

      {/* Navigation Arrows - Hidden on mobile AND web */}
      {!IS_MOBILE && !IS_WEB && (
        <>
          <TouchableOpacity style={styles.leftArrow} onPress={prevSlide} activeOpacity={0.7}>
            <View style={styles.arrowButton}>
              <ChevronLeft size={28} color={MEDICAL_COLORS.white} strokeWidth={3} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.rightArrow} onPress={nextSlide} activeOpacity={0.7}>
            <View style={styles.arrowButton}>
              <ChevronRight size={28} color={MEDICAL_COLORS.white} strokeWidth={3} />
            </View>
          </TouchableOpacity>
        </>
      )}

      {/* Main Content - Conditional: Vertical for Web, Horizontal Carousel for Mobile */}
      {IS_WEB ? (
        /* WEB: Vertical scrolling layout - all slides stacked */
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
          <View style={styles.webContainer}>
            {/* SLIDE 0 - Welcome Card */}
            <View style={styles.webSlide}>
              <View style={dynamicStyles.heroCard}>
                {/* Icon Container */}
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={[MEDICAL_COLORS.warmOrange, MEDICAL_COLORS.warmRed]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                  >
                    <BookOpen size={40} color={MEDICAL_COLORS.white} strokeWidth={2} />
                  </LinearGradient>
                </View>

                {/* Heading */}
                <Text style={styles.heading}>Bestehen Sie Ihre KP & FSP{'\n'}Prüfung beim ersten Versuch</Text>

                {/* Subheading */}
                <Text style={styles.subheading}>
                  Realistische Prüfungen • Persönliches Feedback • Relevante Inhalte
                </Text>

                {/* CTA Buttons */}
                <View style={styles.buttonsContainer}>
                  <TouchableOpacity
                    style={styles.buttonWrapper}
                    onPress={() => router.push('/(tabs)/simulation')}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={MEDICAL_COLORS.warmOrangeGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryButton}
                    >
                      <Text style={styles.buttonText}>Simulation testen</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.buttonWrapper}
                    onPress={() => router.push('/subscription')}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={MEDICAL_COLORS.warmYellowGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.buttonText}>Abonnieren</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.outlineButton}
                    onPress={() => setShowAboutUs(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.outlineButtonText}>Über KP Med</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* SLIDE 1 - Zuletzt angesehen */}
            <View style={styles.webSlide}>
              <Text style={styles.slideTitle}>Zuletzt angesehen</Text>
              {recentContent.length > 0 ? (
                <>
                  <View style={styles.cardsContainer}>
                    {recentContent.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={dynamicStyles.recentCard}
                        activeOpacity={0.7}
                        onPress={() => handleRecentContentClick(item.slug)}
                      >
                        <View style={styles.recentCardContent}>
                          <View style={styles.recentCardLeft}>
                            <View style={styles.recentIconContainer}>
                              <Heart size={24} color={MEDICAL_COLORS.blue} />
                            </View>
                            <View>
                              <Text style={styles.recentCardTitle}>{item.title}</Text>
                              <Text style={styles.recentCardSubtitle}>{item.category || 'Sonstiges'}</Text>
                            </View>
                          </View>
                          <View style={styles.recentCardRight}>
                            <View style={styles.timeContainer}>
                              <Clock size={16} color={MEDICAL_COLORS.slate400} />
                              <Text style={styles.timeText}>{item.viewCount}</Text>
                            </View>
                            <ChevronRight size={20} color={MEDICAL_COLORS.slate400} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.viewAllLink} activeOpacity={0.7} onPress={handleViewAllContent}>
                    <FileText size={20} color={MEDICAL_COLORS.warmOrange} />
                    <Text style={styles.viewAllText}>Alle Inhalte anzeigen</Text>
                    <ChevronRight size={20} color={MEDICAL_COLORS.warmOrange} />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={dynamicStyles.recentCard}>
                  <Text style={styles.recentCardTitle}>Keine kürzlich angesehenen Inhalte</Text>
                </View>
              )}
            </View>

            {/* SLIDE 2 - Tipp des Tages */}
            <View style={styles.webSlide}>
              <Text style={styles.slideTitle}>Tipp des Tages</Text>
              <View style={dynamicStyles.tipCard}>
                <View style={styles.tipHeader}>
                  <View style={styles.tipIconContainer}>
                    <Lightbulb size={24} color={MEDICAL_COLORS.warmOrange} />
                  </View>
                  <Text style={styles.tipHeaderText}>Tipp des Tages</Text>
                </View>
                <View style={styles.tipContentBox}>
                  <Text style={styles.tipContent}>
                    {dailyTip?.tip_content || dailyTip?.content || dailyTip?.tip || 'Kein Tipp für heute verfügbar'}
                  </Text>
                </View>
              </View>
            </View>

            {/* SLIDE 3 - Frage des Tages */}
            <View style={styles.webSlide}>
              <Text style={styles.slideTitle}>Frage des Tages</Text>
              <View style={dynamicStyles.questionCard}>
                <View style={styles.questionHeader}>
                  <View style={styles.questionIconContainer}>
                    <HelpCircle size={24} color={MEDICAL_COLORS.warmOrange} />
                  </View>
                  <Text style={styles.questionHeaderText}>Wissensfrage</Text>
                </View>
                <Text style={styles.questionText}>{dailyQuestion?.question || 'Keine Frage für heute verfügbar'}</Text>
                <View style={styles.optionsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      selectedAnswer === 'a' && (isCorrectAnswer('a') ? styles.correctAnswer : styles.wrongAnswer),
                    ]}
                    onPress={() => handleAnswerSelect('a')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionLabel}>A.</Text>
                    <Text style={styles.optionText}>{dailyQuestion?.option_a || dailyQuestion?.choice_a || 'N/A'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      selectedAnswer === 'b' && (isCorrectAnswer('b') ? styles.correctAnswer : styles.wrongAnswer),
                    ]}
                    onPress={() => handleAnswerSelect('b')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionLabel}>B.</Text>
                    <Text style={styles.optionText}>{dailyQuestion?.option_b || dailyQuestion?.choice_b || 'N/A'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      selectedAnswer === 'c' && (isCorrectAnswer('c') ? styles.correctAnswer : styles.wrongAnswer),
                    ]}
                    onPress={() => handleAnswerSelect('c')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionLabel}>C.</Text>
                    <Text style={styles.optionText}>{dailyQuestion?.option_c || dailyQuestion?.choice_c || 'N/A'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* MOBILE: Horizontal scrolling carousel */
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.mainContent}
          contentContainerStyle={styles.horizontalContentContainer}
        >
          {/* SLIDE 0 - Welcome Card */}
          <View style={styles.slideWrapper}>
            <ScrollView
              style={styles.verticalScroll}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.slideContainer}>
                <View style={dynamicStyles.heroCard}>
                  {/* Icon Container */}
                  <View style={styles.iconContainer}>
                    <LinearGradient
                      colors={[MEDICAL_COLORS.warmOrange, MEDICAL_COLORS.warmRed]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconGradient}
                    >
                      <BookOpen size={40} color={MEDICAL_COLORS.white} strokeWidth={2} />
                    </LinearGradient>
                  </View>

                  {/* Heading */}
                  <Text style={styles.heading}>Bestehen Sie Ihre KP & FSP{'\n'}Prüfung beim ersten Versuch</Text>

                  {/* Subheading */}
                  <Text style={styles.subheading}>
                    Realistische Prüfungen • Persönliches Feedback • Relevante Inhalte
                  </Text>

                  {/* CTA Buttons */}
                  <View style={styles.buttonsContainer}>
                    {/* Button 1 - Simulation testen */}
                    <TouchableOpacity
                      style={styles.buttonWrapper}
                      onPress={() => router.push('/(tabs)/simulation')}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={MEDICAL_COLORS.warmOrangeGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.primaryButton}
                      >
                        <Text style={styles.buttonText}>Simulation testen</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Button 2 - Abonnieren */}
                    <TouchableOpacity
                      style={styles.buttonWrapper}
                      onPress={() => router.push('/subscription')}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={MEDICAL_COLORS.warmYellowGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.secondaryButton}
                      >
                        <Text style={styles.buttonText}>Abonnieren</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Button 3 - Über KP Med */}
                    <TouchableOpacity
                      style={styles.outlineButton}
                      onPress={() => setShowAboutUs(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.outlineButtonText}>Über KP Med</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>

          {/* SLIDE 1 - Zuletzt angesehen (Recently Viewed) */}
          <View style={styles.slideWrapper}>
            <ScrollView
              style={styles.verticalScroll}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.slideContainer}>
                <Text style={styles.slideTitle}>Zuletzt angesehen</Text>

                {recentContent.length > 0 ? (
                  <>
                    <View style={styles.cardsContainer}>
                      {recentContent.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={dynamicStyles.recentCard}
                          activeOpacity={0.7}
                          onPress={() => handleRecentContentClick(item.slug)}
                        >
                          <View style={styles.recentCardContent}>
                            <View style={styles.recentCardLeft}>
                              <View style={styles.recentIconContainer}>
                                <Heart size={24} color={MEDICAL_COLORS.blue} />
                              </View>
                              <View>
                                <Text style={styles.recentCardTitle}>{item.title}</Text>
                                <Text style={styles.recentCardSubtitle}>{item.category || 'Sonstiges'}</Text>
                              </View>
                            </View>
                            <View style={styles.recentCardRight}>
                              <View style={styles.timeContainer}>
                                <Clock size={16} color={MEDICAL_COLORS.slate400} />
                                <Text style={styles.timeText}>{item.viewCount}</Text>
                              </View>
                              <ChevronRight size={20} color={MEDICAL_COLORS.slate400} />
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Footer Link */}
                    <TouchableOpacity style={styles.viewAllLink} activeOpacity={0.7} onPress={handleViewAllContent}>
                      <FileText size={20} color={MEDICAL_COLORS.warmOrange} />
                      <Text style={styles.viewAllText}>Alle Inhalte anzeigen</Text>
                      <ChevronRight size={20} color={MEDICAL_COLORS.warmOrange} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={dynamicStyles.recentCard}>
                    <Text style={styles.recentCardTitle}>Keine kürzlich angesehenen Inhalte</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>

          {/* SLIDE 2 - Tipp des Tages */}
          <View style={styles.slideWrapper}>
            <ScrollView
              style={styles.verticalScroll}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.slideContainer}>
                <Text style={styles.slideTitle}>Tipp des Tages</Text>

                <View style={dynamicStyles.tipCard}>
                  <View style={styles.tipHeader}>
                    <View style={styles.tipIconContainer}>
                      <Lightbulb size={24} color={MEDICAL_COLORS.warmOrange} />
                    </View>
                    <Text style={styles.tipHeaderText}>Tipp des Tages</Text>
                  </View>

                  <View style={styles.tipContentBox}>
                    <Text style={styles.tipContent}>
                      {dailyTip?.tip_content || dailyTip?.content || dailyTip?.tip || 'Kein Tipp für heute verfügbar'}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>

          {/* SLIDE 3 - Frage des Tages */}
          <View style={styles.slideWrapper}>
            <ScrollView
              style={styles.verticalScroll}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.slideContainer}>
                <Text style={styles.slideTitle}>Frage des Tages</Text>

                <View style={dynamicStyles.questionCard}>
                  <View style={styles.questionHeader}>
                    <View style={styles.questionIconContainer}>
                      <HelpCircle size={24} color={MEDICAL_COLORS.warmOrange} />
                    </View>
                    <Text style={styles.questionHeaderText}>Wissensfrage</Text>
                  </View>

                  <Text style={styles.questionText}>
                    {dailyQuestion?.question || 'Keine Frage für heute verfügbar'}
                  </Text>

                  <View style={styles.optionsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        selectedAnswer === 'a' && (isCorrectAnswer('a') ? styles.correctAnswer : styles.wrongAnswer),
                      ]}
                      onPress={() => handleAnswerSelect('a')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.optionLabel}>A.</Text>
                      <Text style={styles.optionText}>
                        {dailyQuestion?.option_a || dailyQuestion?.choice_a || 'N/A'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        selectedAnswer === 'b' && (isCorrectAnswer('b') ? styles.correctAnswer : styles.wrongAnswer),
                      ]}
                      onPress={() => handleAnswerSelect('b')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.optionLabel}>B.</Text>
                      <Text style={styles.optionText}>
                        {dailyQuestion?.option_b || dailyQuestion?.choice_b || 'N/A'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        selectedAnswer === 'c' && (isCorrectAnswer('c') ? styles.correctAnswer : styles.wrongAnswer),
                      ]}
                      onPress={() => handleAnswerSelect('c')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.optionLabel}>C.</Text>
                      <Text style={styles.optionText}>
                        {dailyQuestion?.option_c || dailyQuestion?.choice_c || 'N/A'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* Carousel Indicators - Removed to prevent overlap with navigation */}

      {/* Menu */}
      <Menu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* About Us Modal */}
      <AboutUsModal visible={showAboutUs} onClose={() => setShowAboutUs(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MEDICAL_COLORS.slate50,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: screenHeight,
  },

  // Header Styles - Redesigned (Compact & Professional with Glassmorphism)
  modernHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    ...(IS_WEB && {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' as any,
      willChange: 'transform, box-shadow, background-color' as any,
    }),
  },
  headerGradient: {
    paddingVertical: IS_MOBILE ? SPACING.sm : SPACING.md, // Reduced from md/lg to sm/md
    paddingHorizontal: IS_MOBILE ? SPACING.lg : SPACING.xl,
    paddingTop: IS_MOBILE ? SPACING.md : SPACING.lg, // Reduced from lg/xxl to md/lg
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44, // Reduced from 48 for more compact header
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    minWidth: 44, // Slightly reduced
    minHeight: 44,
  },
  menuButtonGradient: {
    padding: SPACING.sm + 2, // More compact padding
    borderRadius: BORDER_RADIUS.md,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Navigation Arrows - ALWAYS VISIBLE with z-index 50
  leftArrow: {
    position: 'absolute',
    left: IS_MOBILE ? SPACING.sm : SPACING.lg,
    top: '50%',
    marginTop: -28,
    zIndex: 50,
  },
  rightArrow: {
    position: 'absolute',
    right: IS_MOBILE ? SPACING.sm : SPACING.lg,
    top: '50%',
    marginTop: -28,
    zIndex: 50,
  },
  arrowButton: {
    width: IS_MOBILE ? 48 : 56,
    height: IS_MOBILE ? 48 : 56,
    borderRadius: IS_MOBILE ? 24 : 28,
    backgroundColor: MEDICAL_COLORS.warmOrange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(251, 146, 60, 0.5)',
    shadowOffset: { width: 0, height: SPACING.sm },
    shadowOpacity: 1,
    shadowRadius: SPACING.lg,
    elevation: 12,
  },

  // Main Content Styles - Horizontal Scrollable
  mainContent: {
    flex: 1,
  },
  horizontalContentContainer: {
    flexDirection: 'row',
  },
  slideWrapper: {
    width: screenWidth,
    height: '100%',
  },
  verticalScroll: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: IS_MOBILE ? SPACING.xl : SPACING.lg,
    paddingVertical: IS_MOBILE ? SPACING.xxxl : SPACING.xxl,
    paddingBottom: IS_MOBILE ? 80 : SPACING.xxl, // Extra space for bottom nav on mobile
  },
  slideContainer: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },

  // Slide 0 - Hero Card Styles - Enhanced for Mobile
  heroCard: {
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: IS_MOBILE ? SPACING.xl : SPACING.xxl,
    padding: IS_MOBILE ? 28 : SPACING.xxxxl,
    borderWidth: 1,
    borderColor: MEDICAL_COLORS.slate100,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: IS_MOBILE ? SPACING.md : SPACING.xl },
    shadowOpacity: 1,
    shadowRadius: IS_MOBILE ? SPACING.xxl : SPACING.xxxxl,
    elevation: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: IS_MOBILE ? SPACING.xl : SPACING.xxl,
  },
  iconGradient: {
    width: IS_MOBILE ? 100 : 80,
    height: IS_MOBILE ? 100 : 80,
    borderRadius: IS_MOBILE ? SPACING.xxl : SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(251, 146, 60, 0.4)',
    shadowOffset: { width: 0, height: SPACING.sm },
    shadowOpacity: 1,
    shadowRadius: SPACING.lg,
    elevation: 8,
  },
  heading: {
    fontSize: IS_MOBILE ? 22 : TYPOGRAPHY.fontSize['3xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.slate900,
    textAlign: 'center',
    marginBottom: IS_MOBILE ? SPACING.md : SPACING.lg,
    lineHeight: IS_MOBILE ? 30 : 40,
    letterSpacing: -0.5,
    paddingHorizontal: IS_MOBILE ? SPACING.xs : 0,
  },
  subheading: {
    fontSize: IS_MOBILE ? TYPOGRAPHY.fontSize.sm : TYPOGRAPHY.fontSize.lg,
    color: MEDICAL_COLORS.slate500,
    textAlign: 'center',
    marginBottom: IS_MOBILE ? 28 : SPACING.xxxl,
    lineHeight: IS_MOBILE ? 22 : 28,
    fontWeight: TYPOGRAPHY.fontWeight.normal,
    paddingHorizontal: IS_MOBILE ? SPACING.sm : 0,
  },
  buttonsContainer: {
    width: '100%',
    gap: IS_MOBILE ? SPACING.md : SPACING.lg,
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: IS_MOBILE ? 14 : SPACING.lg,
    overflow: 'hidden',
    shadowColor: 'rgba(251, 146, 60, 0.3)',
    shadowOffset: { width: 0, height: IS_MOBILE ? 6 : 4 },
    shadowOpacity: 1,
    shadowRadius: SPACING.md,
    elevation: 6,
  },
  primaryButton: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: IS_MOBILE ? SPACING.xxl : SPACING.xxxl,
    borderRadius: IS_MOBILE ? 14 : SPACING.lg,
    minHeight: 52, // Enhanced touch target (> 48px)
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: IS_MOBILE ? SPACING.xxl : SPACING.xxxl,
    borderRadius: IS_MOBILE ? 14 : SPACING.lg,
    minHeight: 52, // Enhanced touch target
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: MEDICAL_COLORS.white,
    fontSize: IS_MOBILE ? TYPOGRAPHY.fontSize.base : TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 0.3,
  },
  outlineButton: {
    width: '100%',
    paddingVertical: SPACING.lg,
    paddingHorizontal: IS_MOBILE ? SPACING.xxl : SPACING.xxxl,
    borderRadius: IS_MOBILE ? 14 : SPACING.lg,
    minHeight: 52, // Enhanced touch target
    borderWidth: 2,
    borderColor: MEDICAL_COLORS.warmOrange,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: MEDICAL_COLORS.warmOrange,
    fontSize: IS_MOBILE ? TYPOGRAPHY.fontSize.base : TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 0.3,
  },

  // Slide 1 - Recently Viewed Styles
  slideTitle: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.slate900,
    textAlign: 'center',
    marginBottom: SPACING.xxxl,
  },
  cardsContainer: {
    gap: SPACING.lg,
  },
  recentCard: {
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: SPACING.lg,
    padding: SPACING.xxl,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: SPACING.md,
    elevation: 6,
  },
  recentCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    flex: 1,
  },
  recentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: SPACING.md,
    backgroundColor: MEDICAL_COLORS.blueBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.slate900,
  },
  recentCardSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: MEDICAL_COLORS.slate500,
    marginTop: 2,
  },
  recentCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: MEDICAL_COLORS.slate400,
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xxl,
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: MEDICAL_COLORS.warmOrange,
  },

  // Slide 2 - Tip of the Day Styles
  tipCard: {
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: SPACING.xxl,
    padding: SPACING.xxxl,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: SPACING.xxl,
    elevation: 12,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  tipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: SPACING.md,
    backgroundColor: MEDICAL_COLORS.warmOrangeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipHeaderText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: MEDICAL_COLORS.slate900,
  },
  tipContentBox: {
    backgroundColor: MEDICAL_COLORS.warmYellowBg,
    borderRadius: SPACING.lg,
    padding: SPACING.xxl,
  },
  tipContent: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: MEDICAL_COLORS.slate700,
    lineHeight: 28,
    textAlign: 'center',
  },

  // Slide 3 - Question of the Day Styles
  questionCard: {
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: SPACING.xxl,
    padding: SPACING.xxxl,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: SPACING.xxl,
    elevation: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  questionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: SPACING.md,
    backgroundColor: MEDICAL_COLORS.warmOrangeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionHeaderText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: MEDICAL_COLORS.slate900,
  },
  questionText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: MEDICAL_COLORS.slate900,
    lineHeight: 26,
    marginBottom: SPACING.xxl,
  },
  optionsContainer: {
    gap: SPACING.md,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MEDICAL_COLORS.white,
    borderWidth: 2,
    borderColor: MEDICAL_COLORS.slate200,
    borderRadius: SPACING.md,
    padding: SPACING.xl,
  },
  optionLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.slate700,
    marginRight: SPACING.lg,
  },
  optionText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.slate700,
    flex: 1,
  },
  correctAnswer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: '#22c55e',
  },
  wrongAnswer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
  },

  // Web Layout Styles
  webContainer: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xxl,
  },
  webSlide: {
    marginBottom: SPACING.xxxl,
    width: '100%',
  },

  // Carousel Indicators (Dots) - Mobile Only
  carouselIndicators: {
    position: 'absolute',
    bottom: IS_MOBILE ? 90 : SPACING.xxxxl, // Above bottom nav on mobile
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    zIndex: 100,
  },
  indicatorDot: {
    width: SPACING.sm,
    height: SPACING.sm,
    borderRadius: SPACING.xs,
    backgroundColor: MEDICAL_COLORS.slate300,
    transition: 'all 0.3s ease',
    cursor: 'default',
  },
  indicatorDotActive: {
    width: SPACING.xxl,
    height: SPACING.sm,
    borderRadius: SPACING.xs,
    backgroundColor: MEDICAL_COLORS.warmOrange,
    cursor: 'default',
  },
});
