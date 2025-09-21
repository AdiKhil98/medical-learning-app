import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions, 
  Animated,
  SafeAreaView
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
  Info,
  TrendingUp,
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

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E2827F', '#B87E70', '#B15740']}  // DRAMATIC coral gradient
        style={styles.gradientBackground}
      />

      {/* Header with Menu */}
      <LinearGradient
        colors={['#E2827F', '#B87E70', '#B15740']}  // DRAMATIC coral gradient
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

      {/* Navigation Arrows - Visually Lighter */}
      {currentSection > 0 && (
        <TouchableOpacity
          style={[styles.navigationArrow, styles.leftArrow]}
          onPress={scrollToPrevious}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.4)']}
            style={styles.arrowButton}
          >
            <ArrowLeft size={20} color="rgba(0,0,0,0.5)" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {currentSection < sections.length - 1 && (
        <TouchableOpacity
          style={[styles.navigationArrow, styles.rightArrow]}
          onPress={scrollToNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.4)']}
            style={styles.arrowButton}
          >
            <ArrowRight size={20} color="rgba(0,0,0,0.5)" />
          </LinearGradient>
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

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Section 1: Hero */}
        <View style={styles.section}>
          <View style={styles.heroSection}>
            <LinearGradient
              colors={['rgba(248, 243, 232, 0.98)', 'rgba(248, 243, 232, 0.95)']}  // Nearly opaque White Linen
              style={styles.heroCard}
            >
              <View style={styles.heroIcon}>
                <BookOpen size={64} color="#B87E70" />  {/* Old Rose for brand consistency */}
              </View>
              <Text style={styles.heroTitle}>Lernkapital</Text>
              <Text style={styles.heroSubtitle}>
                Deine Plattform für effektives und nachhaltiges Lernen
              </Text>
              <Text style={styles.heroDescription}>
                Entdecke moderne Lernmethoden, tägliche Wissensnuggets und 
                interaktive Übungen, die dich zum Lernerfolg führen.
              </Text>
              <TouchableOpacity 
                style={styles.ctaButton}
                onPress={() => setShowAboutUs(true)}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#B15740', '#A04A35']}  // Premium gradient - Brown Rust to darker shade
                  style={styles.ctaButtonGradient}
                >
                  <Info size={20} color="#ffffff" style={styles.ctaIcon} />
                  <Text style={styles.ctaButtonText}>Über Uns</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
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

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradientBackground: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    height: screenHeight,
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
  sectionIndicators: {
    position: 'absolute' as const,
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(184, 126, 112, 0.4)',  // Reduced opacity for inactive dots
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#B15740',  // Brown Rust for active state - stronger brand presence
    width: 24,
    shadowColor: '#B15740',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 30,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  tipSectionTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Header Styles
  modernHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center' as const,
    padding: 20,
  },
  // Hero Section Styles
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  heroCard: {
    borderRadius: 16,  // Modern corner radius
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(184, 126, 112, 0.2)',  // Subtle Old Rose border
    shadowColor: 'rgba(181, 87, 64, 0.1)',  // Enhanced primary shadow
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 25,
    // Adding second shadow for depth
    backgroundColor: 'transparent',  // Ensure gradient shows through
  },
  heroIcon: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#A04A35',  // Darker shade for more authority
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',  // Subtle shadow for contrast
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 20,
    color: '#333333',  // Dark gray for optimal readability against White Linen
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 28,
    fontWeight: '500',  // Medium weight for better hierarchy
  },
  heroDescription: {
    fontSize: 16,
    color: '#555555',  // Medium gray for optimal reading against White Linen
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    fontWeight: '400',  // Regular weight for body text
  },
  ctaButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#B15740',  // Brown Rust shadow to make button pop
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    transform: [{ scale: 1 }],  // Ready for hover animations
  },
  ctaButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIcon: {
    marginRight: 8,
  },
  ctaButtonText: {
    color: '#ffffff',  // White text for maximum contrast
    fontSize: 18,
    fontWeight: '600',  // Semi-bold for premium feel
    letterSpacing: 0.5,  // Slight letter spacing for elegance
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#B87E70',  // Old Rose border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  // Tip Section Styles
  tipSection: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  tipCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#B87E70',  // Old Rose border - DRAMATIC accent
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
  // Question Section Styles
  questionSection: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  questionCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#B87E70',  // Old Rose border - DRAMATIC accent
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
};