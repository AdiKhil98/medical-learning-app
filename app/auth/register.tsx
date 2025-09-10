 import React, { useState } from 'react';
  import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ScrollView, Platform } from 'react-native';
  import { Link, router } from 'expo-router';
  import { Lock, Mail, User, Eye, EyeOff, BriefcaseMedical } from 'lucide-react-native';
  import { useAuth } from '@/contexts/AuthContext';
  import Input from '@/components/ui/Input';
  import Logo from '@/components/ui/Logo';
  import PasswordStrengthIndicator from '@/components/ui/PasswordStrengthIndicator';
  import { LinearGradient } from 'expo-linear-gradient';

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
    const { signUp } = useAuth();

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

      setLoading(true);
      try {
        await signUp(email, password, name);
        // If we get here without error, user was signed up successfully but needs verification
        router.replace('/(tabs)');
      } catch (error: any) {
        if (error.message === 'VERIFICATION_REQUIRED') {
          // Redirect to verification screen
          Alert.alert(
            'Registration Successful!',
            'Please check your email and click the verification link to activate your account.',
            [
              {
                text: 'Check Email',
                onPress: () => router.push({
                  pathname: '/auth/verify-email',
                  params: { email: email.toLowerCase().trim() }
                }),
              },
            ]
          );
        } else {
          Alert.alert('Registrierungsfehler', error.message || 'Ein Fehler ist aufgetreten.');
        }
      } finally {
        setLoading(false);
      }
    };

    const handleGoogleSignUp = async () => {
      // TODO: Implement Google Sign-Up
      Alert.alert('Info', 'Google-Registrierung wird bald verfügbar sein');
    };

    return (
      <LinearGradient
        colors={['#ffffff', '#f0f9f0']}
        style={styles.gradientBackground}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.registerCard}>
              <View style={styles.header}>
                <View style={styles.logoSection}>
                  <Logo size="large" textColor="#1F2937" />
                  <BriefcaseMedical size={32} color="#10b981" style={styles.caduceusIcon} />
                </View>
                <Text style={styles.welcomeTitle}>Konto erstellen</Text>
                <Text style={styles.subtitle}>
                  Erstellen Sie ein Konto, um mit dem Lernen zu beginnen
                </Text>
                <Text style={styles.platformText}>
                  Kenntnisprüfung & Fachsprachprüfung Vorbereitung
                </Text>
              </View>

              <View style={styles.form}>
                <Input
                  label="Name"
                  placeholder="Vollständiger Name eingeben"
                  value={name}
                  onChangeText={setName}
                  leftIcon={<User size={20} color="#6B7280" />}
                  editable={!loading}
                  containerStyle={styles.inputContainer}
                  autoFocus={true}
                />

                <Input
                  label="E-Mail"
                  placeholder="E-Mail eingeben"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={handleEmailChange}
                  onBlur={handleEmailBlur}
                  leftIcon={<Mail size={20} color="#6B7280" />}
                  editable={!loading}
                  containerStyle={styles.inputContainer}
                  error={emailError}
                />

                <View>
                  <Input
                    label="Passwort"
                    placeholder="Passwort eingeben"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={handlePasswordChange}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    leftIcon={<Lock size={20} color="#6B7280" />}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ?
                          <EyeOff size={20} color="#6B7280" /> :
                          <Eye size={20} color="#6B7280" />
                        }
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

                <Input
                  label="Passwort bestätigen"
                  placeholder="Passwort wiederholen"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  leftIcon={<Lock size={20} color="#6B7280" />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ?
                        <EyeOff size={20} color="#6B7280" /> :
                        <Eye size={20} color="#6B7280" />
                      }
                    </TouchableOpacity>
                  }
                  editable={!loading}
                  containerStyle={styles.inputContainer}
                  error={confirmPasswordError}
                />

                <LinearGradient
                  colors={['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.registerButtonGradient}
                >
                  <TouchableOpacity
                    style={styles.registerButton}
                    onPress={handleRegister}
                    disabled={loading}
                  >
                    <Text style={styles.registerButtonText}>
                      {loading ? 'Wird erstellt...' : 'Registrieren'}
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>oder</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={handleGoogleSignUp}
                  disabled={loading}
                >
                  <Text style={styles.googleButtonText}>
                    Mit Google registrieren
                  </Text>
                </TouchableOpacity>

                <View style={styles.signInRow}>
                  <Text style={styles.signInText}>Bereits ein Konto? </Text>
                  <Link href="/auth/login" asChild>
                    <TouchableOpacity>
                      <Text style={styles.signInLink}>Anmelden</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>
            </View>
          </ScrollView>
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
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
      minHeight: '100%',
    },
    registerCard: {
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
      marginBottom: 32,
      alignItems: 'center',
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
    welcomeTitle: {
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
      marginBottom: 4,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    platformText: {
      fontSize: 14,
      color: '#10b981',
      fontWeight: '500',
      textAlign: 'center',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    form: {
      gap: 20,
    },
    inputContainer: {
      marginBottom: 4,
    },
    registerButtonGradient: {
      borderRadius: 12,
      marginTop: 8,
      shadowColor: '#10b981',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    registerButton: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    registerButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    signInRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 24,
    },
    signInText: {
      fontSize: 14,
      color: '#6B7280',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    signInLink: {
      fontSize: 14,
      color: '#10b981',
      fontWeight: '600',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: '#E5E7EB',
    },
    dividerText: {
      paddingHorizontal: 16,
      fontSize: 14,
      color: '#6B7280',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    googleButton: {
      backgroundColor: 'white',
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    googleButtonText: {
      color: '#374151',
      fontSize: 16,
      fontWeight: '500',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
  });
