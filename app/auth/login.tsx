 import React, { useState, useEffect } from 'react';
  import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Platform
  } from 'react-native';
  import { useRouter, Link } from 'expo-router';
  import { LinearGradient } from 'expo-linear-gradient';
  import { Mail, Lock, Eye, EyeOff, BriefcaseMedical } from 'lucide-react-native';
  import { useAuth } from '@/contexts/AuthContext';
  import Input from '@/components/ui/Input';
  import Logo from '@/components/ui/Logo';

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
      setLoginError(''); // Clear login error when user types
      
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

      // Check for email validation errors
      if (!validateEmailFormat(email)) {
        setEmailTouched(true);
        setEmailError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
        return;
      }

      const startTime = performance.now();
      
      setLoading(true);
      try {
        const loginStartTime = performance.now();
        
        await signIn(email.trim(), password);
        
        const loginEndTime = performance.now();

        // Success - the AuthContext will handle navigation via useEffect

        // Clear form
        setEmail('');
        setPassword('');

      } catch (error: any) {
        const errorTime = performance.now();
        
        // Set red error message instead of Alert
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
        const finalTime = performance.now();
        setLoading(false);
      }
    };


    return (
      <View style={styles.gradientBackground}>
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.loginCard}>
              <View style={styles.header}>
                <View style={styles.logoSection}>
                  <Logo size="large" textColor="#1F2937" variant="premium" />
                  <BriefcaseMedical size={32} color="#B87E70" style={styles.caduceusIcon} />
                </View>
                <Text style={styles.welcomeTitle}>Willkommen zurück</Text>
                <Text style={styles.subtitle}>
                  Melden Sie sich bei Ihrer medizinischen Lernplattform an
                </Text>
              </View>

              <View style={styles.form}>
                <Input
                  label="E-Mail"
                  placeholder="E-Mail eingeben"
                  value={email}
                  onChangeText={handleEmailChange}
                  onBlur={handleEmailBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus={true}
                  leftIcon={<Mail size={20} color="#6B7280" />}
                  editable={!loading}
                  containerStyle={styles.inputContainer}
                  error={emailError}
                />

                <Input
                  label="Passwort"
                  placeholder="Passwort eingeben"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setLoginError(''); // Clear login error when user types
                  }}
                  secureTextEntry={!showPassword}
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
                />

                {loginError ? (
                  <Text style={styles.loginErrorText}>{loginError}</Text>
                ) : null}

                <View style={styles.optionsRow}>
                  <TouchableOpacity
                    style={styles.rememberRow}
                    onPress={() => setRememberMe(!rememberMe)}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.rememberText}>Für 30 Tage merken</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
                    <Text style={styles.forgotPassword}>Passwort vergessen?</Text>
                  </TouchableOpacity>
                </View>

                <LinearGradient
                  colors={['#B8755C', '#E2827F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.signInButtonGradient}
                >
                  <TouchableOpacity
                    style={styles.signInButton}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    <Text style={styles.signInButtonText}>
                      {loading ? 'Wird angemeldet...' : 'Anmelden'}
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>


                <View style={styles.signUpRow}>
                  <Text style={styles.signUpText}>Noch kein Konto? </Text>
                  <Link href="/auth/register" asChild>
                    <TouchableOpacity>
                      <Text style={styles.signUpLink}>Registrieren</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const styles = StyleSheet.create({
    gradientBackground: {
      flex: 1,
      backgroundColor: '#FFFFFF',
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
    loginCard: {
      backgroundColor: '#F9F6F2',
      borderRadius: 24,
      padding: 32,
      marginHorizontal: 'auto',
      maxWidth: 440,
      width: '100%',
      alignSelf: 'center',
      shadowColor: 'rgba(181,87,64,0.15)',
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 8,
      borderWidth: 1,
      borderColor: 'rgba(184, 126, 112, 0.2)',
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
      color: '#B8755C',
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
    form: {
      gap: 20,
    },
    inputContainer: {
      marginBottom: 4,
    },
    optionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    rememberRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: '#D1D5DB',
      borderRadius: 4,
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#B87E70',
      borderColor: '#B87E70',
    },
    checkmark: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
    rememberText: {
      fontSize: 14,
      color: '#374151',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    forgotPassword: {
      fontSize: 14,
      color: '#B87E70',
      fontWeight: '500',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    signInButtonGradient: {
      borderRadius: 12,
      marginTop: 8,
      shadowColor: 'rgba(184, 117, 92, 0.4)',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    signInButton: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signInButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    signUpRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 24,
    },
    signUpText: {
      fontSize: 14,
      color: '#6B7280',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    signUpLink: {
      fontSize: 14,
      color: '#B87E70',
      fontWeight: '600',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    loginErrorText: {
      fontSize: 14,
      color: '#EF4444',
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 8,
      paddingHorizontal: 16,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
  });
