import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface IntroSlidesProps {
  onComplete: () => void;
}

const IntroSlides: React.FC<IntroSlidesProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 3;

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <View style={styles.container}>
      {/* Decorative Circles */}
      <View style={[styles.circle, styles.circleTopLeft]} />
      <View style={[styles.circle, styles.circleBottomRight]} />

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        {Array.from({ length: totalSlides }).map((_, index) => (
          <View key={index} style={[styles.progressPill, index === currentSlide && styles.progressPillActive]} />
        ))}
      </View>

      {/* Slides Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentSlide === 0 && <Slide1 />}
        {currentSlide === 1 && <Slide2 />}
        {currentSlide === 2 && <Slide3 />}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigation}>
        {currentSlide > 0 && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>Zurück</Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Überspringen</Text>
        </TouchableOpacity>
      </View>

      {/* Next/Complete Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={handleNext} activeOpacity={0.8}>
          <LinearGradient
            colors={['#F97316', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>
              {currentSlide === totalSlides - 1 ? 'Dashboard entdecken →' : 'Weiter →'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Slide1: React.FC = () => (
  <View style={styles.slideContent}>
    <View style={styles.iconContainer}>
      <Text style={styles.mainEmoji}>🏥</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeEmoji}>✓</Text>
      </View>
    </View>
    <Text style={styles.slideTitle}>Willkommen bei MedMeister</Text>
    <Text style={styles.slideSubtitle}>
      Ihre persönliche Plattform für medizinisches Lernen und Prüfungsvorbereitung
    </Text>
  </View>
);

const Slide2: React.FC = () => (
  <View style={styles.slideContent}>
    <Text style={styles.slideTitle}>Lernen auf Ihre Art</Text>
    <Text style={styles.slideSubtitle}>Entdecken Sie drei leistungsstarke Funktionen</Text>

    <View style={styles.featureBoxes}>
      <View style={styles.featureBox}>
        <Text style={styles.featureEmoji}>🎤</Text>
        <Text style={styles.featureLabel}>Audio</Text>
      </View>
      <View style={styles.featureBox}>
        <Text style={styles.featureEmoji}>📚</Text>
        <Text style={styles.featureLabel}>Favoriten</Text>
      </View>
      <View style={styles.featureBox}>
        <Text style={styles.featureEmoji}>💓</Text>
        <Text style={styles.featureLabel}>Fortschritt</Text>
      </View>
    </View>
  </View>
);

const Slide3: React.FC = () => (
  <View style={styles.slideContent}>
    <Text style={styles.slideTitle}>So funktioniert's</Text>
    <Text style={styles.slideSubtitle}>Folgen Sie diesen einfachen Schritten</Text>

    <View style={styles.stepsList}>
      <View style={styles.stepItem}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>1</Text>
        </View>
        <Text style={styles.stepText}>Wählen Sie eine Fallkategorie</Text>
      </View>

      <View style={[styles.stepItem, styles.stepHighlight]}>
        <View style={[styles.stepNumber, styles.stepNumberActive]}>
          <Text style={[styles.stepNumberText, styles.stepNumberTextActive]}>2</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stepText, styles.stepTextBold]}>Nutzen Sie die interaktiven Features</Text>
          <Text style={styles.stepHint}>Audio, Favoriten & Fortschritt</Text>
        </View>
      </View>

      <View style={styles.stepItem}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>3</Text>
        </View>
        <Text style={styles.stepText}>Bearbeiten Sie medizinische Fälle</Text>
      </View>

      <View style={styles.stepItem}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>4</Text>
        </View>
        <Text style={styles.stepText}>Verfolgen Sie Ihren Lernfortschritt</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  circle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.1,
  },
  circleTopLeft: {
    top: -100,
    left: -100,
    backgroundColor: '#F97316',
  },
  circleBottomRight: {
    bottom: -100,
    right: -100,
    backgroundColor: '#EF4444',
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    gap: 8,
  },
  progressPill: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  progressPillActive: {
    backgroundColor: '#F97316',
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  slideContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  mainEmoji: {
    fontSize: 120,
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: -10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF9F5',
  },
  badgeEmoji: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  slideSubtitle: {
    fontSize: 17,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 12,
  },
  featureBoxes: {
    flexDirection: 'row',
    marginTop: 48,
    gap: 16,
  },
  featureBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFE4D6',
  },
  featureEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  stepsList: {
    width: '100%',
    marginTop: 40,
    gap: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  stepHighlight: {
    backgroundColor: '#FFF4ED',
    borderWidth: 2,
    borderColor: '#F97316',
    shadowColor: '#F97316',
    shadowOpacity: 0.15,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberActive: {
    backgroundColor: '#F97316',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  stepNumberTextActive: {
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  stepTextBold: {
    fontWeight: '600',
    color: '#1F2937',
  },
  stepHint: {
    fontSize: 13,
    color: '#F97316',
    marginTop: 4,
    fontWeight: '500',
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F97316',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  nextButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default IntroSlides;
