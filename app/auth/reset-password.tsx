import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Eye, EyeOff, BriefcaseMedical } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Input from '@/components/ui/Input';
import Logo from '@/components/ui/Logo';
import PasswordStrengthIndicator from '@/components/ui/PasswordStrengthIndicator';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Check if we have the necessary parameters from the email link
    const { access_token, refresh_token } = params;
    
    if (access_token && refresh_token) {
      // Set the session with the tokens from the email link
      supabase.auth.setSession({
        access_token: access_token as string,
        refresh_token: refresh_token as string
      }).catch(error => {
        // Error setting session
        Alert.alert(
          'Fehler',
          'Der Reset-Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.',
          [
            {
              text: 'Zurück zur Anmeldung',
              onPress: () => router.replace('/auth/login'),
            },
          ]
        );
      });
    }
  }, [params, router]);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Fehler', 'Bitte füllen Sie alle Felder aus.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Fehler', 'Die Passwörter stimmen nicht überein.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Fehler', 'Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setResetSuccess(true);
      
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
    } catch (error: any) {
      let errorMessage = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
      
      if (error.message?.includes('New password should be different')) {
        errorMessage = 'Das neue Passwort muss sich vom aktuellen Passwort unterscheiden.';
      } else if (error.message?.includes('Password should be')) {
        errorMessage = 'Das Passwort erfüllt nicht die Sicherheitsanforderungen.';
      }
      
      Alert.alert('Fehler', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/auth/login');
  };

  if (resetSuccess) {
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
          >
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#D4A574', '#C19A6B']}
                  style={styles.logoGradient}
                >
                  <BriefcaseMedical size={40} color="#FFFFFF" strokeWidth={2} />
                </LinearGradient>
              </View>
              <Text style={styles.brandName}>KP MED</Text>
              <Text style={styles.brandTagline}>Professional Medical Training</Text>
            </View>

            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <View style={styles.successIconCircle}>
                <Lock size={48} color="#10b981" strokeWidth={2} />
              </View>
            </View>

            {/* Success Message */}
            <View style={styles.successMessageSection}>
              <Text style={styles.successTitle}>Passwort erfolgreich geändert!</Text>
              <Text style={styles.successSubtitle}>
                Ihr Passwort wurde erfolgreich aktualisiert.
              </Text>
              <Text style={styles.instructions}>
                Sie werden in {countdown} Sekunden automatisch zur Anmeldung weitergeleitet.
              </Text>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleBackToLogin}
              activeOpacity={0.8}
              style={styles.buttonSpacing}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                <Text style={styles.loginButtonText}>Zur Anmeldung</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

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
                <BriefcaseMedical size={40} color="#FFFFFF" strokeWidth={2} />
              </LinearGradient>
            </View>
            <Text style={styles.brandName}>KP MED</Text>
            <Text style={styles.brandTagline}>Professional Medical Training</Text>
          </View>

          {/* Welcome Message */}
          <View style={styles.welcomeSection}>
            <Text style={styles.title}>Neues Passwort erstellen</Text>
            <Text style={styles.subtitle}>
              Erstellen Sie ein sicheres neues Passwort für Ihr Konto.
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View>
              <Input
                label="Neues Passwort"
                placeholder="Neues Passwort eingeben"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                autoFocus={true}
                leftIcon={<Lock size={20} color="#94A3B8" />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ?
                      <EyeOff size={20} color="#94A3B8" /> :
                      <Eye size={20} color="#94A3B8" />
                    }
                  </TouchableOpacity>
                }
                editable={!loading}
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
              onChangeText={setConfirmPassword}
              leftIcon={<Lock size={20} color="#94A3B8" />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ?
                    <EyeOff size={20} color="#94A3B8" /> :
                    <Eye size={20} color="#94A3B8" />
                  }
                </TouchableOpacity>
              }
              editable={!loading}
              error={
                confirmPassword.length > 0 && password !== confirmPassword
                  ? 'Passwörter stimmen nicht überein'
                  : ''
              }
            />

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
                <Text style={styles.resetButtonText}>
                  {loading ? 'Wird aktualisiert...' : 'Passwort aktualisieren'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleBackToLogin}
            >
              <Text style={styles.cancelButtonText}>Zurück zur Anmeldung</Text>
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
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
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
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  instructions: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
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
});