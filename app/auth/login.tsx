import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  Platform,
  Animated,
  Dimensions
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Input from '@/components/ui/Input';

const { width, height } = Dimensions.get('window');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const router = useRouter();
  const { signIn, session } = useAuth();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const beamAnim = useRef(new Animated.Value(-width)).current;
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  
  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      router.replace('/(tabs)');
    }
  }, [session, router]);

  // Initialize animations
  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(cardScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();

    // Start continuous animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        })
      ])
    ).start();

    // Subtle rotation animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        })
      ])
    ).start();

    // Traveling beam effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(beamAnim, {
          toValue: width,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(beamAnim, {
          toValue: -width,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(2000)
      ])
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting login with:', email);
      await signIn(email.trim(), password);
      
      // Success - the AuthContext will handle navigation via useEffect
      console.log('Login successful!');
      
      // Clear form
      setEmail('');
      setPassword('');
      
    } catch (error: any) {
      console.log('Login error:', error.message);
      Alert.alert('Anmeldung fehlgeschlagen', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    Alert.alert('Info', 'Google-Anmeldung wird bald verfügbar sein');
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '2deg']
  });

  return (
    <LinearGradient
      colors={['#ffffff', '#f0f8ff', '#e6f3ff', '#3b82f6']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.gradientBackground}
    >
      <SafeAreaView style={styles.container}>
        {/* Animated background elements */}
        <Animated.View style={[styles.backgroundGlow1, { opacity: glowAnim, transform: [{ scale: pulseAnim }] }]} />
        <Animated.View style={[styles.backgroundGlow2, { opacity: glowAnim, transform: [{ scale: pulseAnim }] }]} />
        <Animated.View style={[styles.backgroundGlow3, { opacity: glowAnim }]} />
        
        {/* Floating particles */}
        <Animated.View style={[styles.particle1, { transform: [{ translateY: slideAnim }] }]} />
        <Animated.View style={[styles.particle2, { transform: [{ translateY: slideAnim }] }]} />
        <Animated.View style={[styles.particle3, { transform: [{ translateY: slideAnim }] }]} />

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            style={[
              styles.loginCard, 
              { 
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: cardScaleAnim },
                  { rotate: rotation }
                ]
              }
            ]}
          >
            {/* Traveling light beam */}
            <Animated.View 
              style={[
                styles.travelingBeam,
                { transform: [{ translateX: beamAnim }] }
              ]} 
            />

            {/* Card glow border */}
            <Animated.View style={[styles.cardGlow, { opacity: glowAnim }]} />

            <View style={styles.cardContent}>
              <View style={styles.header}>
                {/* Logo with glow */}
                <Animated.View style={[styles.logoContainer, { transform: [{ scale: cardScaleAnim }] }]}>
                  <LinearGradient
                    colors={['#3b82f6', '#1e40af']}
                    style={styles.logoGradient}
                  >
                    <Text style={styles.logoText}>KP</Text>
                  </LinearGradient>
                  <Animated.View style={[styles.logoGlow, { opacity: glowAnim }]} />
                </Animated.View>

                <Animated.Text 
                  style={[styles.welcomeTitle, { opacity: fadeAnim }]}
                >
                  Willkommen zurück
                </Animated.Text>
                <Animated.Text 
                  style={[styles.subtitle, { opacity: fadeAnim }]}
                >
                  Melden Sie sich bei Ihrer medizinischen Lernplattform an
                </Animated.Text>
                <Animated.Text 
                  style={[styles.platformText, { opacity: fadeAnim }]}
                >
                  Kenntnisprüfung & Fachsprachprüfung Vorbereitung
                </Animated.Text>
              </View>

              <View style={styles.form}>
                {/* Email Input with Focus Effect */}
                <Animated.View style={[styles.inputWrapper, { opacity: fadeAnim }]}>
                  <Input
                    label="E-Mail"
                    placeholder="E-Mail eingeben"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    leftIcon={<Mail size={20} color={focusedInput === 'email' ? "#3b82f6" : "#6B7280"} />}
                    editable={!loading}
                    containerStyle={styles.inputContainer}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    style={[
                      focusedInput === 'email' && styles.focusedInput
                    ]}
                  />
                  {focusedInput === 'email' && (
                    <Animated.View style={[styles.inputGlow, { opacity: glowAnim }]} />
                  )}
                </Animated.View>

                {/* Password Input with Focus Effect */}
                <Animated.View style={[styles.inputWrapper, { opacity: fadeAnim }]}>
                  <Input
                    label="Passwort"
                    placeholder="Passwort eingeben"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    leftIcon={<Lock size={20} color={focusedInput === 'password' ? "#3b82f6" : "#6B7280"} />}
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
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    style={[
                      focusedInput === 'password' && styles.focusedInput
                    ]}
                  />
                  {focusedInput === 'password' && (
                    <Animated.View style={[styles.inputGlow, { opacity: glowAnim }]} />
                  )}
                </Animated.View>

                {/* Options Row */}
                <Animated.View style={[styles.optionsRow, { opacity: fadeAnim }]}>
                  <TouchableOpacity 
                    style={styles.rememberRow}
                    onPress={() => setRememberMe(!rememberMe)}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.rememberText}>Für 30 Tage merken</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity>
                    <Text style={styles.forgotPassword}>Passwort vergessen?</Text>
                  </TouchableOpacity>
                </Animated.View>

                {/* Animated Sign In Button */}
                <Animated.View style={{ opacity: fadeAnim }}>
                  <TouchableOpacity
                    style={styles.signInButtonContainer}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={['#3b82f6', '#1e40af']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.signInButtonGradient}
                    >
                      <View style={styles.signInButton}>
                        {loading ? (
                          <Animated.View style={[styles.loadingSpinner, { transform: [{ rotate: '360deg' }] }]}>
                            <View style={styles.spinner} />
                          </Animated.View>
                        ) : (
                          <View style={styles.buttonContent}>
                            <Text style={styles.signInButtonText}>Anmelden</Text>
                            <ArrowRight size={16} color="#ffffff" style={styles.arrowIcon} />
                          </View>
                        )}
                      </View>
                      
                      {/* Button shine effect */}
                      <Animated.View 
                        style={[
                          styles.buttonShine,
                          { transform: [{ translateX: beamAnim }] }
                        ]} 
                      />
                    </LinearGradient>
                    <Animated.View style={[styles.buttonGlow, { opacity: glowAnim }]} />
                  </TouchableOpacity>
                </Animated.View>

                {/* Sign Up Row */}
                <Animated.View style={[styles.signUpRow, { opacity: fadeAnim }]}>
                  <Text style={styles.signUpText}>Noch kein Konto? </Text>
                  <Link href="/auth/register" asChild>
                    <TouchableOpacity>
                      <Text style={styles.signUpLink}>Registrieren</Text>
                    </TouchableOpacity>
                  </Link>
                </Animated.View>
              </View>
            </View>
          </Animated.View>
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
  // Background effects
  backgroundGlow1: {
    position: 'absolute',
    top: -100,
    left: -50,
    width: 200,
    height: 200,
    backgroundColor: '#3b82f6',
    borderRadius: 100,
    opacity: 0.1,
  },
  backgroundGlow2: {
    position: 'absolute',
    bottom: -100,
    right: -50,
    width: 300,
    height: 300,
    backgroundColor: '#1e40af',
    borderRadius: 150,
    opacity: 0.08,
  },
  backgroundGlow3: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 400,
    height: 400,
    backgroundColor: '#60a5fa',
    borderRadius: 200,
    opacity: 0.05,
    transform: [{ translateX: -200 }, { translateY: -200 }],
  },
  // Floating particles
  particle1: {
    position: 'absolute',
    top: 100,
    left: 50,
    width: 4,
    height: 4,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
    opacity: 0.6,
  },
  particle2: {
    position: 'absolute',
    top: 200,
    right: 80,
    width: 6,
    height: 6,
    backgroundColor: '#1e40af',
    borderRadius: 3,
    opacity: 0.4,
  },
  particle3: {
    position: 'absolute',
    bottom: 150,
    left: 100,
    width: 3,
    height: 3,
    backgroundColor: '#60a5fa',
    borderRadius: 1.5,
    opacity: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    minHeight: height,
  },
  loginCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    marginHorizontal: 'auto',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    overflow: 'hidden',
  },
  travelingBeam: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#3b82f6',
    opacity: 0.6,
  },
  cardGlow: {
    position: 'absolute',
    inset: -2,
    borderRadius: 26,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3b82f6',
    opacity: 0.3,
  },
  cardContent: {
    padding: 32,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  logoGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logoGlow: {
    position: 'absolute',
    inset: -5,
    borderRadius: 35,
    backgroundColor: '#3b82f6',
    opacity: 0.2,
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
    color: '#3b82f6',
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  form: {
    gap: 20,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputContainer: {
    marginBottom: 4,
  },
  focusedInput: {
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  inputGlow: {
    position: 'absolute',
    inset: -2,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
    opacity: 0.5,
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
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
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
    color: '#3b82f6',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  signInButtonContainer: {
    position: 'relative',
    marginTop: 8,
  },
  signInButtonGradient: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  signInButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  arrowIcon: {
    marginLeft: 4,
  },
  buttonShine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonGlow: {
    position: 'absolute',
    inset: -3,
    borderRadius: 19,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3b82f6',
    opacity: 0.4,
  },
  loadingSpinner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: '#ffffff',
    borderRadius: 10,
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
    color: '#3b82f6',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});