import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff, Stethoscope, User } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Input from '@/components/ui/Input';
import PasswordStrengthIndicator from '@/components/ui/PasswordStrengthIndicator';
import { RegistrationStatusBanner } from '@/components/RegistrationStatusBanner';
import { checkRegistrationStatus } from '@/lib/registrationLimit';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [registrationAllowed, setRegistrationAllowed] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const { signUp } = useAuth();

  // Check registration status on mount
  useEffect(() => {
    async function checkStatus() {
      console.log('📋 Register page: Checking registration status on mount...');
      const status = await checkRegistrationStatus();

      console.log('📋 Register page: Status received:', status);

      if (status && !status.allowed) {
        // Redirect to waitlist immediately if registration is closed
        console.log('🚫 Registration closed, redirecting to waitlist...');
        Alert.alert(
          'Registrierung geschlossen',
          'Wir haben unsere Benutzerlimit erreicht. Sie werden zur Warteliste weitergeleitet.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/waitlist')
            }
          ]
        );
        return;
      }

      setRegistrationAllowed(status?.allowed ?? true);
      setCheckingStatus(false);
    }
    checkStatus();
  }, []);

  // Email validation function
  const validateEmailFormat = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation function
  const validatePasswordStrength = (password: string) => {
    if (password.length < 8) return 'Passwort muss mindestens 8 Zeichen lang sein';
    if (!/(?=.*[a-z])/.test(password)) return 'Passwort muss mindestens einen Kleinbuchstaben enthalten';
    if (!/(?=.*[A-Z])/.test(password)) return 'Passwort muss mindestens einen Großbuchstaben enthalten';
    if (!/(?=.*\d)/.test(password)) return 'Passwort muss mindestens eine Zahl enthalten';
    return '';
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

  // Handle password input with validation
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    const error = validatePasswordStrength(text);
    setPasswordError(error);

    // Re-check confirm password if it's already filled
    if (confirmPassword && text !== confirmPassword) {
      setConfirmPasswordError('Die Passwörter stimmen nicht überein');
    } else if (confirmPassword && text === confirmPassword) {
      setConfirmPasswordError('');
    }
  };

  // Handle confirm password input with validation
  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (text !== password) {
      setConfirmPasswordError('Die Passwörter stimmen nicht überein');
    } else {
      setConfirmPasswordError('');
    }
  };

  const handleRegister = async () => {
    // Clear previous errors and validate all fields
    let hasErrors = false;

    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Fehler', 'Bitte füllen Sie alle Felder aus.');
      return;
    }

    // Check email format
    if (!validateEmailFormat(email)) {
      setEmailTouched(true);
      setEmailError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      hasErrors = true;
    }

    // Check password strength
    const passwordStrengthError = validatePasswordStrength(password);
    if (passwordStrengthError) {
      setPasswordError(passwordStrengthError);
      hasErrors = true;
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      setConfirmPasswordError('Die Passwörter stimmen nicht überein');
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    // Double-check registration status before submitting
    console.log('🔄 Double-checking registration status before submission...');
    const status = await checkRegistrationStatus();
    console.log('📊 Status result:', status);

    if (status && !status.allowed) {
      console.log('🚫 Registration not allowed, redirecting to waitlist');
      Alert.alert(
        'Registrierung geschlossen',
        'Das Benutzerlimit wurde erreicht. Sie werden zur Warteliste weitergeleitet.',
        [
          {
            text: 'Zur Warteliste',
            onPress: () => router.replace('/waitlist')
          }
        ]
      );
      return;
    }

    if (!status) {
      console.error('⚠️ Could not verify registration status');
      Alert.alert(
        'Fehler',
        'Die Registrierungsstatus konnte nicht überprüft werden. Bitte versuchen Sie es später erneut.'
      );
      return;
    }

    console.log('✅ Registration allowed, proceeding with signup...');
    setLoading(true);
    try {
      await signUp(email, password, name);
      console.log('✅ Signup successful');
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('❌ Signup error:', error);

      if (error.message === 'VERIFICATION_REQUIRED') {
        router.push({
          pathname: '/auth/verify-email',
          params: {
            email: email.toLowerCase().trim(),
            message: 'Bestätigungs-E-Mail gesendet! Bitte überprüfen Sie Ihr Postfach.'
          }
        });
      } else if (error.message && (error.message.includes('USER_LIMIT_REACHED') || error.message.includes('user limit'))) {
        // Registration limit reached - redirect to waitlist
        console.log('🚫 Backend returned USER_LIMIT_REACHED');
        Alert.alert(
          'Limit erreicht',
          'Die maximale Anzahl von Benutzern wurde erreicht. Sie werden zur Warteliste weitergeleitet.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/waitlist')
            }
          ]
        );
      } else {
        Alert.alert('Registrierungsfehler', error.message || 'Ein Fehler ist aufgetreten.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#F8FAFC', '#FFFFFF', '#F1F5F9']}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#D4A574', '#C19A6B']}
                style={styles.logoGradient}
              >
                <Stethoscope size={40} color="#FFFFFF" strokeWidth={2} />
              </LinearGradient>
            </View>
            <Text style={styles.brandName}>KP MED</Text>
            <Text style={styles.brandTagline}>Professional Medical Training</Text>
          </View>

          {/* Welcome Message */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Konto erstellen</Text>
            <Text style={styles.welcomeSubtitle}>
              Erstellen Sie ein Konto, um mit dem Lernen zu beginnen
            </Text>
          </View>

          {/* Registration Status Banner */}
          {!checkingStatus && <RegistrationStatusBanner />}

          {/* Registration Form */}
          <View style={styles.registerCard}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Input
                label="Name"
                placeholder="Vollständiger Name"
                value={name}
                onChangeText={setName}
                leftIcon={<User size={20} color="#94A3B8" />}
                editable={!loading}
                containerStyle={styles.inputContainer}
                autoFocus={true}
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Input
                label="E-Mail"
                placeholder="ihre.email@beispiel.de"
                value={email}
                onChangeText={handleEmailChange}
                onBlur={handleEmailBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                error={emailError}
                leftIcon={<Mail size={20} color="#94A3B8" />}
                containerStyle={styles.inputContainer}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Input
                label="Passwort"
                placeholder="Passwort eingeben"
                value={password}
                onChangeText={handlePasswordChange}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                leftIcon={<Lock size={20} color="#94A3B8" />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={20} color="#94A3B8" />
                    ) : (
                      <Eye size={20} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                }
                editable={!loading}
                containerStyle={styles.inputContainer}
                error={passwordError}
              />
              <PasswordStrengthIndicator
                password={password}
                visible={passwordFocused || password.length > 0}
              />
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Input
                label="Passwort bestätigen"
                placeholder="Passwort wiederholen"
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                secureTextEntry={!showConfirmPassword}
                leftIcon={<Lock size={20} color="#94A3B8" />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#94A3B8" />
                    ) : (
                      <Eye size={20} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                }
                editable={!loading}
                containerStyle={styles.inputContainer}
                error={confirmPasswordError}
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
              style={styles.registerButtonContainer}
            >
              <LinearGradient
                colors={['#FB923C', '#F97316', '#EF4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.registerButtonText}>Registrieren</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>oder</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Login Link */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Bereits ein Konto? </Text>
              <Link href="/auth/login" asChild>
                <TouchableOpacity disabled={loading}>
                  <Text style={styles.loginLink}>Anmelden</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },

  // Logo Section
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
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4A574',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  brandName: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    letterSpacing: -1,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    letterSpacing: 0.5,
  },

  // Welcome Section
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#D4A574',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Register Card
  registerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },

  // Input Styles
  inputGroup: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 0,
  },

  // Register Button
  registerButtonContainer: {
    marginTop: 24,
  },
  registerButtonGradient: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  registerButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    marginHorizontal: 16,
  },

  // Login Row
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  loginLink: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#D4A574',
  },
});
