import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  Image,
  Dimensions,
  Platform
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff, Star, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const isDesktop = width >= 1024;

const testimonials = [
  {
    quote: "Diese Plattform hat mir geholfen, meine Kenntnisprüfung mit Vertrauen zu bestehen. Die KI-gestützten Simulationen waren unschätzbar wertvoll für meine Vorbereitung.",
    author: "Dr. Sarah Weber",
    role: "Allgemeinmedizin",
    rating: 5,
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=600&fit=crop&crop=face"
  },
  {
    quote: "Die Fachsprachprüfung schien unmöglich, aber mit den strukturierten Übungen hier habe ich sie beim ersten Versuch geschafft.",
    author: "Dr. Ahmed Hassan",
    role: "Innere Medizin", 
    rating: 5,
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=600&fit=crop&crop=face"
  },
  {
    quote: "Hervorragende Vorbereitung auf beide Prüfungen. Die Simulationen sind realitätsnah und sehr hilfreich.",
    author: "Dr. Maria González",
    role: "Pädiatrie",
    rating: 5,
    image: "https://images.unsplash.com/photo-1594824804732-ca8db29ac2e3?w=400&h=600&fit=crop&crop=face"
  }
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const router = useRouter();
  const { signIn, session } = useAuth();
  
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
    // TODO: Implement Google Sign-In
    Alert.alert('Info', 'Google-Anmeldung wird bald verfügbar sein');
  };

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        fill={i < rating ? '#FFD700' : 'transparent'}
        color={i < rating ? '#FFD700' : '#E5E5E5'}
      />
    ));
  };

  if (isTablet || isDesktop) {
    // Split-screen layout for tablets and desktop
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.splitContainer}>
          {/* Left Panel - Login Form */}
          <View style={styles.leftPanel}>
            <ScrollView contentContainerStyle={styles.leftContent} showsVerticalScrollIndicator={false}>
              <View style={styles.loginForm}>
                <View style={styles.header}>
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
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    leftIcon={<Mail size={20} color="#9CA3AF" />}
                    editable={!loading}
                  />

                  <Input
                    label="Passwort"
                    placeholder="Passwort eingeben"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    leftIcon={<Lock size={20} color="#9CA3AF" />}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? 
                          <EyeOff size={20} color="#9CA3AF" /> : 
                          <Eye size={20} color="#9CA3AF" />
                        }
                      </TouchableOpacity>
                    }
                    editable={!loading}
                  />

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
                    
                    <TouchableOpacity>
                      <Text style={styles.forgotPassword}>Passwort vergessen?</Text>
                    </TouchableOpacity>
                  </View>

                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
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

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>oder</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity 
                    style={styles.googleButton}
                    onPress={handleGoogleSignIn}
                  >
                    <Image 
                      source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                      style={styles.googleLogo}
                    />
                    <Text style={styles.googleButtonText}>Mit Google anmelden</Text>
                  </TouchableOpacity>

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
          </View>

          {/* Right Panel - Hero Section */}
          <View style={styles.rightPanel}>
            <Image 
              source={{ uri: testimonials[currentTestimonial].image }}
              style={styles.heroImage}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
              style={styles.heroOverlay}
            >
              <View style={styles.testimonialContainer}>
                <View style={styles.testimonialNavigation}>
                  <TouchableOpacity 
                    style={styles.navButton}
                    onPress={prevTestimonial}
                  >
                    <ChevronLeft size={24} color="white" />
                  </TouchableOpacity>
                  
                  <View style={styles.testimonialContent}>
                    <View style={styles.ratingContainer}>
                      {renderStars(testimonials[currentTestimonial].rating)}
                    </View>
                    
                    <Text style={styles.testimonialQuote}>
                      "{testimonials[currentTestimonial].quote}"
                    </Text>
                    
                    <View style={styles.testimonialAuthor}>
                      <Text style={styles.authorName}>
                        {testimonials[currentTestimonial].author}
                      </Text>
                      <Text style={styles.authorRole}>
                        {testimonials[currentTestimonial].role}
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.navButton}
                    onPress={nextTestimonial}
                  >
                    <ChevronRight size={24} color="white" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.indicators}>
                  {testimonials.map((_, index) => (
                    <View 
                      key={index}
                      style={[
                        styles.indicator,
                        index === currentTestimonial && styles.activeIndicator
                      ]}
                    />
                  ))}
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Mobile layout (original simplified design)
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.mobileContent} showsVerticalScrollIndicator={false}>
        <View style={styles.mobileForm}>
          <View style={styles.header}>
            <Text style={styles.welcomeTitle}>Willkommen zurück</Text>
            <Text style={styles.subtitle}>
              Kenntnisprüfung & Fachsprachprüfung Vorbereitung
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="E-Mail"
              placeholder="E-Mail eingeben"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Mail size={20} color="#9CA3AF" />}
              editable={!loading}
            />

            <Input
              label="Passwort"
              placeholder="Passwort eingeben"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              leftIcon={<Lock size={20} color="#9CA3AF" />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? 
                    <EyeOff size={20} color="#9CA3AF" /> : 
                    <Eye size={20} color="#9CA3AF" />
                  }
                </TouchableOpacity>
              }
              editable={!loading}
            />

            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  splitContainer: {
    flex: 1,
    flexDirection: isTablet || isDesktop ? 'row' : 'column',
  },
  leftPanel: {
    flex: isDesktop ? 0.4 : 0.5,
    backgroundColor: '#ffffff',
    padding: 24,
    justifyContent: 'center',
  },
  rightPanel: {
    flex: isDesktop ? 0.6 : 0.5,
    position: 'relative',
  },
  leftContent: {
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 400,
    alignSelf: 'center',
  },
  loginForm: {
    width: '100%',
  },
  header: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  form: {
    gap: 20,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -8,
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
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberText: {
    fontSize: 14,
    color: '#374151',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  gradientButton: {
    borderRadius: 8,
    marginTop: 8,
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
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  googleLogo: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  signUpText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signUpLink: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    padding: 32,
  },
  testimonialContainer: {
    alignItems: 'center',
  },
  testimonialNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  testimonialContent: {
    flex: 1,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 4,
  },
  testimonialQuote: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  testimonialAuthor: {
    alignItems: 'center',
  },
  authorName: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginBottom: 4,
  },
  authorRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  indicators: {
    flexDirection: 'row',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  activeIndicator: {
    backgroundColor: 'white',
  },
  // Mobile styles
  mobileContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  mobileForm: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
});