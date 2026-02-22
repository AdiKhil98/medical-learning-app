import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, ArrowLeft, BriefcaseMedical } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Input from '@/components/ui/Input';
import Logo from '@/components/ui/Logo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const router = useRouter();

  // Email validation function
  const validateEmailFormat = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email input with validation
  const handleEmailChange = (text: string) => {
    setEmail(text);

    if (emailTouched && text.length > 0) {
      if (!validateEmailFormat(text)) {
        setEmailError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      } else {
        setEmailError('');
      }
    }
  };

  // Handle email blur event
  const handleEmailBlur = () => {
    setEmailTouched(true);
    if (email.length > 0 && !validateEmailFormat(email)) {
      setEmailError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
    }
  };

  const handleResetPassword = async () => {
    logger.info('🔵 handleResetPassword called', { email });
    setSubmitError(''); // Clear previous errors

    if (!email) {
      logger.info('❌ Email is empty');
      setSubmitError('Bitte geben Sie Ihre E-Mail-Adresse ein');
      return;
    }

    // Check for email validation errors
    if (!validateEmailFormat(email)) {
      logger.info('❌ Email validation failed');
      setEmailTouched(true);
      setEmailError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    logger.info('✅ Email validation passed');
    setLoading(true);

    try {
      logger.info('🔵 Calling Supabase resetPasswordForEmail...');
      const redirectUrl =
        Platform.OS === 'web'
          ? `${window.location.origin}/auth/reset-password`
          : 'medicallearningapp://auth/reset-password';
      logger.info('🔵 Redirect URL', { redirectUrl });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      logger.info('🔵 Supabase response received');

      if (error) {
        logger.info('❌ Supabase error:', error);
        throw error;
      }

      logger.info('✅ Password reset email sent successfully');
      setEmailSent(true);
    } catch (error: any) {
      logger.info('❌ Caught error:', error);
      const errorMsg = error?.message?.toLowerCase() || '';
      let errorMessage = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';

      if (errorMsg.includes('rate limit')) {
        errorMessage =
          'Sie haben zu viele E-Mails angefordert. Bitte warten Sie 60 Sekunden und versuchen Sie es erneut.';
      } else if (errorMsg.includes('for security purposes')) {
        errorMessage =
          'Aus Sicherheitsgründen können wir nicht bestätigen, ob diese E-Mail-Adresse in unserem System existiert. Falls sie existiert, haben Sie eine E-Mail erhalten.';
      }

      logger.info('🔵 Setting error message', { errorMessage });
      setSubmitError(errorMessage);
    } finally {
      logger.info('🔵 Finally block - setting loading to false');
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        {/* Background Gradient */}
        <LinearGradient colors={['#F8FAFC', '#FFFFFF', '#F1F5F9']} style={styles.backgroundGradient} />

        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <LinearGradient colors={['#D4A574', '#C19A6B']} style={styles.logoGradient}>
                  <BriefcaseMedical size={40} color="#FFFFFF" strokeWidth={2} />
                </LinearGradient>
              </View>
              <Text style={styles.brandName}>KP Med</Text>
              <Text style={styles.brandTagline}>Professional Medical Training</Text>
            </View>

            {/* Mail Icon */}
            <View style={styles.successIconContainer}>
              <View style={styles.successIconCircle}>
                <Mail size={48} color="#D4A574" strokeWidth={2} />
              </View>
            </View>

            {/* Success Message */}
            <View style={styles.successMessageSection}>
              <Text style={styles.successTitle}>E-Mail versendet!</Text>
              <Text style={styles.successSubtitle}>
                Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir Ihnen einen Link zum Zurücksetzen des
                Passworts gesendet.
              </Text>
              <View style={styles.emailContainer}>
                <Text style={styles.email}>{email}</Text>
              </View>
              <Text style={styles.instructions}>
                Überprüfen Sie Ihren Posteingang und klicken Sie auf den Link, um Ihr Passwort zurückzusetzen. Der Link
                läuft in 1 Stunde ab.
              </Text>
            </View>

            {/* Back to Login Button */}
            <TouchableOpacity onPress={handleBackToLogin} activeOpacity={0.8} style={styles.buttonSpacing}>
              <LinearGradient
                colors={['#FEF3C7', '#FDE68A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.backToLoginGradient}
              >
                <ArrowLeft size={20} color="#D4A574" strokeWidth={2.5} />
                <Text style={styles.backToLoginText}>Zurück zur Anmeldung</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Help Text */}
            <View style={styles.helpSection}>
              <Text style={styles.helpText}>
                E-Mail nicht erhalten? Überprüfen Sie Ihren Spam-Ordner oder versuchen Sie es in ein paar Minuten
                erneut.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

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

          {/* Welcome Message */}
          <View style={styles.welcomeSection}>
            <Text style={styles.title}>Passwort vergessen?</Text>
            <Text style={styles.subtitle}>
              Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <Input
              label="E-Mail"
              placeholder="ihre.email@beispiel.de"
              value={email}
              onChangeText={handleEmailChange}
              onBlur={handleEmailBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
              leftIcon={<Mail size={20} color="#94A3B8" />}
              editable={!loading}
              error={emailError}
            />

            {/* Error Message */}
            {submitError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{submitError}</Text>
              </View>
            ) : null}

            {/* Reset Button */}
            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.8}
              style={styles.buttonSpacing}
            >
              <LinearGradient
                colors={['#FB923C', '#F97316', '#EF4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.resetButtonGradient}
              >
                <Text style={styles.resetButtonText}>{loading ? 'Wird gesendet...' : 'Link senden'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity style={styles.cancelButton} onPress={handleBackToLogin}>
              <Text style={styles.cancelButtonText}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
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
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
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
  welcomeSection: {
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
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  formSection: {
    gap: 20,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  buttonSpacing: {
    marginTop: 8,
  },
  resetButtonGradient: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  // Success screen styles
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    marginHorizontal: 'auto',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  caduceusIcon: {
    marginLeft: 16,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4A574',
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
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#D4A574',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  backButtonText: {
    color: '#D4A574',
    fontSize: 16,
    fontWeight: '600',
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
  // Success screen styles (email sent confirmation)
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4A574',
  },
  successMessageSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emailContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  backToLoginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#D4A574',
  },
  backToLoginText: {
    color: '#D4A574',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
