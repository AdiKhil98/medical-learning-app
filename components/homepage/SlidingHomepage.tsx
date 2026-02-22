import React, { useState, useRef, useEffect, useMemo, useCallback, startTransition, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Dimensions,
  Linking,
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
  Mail,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import Menu from '@/components/ui/Menu';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';
import AboutUsModal from '@/components/ui/AboutUsModal';
import PromoBanner from '@/components/ui/PromoBanner';
import TrialStatusTimeline from '@/components/ui/TrialStatusTimeline';
import { useRouter } from 'expo-router';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/constants/tokens';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import { useResponsive, BREAKPOINTS, SMALL_MOBILE_THRESHOLD } from '@/hooks/useResponsive';

import { useAuth } from '@/contexts/AuthContext';
import { useDailyContent } from '@/hooks/useDailyContent';
import { useRecentContentForHomepage } from '@/hooks/useRecentContent';
import { logger } from '@/utils/logger';
import { HomepageSkeleton } from './HomepageSkeleton';

const IS_WEB = Platform.OS === 'web';

// Temporary constants for StyleSheet (will be refactored to dynamic styles)
// These are approximations since we can't use hooks at module level
const TEMP_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 768;
const IS_MOBILE = TEMP_WIDTH < BREAKPOINTS.mobile;
const IS_SMALL_MOBILE = TEMP_WIDTH < SMALL_MOBILE_THRESHOLD;

interface SlidingHomepageProps {
  onGetStarted?: () => void;
  onboardingRefs?: React.MutableRefObject<Record<string, any>>;
}

// Custom Telegram Icon SVG (Ionicons doesn't have it)
const TelegramIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"
      fill={color}
    />
  </Svg>
);

// Social Icon Button with hover effect for web
interface SocialIconButtonProps {
  iconType: 'telegram' | 'facebook';
  url: string;
  hoverColor: string;
  label: string;
}

const SocialIconButton = memo(({ iconType, url, hoverColor, label }: SocialIconButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const webHoverProps = IS_WEB
    ? {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      }
    : {};

  const iconColor = isHovered && IS_WEB ? hoverColor : MEDICAL_COLORS.slate500;

  return (
    <TouchableOpacity
      style={[socialIconStyles.button, isHovered && IS_WEB && { backgroundColor: `${hoverColor}15` }]}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.7}
      accessibilityLabel={label}
      {...webHoverProps}
    >
      {iconType === 'telegram' ? (
        <TelegramIcon size={20} color={iconColor} />
      ) : (
        <Ionicons name="logo-facebook" size={20} color={iconColor} />
      )}
    </TouchableOpacity>
  );
});

const socialIconStyles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(IS_WEB && {
      transition: 'all 0.2s ease' as any,
      cursor: 'pointer' as any,
    }),
  },
});

function SlidingHomepageComponent({ onGetStarted: _onGetStarted, onboardingRefs }: SlidingHomepageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { user } = useAuth();

  // INP OPTIMIZATION: Memoized handlers for menu and modal toggles
  const openMenu = useCallback(() => {
    startTransition(() => setMenuOpen(true));
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const openAboutUs = useCallback(() => {
    startTransition(() => setShowAboutUs(true));
  }, []);

  const closeAboutUs = useCallback(() => {
    setShowAboutUs(false);
  }, []);

  // INP OPTIMIZATION: Memoized navigation handlers
  const navigateToSimulation = useCallback(() => {
    router.push('/(tabs)/simulation');
  }, [router]);

  const navigateToSubscription = useCallback(() => {
    router.push('/subscription');
  }, [router]);

  // Get responsive values
  const { isMobile, isSmallMobile, width: screenWidth, height: screenHeight } = useResponsive();

  // Fetch daily content and recent content
  const { dailyTip, dailyQuestion, loading: dailyLoading } = useDailyContent();
  const { recentContent, loading: recentLoading } = useRecentContentForHomepage(user?.id);

  const totalSlides = 4;

  // Logger test - shows immediately when homepage loads
  useEffect(() => {
    logger.info('🏠 Homepage loaded', {
      component: 'SlidingHomepage',
      userId: user?.id,
      screenWidth,
      screenHeight,
      isMobile,
      isSmallMobile,
      platform: Platform.OS,
    });
  }, [user?.id, screenWidth, screenHeight, isMobile, isSmallMobile]);

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

  // INP OPTIMIZATION: Wrap event handlers with useCallback to prevent recreating on every render
  const nextSlide = useCallback(() => {
    const nextIndex = (currentSlide + 1) % totalSlides;
    scrollViewRef.current?.scrollTo({ x: nextIndex * screenWidth, animated: true });
    setCurrentSlide(nextIndex);
  }, [currentSlide, screenWidth]);

  const prevSlide = useCallback(() => {
    const prevIndex = (currentSlide - 1 + totalSlides) % totalSlides;
    scrollViewRef.current?.scrollTo({ x: prevIndex * screenWidth, animated: true });
    setCurrentSlide(prevIndex);
  }, [currentSlide, screenWidth]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollPosition = event.nativeEvent.contentOffset.x;
      const index = Math.round(scrollPosition / screenWidth);
      setCurrentSlide(index);
    },
    [screenWidth]
  );

  const _scrollToSlide = useCallback(
    (index: number) => {
      scrollViewRef.current?.scrollTo({ x: index * screenWidth, animated: true });
      setCurrentSlide(index);
    },
    [screenWidth]
  );

  // INP OPTIMIZATION: Use startTransition for non-critical UI updates (answer selection)
  const handleAnswerSelect = useCallback((option: string) => {
    startTransition(() => {
      setSelectedAnswer(option);
    });
  }, []);

  // Check if selected answer is correct - memoized for performance
  const isCorrectAnswer = useCallback(
    (option: string) => {
      if (!dailyQuestion || !selectedAnswer) return null;
      const correctAnswer = (dailyQuestion.correct_answer || dailyQuestion.correct_choice || '').toLowerCase();
      return option.toLowerCase() === correctAnswer;
    },
    [dailyQuestion, selectedAnswer]
  );

  // Navigate to recent content page - memoized
  const handleRecentContentClick = useCallback(
    (slug: string) => {
      router.push(`/(tabs)/bibliothek/content/${slug}`);
    },
    [router]
  );

  // Navigate to all content (Bibliothek) - memoized
  const handleViewAllContent = useCallback(() => {
    router.push('/(tabs)/bibliothek');
  }, [router]);

  // PERFORMANCE FIX: Memoize dynamic styles to prevent recreation on every render
  // These styles support dark mode by merging base styles with theme colors
  // Also handle responsive sizing for mobile web browsers
  const dynamicStyles = useMemo(
    () => ({
      container: {
        ...styles.container,
        backgroundColor: colors.background,
      },
      heroCard: {
        ...styles.heroCard,
        backgroundColor: colors.card,
        // Override padding for mobile web
        padding: isMobile ? (isSmallMobile ? 16 : 20) : SPACING.xxxxl,
        maxWidth: '100%',
      },
      recentCard: {
        ...styles.recentCard,
        backgroundColor: colors.card,
        maxWidth: '100%',
      },
      tipCard: {
        ...styles.tipCard,
        backgroundColor: colors.card,
        maxWidth: '100%',
        padding: isMobile ? SPACING.xl : SPACING.xxxl,
      },
      questionCard: {
        ...styles.questionCard,
        backgroundColor: colors.card,
        maxWidth: '100%',
        padding: isMobile ? SPACING.xl : SPACING.xxxl,
      },
      // Responsive heading for mobile web
      heading: {
        ...styles.heading,
        fontSize: isMobile ? 20 : TYPOGRAPHY.fontSize['3xl'],
        lineHeight: isMobile ? 28 : 40,
        paddingHorizontal: isMobile ? 4 : 0,
      },
      // Responsive subheading
      subheading: {
        ...styles.subheading,
        fontSize: isMobile ? 14 : TYPOGRAPHY.fontSize.lg,
        lineHeight: isMobile ? 20 : 28,
        paddingHorizontal: isMobile ? 4 : 0,
      },
      // Responsive buttons
      primaryButton: {
        ...styles.primaryButton,
        paddingVertical: isMobile ? SPACING.md : SPACING.lg,
        paddingHorizontal: isMobile ? SPACING.lg : SPACING.xxxl,
      },
      secondaryButton: {
        ...styles.secondaryButton,
        paddingVertical: isMobile ? SPACING.md : SPACING.lg,
        paddingHorizontal: isMobile ? SPACING.lg : SPACING.xxxl,
      },
      outlineButton: {
        ...styles.outlineButton,
        paddingVertical: isMobile ? SPACING.md : SPACING.lg,
        paddingHorizontal: isMobile ? SPACING.lg : SPACING.xxxl,
      },
    }),
    [isMobile, isSmallMobile]
  );

  // Gradient colors
  const backgroundGradient = MEDICAL_COLORS.backgroundGradient;
  const headerGradient = MEDICAL_COLORS.headerGradient;

  // PERFORMANCE FIX: Show skeleton while critical data is loading
  // This prevents CLS (Cumulative Layout Shift) by reserving space immediately
  // Note: This early return is AFTER all hooks to comply with Rules of Hooks
  const isInitialLoading = dailyLoading && recentLoading;
  if (isInitialLoading) {
    return <HomepageSkeleton />;
  }

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
              <TouchableOpacity style={styles.menuButton} onPress={openMenu} activeOpacity={0.7}>
                <LinearGradient
                  colors={['rgba(251, 146, 60, 0.15)', 'rgba(239, 68, 68, 0.10)']}
                  style={styles.menuButtonGradient}
                >
                  <MenuIcon size={22} color={MEDICAL_COLORS.warmOrange} />
                </LinearGradient>
              </TouchableOpacity>
              <Logo size="medium" variant="medical" textColor={MEDICAL_COLORS.warmOrange} animated={false} />
            </View>
            {/* Right Section: Social Icons + User Avatar */}
            <View style={styles.headerRight}>
              {/* Social Media Icons */}
              <View style={styles.socialIconsContainer}>
                <SocialIconButton
                  iconType="facebook"
                  url="https://www.facebook.com/share/19zKPyofTZ/?mibextid=wwXIfr"
                  hoverColor="#1877f2"
                  label="Facebook"
                />
              </View>
              <UserAvatar size="medium" />
            </View>
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
              <View
                ref={(el) => {
                  if (onboardingRefs?.current) onboardingRefs.current['hero_card'] = el;
                }}
                collapsable={false}
                style={dynamicStyles.heroCard}
              >
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
                <Text style={dynamicStyles.heading}>Bestehen Sie Ihre KP & FSP{'\n'}Prüfung beim ersten Versuch</Text>

                {/* Subheading */}
                <Text style={dynamicStyles.subheading}>
                  Realistische Prüfungen • Persönliches Feedback • Relevante Inhalte
                </Text>

                {/* Trial Status Timeline */}
                <View
                  ref={(el) => {
                    if (onboardingRefs?.current) onboardingRefs.current['trial_banner'] = el;
                  }}
                  collapsable={false}
                >
                  <TrialStatusTimeline />
                </View>

                {/* CTA Buttons */}
                <View style={styles.buttonsContainer}>
                  <TouchableOpacity
                    ref={(el) => {
                      if (onboardingRefs?.current) onboardingRefs.current['simulation_button'] = el;
                    }}
                    collapsable={false}
                    style={styles.buttonWrapper}
                    onPress={navigateToSimulation}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={MEDICAL_COLORS.warmOrangeGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={dynamicStyles.primaryButton}
                    >
                      <Text style={styles.buttonText}>Simulation testen</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    ref={(el) => {
                      if (onboardingRefs?.current) onboardingRefs.current['subscribe_button'] = el;
                    }}
                    collapsable={false}
                    style={styles.buttonWrapper}
                    onPress={navigateToSubscription}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={MEDICAL_COLORS.warmYellowGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={dynamicStyles.secondaryButton}
                    >
                      <Text style={styles.buttonText}>Abonnieren</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={dynamicStyles.outlineButton} onPress={openAboutUs} activeOpacity={0.7}>
                    <Text style={styles.outlineButtonText}>Über MedMeister</Text>
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
                            <View style={styles.recentTextContainer}>
                              <Text style={styles.recentCardTitle} numberOfLines={1} ellipsizeMode="tail">
                                {item.title}
                              </Text>
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

            {/* Contact Footer - Inside Scroll */}
            <View style={styles.contactFooterInScroll}>
              <TouchableOpacity
                onPress={() => Linking.openURL('mailto:support@medmeister.eu')}
                style={styles.contactFooterButton}
                activeOpacity={0.7}
              >
                <Mail size={16} color={MEDICAL_COLORS.primary} />
                <Text style={styles.contactFooterText}>
                  Fragen? Kontaktieren Sie uns: <Text style={styles.contactFooterEmail}>support@medmeister.eu</Text>
                </Text>
              </TouchableOpacity>
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

                  {/* Trial Status Timeline */}
                  <TrialStatusTimeline />

                  {/* CTA Buttons */}
                  <View style={styles.buttonsContainer}>
                    {/* Button 1 - Simulation testen */}
                    <TouchableOpacity style={styles.buttonWrapper} onPress={navigateToSimulation} activeOpacity={0.7}>
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
                    <TouchableOpacity style={styles.buttonWrapper} onPress={navigateToSubscription} activeOpacity={0.7}>
                      <LinearGradient
                        colors={MEDICAL_COLORS.warmYellowGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.secondaryButton}
                      >
                        <Text style={styles.buttonText}>Abonnieren</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Button 3 - Über MedMeister */}
                    <TouchableOpacity style={styles.outlineButton} onPress={openAboutUs} activeOpacity={0.7}>
                      <Text style={styles.outlineButtonText}>Über MedMeister</Text>
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
                              <View style={styles.recentTextContainer}>
                                <Text style={styles.recentCardTitle} numberOfLines={1} ellipsizeMode="tail">
                                  {item.title}
                                </Text>
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

      {/* Contact Footer - Only show fixed on mobile */}
      {!IS_WEB && (
        <View style={styles.contactFooter}>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:support@medmeister.eu')}
            style={styles.contactFooterButton}
            activeOpacity={0.7}
          >
            <Mail size={16} color={MEDICAL_COLORS.primary} />
            <Text style={styles.contactFooterText}>
              Fragen? Kontaktieren Sie uns: <Text style={styles.contactFooterEmail}>support@medmeister.eu</Text>
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Menu */}
      <Menu isOpen={menuOpen} onClose={closeMenu} />

      {/* About Us Modal */}
      <AboutUsModal visible={showAboutUs} onClose={closeAboutUs} />
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
    height: '100%',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  socialIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
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
    width: Dimensions.get('window').width,
    height: '100%',
  },
  verticalScroll: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: IS_SMALL_MOBILE ? SPACING.md : IS_MOBILE ? SPACING.xl : SPACING.lg,
    paddingVertical: IS_SMALL_MOBILE ? SPACING.xl : IS_MOBILE ? SPACING.xxxl : SPACING.xxl,
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
    padding: IS_SMALL_MOBILE ? 20 : IS_MOBILE ? 28 : SPACING.xxxxl,
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
    ...(Platform.OS === 'web' && {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '100%',
    }),
  },
  recentCardSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: MEDICAL_COLORS.slate500,
    marginTop: 2,
  },
  recentTextContainer: {
    flex: 1,
    overflow: 'hidden',
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
    width: '100%',
    marginHorizontal: 'auto',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xxl,
    overflow: 'hidden',
  },
  webSlide: {
    marginBottom: SPACING.xxxl,
    width: '100%',
    maxWidth: '100%',
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
  },
  indicatorDotActive: {
    width: SPACING.xxl,
    height: SPACING.sm,
    borderRadius: SPACING.xs,
    backgroundColor: MEDICAL_COLORS.warmOrange,
  },
  contactFooter: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.5)',
    alignItems: 'center',
  },
  contactFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  contactFooterText: {
    fontSize: 14,
    color: MEDICAL_COLORS.slate600,
    fontFamily: 'Inter-Regular',
  },
  contactFooterEmail: {
    color: MEDICAL_COLORS.primary,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  contactFooterInScroll: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },
});

// INP OPTIMIZATION: Wrap component with React.memo to prevent unnecessary re-renders
// This significantly improves INP by avoiding render cycles when parent components re-render
const SlidingHomepage = memo(SlidingHomepageComponent);
export default SlidingHomepage;
