import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bug, Lightbulb, Send, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { colors } from '@/constants/colors';

export default function FeedbackScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [feedbackType, setFeedbackType] = useState('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Fehler', 'Bitte füllen Sie alle Felder aus.');
      return;
    }

    if (!user) {
      Alert.alert('Fehler', 'Sie müssen angemeldet sein, um Feedback zu senden.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('user_feedback').insert([
        {
          user_id: user.id,
          type: feedbackType,
          title: title.trim(),
          description: description.trim(),
          status: 'new',
        },
      ]);

      if (error) {
        logger.error('Error submitting feedback:', error);
        Alert.alert('Fehler', 'Feedback konnte nicht gesendet werden. Bitte versuchen Sie es erneut.');
        return;
      }

      setIsSubmitted(true);
      setTitle('');
      setDescription('');

      // Show success message briefly then navigate back
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (error) {
      logger.error('Error submitting feedback:', error);
      Alert.alert('Fehler', 'Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const gradientColors = ['#F8F3E8', '#FBEEEC', '#FFFFFF'] as const; // White Linen to light coral to white

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    gradientBackground: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: '100%',
    },
    title: {
      fontFamily: 'Inter-Bold',
      fontSize: 28,
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 32,
      lineHeight: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    formGroup: {
      marginBottom: 24,
    },
    label: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.text,
      marginBottom: 8,
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    picker: {
      color: colors.text,
      backgroundColor: colors.surface,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
      fontFamily: 'Inter-Regular',
    },
    textArea: {
      height: 120,
      textAlignVertical: 'top',
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: isSubmitting ? 0.6 : 1,
    },
    submitButtonText: {
      fontFamily: 'Inter-Bold',
      fontSize: 16,
      color: '#FFFFFF',
      marginLeft: 8,
    },
    successContainer: {
      alignItems: 'center',
      padding: 32,
    },
    successIcon: {
      marginBottom: 16,
    },
    successTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 24,
      color: colors.success,
      marginBottom: 8,
      textAlign: 'center',
    },
    successText: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    typeIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
    },
    typeText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 8,
    },
  });

  if (isSubmitted) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <LinearGradient colors={gradientColors} style={dynamicStyles.gradientBackground} />
        <View style={styles.content}>
          <View style={dynamicStyles.card}>
            <View style={dynamicStyles.successContainer}>
              <CheckCircle size={64} color={colors.success} style={dynamicStyles.successIcon} />
              <Text style={dynamicStyles.successTitle}>Feedback gesendet!</Text>
              <Text style={dynamicStyles.successText}>
                Vielen Dank für Ihr Feedback. Wir werden es überprüfen und uns bei Bedarf bei Ihnen melden.
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient colors={gradientColors} style={dynamicStyles.gradientBackground} />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.primary} />
          </TouchableOpacity>

          <Text style={dynamicStyles.title}>Feedback</Text>
          <Text style={dynamicStyles.subtitle}>Teilen Sie uns Bugs mit oder machen Sie Verbesserungsvorschläge</Text>
        </View>

        <View style={dynamicStyles.card}>
          {/* Feedback Type Selection */}
          <View style={dynamicStyles.formGroup}>
            <Text style={dynamicStyles.label}>Art des Feedbacks</Text>
            <View style={dynamicStyles.pickerContainer}>
              <Picker
                selectedValue={feedbackType}
                onValueChange={(itemValue) => setFeedbackType(itemValue)}
                style={dynamicStyles.picker}
                dropdownIconColor={colors.text}
              >
                <Picker.Item label="🐛 Bug melden" value="bug" />
                <Picker.Item label="💡 Verbesserungsvorschlag" value="suggestion" />
              </Picker>
            </View>

            <View style={dynamicStyles.typeIndicator}>
              {feedbackType === 'bug' ? (
                <Bug size={16} color={colors.error} />
              ) : (
                <Lightbulb size={16} color={colors.warning} />
              )}
              <Text style={dynamicStyles.typeText}>
                {feedbackType === 'bug'
                  ? 'Melden Sie technische Probleme oder Fehler'
                  : 'Schlagen Sie neue Features oder Verbesserungen vor'}
              </Text>
            </View>
          </View>

          {/* Title Input */}
          <View style={dynamicStyles.formGroup}>
            <Text style={dynamicStyles.label}>Titel</Text>
            <TextInput
              style={dynamicStyles.textInput}
              placeholder={feedbackType === 'bug' ? 'Kurze Beschreibung des Problems' : 'Was möchten Sie vorschlagen?'}
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Description Input */}
          <View style={dynamicStyles.formGroup}>
            <Text style={dynamicStyles.label}>Beschreibung</Text>
            <TextInput
              style={[dynamicStyles.textInput, dynamicStyles.textArea]}
              placeholder={
                feedbackType === 'bug'
                  ? 'Beschreiben Sie das Problem im Detail. Welche Schritte führten zu dem Fehler?'
                  : 'Beschreiben Sie Ihren Vorschlag im Detail. Wie würde das die App verbessern?'
              }
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              maxLength={1000}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={dynamicStyles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
            <Send size={20} color="#FFFFFF" />
            <Text style={dynamicStyles.submitButtonText}>{isSubmitting ? 'Wird gesendet...' : 'Feedback senden'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
