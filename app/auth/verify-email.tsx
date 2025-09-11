import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform
} from 'react-native';
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  const handleResendVerification = async () => {
    if (!params.email) {
      Alert.alert('Fehler', 'Keine E-Mail-Adresse gefunden. Bitte gehen Sie zurück und versuchen Sie sich erneut zu registrieren.');
      return;
    }

    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: params.email as string,
        options: {
          emailRedirectTo: Platform.OS === 'web' 
            ? `${window.location.origin}/auth/verify-email`
            : 'medicallearningapp://auth/verify-email'
        }
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'E-Mail gesendet',
        'Eine neue Bestätigungs-E-Mail wurde an Ihr Postfach gesendet.'
      );
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
    <LinearGradient
      colors={['#ffffff', '#f0f9f0']}
      style={styles.gradientBackground}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.verifyCard}>
            <View style={styles.header}>
              <View style={styles.logoSection}>
                <Logo size="large" textColor="#1F2937" />
                <BriefcaseMedical size={32} color="#10b981" style={styles.caduceusIcon} />
              </View>
              
              <View style={styles.iconContainer}>
                <Mail size={64} color="#10b981" />
              </View>

              {verificationStatus === 'success' ? (
                <>
                  <Text style={styles.title}>E-Mail erfolgreich bestätigt!</Text>
                  <Text style={styles.subtitle}>
                    Ihr Konto wurde erfolgreich verifiziert.
                  </Text>
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
                  <Text style={styles.subtitle}>
                    Wir haben einen Bestätigungslink gesendet an:
                  </Text>
                  <Text style={styles.email}>{params.email}</Text>
                  
                  <Text style={styles.instructions}>
                    Klicken Sie auf den Link in Ihrer E-Mail, um Ihr Konto zu verifizieren und mit dem Lernen zu beginnen.
                    Der Link läuft in 24 Stunden ab.
                  </Text>
                </>
              )}
            </View>

            <View style={styles.actions}>
              {verificationStatus === 'success' ? (
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleBackToLogin}
                >
                  <Text style={styles.loginButtonText}>Zur Anmeldung</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResendVerification}
                    disabled={resendLoading}
                  >
                    <RefreshCw 
                      size={20} 
                      color="#10b981" 
                      style={resendLoading ? styles.spinning : undefined}
                    />
                    <Text style={styles.resendButtonText}>
                      {resendLoading ? 'Wird gesendet...' : 'E-Mail erneut senden'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBackToLogin}
                  >
                    <Text style={styles.backButtonText}>Zurück zur Anmeldung</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {verificationStatus !== 'success' && (
              <View style={styles.helpSection}>
                <Text style={styles.helpText}>
                  E-Mail nicht erhalten? Überprüfen Sie Ihren Spam-Ordner oder senden Sie die E-Mail erneut.
                </Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  verifyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    marginHorizontal: 'auto',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    justifyContent: 'center',
  },
  caduceusIcon: {
    marginLeft: 16,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  instructions: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  actions: {
    gap: 16,
    marginBottom: 24,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  resendButtonText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  backButtonText: {
    color: '#6B7280',
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
  successMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  loginButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});