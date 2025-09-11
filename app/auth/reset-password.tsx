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
      <LinearGradient
        colors={['#ffffff', '#f0f9f0']}
        style={styles.gradientBackground}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.successCard}>
              <View style={styles.header}>
                <View style={styles.logoSection}>
                  <Logo size="large" textColor="#1F2937" />
                  <BriefcaseMedical size={32} color="#10b981" style={styles.caduceusIcon} />
                </View>
                
                <View style={styles.iconContainer}>
                  <Lock size={64} color="#10b981" />
                </View>

                <Text style={styles.title}>Passwort erfolgreich geändert!</Text>
                <Text style={styles.subtitle}>
                  Ihr Passwort wurde erfolgreich aktualisiert.
                </Text>
                <Text style={styles.instructions}>
                  Sie werden in {countdown} Sekunden automatisch zur Anmeldung weitergeleitet.
                </Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleBackToLogin}
                >
                  <Text style={styles.loginButtonText}>Zur Anmeldung</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

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
          <View style={styles.resetCard}>
            <View style={styles.header}>
              <View style={styles.logoSection}>
                <Logo size="large" textColor="#1F2937" />
                <BriefcaseMedical size={32} color="#10b981" style={styles.caduceusIcon} />
              </View>

              <Text style={styles.title}>Neues Passwort erstellen</Text>
              <Text style={styles.subtitle}>
                Erstellen Sie ein sicheres neues Passwort für Ihr Konto.
              </Text>
            </View>

            <View style={styles.form}>
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
                error={
                  confirmPassword.length > 0 && password !== confirmPassword
                    ? 'Passwörter stimmen nicht überein'
                    : ''
                }
              />

              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.resetButtonGradient}
              >
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  <Text style={styles.resetButtonText}>
                    {loading ? 'Wird aktualisiert...' : 'Passwort aktualisieren'}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleBackToLogin}
              >
                <Text style={styles.cancelButtonText}>Zurück zur Anmeldung</Text>
              </TouchableOpacity>
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
  resetCard: {
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  form: {
    gap: 20,
  },
  resetButtonGradient: {
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
  resetButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  instructions: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginTop: 8,
  },
  actions: {
    marginTop: 24,
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