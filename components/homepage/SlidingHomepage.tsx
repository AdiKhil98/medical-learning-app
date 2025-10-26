import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent
} from 'react-native';
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
  HelpCircle
} from 'lucide-react-native';
import Menu from '@/components/ui/Menu';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';
import AboutUsModal from '@/components/ui/AboutUsModal';
import { useRouter } from 'expo-router';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SlidingHomepageProps {
  onGetStarted?: () => void;
}

export default function SlidingHomepage({ onGetStarted }: SlidingHomepageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  const totalSlides = 4;

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Clean gradient background */}
      <LinearGradient
        colors={['#F8FAFC', '#FFFFFF', '#F1F5F9']}
        style={styles.backgroundGradient}
      />

      {/* Modern Header */}
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
                colors={['rgba(251, 146, 60, 0.15)', 'rgba(239, 68, 68, 0.10)']}
                style={styles.menuButtonGradient}
              >
                <MenuIcon size={24} color="#FB923C" />
              </LinearGradient>
            </TouchableOpacity>
            <Logo size="medium" variant="medical" textColor="#FB923C" animated={true} />
            <UserAvatar size="medium" />
          </View>
        </LinearGradient>
      </View>

      {/* Navigation Arrows - Hidden on mobile */}
      {screenWidth >= 600 && (
        <>
          <TouchableOpacity
            style={styles.leftArrow}
            onPress={prevSlide}
            activeOpacity={0.8}
          >
            <View style={styles.arrowButton}>
              <ChevronLeft size={28} color="#FFFFFF" strokeWidth={3} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rightArrow}
            onPress={nextSlide}
            activeOpacity={0.8}
          >
            <View style={styles.arrowButton}>
              <ChevronRight size={28} color="#FFFFFF" strokeWidth={3} />
            </View>
          </TouchableOpacity>
        </>
      )}

      {/* Main Content - Horizontal Scrollable Carousel */}
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
            <View style={styles.heroCard}>
              {/* Icon Container */}
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={['#FB923C', '#EF4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <BookOpen size={40} color="#FFFFFF" strokeWidth={2} />
                </LinearGradient>
              </View>

              {/* Heading */}
              <Text style={styles.heading}>
                Bestehen Sie Ihre KP & FSP{'\n'}Prüfung beim ersten Versuch
              </Text>

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
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#FB923C', '#F97316', '#EF4444']}
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
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#FCD34D', '#FBBF24', '#F59E0B']}
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
                  activeOpacity={0.9}
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

            <View style={styles.cardsContainer}>
              {/* Card 1 */}
              <TouchableOpacity style={styles.recentCard} activeOpacity={0.8}>
                <View style={styles.recentCardContent}>
                  <View style={styles.recentCardLeft}>
                    <View style={styles.recentIconContainer}>
                      <Heart size={24} color="#3B82F6" />
                    </View>
                    <View>
                      <Text style={styles.recentCardTitle}>Akutes Koronarsyndrom</Text>
                      <Text style={styles.recentCardSubtitle}>Sonstiges</Text>
                    </View>
                  </View>
                  <View style={styles.recentCardRight}>
                    <View style={styles.timeContainer}>
                      <Clock size={16} color="#94A3B8" />
                      <Text style={styles.timeText}>6</Text>
                    </View>
                    <ChevronRight size={20} color="#94A3B8" />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Card 2 */}
              <TouchableOpacity style={styles.recentCard} activeOpacity={0.8}>
                <View style={styles.recentCardContent}>
                  <View style={styles.recentCardLeft}>
                    <View style={styles.recentIconContainer}>
                      <Heart size={24} color="#3B82F6" />
                    </View>
                    <View>
                      <Text style={styles.recentCardTitle}>Perikardtamponade</Text>
                      <Text style={styles.recentCardSubtitle}>Sonstiges</Text>
                    </View>
                  </View>
                  <View style={styles.recentCardRight}>
                    <View style={styles.timeContainer}>
                      <Clock size={16} color="#94A3B8" />
                      <Text style={styles.timeText}>1</Text>
                    </View>
                    <ChevronRight size={20} color="#94A3B8" />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Card 3 */}
              <TouchableOpacity style={styles.recentCard} activeOpacity={0.8}>
                <View style={styles.recentCardContent}>
                  <View style={styles.recentCardLeft}>
                    <View style={styles.recentIconContainer}>
                      <Heart size={24} color="#3B82F6" />
                    </View>
                    <View>
                      <Text style={styles.recentCardTitle}>Koniotomie</Text>
                      <Text style={styles.recentCardSubtitle}>Sonstiges</Text>
                    </View>
                  </View>
                  <View style={styles.recentCardRight}>
                    <View style={styles.timeContainer}>
                      <Clock size={16} color="#94A3B8" />
                      <Text style={styles.timeText}>1</Text>
                    </View>
                    <ChevronRight size={20} color="#94A3B8" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Footer Link */}
            <TouchableOpacity style={styles.viewAllLink} activeOpacity={0.8}>
              <FileText size={20} color="#FB923C" />
              <Text style={styles.viewAllText}>Alle Inhalte anzeigen</Text>
              <ChevronRight size={20} color="#FB923C" />
            </TouchableOpacity>
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

            <View style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <View style={styles.tipIconContainer}>
                  <Lightbulb size={24} color="#FB923C" />
                </View>
                <Text style={styles.tipHeaderText}>Tipp des Tages</Text>
              </View>

              <View style={styles.tipContentBox}>
                <Text style={styles.tipContent}>
                  Nimm dir regelmäßig Zeit für Entspannung 🧘. Kurze Meditationsübungen können Wunder wirken, um Stress abzubauen und den Fokus zu schärfen! ✨
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

            <View style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <View style={styles.questionIconContainer}>
                  <HelpCircle size={24} color="#FB923C" />
                </View>
                <Text style={styles.questionHeaderText}>Wissensfrage</Text>
              </View>

              <Text style={styles.questionText}>
                Welche der folgenden Untersuchungen ist am sensitivsten zur Diagnose einer Lungenembolie?
              </Text>

              <View style={styles.optionsContainer}>
                <TouchableOpacity style={styles.optionButton} activeOpacity={0.8}>
                  <Text style={styles.optionLabel}>A.</Text>
                  <Text style={styles.optionText}>D-Dimer-Test</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionButton} activeOpacity={0.8}>
                  <Text style={styles.optionLabel}>A.</Text>
                  <Text style={styles.optionText}>Spiral-CT der Lunge</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionButton} activeOpacity={0.8}>
                  <Text style={styles.optionLabel}>C.</Text>
                  <Text style={styles.optionText}>Röntgen-Thorax</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Carousel Indicators - Dots (visible on mobile) */}
      {screenWidth < 600 && (
        <View style={styles.carouselIndicators}>
          {[0, 1, 2, 3].map((index) => (
            <TouchableOpacity
              key={index}
              onPress={() => scrollToSlide(index)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.indicatorDot,
                  currentSlide === index && styles.indicatorDotActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

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
    backgroundColor: '#F8FAFC',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: screenHeight,
  },

  // Header Styles - Enhanced for Mobile
  modernHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 1000,
  },
  headerGradient: {
    paddingVertical: screenWidth < 600 ? 12 : 16,
    paddingHorizontal: screenWidth < 600 ? 16 : 20,
    paddingTop: screenWidth < 600 ? 16 : 24,
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
    minHeight: 48, // Touch target minimum
  },
  menuButton: {
    borderRadius: screenWidth < 600 ? 12 : 16,
    overflow: 'hidden',
    minWidth: 48, // Touch target minimum
    minHeight: 48,
  },
  menuButtonGradient: {
    padding: screenWidth < 600 ? 12 : 14,
    borderRadius: screenWidth < 600 ? 12 : 16,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Navigation Arrows - ALWAYS VISIBLE with z-index 50
  leftArrow: {
    position: 'absolute',
    left: screenWidth < 600 ? 8 : 16,
    top: '50%',
    marginTop: -28,
    zIndex: 50,
  },
  rightArrow: {
    position: 'absolute',
    right: screenWidth < 600 ? 8 : 16,
    top: '50%',
    marginTop: -28,
    zIndex: 50,
  },
  arrowButton: {
    width: screenWidth < 600 ? 48 : 56,
    height: screenWidth < 600 ? 48 : 56,
    borderRadius: screenWidth < 600 ? 24 : 28,
    backgroundColor: '#FB923C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(251, 146, 60, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
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
    paddingHorizontal: screenWidth < 600 ? 20 : 16,
    paddingVertical: screenWidth < 600 ? 32 : 24,
    paddingBottom: screenWidth < 600 ? 80 : 24, // Extra space for bottom nav on mobile
  },
  slideContainer: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },

  // Slide 0 - Hero Card Styles - Enhanced for Mobile
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: screenWidth < 600 ? 20 : 24,
    padding: screenWidth < 600 ? 28 : 40,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: screenWidth < 600 ? 12 : 20 },
    shadowOpacity: 1,
    shadowRadius: screenWidth < 600 ? 24 : 40,
    elevation: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: screenWidth < 600 ? 20 : 24,
  },
  iconGradient: {
    width: screenWidth < 600 ? 100 : 80,
    height: screenWidth < 600 ? 100 : 80,
    borderRadius: screenWidth < 600 ? 24 : 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(251, 146, 60, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  heading: {
    fontSize: screenWidth < 600 ? 22 : 30,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: screenWidth < 600 ? 12 : 16,
    lineHeight: screenWidth < 600 ? 30 : 40,
    letterSpacing: -0.5,
    paddingHorizontal: screenWidth < 600 ? 4 : 0,
  },
  subheading: {
    fontSize: screenWidth < 600 ? 14 : 18,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: screenWidth < 600 ? 28 : 32,
    lineHeight: screenWidth < 600 ? 22 : 28,
    fontWeight: '400',
    paddingHorizontal: screenWidth < 600 ? 8 : 0,
  },
  buttonsContainer: {
    width: '100%',
    gap: screenWidth < 600 ? 12 : 16,
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: screenWidth < 600 ? 14 : 16,
    overflow: 'hidden',
    shadowColor: 'rgba(251, 146, 60, 0.3)',
    shadowOffset: { width: 0, height: screenWidth < 600 ? 6 : 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButton: {
    paddingVertical: screenWidth < 600 ? 16 : 16,
    paddingHorizontal: screenWidth < 600 ? 24 : 32,
    borderRadius: screenWidth < 600 ? 14 : 16,
    minHeight: 52, // Enhanced touch target (> 48px)
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    paddingVertical: screenWidth < 600 ? 16 : 16,
    paddingHorizontal: screenWidth < 600 ? 24 : 32,
    borderRadius: screenWidth < 600 ? 14 : 16,
    minHeight: 52, // Enhanced touch target
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: screenWidth < 600 ? 16 : 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  outlineButton: {
    width: '100%',
    paddingVertical: screenWidth < 600 ? 16 : 16,
    paddingHorizontal: screenWidth < 600 ? 24 : 32,
    borderRadius: screenWidth < 600 ? 14 : 16,
    minHeight: 52, // Enhanced touch target
    borderWidth: 2,
    borderColor: '#FB923C',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: '#FB923C',
    fontSize: screenWidth < 600 ? 16 : 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Slide 1 - Recently Viewed Styles
  slideTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 32,
  },
  cardsContainer: {
    gap: 16,
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
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
    gap: 16,
    flex: 1,
  },
  recentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  recentCardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  recentCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FB923C',
  },

  // Slide 2 - Tip of the Day Styles
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  tipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  tipContentBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 24,
  },
  tipContent: {
    fontSize: 18,
    color: '#374151',
    lineHeight: 28,
    textAlign: 'center',
  },

  // Slide 3 - Question of the Day Styles
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  questionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  questionText: {
    fontSize: 18,
    color: '#0F172A',
    lineHeight: 26,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 20,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },

  // Carousel Indicators (Dots) - Mobile Only
  carouselIndicators: {
    position: 'absolute',
    bottom: screenWidth < 600 ? 90 : 40, // Above bottom nav on mobile
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    zIndex: 100,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
    transition: 'all 0.3s ease',
    cursor: 'default',
  },
  indicatorDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FB923C',
    cursor: 'default',
  },
});
