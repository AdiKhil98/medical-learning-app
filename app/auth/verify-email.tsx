import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, RefreshCw, BriefcaseMedical } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/ui/Logo';

export default function VerifyEmail() {
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Listen for auth state changes to handle email verification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          Alert.alert(
            'Email Verified!',
            'Your email has been successfully verified. Welcome!',
            [
              {
                text: 'Continue',
                onPress: () => router.replace('/(tabs)'),
              },
            ]
          );
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  const handleResendVerification = async () => {
    if (!params.email) {
      Alert.alert('Error', 'No email address found. Please go back and try registering again.');
      return;
    }

    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: params.email as string,
        options: {
          emailRedirectTo: Platform.OS === 'web' 
            ? `${window.location.origin}/auth/verify-email`
            : 'medicallearningapp://auth/verify-email'
        }
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Email Sent',
        'A new verification email has been sent to your inbox.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/auth/login');
  };

  return (
    <LinearGradient
      colors={['#ffffff', '#f0f9f0']}
      style={styles.gradientBackground}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.verifyCard}>
            <View style={styles.header}>
              <View style={styles.logoSection}>
                <Logo size="large" textColor="#1F2937" />
                <BriefcaseMedical size={32} color="#10b981" style={styles.caduceusIcon} />
              </View>
              
              <View style={styles.iconContainer}>
                <Mail size={64} color="#10b981" />
              </View>

              <Text style={styles.title}>Check Your Email</Text>
              <Text style={styles.subtitle}>
                We've sent a verification link to:
              </Text>
              <Text style={styles.email}>{params.email}</Text>
              
              <Text style={styles.instructions}>
                Click the link in your email to verify your account and start learning.
                The link will expire in 24 hours.
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendVerification}
                disabled={resendLoading}
              >
                <RefreshCw 
                  size={20} 
                  color="#10b981" 
                  style={resendLoading ? styles.spinning : undefined}
                />
                <Text style={styles.resendButtonText}>
                  {resendLoading ? 'Sending...' : 'Resend Email'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToLogin}
              >
                <Text style={styles.backButtonText}>Back to Login</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.helpSection}>
              <Text style={styles.helpText}>
                Didn't receive the email? Check your spam folder or try resending.
              </Text>
            </View>
          </View>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  verifyCard: {
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
  iconContainer: {
    marginBottom: 24,
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
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  instructions: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  actions: {
    gap: 16,
    marginBottom: 24,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  resendButtonText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  helpSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 24,
  },
  helpText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  spinning: {
    // Add animation if needed
  },
});