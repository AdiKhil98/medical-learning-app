import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { View, Text, StyleSheet, SafeAreaView, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, User, Mail, Save } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';

export default function PersoenlicheDatenScreen() {
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [originalData, setOriginalData] = useState({ name: '', email: '' });

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        Alert.alert('Fehler', 'Benutzer nicht gefunden');
        router.back();
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setName(data.name || '');
        setEmail(data.email || user.email || '');
        setOriginalData({ name: data.name || '', email: data.email || user.email || '' });
      } else {
        // If no user record exists, use auth data
        setEmail(user.email || '');
        setOriginalData({ name: '', email: user.email || '' });
      }
    } catch (error: any) {
      logger.error('Error loading user data:', error);
      Alert.alert('Fehler', 'Benutzerdaten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie einen Namen ein.');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie eine E-Mail-Adresse ein.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Fehler', 'Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }

    try {
      setSaving(true);

      // Update user profile in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          name: name.trim(), 
          email: email.trim() 
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // If email changed, update auth email as well
      if (email !== originalData.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: email.trim()
        });

        if (authError) {
          // If auth update fails, revert database change
          await supabase
            .from('users')
            .update({ email: originalData.email })
            .eq('id', user.id);
          
          throw new Error('E-Mail-Adresse konnte nicht aktualisiert werden. ' + authError.message);
        }
      }

      // Update original data to reflect saved changes
      setOriginalData({ name: name.trim(), email: email.trim() });

      Alert.alert(
        'Erfolgreich gespeichert',
        'Ihre persönlichen Daten wurden erfolgreich aktualisiert.',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error: any) {
      logger.error('Error saving user data:', error);
      Alert.alert('Fehler', error.message || 'Daten konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return name.trim() !== originalData.name || email.trim() !== originalData.email;
  };

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
    saveButton: {
      marginTop: 8,
      borderRadius: 12,
      height: 56,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 16,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.loadingContainer}>
        <Text style={dynamicStyles.loadingText}>Lade Benutzerdaten...</Text>
      </SafeAreaView>
    );
  }

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
        <Text style={dynamicStyles.title}>Persönliche Daten</Text>
      </View>

      <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
        <Text style={dynamicStyles.subtitle}>
          Verwalten Sie Ihre persönlichen Informationen. Änderungen an der E-Mail-Adresse erfordern eine Bestätigung.
        </Text>

        <Card style={dynamicStyles.formCard}>
          <Text style={dynamicStyles.formTitle}>Grundinformationen</Text>
          
          <Input
            label="Vollständiger Name"
            placeholder="Ihr vollständiger Name"
            value={name}
            onChangeText={setName}
            leftIcon={<User size={20} color={colors.textSecondary} />}
            autoCapitalize="words"
          />

          <Input
            label="E-Mail-Adresse"
            placeholder="Ihre E-Mail-Adresse"
            value={email}
            onChangeText={setEmail}
            leftIcon={<Mail size={20} color={colors.textSecondary} />}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Button
            title={saving ? "Wird gespeichert..." : "Änderungen speichern"}
            onPress={handleSave}
            loading={saving}
            disabled={saving || !hasChanges()}
            icon={<Save size={20} color="#FFFFFF" />}
            style={dynamicStyles.saveButton}
          />
        </Card>

        <Card>
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>💡 Hinweise</Text>
            <Text style={styles.infoText}>
              • Änderungen an der E-Mail-Adresse erfordern eine Bestätigung über die neue E-Mail-Adresse
            </Text>
            <Text style={styles.infoText}>
              • Ihr Name wird in der App und in Kommunikationen verwendet
            </Text>
            <Text style={styles.infoText}>
              • Alle Änderungen werden sofort wirksam
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
  infoSection: {
    padding: 4,
  },
  infoTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#F59E0B',
    marginBottom: 12,
  },
  infoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
});