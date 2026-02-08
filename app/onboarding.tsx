import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Willkommen bei KP Med',
    description:
      'Ihre KI-gestützte Plattform für die Vorbereitung auf die Fachsprachprüfung (FSP) und Kenntnisprüfung (KP).',
    icon: 'school-outline',
  },
  {
    id: '2',
    title: 'Alles an einem Ort',
    description:
      'Simulation, Bibliothek, EKG-Training und Fortschrittsanalyse — alles was Sie für Ihre Prüfung brauchen.',
    icon: 'apps-outline',
  },
  {
    id: '3',
    title: 'So funktioniert die Simulation',
    description:
      'Wählen Sie einen Fall, führen Sie die Anamnese, beantworten Sie Prüferfragen und erhalten Sie sofortiges Feedback.',
    icon: 'mic-outline',
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const currentSlide = slides[step];

  const goNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const goBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('kpmed_onboarding_completed', 'true');
    } catch (e) {
      console.error('Error saving onboarding:', e);
    }
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 100);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF9F5' }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* TOP: Progress dots */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
            paddingTop: 20,
            paddingBottom: 10,
          }}
        >
          {slides.map((_, index) => (
            <View
              key={index}
              style={{
                width: index === step ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: index === step ? '#F97316' : '#E5E7EB',
              }}
            />
          ))}
        </View>

        {/* MIDDLE: Content - centered vertically */}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 32,
          }}
        >
          {/* Icon */}
          <View style={{ marginBottom: 40 }}>
            <LinearGradient
              colors={['#F97316', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 140,
                height: 140,
                borderRadius: 70,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#F97316',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <Ionicons name={currentSlide.icon} size={70} color="#FFF" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: '#1F2937',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {currentSlide.title}
          </Text>

          {/* Description */}
          <Text
            style={{
              fontSize: 16,
              color: '#6B7280',
              textAlign: 'center',
              lineHeight: 24,
              maxWidth: 400,
            }}
          >
            {currentSlide.description}
          </Text>
        </View>

        {/* BOTTOM: Buttons - pinned to bottom */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 30 }}>
          {/* Button row - centered */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            {/* Back button */}
            {step > 0 && (
              <TouchableOpacity
                onPress={goBack}
                style={{
                  paddingVertical: 15,
                  paddingHorizontal: 28,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: 'rgba(249, 115, 22, 0.15)',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Text style={{ color: '#6B7280', fontSize: 15, fontWeight: '500' }}>Zurück</Text>
              </TouchableOpacity>
            )}

            {/* Primary button (Weiter / Los geht's!) */}
            <TouchableOpacity
              onPress={goNext}
              activeOpacity={0.85}
              style={{
                flex: step === 0 ? undefined : 1,
                maxWidth: 300,
              }}
            >
              <LinearGradient
                colors={['#F97316', '#EF4444', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 15,
                  paddingHorizontal: 40,
                  borderRadius: 14,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  shadowColor: '#F97316',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  {step < 2 ? 'Weiter' : "Los geht's!"}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Skip button - centered below */}
          {step < 2 && (
            <TouchableOpacity
              onPress={completeOnboarding}
              style={{
                alignSelf: 'center',
                paddingVertical: 14,
              }}
            >
              <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Überspringen</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
