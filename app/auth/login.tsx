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
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff, Stethoscope, Heart, Shield, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Input from '@/components/ui/Input';

const { width: screenWidth } = Dimensions.get('window');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [loginError, setLoginError] = useState('');
  const router = useRouter();
  const { signIn, session } = useAuth();

  // Email validation function
  const validateEmailFormat = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email input with validation
  const handleEmailChange = (text: string) => {
    setEmail(text);
    setLoginError('');

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

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      router.replace('/(tabs)');
    }
  }, [session, router]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben');
      return;
    }

    if (!validateEmailFormat(email)) {
      setEmailTouched(true);
      setEmailError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      if (error.message?.includes('Invalid login credentials')) {
        setLoginError('E-Mail-Adresse oder Passwort ist falsch. Bitte überprüfen Sie Ihre Eingaben.');
      } else if (error.message?.includes('Email not confirmed')) {
        setLoginError('Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link, den wir Ihnen gesendet haben.');
      } else if (error.message?.includes('Too many requests')) {
        setLoginError('Sie haben zu oft versucht, sich anzumelden. Bitte warten Sie einen Moment.');
      } else if (error.message?.includes('Account locked')) {
        setLoginError('Ihr Konto wurde temporär gesperrt. Versuchen Sie es in 30 Minuten erneut.');
      } else if (error.message?.includes('Network')) {
        setLoginError('Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.');
      } else {
        setLoginError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
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
                colors={['#B8846A', '#A07560']}
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
            <Text style={styles.welcomeTitle}>Willkommen zurück</Text>
            <Text style={styles.welcomeSubtitle}>
              Setzen Sie Ihre medizinische Lernreise fort
            </Text>
          </View>

          {/* Login Card */}
          <View style={styles.loginCard}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>E-Mail Adresse</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconLeft}>
                  <Mail size={20} color="#94A3B8" />
                </View>
                <Input
                  placeholder="ihre.email@beispiel.de"
                  value={email}
                  onChangeText={handleEmailChange}
                  onBlur={handleEmailBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  error={emailError}
                  containerStyle={styles.inputContainer}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Passwort</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconLeft}>
                  <Lock size={20} color="#94A3B8" />
                </View>
                <Input
                  placeholder="••••••••"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setLoginError('');
                  }}
                  secureTextEntry={!showPassword}
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
                />
              </View>
            </View>

            {/* Error Message */}
            {loginError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            {/* Remember Me & Forgot Password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeRow}
                onPress={() => setRememberMe(!rememberMe)}
                disabled={loading}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberMeText}>Angemeldet bleiben</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/auth/forgot-password')}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordLink}>Passwort vergessen?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FB923C', '#F97316', '#EF4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>Jetzt anmelden</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>oder</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Noch kein Konto? </Text>
              <Link href="/auth/register" asChild>
                <TouchableOpacity disabled={loading}>
                  <Text style={styles.registerLink}>Jetzt registrieren</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          {/* Feature Cards */}
          <View style={styles.featuresSection}>
            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, styles.featureIconCyan]}>
                <Shield size={20} color="#06B6D4" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Sichere Plattform</Text>
                <Text style={styles.featureDescription}>Ihre Daten sind geschützt</Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, styles.featureIconOrange]}>
                <Sparkles size={20} color="#F97316" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>KI-gestütztes Lernen</Text>
                <Text style={styles.featureDescription}>Personalisiert für Sie</Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, styles.featureIconGreen]}>
                <Heart size={20} color="#10B981" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Gemeinschaft</Text>
                <Text style={styles.featureDescription}>Lernen mit Tausenden</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2025 KP MED. Exzellenz in medizinischer Ausbildung.
            </Text>
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
    shadowColor: '#B8846A',
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
    color: '#B8846A',
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

  // Login Card
  loginCard: {
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
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIconLeft: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  inputContainer: {
    marginBottom: 0,
  },

  // Error
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Options Row
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FB923C',
    borderColor: '#FB923C',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  rememberMeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#475569',
  },
  forgotPasswordLink: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#B8846A',
  },

  // Login Button
  loginButtonGradient: {
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
  loginButtonText: {
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

  // Register Row
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  registerLink: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#B8846A',
  },

  // Features Section
  featuresSection: {
    gap: 12,
    marginBottom: 32,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIconCyan: {
    backgroundColor: '#CFFAFE',
  },
  featureIconOrange: {
    backgroundColor: '#FED7AA',
  },
  featureIconGreen: {
    backgroundColor: '#D1FAE5',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },

  // Footer
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    textAlign: 'center',
  },
});
