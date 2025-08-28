 import React, { useState } from 'react';
  import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ScrollView, Platform } from 'react-native';
  import { Link, router } from 'expo-router';
  import { Lock, Mail, User, Eye, EyeOff, BriefcaseMedical } from 'lucide-react-native';
  import { useAuth } from '@/contexts/AuthContext';
  import Input from '@/components/ui/Input';
  import Logo from '@/components/ui/Logo';
  import { LinearGradient } from 'expo-linear-gradient';

  export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { signUp } = useAuth();

    const handleRegister = async () => {
      if (!name || !email || !password || !confirmPassword) {
        Alert.alert('Fehler', 'Bitte füllen Sie alle Felder aus.');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Fehler', 'Die Passwörter stimmen nicht überein.');
        return;
      }

      setLoading(true);
      try {
        await signUp(email, password, name);
        router.replace('/(tabs)');
      } catch (error: any) {
        Alert.alert('Registrierungsfehler', error.message || 'Ein Fehler ist aufgetreten.');
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
                />

                <Input
                  label="E-Mail"
                  placeholder="E-Mail eingeben"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  leftIcon={<Mail size={20} color="#6B7280" />}
                  editable={!loading}
                  containerStyle={styles.inputContainer}
                />

                <Input
                  label="Passwort"
                  placeholder="Passwort eingeben"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
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
                  containerStyle={styles.inputContainer}
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
