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
  Sparkles,
  TrendingUp,
  Menu as MenuIcon
} from 'lucide-react-native';
import Menu from '@/components/ui/Menu';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SlidingHomepageProps {
  onGetStarted?: () => void;
}

export default function SlidingHomepage({ onGetStarted }: SlidingHomepageProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showQuestionAnswer, setShowQuestionAnswer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const sections = [
    'Hero',
    'About Lernkapital', 
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

  const sampleTip = {
    title: "Effektive Lernstrategie",
    content: "Die Pomodoro-Technik kann deine Lerneffizienz um bis zu 40% steigern. Arbeite 25 Minuten konzentriert, dann mache 5 Minuten Pause.",
    category: "Lerntechnik"
  };

  const sampleQuestion = {
    question: "Welche Lernmethode ist am effektivsten für das Langzeitgedächtnis?",
    options: {
      a: "Mehrmaliges Lesen",
      b: "Aktive Wiederholung",
      c: "Passives Zuhören"
    },
    correctAnswer: "b",
    explanation: "Aktive Wiederholung aktiviert mehrere Gehirnregionen und festigt das Wissen nachhaltig."
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.gradientBackground}
      />

      {/* Header with Menu */}
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
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
            style={styles.arrowButton}
          >
            <ArrowLeft size={24} color="#333" />
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
            colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
            style={styles.arrowButton}
          >
            <ArrowRight size={24} color="#333" />
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
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.heroCard}
            >
              <View style={styles.heroIcon}>
                <BookOpen size={64} color="#ffffff" />
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
                onPress={onGetStarted}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#FF8E53', '#FF6B9D']}
                  style={styles.ctaButtonGradient}
                >
                  <Sparkles size={20} color="#ffffff" style={styles.ctaIcon} />
                  <Text style={styles.ctaButtonText}>Jetzt starten</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>

        {/* Section 2: About Lernkapital */}
        <View style={styles.section}>
          <View style={styles.aboutSection}>
            <Text style={styles.sectionTitle}>Über Lernkapital</Text>
            <View style={styles.valuePropositions}>
              <View style={styles.valueItem}>
                <LinearGradient
                  colors={['#4facfe', '#00f2fe']}
                  style={styles.valueIcon}
                >
                  <Target size={32} color="#ffffff" />
                </LinearGradient>
                <View style={styles.valueContent}>
                  <Text style={styles.valueTitle}>Personalisiertes Lernen</Text>
                  <Text style={styles.valueDescription}>
                    Maßgeschneiderte Lerninhalte basierend auf deinem Fortschritt
                  </Text>
                </View>
              </View>

              <View style={styles.valueItem}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.valueIcon}
                >
                  <TrendingUp size={32} color="#ffffff" />
                </LinearGradient>
                <View style={styles.valueContent}>
                  <Text style={styles.valueTitle}>Messbare Erfolge</Text>
                  <Text style={styles.valueDescription}>
                    Verfolge deinen Lernfortschritt mit detaillierten Statistiken
                  </Text>
                </View>
              </View>

              <View style={styles.valueItem}>
                <LinearGradient
                  colors={['#f093fb', '#f5576c']}
                  style={styles.valueIcon}
                >
                  <Lightbulb size={32} color="#ffffff" />
                </LinearGradient>
                <View style={styles.valueContent}>
                  <Text style={styles.valueTitle}>Täglich Neues</Text>
                  <Text style={styles.valueDescription}>
                    Frische Lerninhalte und Tipps jeden Tag
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Section 3: Tip of the Day */}
        <View style={styles.section}>
          <View style={styles.tipSection}>
            <Text style={styles.sectionTitle}>Tipp des Tages</Text>
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
              style={styles.tipCard}
            >
              <View style={styles.tipHeader}>
                <LinearGradient
                  colors={['#ffecd2', '#fcb69f']}
                  style={styles.tipIconBg}
                >
                  <Lightbulb size={24} color="#f39c12" />
                </LinearGradient>
                <View style={styles.tipHeaderText}>
                  <Text style={styles.tipTitle}>{sampleTip.title}</Text>
                  <Text style={styles.tipCategory}>{sampleTip.category}</Text>
                </View>
              </View>
              <Text style={styles.tipContent}>{sampleTip.content}</Text>
              <TouchableOpacity style={styles.tipButton} activeOpacity={0.8}>
                <Text style={styles.tipButtonText}>Mehr erfahren</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>

        {/* Section 4: Question of the Day */}
        <View style={styles.section}>
          <View style={styles.questionSection}>
            <Text style={styles.sectionTitle}>Frage des Tages</Text>
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
              style={styles.questionCard}
            >
              <View style={styles.questionHeader}>
                <HelpCircle size={28} color="#6366f1" />
                <Text style={styles.questionTitle}>Wissensfrage</Text>
              </View>
              <Text style={styles.questionText}>{sampleQuestion.question}</Text>
              
              <View style={styles.questionOptions}>
                {Object.entries(sampleQuestion.options).map(([key, value]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.optionButton,
                      selectedAnswer === key && styles.selectedOption,
                      showQuestionAnswer && key === sampleQuestion.correctAnswer && styles.correctOption,
                      showQuestionAnswer && selectedAnswer === key && key !== sampleQuestion.correctAnswer && styles.wrongOption
                    ]}
                    onPress={() => handleAnswerSelect(key)}
                    disabled={showQuestionAnswer}
                  >
                    <View style={styles.optionContent}>
                      <Text style={[
                        styles.optionLetter,
                        selectedAnswer === key && styles.selectedOptionText,
                        showQuestionAnswer && key === sampleQuestion.correctAnswer && styles.correctOptionText,
                        showQuestionAnswer && selectedAnswer === key && key !== sampleQuestion.correctAnswer && styles.wrongOptionText
                      ]}>
                        {key.toUpperCase()}.
                      </Text>
                      <Text style={[
                        styles.optionText,
                        selectedAnswer === key && styles.selectedOptionText,
                        showQuestionAnswer && key === sampleQuestion.correctAnswer && styles.correctOptionText,
                        showQuestionAnswer && selectedAnswer === key && key !== sampleQuestion.correctAnswer && styles.wrongOptionText
                      ]}>
                        {value}
                      </Text>
                      {showQuestionAnswer && key === sampleQuestion.correctAnswer && (
                        <CheckCircle size={20} color="#10b981" />
                      )}
                      {showQuestionAnswer && selectedAnswer === key && key !== sampleQuestion.correctAnswer && (
                        <XCircle size={20} color="#ef4444" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {showQuestionAnswer && (
                <View style={styles.explanationContainer}>
                  <Text style={styles.explanationTitle}>Erklärung:</Text>
                  <Text style={styles.explanationText}>{sampleQuestion.explanation}</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        </View>
      </ScrollView>

      {/* Menu */}
      <Menu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
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
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 24,
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
  // Hero Section Styles
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  heroCard: {
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  heroIcon: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 28,
  },
  heroDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  ctaButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // About Section Styles
  aboutSection: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  valuePropositions: {
    gap: 24,
  },
  valueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
  },
  valueIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  valueContent: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  valueDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipHeaderText: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  tipCategory: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  tipContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 20,
  },
  tipButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
  },
  tipButtonText: {
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
    borderLeftColor: '#0ea5e9',
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