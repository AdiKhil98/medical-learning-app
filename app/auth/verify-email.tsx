import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, RefreshCw, BriefcaseMedical } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/ui/Logo';

export default function VerifyEmail() {
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [countdown, setCountdown] = useState(3);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Listen for auth state changes to handle email verification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        setVerificationStatus('success');

        // Start countdown timer
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              router.replace('/auth/login');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(timer);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleResendVerification = async () => {
    if (!params.email) {
      Alert.alert(
        'Fehler',
        'Keine E-Mail-Adresse gefunden. Bitte gehen Sie zurück und versuchen Sie sich erneut zu registrieren.'
      );
      return;
    }

    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: params.email as string,
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

      Alert.alert('E-Mail gesendet', 'Eine neue Bestätigungs-E-Mail wurde an Ihr Postfach gesendet.');
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Fehler beim erneuten Senden der Bestätigungs-E-Mail');
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
            <Text style={styles.brandName}>KP MED</Text>
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
                <Text style={styles.successMessage}>
                  {params.message || 'Bestätigungs-E-Mail gesendet! Bitte überprüfen Sie Ihr Postfach.'}
                </Text>
                <Text style={styles.subtitle}>Wir haben einen Bestätigungslink gesendet an:</Text>
                <View style={styles.emailContainer}>
                  <Text style={styles.email}>{params.email}</Text>
                </View>

                <Text style={styles.instructions}>
                  Klicken Sie auf den Link in Ihrer E-Mail, um Ihr Konto zu verifizieren und mit dem Lernen zu beginnen.
                  Der Link läuft in 24 Stunden ab.
                </Text>
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

          {/* Help Section */}
          {verificationStatus !== 'success' && (
            <View style={styles.helpSection}>
              <Text style={styles.helpText}>
                E-Mail nicht erhalten? Überprüfen Sie Ihren Spam-Ordner oder senden Sie die E-Mail erneut.
              </Text>
            </View>
          )}
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
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 16,
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
  helpSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 24,
  },
  helpText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  spinning: {
    // Add animation if needed
  },
});
