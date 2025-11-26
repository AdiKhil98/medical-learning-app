import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock, Eye, EyeOff, Shield } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';

export default function PasswortAendernScreen() {
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePasswords = () => {
    if (!currentPassword.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie Ihr aktuelles Passwort ein.');
      return false;
    }

    if (!newPassword.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie ein neues Passwort ein.');
      return false;
    }

    if (newPassword.length < 6) {
      Alert.alert('Fehler', 'Das neue Passwort muss mindestens 6 Zeichen lang sein.');
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Fehler', 'Die Passwort-Bestätigung stimmt nicht überein.');
      return false;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Fehler', 'Das neue Passwort muss sich vom aktuellen Passwort unterscheiden.');
      return false;
    }

    return true;
  };

  const handlePasswordChange = async () => {
    if (!validatePasswords()) return;

    try {
      setLoading(true);

      // First, verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });

      if (signInError) {
        Alert.alert('Fehler', 'Das aktuelle Passwort ist nicht korrekt.');
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert(
        'Passwort geändert',
        'Ihr Passwort wurde erfolgreich geändert. Sie bleiben angemeldet.',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error: any) {
      logger.error('Error changing password:', error);
      
      let errorMessage = 'Passwort konnte nicht geändert werden.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Das aktuelle Passwort ist nicht korrekt.';
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = 'Das neue Passwort entspricht nicht den Sicherheitsanforderungen.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Fehler', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: '', color: '#E5E7EB' };
    if (password.length < 6) return { strength: 1, text: 'Schwach', color: '#EF4444' };
    if (password.length < 8) return { strength: 2, text: 'Mittel', color: '#F59E0B' };
    if (password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { strength: 4, text: 'Sehr stark', color: '#22C55E' };
    }
    return { strength: 3, text: 'Stark', color: '#10B981' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const gradientColors = isDarkMode
    ? ['#1F2937', '#111827', '#0F172A']
    : ['#F8F3E8', '#FBEEEC', '#FFFFFF']; // White Linen to light coral to white

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      marginRight: 16,
    },
    backText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.primary,
      marginLeft: 4,
    },
    title: {
      fontFamily: 'Inter-Bold',
      fontSize: 20,
      color: colors.text,
      flex: 1,
    },
    content: {
      flex: 1,
      padding: 24,
    },
    subtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 24,
      lineHeight: 24,
    },
    formCard: {
      marginBottom: 24,
      backgroundColor: colors.card,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    formTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 18,
      color: colors.text,
      marginBottom: 20,
    },
    passwordStrengthContainer: {
      marginTop: 8,
      marginBottom: 16,
    },
    passwordStrengthBar: {
      height: 4,
      backgroundColor: '#E5E7EB',
      borderRadius: 2,
      marginBottom: 8,
    },
    passwordStrengthFill: {
      height: '100%',
      borderRadius: 2,
    },
    passwordStrengthText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      textAlign: 'right',
    },
    changeButton: {
      marginTop: 8,
      borderRadius: 12,
      height: 56,
    },
    securityCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
      />
      
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={dynamicStyles.backButton}
        >
          <ChevronLeft size={24} color={colors.primary} />
          <Text style={dynamicStyles.backText}>Zurück</Text>
        </TouchableOpacity>
        <Text style={dynamicStyles.title}>Passwort ändern</Text>
      </View>

      <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
        <Text style={dynamicStyles.subtitle}>
          Ändern Sie Ihr Passwort für mehr Sicherheit. Verwenden Sie ein starkes Passwort mit mindestens 8 Zeichen.
        </Text>

        <Card style={dynamicStyles.formCard}>
          <Text style={dynamicStyles.formTitle}>Passwort aktualisieren</Text>
          
          <Input
            label="Aktuelles Passwort"
            placeholder="Geben Sie Ihr aktuelles Passwort ein"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrentPassword}
            leftIcon={<Lock size={20} color={colors.textSecondary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                {showCurrentPassword ? 
                  <EyeOff size={20} color={colors.textSecondary} /> : 
                  <Eye size={20} color={colors.textSecondary} />
                }
              </TouchableOpacity>
            }
          />

          <Input
            label="Neues Passwort"
            placeholder="Geben Sie ein neues Passwort ein"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            leftIcon={<Lock size={20} color={colors.textSecondary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                {showNewPassword ? 
                  <EyeOff size={20} color={colors.textSecondary} /> : 
                  <Eye size={20} color={colors.textSecondary} />
                }
              </TouchableOpacity>
            }
          />

          {newPassword.length > 0 && (
            <View style={dynamicStyles.passwordStrengthContainer}>
              <View style={dynamicStyles.passwordStrengthBar}>
                <View 
                  style={[
                    dynamicStyles.passwordStrengthFill,
                    { 
                      width: `${(passwordStrength.strength / 4) * 100}%`,
                      backgroundColor: passwordStrength.color 
                    }
                  ]} 
                />
              </View>
              <Text style={[dynamicStyles.passwordStrengthText, { color: passwordStrength.color }]}>
                {passwordStrength.text}
              </Text>
            </View>
          )}

          <Input
            label="Neues Passwort bestätigen"
            placeholder="Bestätigen Sie Ihr neues Passwort"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            leftIcon={<Lock size={20} color={colors.textSecondary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? 
                  <EyeOff size={20} color={colors.textSecondary} /> : 
                  <Eye size={20} color={colors.textSecondary} />
                }
              </TouchableOpacity>
            }
          />

          <Button
            title={loading ? "Wird geändert..." : "Passwort ändern"}
            onPress={handlePasswordChange}
            loading={loading}
            disabled={loading}
            icon={<Shield size={20} color="#FFFFFF" />}
            style={dynamicStyles.changeButton}
          />
        </Card>

        <Card style={dynamicStyles.securityCard}>
          <View style={styles.securitySection}>
            <Text style={styles.securityTitle}>🔒 Sicherheitshinweise</Text>
            <Text style={styles.securityText}>
              • Verwenden Sie ein einzigartiges Passwort, das Sie nirgendwo anders nutzen
            </Text>
            <Text style={styles.securityText}>
              • Kombinieren Sie Groß- und Kleinbuchstaben, Zahlen und Sonderzeichen
            </Text>
            <Text style={styles.securityText}>
              • Vermeiden Sie persönliche Informationen wie Namen oder Geburtsdaten
            </Text>
            <Text style={styles.securityText}>
              • Ändern Sie Ihr Passwort regelmäßig für optimale Sicherheit
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  securitySection: {
    padding: 4,
  },
  securityTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#22C55E',
    marginBottom: 12,
  },
  securityText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
});