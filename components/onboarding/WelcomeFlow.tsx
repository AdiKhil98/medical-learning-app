import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, User, Shield, BookOpen, X } from 'lucide-react-native';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

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
      title: 'Willkommen bei KP MED',
      subtitle: 'Ihre medizinische Lernplattform',
      icon: '🏥',
      content: 'Bereiten Sie sich erfolgreich auf Ihre medizinischen Prüfungen vor mit professionellen Lehrmaterialien und interaktiven Simulationen.',
    },
    {
      title: 'Berufliche Qualifikation',
      subtitle: 'Bestätigung der Berechtigung',
      icon: '👨‍⚕️',
      content: 'Diese Plattform ist ausschließlich für approbierte medizinische Fachkräfte und Studierende der Medizin bestimmt.',
    },
    {
      title: 'Medizinischer Haftungsausschluss',
      subtitle: 'Wichtige Nutzungsbedingungen',
      icon: '⚕️',
      content: 'Diese Plattform stellt Lehrmaterialien ausschließlich für approbierte medizinische Fachkräfte zur Verfügung. Die Inhalte dienen der Prüfungsvorbereitung und stellen keine medizinische Beratung dar.',
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
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

    onComplete();
  };

  const currentStepData = steps[currentStep];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[MEDICAL_COLORS.lightGradient[0], MEDICAL_COLORS.lightGradient[1], '#ffffff']}
          style={styles.gradientBackground}
        />

        {/* Header */}
        <LinearGradient
          colors={[MEDICAL_COLORS.primaryGradient[0], MEDICAL_COLORS.primaryGradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onDismiss}
          >
            <X size={24} color={MEDICAL_COLORS.white} />
          </TouchableOpacity>
          
          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.activeProgressDot,
                  index < currentStep && styles.completedProgressDot,
                ]}
              />
            ))}
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Step Content */}
          <View style={styles.stepContainer}>
            <Text style={styles.stepIcon}>{currentStepData.icon}</Text>
            <Text style={styles.stepTitle}>{currentStepData.title}</Text>
            <Text style={styles.stepSubtitle}>{currentStepData.subtitle}</Text>
            <Text style={styles.stepContent}>{currentStepData.content}</Text>
          </View>

          {/* Professional Verification */}
          {currentStep === 1 && (
            <View style={styles.verificationContainer}>
              <TouchableOpacity
                style={[
                  styles.checkboxContainer,
                  professionalVerified && styles.checkboxChecked
                ]}
                onPress={() => setProfessionalVerified(!professionalVerified)}
              >
                <CheckCircle
                  size={20}
                  color={professionalVerified ? MEDICAL_COLORS.white : MEDICAL_COLORS.primary}
                />
                <Text style={[
                  styles.checkboxText,
                  professionalVerified && styles.checkboxTextChecked
                ]}>
                  Ich bestätige, dass ich eine approbierte medizinische Fachkraft oder Medizinstudent bin
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Disclaimer Acceptance */}
          {currentStep === 2 && (
            <View style={styles.verificationContainer}>
              <TouchableOpacity
                style={[
                  styles.checkboxContainer,
                  disclaimerAccepted && styles.checkboxChecked
                ]}
                onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
              >
                <CheckCircle
                  size={20}
                  color={disclaimerAccepted ? MEDICAL_COLORS.white : MEDICAL_COLORS.primary}
                />
                <Text style={[
                  styles.checkboxText,
                  disclaimerAccepted && styles.checkboxTextChecked
                ]}>
                  Ich habe den medizinischen Haftungsausschluss gelesen und akzeptiert
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
          >
            <LinearGradient
              colors={[MEDICAL_COLORS.primaryGradient[0], MEDICAL_COLORS.primaryGradient[1]]}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === steps.length - 1 ? 'Loslegen' : 'Weiter'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MEDICAL_COLORS.white,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  activeProgressDot: {
    backgroundColor: MEDICAL_COLORS.white,
    width: 24,
  },
  completedProgressDot: {
    backgroundColor: MEDICAL_COLORS.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  stepContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  stepIcon: {
    fontSize: 60,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  stepContent: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  verificationContainer: {
    marginTop: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: MEDICAL_COLORS.primary,
    backgroundColor: `${MEDICAL_COLORS.primary}08`,
  },
  checkboxChecked: {
    backgroundColor: MEDICAL_COLORS.primary,
    borderColor: MEDICAL_COLORS.primaryDark,
  },
  checkboxText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.textPrimary,
    lineHeight: 20,
  },
  checkboxTextChecked: {
    color: MEDICAL_COLORS.white,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  nextButton: {
    borderRadius: 25,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.white,
  },
});