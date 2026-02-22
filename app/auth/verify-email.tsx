import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, RefreshCw, BriefcaseMedical, CheckCircle, AlertCircle, Clock } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/ui/Logo';

// Storage key for pending verification email (must match AuthContext)
const PENDING_VERIFICATION_EMAIL_KEY = 'pending_verification_email';

export default function VerifyEmail() {
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [countdown, setCountdown] = useState(3);
  const [storedEmail, setStoredEmail] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get the email from params or AsyncStorage
  const displayEmail = (params.email as string) || storedEmail;

  // Load email from AsyncStorage if not in params
  useEffect(() => {
    const loadStoredEmail = async () => {
      if (!params.email) {
        try {
          const email = await AsyncStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY);
          if (email) {
            setStoredEmail(email);
          }
        } catch (error) {
          console.warn('Failed to load stored email:', error);
        }
      }
    };
    loadStoredEmail();
  }, [params.email]);

  useEffect(() => {
    // Listen for auth state changes to handle email verification
    let countdownTimer: ReturnType<typeof setInterval> | null = null;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        setVerificationStatus('success');

        // Clear stored verification email
        try {
          await AsyncStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
        } catch (error) {
          console.warn('Failed to clear stored email:', error);
        }

        // Start countdown timer
        countdownTimer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (countdownTimer) clearInterval(countdownTimer);
              router.replace('/auth/login');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleResendVerification = async () => {
    if (!displayEmail) {
      Alert.alert(
        'Fehler',
        'Keine E-Mail-Adresse gefunden. Bitte gehen Sie zurück zur Anmeldung und geben Sie Ihre E-Mail-Adresse ein.'
      );
      return;
    }

    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: displayEmail,
        options: {
          emailRedirectTo:
            Platform.OS === 'web'
              ? `${window.location.origin}/auth/verify-email`
              : 'medicallearningapp://auth/verify-email',
        },
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'E-Mail gesendet',
        'Eine neue Bestätigungs-E-Mail wurde an Ihr Postfach gesendet. Bitte überprüfen Sie auch Ihren Spam-Ordner.'
      );
    } catch (error: any) {
      if (error.message?.includes('rate limit')) {
        Alert.alert(
          'Bitte warten',
          'Sie haben zu viele E-Mails angefordert. Bitte warten Sie 60 Sekunden und versuchen Sie es erneut.'
        );
      } else {
        Alert.alert('Fehler', error.message || 'Fehler beim erneuten Senden der Bestätigungs-E-Mail');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient colors={['#F8FAFC', '#FFFFFF', '#F1F5F9']} style={styles.backgroundGradient} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <LinearGradient colors={['#D4A574', '#C19A6B']} style={styles.logoGradient}>
                <BriefcaseMedical size={40} color="#FFFFFF" strokeWidth={2} />
              </LinearGradient>
            </View>
            <Text style={styles.brandName}>MEDMEISTER</Text>
            <Text style={styles.brandTagline}>Professional Medical Training</Text>
          </View>

          {/* Mail Icon */}
          <View style={styles.mailIconContainer}>
            <View style={styles.mailIconCircle}>
              <Mail size={48} color="#10b981" strokeWidth={2} />
            </View>
          </View>

          {/* Message Section */}
          <View style={styles.messageSection}>
            {verificationStatus === 'success' ? (
              <>
                <Text style={styles.title}>E-Mail erfolgreich bestätigt!</Text>
                <Text style={styles.subtitle}>Ihr Konto wurde erfolgreich verifiziert.</Text>
                <Text style={styles.instructions}>
                  Sie werden in {countdown} Sekunden automatisch zur Anmeldung weitergeleitet.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>Registrierung erfolgreich!</Text>
                <Text style={styles.successMessage}>Bestätigungs-E-Mail wurde versendet</Text>

                {/* Email Sent To Box */}
                {displayEmail ? (
                  <View style={styles.emailSentToBox}>
                    <Mail size={20} color="#10b981" />
                    <View style={styles.emailSentToContent}>
                      <Text style={styles.emailSentToLabel}>E-Mail gesendet an:</Text>
                      <Text style={styles.emailSentToAddress}>{displayEmail}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noEmailText}>
                    (E-Mail-Adresse nicht verfügbar - Sie können sich über die Anmeldeseite erneut eine Bestätigung
                    senden lassen)
                  </Text>
                )}

                {/* Next Steps Section */}
                <View style={styles.nextStepsContainer}>
                  <Text style={styles.nextStepsTitle}>📋 Nächste Schritte:</Text>

                  {/* Step 1 */}
                  <View style={styles.stepContainer}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Öffnen Sie Ihr E-Mail-Postfach</Text>
                      <Text style={styles.stepDescription}>
                        Suchen Sie nach einer E-Mail von MedMeister (Ankunft in 1-2 Minuten)
                      </Text>
                    </View>
                  </View>

                  {/* Step 2 */}
                  <View style={styles.stepContainer}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Klicken Sie auf den Bestätigungslink</Text>
                      <Text style={styles.stepDescription}>Ein Klick genügt, um Ihr Konto zu aktivieren</Text>
                    </View>
                  </View>

                  {/* Step 3 */}
                  <View style={styles.stepContainer}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Starten Sie Ihre 5-Tage-Testversion</Text>
                      <Text style={styles.stepDescription}>Unbegrenzter Zugang zu allen Simulationen für 5 Tage</Text>
                    </View>
                  </View>
                </View>

                {/* Important Notice */}
                <View style={styles.noticeBox}>
                  <Clock size={18} color="#F59E0B" />
                  <Text style={styles.noticeText}>Der Bestätigungslink ist 24 Stunden gültig</Text>
                </View>

                {/* Warning Box */}
                <View style={styles.warningBox}>
                  <AlertCircle size={18} color="#EF4444" />
                  <Text style={styles.warningText}>
                    Keine E-Mail? Prüfen Sie Ihren <Text style={styles.warningBold}>Spam-Ordner</Text>
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {verificationStatus === 'success' ? (
              <TouchableOpacity onPress={handleBackToLogin} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButtonGradient}
                >
                  <Text style={styles.loginButtonText}>Zur Anmeldung</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity onPress={handleResendVerification} disabled={resendLoading} activeOpacity={0.8}>
                  <LinearGradient
                    colors={['#F0FDF4', '#DCFCE7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.resendButtonGradient}
                  >
                    <RefreshCw size={20} color="#10b981" style={resendLoading ? styles.spinning : undefined} />
                    <Text style={styles.resendButtonText}>
                      {resendLoading ? 'Wird gesendet...' : 'E-Mail erneut senden'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
                  <Text style={styles.backButtonText}>Zurück zur Anmeldung</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Help Section - Removed as info is now in warning box */}
        </ScrollView>
      </SafeAreaView>
    </View>
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
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    minHeight: '100%',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  brandTagline: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  mailIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mailIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  messageSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  successMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emailSentToBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#10b981',
    gap: 12,
    width: '100%',
  },
  emailSentToContent: {
    flex: 1,
  },
  emailSentToLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emailSentToAddress: {
    fontSize: 16,
    fontWeight: '700',
    color: '#047857',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emailContainer: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  nextStepsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  stepDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  noticeText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  warningText: {
    fontSize: 14,
    color: '#991B1B',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  warningBold: {
    fontWeight: '700',
  },
  noEmailText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  instructions: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  actions: {
    gap: 16,
    marginBottom: 24,
  },
  resendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  resendButtonText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  loginButtonGradient: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  backButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  spinning: {
    // Add animation if needed
  },
});
