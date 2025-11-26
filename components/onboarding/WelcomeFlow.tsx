import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, User, Shield, BookOpen, X, ArrowRight, Stethoscope, GraduationCap, FileText, Sparkles } from 'lucide-react-native';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface WelcomeFlowProps {
  visible: boolean;
  onComplete: () => void;
  onDismiss: () => void;
}

export default function WelcomeFlow({ visible, onComplete, onDismiss }: WelcomeFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [professionalVerified, setProfessionalVerified] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const steps = [
    {
      title: 'Über KP Med – Der Elite-Weg zum Erfolg',
      subtitle: 'Die führende Plattform für Ärztinnen und Ärzte',
      icon: Stethoscope,
      iconColor: '#667eea',
      bgGradient: ['#667eea', '#764ba2'],
      content: 'KP Med ist nicht einfach eine weitere Lernplattform. Es ist eine exklusive, spezialisierte Umgebung, entwickelt für internationale Mediziner, die die Fachsprachprüfung, Kenntnisprüfung oder ähnliche Hürden erfolgreich meistern wollen.\n\nHochwertige medizinische Inhalte treffen auf KI-gestützte Lerntechnologie, die sich individuell an Ihre Stärken und Schwächen anpasst. Bei KP Med lernen Sie nicht einfach – Sie bereiten sich strategisch und effizient auf den echten Prüfungstag vor.\n\nMedizinerinnen und Mediziner, die sich gezielt für Exzellenz entschieden haben, haben mit KP Med den entscheidenden Schritt gemacht.\n\nJetzt ist es Ihre Gelegenheit, sich denselben Vorsprung zu verschaffen – mit einer Vorbereitung, die Sie konsequent an Ihr Ziel bringt.\n\nWenn Bestehen Ihr Ziel ist, ist KP Med Ihr Schlüssel. Wenn Exzellenz Ihr Anspruch ist, ist KP Med Ihr Zuhause.',
      features: [
        'Personalisierte Lernpfade',
        'Realistische Patientensimulationen',
        'Detailliertes Feedback & Analytics'
      ]
    },
    {
      title: 'Unsere Inhalte – Medizinisches Wissen, das zählt',
      subtitle: 'Hochrelevant, klinisch fokussiert und prüfungsoptimiert',
      icon: GraduationCap,
      iconColor: '#f093fb',
      bgGradient: ['#f093fb', '#f5576c'],
      content: 'Die Inhalte von KP Med gehen weit über Standardwissen hinaus – sie sind hochrelevant, klinisch fokussiert und genau auf die Prüfungsanforderungen in Deutschland abgestimmt. Entwickelt von Ärztinnen und Ärzten mit echter Prüfungserfahrung, ist jedes Modul auf Präzision, Verstehen und Nachhaltigkeit ausgerichtet.\n\nKeine PDFs von gestern, keine zusammengewürfelten Notizen.\nBei KP Med finden Sie strukturierte, verständliche Inhalte, die auf das Wesentliche reduziert sind – perfekt zum gezielten Lernen und schnellen Fortschritt.\n\nUnsere Lernpfade fördern nicht nur das Verstehen, sondern auch das diagnostische Denken, das in deutschen Prüfungen erwartet wird. Sie lernen nicht nur – Sie werden klinisch denken und handeln.\n\nKP Med ist Ihr Partner für gezielte, effektive Prüfungsvorbereitung.',
      features: [
        'Von Ärzten für Ärzte entwickelt',
        'Klinisch fokussierte Inhalte',
        'Diagnostisches Denken fördern'
      ]
    },
    {
      title: 'Die Simulation – Die Prüfung vor der Prüfung',
      subtitle: 'KI-basierte Prüfungssimulation für maximalen Erfolg',
      icon: FileText,
      iconColor: '#4facfe',
      bgGradient: ['#4facfe', '#00f2fe'],
      content: 'Mit KP Med erhalten Sie Zugang zur modernsten und realistischsten Prüfungssimulation, die es für internationale Ärzte in Deutschland gibt. Unsere KI-basierte Simulation repliziert die echte Prüfungssituation, bewertet Ihre Antworten intelligent und liefert eine detaillierte Analyse Ihrer individuellen Stärken und Schwächen.\n\nDas bedeutet: Sie testen nicht nur Ihr Wissen – Sie verbessern aktiv Ihre Strategie, Ihr Zeitmanagement und Ihre Prüfungskompetenz.\nJede Simulation bringt Sie messbar weiter – zielgerichtet, datenbasiert und personalisiert.\n\nÄrztinnen und Ärzte, die mit KP Med trainiert haben, gehen selbstsicher, fokussiert und mit echter Prüfungsroutine in die Prüfung.\n\nKP Med ist nicht einfach ein Test – es ist Ihre Generalprobe mit maximaler Wirkung.',
      features: [
        'Realistische KI-Prüfungssimulation',
        'Intelligente Leistungsanalyse',
        'Personalisierte Verbesserungsstrategien'
      ]
    }
  ];

  const handleNext = () => {
    logger.info('WelcomeFlow: handleNext called, currentStep:', currentStep);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    logger.info('WelcomeFlow: handleComplete called');
    logger.info('Professional verified:', professionalVerified);
    logger.info('Disclaimer accepted:', disclaimerAccepted);
    
    if (!professionalVerified) {
      Alert.alert(
        'Bestätigung erforderlich',
        'Bitte bestätigen Sie Ihre berufliche Qualifikation als medizinische Fachkraft.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (!disclaimerAccepted) {
      Alert.alert(
        'Zustimmung erforderlich',
        'Bitte akzeptieren Sie den medizinischen Haftungsausschluss, um fortzufahren.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    logger.info('WelcomeFlow: Calling onComplete');
    onComplete();
  };

  const handleSkip = () => {
    logger.info('WelcomeFlow: Skip button pressed');
    onDismiss();
  };

  const currentStepData = steps[currentStep];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.modernContainer}>
        <LinearGradient
          colors={['#f8fafc', '#e2e8f0', '#ffffff']}
          style={styles.gradientBackground}
        />

        {/* Modern Header */}
        <View style={styles.modernHeader}>
          <TouchableOpacity
            style={styles.modernSkipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>Überspringen</Text>
          </TouchableOpacity>
          
          {/* Modern Progress Indicator */}
          <View style={styles.modernProgressContainer}>
            <View style={styles.progressTrack}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentStep + 1) / steps.length) * 100}%` }
                ]} 
              />
            </View>
          </View>
        </View>

        <ScrollView style={styles.modernContent} contentContainerStyle={styles.modernContentContainer}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={currentStepData.bgGradient}
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <View style={styles.modernIconContainer}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.iconBackground}
                  >
                    <currentStepData.icon size={32} color="white" />
                  </LinearGradient>
                  {/* Floating sparkles */}
                  <View style={[styles.sparkle, styles.sparkle1]}>
                    <Sparkles size={12} color="rgba(255,255,255,0.6)" />
                  </View>
                  <View style={[styles.sparkle, styles.sparkle2]}>
                    <Sparkles size={8} color="rgba(255,255,255,0.4)" />
                  </View>
                </View>
                
                <Text style={styles.modernStepTitle}>{currentStepData.title}</Text>
                <Text style={styles.modernStepSubtitle}>{currentStepData.subtitle}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Content Card */}
          <View style={styles.contentCard}>
            <Text style={styles.modernStepContent}>{currentStepData.content}</Text>
            
            {/* Features List */}
            <View style={styles.featuresList}>
              {currentStepData.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: currentStepData.iconColor }]} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Professional Verification */}
          {currentStep === 1 && (
            <View style={styles.modernVerificationContainer}>
              <TouchableOpacity
                style={[
                  styles.modernCheckboxContainer,
                  professionalVerified && styles.modernCheckboxChecked
                ]}
                onPress={() => setProfessionalVerified(!professionalVerified)}
              >
                <View style={[styles.checkboxIcon, professionalVerified && styles.checkboxIconChecked]}>
                  <CheckCircle
                    size={20}
                    color={professionalVerified ? 'white' : currentStepData.iconColor}
                  />
                </View>
                <Text style={[
                  styles.modernCheckboxText,
                  professionalVerified && styles.modernCheckboxTextChecked
                ]}>
                  Ich bestätige, dass ich eine approbierte medizinische Fachkraft oder Medizinstudent bin
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Disclaimer Acceptance */}
          {currentStep === 2 && (
            <View style={styles.modernVerificationContainer}>
              <TouchableOpacity
                style={[
                  styles.modernCheckboxContainer,
                  disclaimerAccepted && styles.modernCheckboxChecked
                ]}
                onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
              >
                <View style={[styles.checkboxIcon, disclaimerAccepted && styles.checkboxIconChecked]}>
                  <CheckCircle
                    size={20}
                    color={disclaimerAccepted ? 'white' : currentStepData.iconColor}
                  />
                </View>
                <Text style={[
                  styles.modernCheckboxText,
                  disclaimerAccepted && styles.modernCheckboxTextChecked
                ]}>
                  Ich habe den medizinischen Haftungsausschluss gelesen und akzeptiert
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Modern Footer */}
        <View style={styles.modernFooter}>
          <TouchableOpacity
            style={styles.modernNextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={currentStepData.bgGradient}
              style={styles.modernNextButtonGradient}
            >
              <Text style={styles.modernNextButtonText}>
                {currentStep === steps.length - 1 ? 'Jetzt starten' : 'Weiter'}
              </Text>
              <ArrowRight size={18} color="white" style={styles.buttonArrow} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modernContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  
  // Modern Header
  modernHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernSkipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },
  modernProgressContainer: {
    flex: 1,
    alignItems: 'center',
    marginLeft: 20,
  },
  progressTrack: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 3,
  },

  // Modern Content
  modernContent: {
    flex: 1,
  },
  modernContentContainer: {
    padding: 0,
    paddingBottom: 40,
  },
  
  // Hero Section
  heroSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  heroGradient: {
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  heroContent: {
    alignItems: 'center',
  },
  modernIconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: -8,
    right: -8,
  },
  sparkle2: {
    bottom: -4,
    left: -4,
  },
  modernStepTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modernStepSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Content Card
  contentCard: {
    marginHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  modernStepContent: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 24,
    textAlign: 'left',
    marginBottom: 24,
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#4b5563',
    flex: 1,
  },

  // Modern Verification
  modernVerificationContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  modernCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(249, 250, 251, 1)',
    borderWidth: 2,
    borderColor: 'rgba(209, 213, 219, 0.5)',
  },
  modernCheckboxChecked: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderColor: '#667eea',
  },
  checkboxIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  checkboxIconChecked: {
    // Add any specific checked icon styles
  },
  modernCheckboxText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    lineHeight: 22,
  },
  modernCheckboxTextChecked: {
    color: '#1f2937',
  },

  // Modern Footer
  modernFooter: {
    padding: 20,
    paddingBottom: 40,
  },
  modernNextButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modernNextButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modernNextButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  buttonArrow: {
    marginLeft: 4,
  },
});