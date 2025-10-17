import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  SafeAreaView,
  StyleSheet
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Target,
  Lightbulb,
  HelpCircle,
  CheckCircle,
  XCircle,
  Menu as MenuIcon,
  Clock,
  Stethoscope,
  ChevronRight,
  FileText
} from 'lucide-react-native';
import Menu from '@/components/ui/Menu';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';
import AboutUsModal from '@/components/ui/AboutUsModal';
import { useDailyContent } from '@/hooks/useDailyContent';
import { useRecentContentForHomepage } from '@/hooks/useRecentContent';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
// import { useSubscription } from '@/hooks/useSubscription';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SlidingHomepageProps {
  onGetStarted?: () => void;
}

export default function SlidingHomepage({ onGetStarted }: SlidingHomepageProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showQuestionAnswer, setShowQuestionAnswer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  // Auth data
  const { user } = useAuth();
  // const { getSubscriptionInfo, simulationsRemaining, subscriptionTier } = useSubscription(user?.id);

  // Connect to Supabase data
  const { dailyTip, dailyQuestion, loading: contentLoading, error: contentError, refetch } = useDailyContent();

  // Get recent medical content
  const { recentContent, loading: recentContentLoading } = useRecentContentForHomepage();
  
  // Debug logging
  React.useEffect(() => {
    console.log('Daily content loaded:', { dailyTip, dailyQuestion, loading: contentLoading, error: contentError });
  }, [dailyTip, dailyQuestion, contentLoading, contentError]);

  const sections = [
    'Hero',
    'Recent Medical Content', 
    'Tip of the Day',
    'Question of the Day'
  ];

  const scrollToSection = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true
    });
    setCurrentSection(index);
  };

  const scrollToPrevious = () => {
    const previousSection = Math.max(0, currentSection - 1);
    scrollToSection(previousSection);
  };

  const scrollToNext = () => {
    const nextSection = Math.min(sections.length - 1, currentSection + 1);
    scrollToSection(nextSection);
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const sectionIndex = Math.round(contentOffset.x / screenWidth);
    setCurrentSection(sectionIndex);
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setShowQuestionAnswer(true);
  };

  const handleRecentContentPress = (contentSlug: string) => {
    router.push(`/(tabs)/bibliothek/content/${contentSlug}`);
  };

  const handleViewAllRecentContent = () => {
    router.push('/(tabs)/bibliothek');
  };

  // Function to format tip content with bold keywords
  const formatTipContent = (content: string) => {
    // Common keywords to make bold
    const keywords = [
      'regelmäßige Pausen', 'Erholung', 'Pomodoro-Technik', 'konzentriert',
      'Lerneffizienz', '25 Minuten', '5 Minuten', 'Pause'
    ];
    
    let formattedContent = content;
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      formattedContent = formattedContent.replace(regex, '**$1**');
    });
    
    return formattedContent;
  };

  // Function to render formatted text with bold parts
  const renderTipContent = (content: string) => {
    const parts = formatTipContent(content).split(/(\*\*[^*]+\*\*)/g);
    
    return (
      <Text style={styles.tipContentFocused}>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <Text key={index} style={styles.tipContentBold}>
                {part.slice(2, -2)}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  // Use real data from Supabase or fallback to sample data
  const tipData = dailyTip ? {
    title: dailyTip.title || "Tipp des Tages",
    content: dailyTip.content || dailyTip.tip_content || dailyTip.tip || "Kein Tipp verfügbar",
    category: dailyTip.category || "Lerntechnik"
  } : {
    title: "Effektive Lernstrategie",
    content: "Die Pomodoro-Technik kann deine Lerneffizienz um bis zu 40% steigern. Arbeite 25 Minuten konzentriert, dann mache 5 Minuten Pause.",
    category: "Lerntechnik"
  };

  // Use real question data from Supabase or fallback to sample data
  const questionData = dailyQuestion || {
    question: "Welche Lernmethode ist am effektivsten für das Langzeitgedächtnis?",
    choice_a: "Mehrmaliges Lesen",
    choice_b: "Aktive Wiederholung", 
    choice_c: "Passives Zuhören",
    correct_choice: "b",
    explanation: "Aktive Wiederholung aktiviert mehrere Gehirnregionen und festigt das Wissen nachhaltig."
  };

  // Animated background blobs
  const blob1Anim = useRef(new Animated.Value(0)).current;
  const blob2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate blob 1
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob1Anim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(blob1Anim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animate blob 2 with delay
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob2Anim, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: true,
        }),
        Animated.timing(blob2Anim, {
          toValue: 0,
          duration: 5000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const blob1Opacity = blob1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.25],
  });

  const blob2Opacity = blob2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.3],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Animated background gradient */}
      <LinearGradient
        colors={['#F8F9FA', '#FFFFFF', '#F1F5F9']}
        style={styles.backgroundGradient}
      />

      {/* Animated background blobs */}
      <Animated.View style={[styles.blob1, { opacity: blob1Opacity }]} />
      <Animated.View style={[styles.blob2, { opacity: blob2Opacity }]} />

      {/* Modern Glassmorphism Header */}
      <View style={styles.modernHeader}>
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuOpen(true)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(184,126,112,0.15)', 'rgba(184,126,112,0.10)']}
                style={styles.menuButtonGradient}
              >
                <MenuIcon size={24} color="#B87E70" />
              </LinearGradient>
            </TouchableOpacity>
            <Logo size="medium" variant="medical" textColor="#B15740" animated={true} />
            <UserAvatar size="medium" />
          </View>
        </LinearGradient>
      </View>

      {/* Navigation Arrows - Hidden on mobile for cleaner interface */}
      {screenWidth >= 600 && currentSection > 0 && (
        <TouchableOpacity
          style={[styles.navigationArrow, styles.leftArrow]}
          onPress={scrollToPrevious}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(184,126,112,0.9)', 'rgba(184,126,112,0.7)']}  // Old Rose gradient for visibility
            style={styles.arrowButton}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {screenWidth >= 600 && currentSection < sections.length - 1 && (
        <TouchableOpacity
          style={[styles.navigationArrow, styles.rightArrow]}
          onPress={scrollToNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(184,126,112,0.9)', 'rgba(184,126,112,0.7)']}  // Old Rose gradient for visibility
            style={styles.arrowButton}
          >
            <ArrowRight size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Section 1: Modern Hero */}
        <View style={styles.section}>
          <View style={styles.heroSection}>
            <View style={styles.heroCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.92)']}
                style={styles.heroCardGradient}
              >
                {/* Modern Icon with Gradient Background */}
                <View style={styles.heroIconContainer}>
                  <LinearGradient
                    colors={['#B87E70', '#B15740']}
                    style={styles.heroIconGradient}
                  >
                    <BookOpen size={screenWidth < 600 ? 40 : 48} color="#FFFFFF" />
                  </LinearGradient>
                </View>

                {/* Hero Title with Gradient Text Effect */}
                <Text style={styles.heroTitle}>
                  Bestehen Sie Ihre KP & FSP Prüfung beim ersten Versuch
                </Text>

                <Text style={styles.heroSubtitle}>
                  Realistische Prüfungen • Persönliches Feedback • Relevante Inhalte
                </Text>

                <View style={styles.ctaButtonContainer}>
                  <TouchableOpacity
                    style={styles.ctaButtonWrapper}
                    onPress={() => router.push('/(tabs)/simulation')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#B87E70', '#B15740']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.ctaButton}
                    >
                      <Text style={styles.ctaButtonText}>Simulation testen</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.ctaButtonWrapper}
                    onPress={() => router.push('/subscription')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#E2827F', '#B87E70']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.ctaButton}
                    >
                      <Text style={styles.ctaButtonText}>Abonnieren</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.ctaButtonOutline}
                    onPress={() => setShowAboutUs(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.ctaButtonOutlineText}>Über KP Med</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            {/* Subscription Status Card - Temporarily Disabled */}
            {user && false && (
              <View style={styles.subscriptionCard}>
                <Text>Subscription info will appear here</Text>
              </View>
            )}
          </View>
        </View>

        {/* Section 2: Recent Medical Content */}
        <View style={styles.section}>
          <View style={styles.recentContentSection}>
            <Text style={styles.sectionTitle}>Zuletzt angesehen</Text>
            {recentContentLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Lade letzte Inhalte...</Text>
              </View>
            ) : recentContent.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                  style={styles.emptyStateCard}
                >
                  <Stethoscope size={48} color="#B87E70" style={styles.emptyStateIcon} />  {/* Old Rose */}
                  <Text style={styles.emptyStateTitle}>Noch keine Inhalte angesehen</Text>
                  <Text style={styles.emptyStateDescription}>
                    Beginne deine medizinische Lernreise und deine zuletzt angesehenen Inhalte werden hier erscheinen.
                  </Text>
                  <TouchableOpacity 
                    style={styles.exploreButton}
                    onPress={handleViewAllRecentContent}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#E2827F', '#B87E70']}  // Burning Sand to Old Rose
                      style={styles.exploreButtonGradient}
                    >
                      <BookOpen size={16} color="#ffffff" style={styles.exploreButtonIcon} />
                      <Text style={styles.exploreButtonText}>Inhalte entdecken</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            ) : (
              <View style={styles.recentContentList}>
                {recentContent.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.recentContentItem}
                    onPress={() => handleRecentContentPress(item.slug)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                      style={styles.recentContentCard}
                    >
                      <View style={styles.recentContentHeader}>
                        <View style={[styles.recentContentIcon, { backgroundColor: item.color ? `${item.color}20` : '#E0F2FE' }]}>
                          <Stethoscope size={20} color={item.color || '#0369A1'} />
                        </View>
                        <View style={styles.recentContentInfo}>
                          <Text style={styles.recentContentTitle} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text style={styles.recentContentCategory}>
                            {item.category || item.type}
                          </Text>
                        </View>
                        <View style={styles.recentContentMeta}>
                          <View style={styles.viewCountBadge}>
                            <Clock size={12} color="#B87E70" />  {/* Old Rose */}
                            <Text style={styles.viewCountText}>{item.viewCount}</Text>
                          </View>
                          <ChevronRight size={16} color="#B87E70" />  {/* Old Rose */}
                        </View>
                      </View>
                      {item.description && (
                        <Text style={styles.recentContentDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
                
                {/* View All Button */}
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={handleViewAllRecentContent}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                    style={styles.viewAllCard}
                  >
                    <FileText size={20} color="#B87E70" />  {/* Old Rose */}
                    <Text style={styles.viewAllText}>Alle Inhalte anzeigen</Text>
                    <ChevronRight size={16} color="#B87E70" />  {/* Old Rose */}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Section 3: Tip of the Day */}
        <View style={styles.section}>
          <View style={styles.tipSection}>
            <Text style={styles.tipSectionTitle}>Tipp des Tages</Text>
            {contentLoading ? (
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                style={styles.tipCard}
              >
                <Text style={styles.loadingText}>Lade Tipp...</Text>
              </LinearGradient>
            ) : contentError ? (
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                style={styles.tipCard}
              >
                <Text style={styles.loadingText}>Fehler: {contentError}</Text>
                <TouchableOpacity style={styles.tipRetryButton} onPress={refetch}>
                  <Text style={styles.tipRetryButtonText}>Erneut versuchen</Text>
                </TouchableOpacity>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                style={styles.tipCard}
              >
                <View style={styles.tipHeader}>
                  <LinearGradient
                    colors={['#ffecd2', '#fcb69f']}
                    style={styles.tipIconBg}
                  >
                    <Lightbulb size={20} color="#E5877E" />  {/* Tonys Pink */}
                  </LinearGradient>
                  <Text style={styles.tipTitle}>{tipData.title}</Text>
                </View>
                <View style={styles.tipContentContainer}>
                  {renderTipContent(tipData.content)}
                </View>
              </LinearGradient>
            )}
          </View>
        </View>

        {/* Section 4: Question of the Day */}
        <View style={styles.section}>
          <View style={styles.questionSection}>
            <Text style={styles.sectionTitle}>Frage des Tages</Text>
            {contentLoading ? (
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                style={styles.questionCard}
              >
                <Text style={styles.loadingText}>Lade Frage...</Text>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                style={styles.questionCard}
              >
                <View style={styles.questionHeader}>
                  <HelpCircle size={28} color="#B15740" />  {/* Brown Rust - EMPHASIS */}
                  <Text style={styles.questionTitle}>Wissensfrage</Text>
                </View>
                <Text style={styles.questionText}>{questionData.question}</Text>
                
                <View style={styles.questionOptions}>
                  {['a', 'b', 'c'].map((key) => {
                    const optionText = questionData[`choice_${key}`] || questionData[`option_${key}`] || '';
                    if (!optionText) return null;
                    
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.optionButton,
                          selectedAnswer === key && styles.selectedOption,
                          showQuestionAnswer && key === questionData.correct_choice?.toLowerCase() && styles.correctOption,
                          showQuestionAnswer && selectedAnswer === key && key !== questionData.correct_choice?.toLowerCase() && styles.wrongOption
                        ]}
                        onPress={() => handleAnswerSelect(key)}
                        disabled={showQuestionAnswer}
                      >
                        <View style={styles.optionContent}>
                          <Text style={[
                            styles.optionLetter,
                            selectedAnswer === key && styles.selectedOptionText,
                            showQuestionAnswer && key === questionData.correct_choice?.toLowerCase() && styles.correctOptionText,
                            showQuestionAnswer && selectedAnswer === key && key !== questionData.correct_choice?.toLowerCase() && styles.wrongOptionText
                          ]}>
                            {key.toUpperCase()}.
                          </Text>
                          <Text style={[
                            styles.optionText,
                            selectedAnswer === key && styles.selectedOptionText,
                            showQuestionAnswer && key === questionData.correct_choice?.toLowerCase() && styles.correctOptionText,
                            showQuestionAnswer && selectedAnswer === key && key !== questionData.correct_choice?.toLowerCase() && styles.wrongOptionText
                          ]}>
                            {optionText}
                          </Text>
                          {showQuestionAnswer && key === questionData.correct_choice?.toLowerCase() && (
                            <CheckCircle size={20} color="#10b981" />
                          )}
                          {showQuestionAnswer && selectedAnswer === key && key !== questionData.correct_choice?.toLowerCase() && (
                            <XCircle size={20} color="#ef4444" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {showQuestionAnswer && questionData.explanation && (
                  <View style={styles.explanationContainer}>
                    <Text style={styles.explanationTitle}>Erklärung:</Text>
                    <Text style={styles.explanationText}>{questionData.explanation}</Text>
                  </View>
                )}
              </LinearGradient>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Menu */}
      <Menu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      
      {/* About Us Modal */}
      <AboutUsModal
        visible={showAboutUs}
        onClose={() => setShowAboutUs(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: screenHeight,
  },
  blob1: {
    position: 'absolute',
    top: 80,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#E2827F',
  },
  blob2: {
    position: 'absolute',
    bottom: 100,
    right: -80,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#B87E70',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  navigationArrow: {
    position: 'absolute' as const,
    top: '50%',
    zIndex: 10,
    marginTop: -25,
  },
  leftArrow: {
    left: 20,
  },
  rightArrow: {
    right: 20,
  },
  arrowButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: screenWidth < 600 ? 32 : 40,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 36,
    letterSpacing: -0.5,
  },
  tipSectionTitle: {
    fontSize: screenWidth < 600 ? 28 : 36,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  // Modern Header Styles
  modernHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 1000,
  },
  headerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuButtonGradient: {
    padding: 14,
    borderRadius: 16,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center' as const,
    padding: 20,
  },
  // Modern Hero Section Styles
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 30,
  },
  heroCard: {
    borderRadius: 32,
    width: screenWidth < 600 ? '92%' : '100%',
    maxWidth: 520,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: 'rgba(177, 87, 64, 0.25)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 16,
    overflow: 'hidden',
  },
  heroCardGradient: {
    padding: screenWidth < 600 ? 32 : 48,
    alignItems: 'center',
  },
  heroIconContainer: {
    marginBottom: screenWidth < 600 ? 24 : 32,
  },
  heroIconGradient: {
    width: screenWidth < 600 ? 80 : 96,
    height: screenWidth < 600 ? 80 : 96,
    borderRadius: screenWidth < 600 ? 24 : 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(184,126,112,0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTitle: {
    fontSize: screenWidth < 600 ? 28 : 36,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: screenWidth < 600 ? 36 : 48,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: screenWidth < 600 ? 16 : 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: screenWidth < 600 ? 36 : 48,
    lineHeight: screenWidth < 600 ? 24 : 28,
    fontWeight: '500',
  },
  ctaButtonContainer: {
    flexDirection: 'column',
    gap: screenWidth < 600 ? 14 : 16,
    width: '100%',
    alignItems: 'center',
  },
  ctaButtonWrapper: {
    width: screenWidth < 600 ? '100%' : 280,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(184,126,112,0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaButton: {
    paddingVertical: screenWidth < 600 ? 18 : 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: screenWidth < 600 ? 16 : 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ctaButtonOutline: {
    width: screenWidth < 600 ? '100%' : 280,
    paddingVertical: screenWidth < 600 ? 18 : 20,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#B87E70',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonOutlineText: {
    color: '#B15740',
    fontSize: screenWidth < 600 ? 16 : 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Recent Content Section Styles
  recentContentSection: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyStateIcon: {
    opacity: 0.6,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exploreButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreButtonIcon: {
    marginRight: 8,
  },
  exploreButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  recentContentList: {
    gap: 12,
  },
  recentContentItem: {
    marginBottom: 8,
  },
  recentContentCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: 'rgba(184,126,112,0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  recentContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentContentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentContentInfo: {
    flex: 1,
  },
  recentContentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
    lineHeight: 20,
  },
  recentContentCategory: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  recentContentMeta: {
    alignItems: 'center',
    gap: 8,
  },
  viewCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  viewCountText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  recentContentDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginLeft: 52,
  },
  viewAllButton: {
    marginTop: 8,
  },
  viewAllCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  viewAllText: {
    fontSize: 14,
    color: '#B87E70',  // Old Rose
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  // Modern Tip Section Styles
  tipSection: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  tipCard: {
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: 'rgba(184,126,112,0.2)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tipIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  tipContentContainer: {
    backgroundColor: '#fef9e7',
    borderRadius: 20,
    padding: 18,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  tipContentFocused: {
    fontSize: 18,
    color: '#1f2937',
    lineHeight: 28,
    fontWeight: '400',
    textAlign: 'center',
  },
  tipContentBold: {
    fontWeight: 'bold',
    color: '#92400e',
  },
  tipRetryButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
    marginTop: 12,
  },
  tipRetryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modern Question Section Styles
  questionSection: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  questionCard: {
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: 'rgba(184,126,112,0.2)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 12,
  },
  questionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: '500',
  },
  questionOptions: {
    gap: 12,
    marginBottom: 20,
  },
  optionButton: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  selectedOption: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  correctOption: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  wrongOption: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  optionLetter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280',
    marginRight: 12,
    minWidth: 24,
  },
  selectedOptionText: {
    color: '#6366f1',
  },
  correctOptionText: {
    color: '#10b981',
  },
  wrongOptionText: {
    color: '#ef4444',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  explanationContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#E2827F',
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#0e7490',
    lineHeight: 20,
  },

  // Subscription Card Styles
  subscriptionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(184, 126, 112, 0.2)',
    shadowColor: 'rgba(181, 87, 64, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subscriptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(184, 126, 112, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B87E70',
    flex: 1,
  },
  subscriptionUsage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(184, 126, 112, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#B87E70',
    borderRadius: 4,
  },
  subscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(184, 126, 112, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(184, 126, 112, 0.2)',
  },
  subscriptionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B87E70',
    flex: 1,
  },
});