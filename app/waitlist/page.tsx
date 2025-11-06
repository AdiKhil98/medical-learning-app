'use client';

import { useState } from 'react';
import { joinWaitlist } from '@/lib/registrationLimit';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { CheckCircle, Loader2, Mail, User, MessageSquare } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function WaitlistPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!formData.email) {
      setError('Email address is required');
      return;
    }

    setLoading(true);
    setError('');

    const result = await joinWaitlist(formData);

    setLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Failed to join waitlist');
    }
  }

  if (success) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <LinearGradient
          colors={['#eff6ff', '#e0e7ff']}
          style={styles.gradient}
        >
          <View style={styles.card}>
            <View style={styles.successIconContainer}>
              <CheckCircle color="#16a34a" size={40} />
            </View>
            <Text style={styles.successTitle}>
              You're on the Waitlist!
            </Text>
            <Text style={styles.successMessage}>
              We'll notify you at <Text style={styles.email}>{formData.email}</Text> when a spot opens up.
            </Text>
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                💡 <Text style={styles.tipBold}>Pro tip:</Text> Share our platform with friends! Users who refer others get priority access.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/')}
            >
              <Text style={styles.primaryButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LinearGradient
        colors={['#eff6ff', '#e0e7ff']}
        style={styles.gradient}
      >
        <View style={styles.card}>
          <Text style={styles.title}>
            Join Our Waitlist
          </Text>
          <Text style={styles.subtitle}>
            We're currently at full capacity for our beta. Sign up to be notified when we have availability!
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <View style={styles.inputContainer}>
                <Mail color="#9ca3af" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Name (optional)</Text>
              <View style={styles.inputContainer}>
                <User color="#9ca3af" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="John Doe"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Why do you want to join? (optional)</Text>
              <View style={[styles.inputContainer, styles.textareaContainer]}>
                <MessageSquare color="#9ca3af" size={20} style={[styles.inputIcon, styles.textareaIcon]} />
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={formData.reason}
                  onChangeText={(text) => setFormData({ ...formData, reason: text })}
                  placeholder="Tell us about your interest..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <Loader2 color="#ffffff" size={20} style={styles.spinner} />
                  <Text style={styles.submitButtonText}>Joining Waitlist...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Join Waitlist</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            Already have an account?{' '}
            <Text
              style={styles.link}
              onPress={() => router.push('/auth/login')}
            >
              Sign in
            </Text>
          </Text>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    padding: 32,
    width: '100%',
    maxWidth: 500,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textareaContainer: {
    alignItems: 'flex-start',
  },
  textareaIcon: {
    marginTop: 12,
  },
  textarea: {
    minHeight: 100,
    paddingTop: 12,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spinner: {
    // Animation would need to be added via Animated API or similar
  },
  footer: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
  },
  link: {
    color: '#2563eb',
  },
  successIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#dcfce7',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  email: {
    fontWeight: 'bold',
  },
  tipBox: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  tipText: {
    fontSize: 14,
    color: '#1e40af',
  },
  tipBold: {
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
