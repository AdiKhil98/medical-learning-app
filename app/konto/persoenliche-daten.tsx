import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { View, Text, StyleSheet, SafeAreaView, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, User, Mail, Save } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';

export default function PersoenlicheDatenScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [originalData, setOriginalData] = useState({ name: '', email: '' });
  const [lastProfileUpdate, setLastProfileUpdate] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(true);
  const [daysUntilEdit, setDaysUntilEdit] = useState(0);

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
        .select('name, email, last_profile_update')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setName(data.name || '');
        setEmail(data.email || user.email || '');
        setOriginalData({ name: data.name || '', email: data.email || user.email || '' });

        // Check last profile update for weekly limit
        if (data.last_profile_update) {
          const lastUpdate = new Date(data.last_profile_update);
          const now = new Date();
          const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

          setLastProfileUpdate(data.last_profile_update);

          if (daysSinceUpdate < 7) {
            setCanEdit(false);
            setDaysUntilEdit(7 - daysSinceUpdate);
          } else {
            setCanEdit(true);
            setDaysUntilEdit(0);
          }
        } else {
          // Never updated before - can edit
          setCanEdit(true);
          setLastProfileUpdate(null);
        }
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
    if (!canEdit) {
      Alert.alert(
        'Fehler',
        `Sie können Ihr Profil derzeit nicht bearbeiten. Bitte warten Sie ${daysUntilEdit} ${daysUntilEdit === 1 ? 'Tag' : 'Tage'}.`
      );
      return;
    }

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
          email: email.trim(),
          last_profile_update: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // If email changed, update auth email as well
      if (email !== originalData.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: email.trim(),
        });

        if (authError) {
          // If auth update fails, revert database change
          await supabase.from('users').update({ email: originalData.email }).eq('id', user.id);

          throw new Error(`E-Mail-Adresse konnte nicht aktualisiert werden. ${  authError.message}`);
        }
      }

      // Update original data to reflect saved changes
      setOriginalData({ name: name.trim(), email: email.trim() });

      Alert.alert('Erfolgreich gespeichert', 'Ihre persönlichen Daten wurden erfolgreich aktualisiert.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
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

  const formatLastUpdateDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const gradientColors = ['#F8F3E8', '#FBEEEC', '#FFFFFF'] as const; // White Linen to light coral to white

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
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
      shadowOpacity: 0.1,
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
      <LinearGradient colors={gradientColors} style={styles.gradientBackground} />

      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
          <ChevronLeft size={24} color={colors.primary} />
          <Text style={dynamicStyles.backText}>Zurück</Text>
        </TouchableOpacity>
        <Text style={dynamicStyles.title}>Persönliche Daten</Text>
      </View>

      <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
        <Text style={dynamicStyles.subtitle}>
          Verwalten Sie Ihre persönlichen Informationen. Änderungen an der E-Mail-Adresse erfordern eine Bestätigung.
        </Text>

        {!canEdit && (
          <Card style={styles.warningCard}>
            <View style={styles.warningContent}>
              <Text style={styles.warningIcon}>⏰</Text>
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>Bearbeitungslimit erreicht</Text>
                <Text style={styles.warningText}>
                  Sie können Ihr Profil in {daysUntilEdit} {daysUntilEdit === 1 ? 'Tag' : 'Tagen'} wieder bearbeiten.
                </Text>
                {lastProfileUpdate && (
                  <Text style={styles.warningSubtext}>
                    Letzte Aktualisierung: {formatLastUpdateDate(lastProfileUpdate)}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        )}

        <Card style={dynamicStyles.formCard}>
          <Text style={dynamicStyles.formTitle}>Grundinformationen</Text>

          <Input
            label="Vollständiger Name"
            placeholder="Ihr vollständiger Name"
            value={name}
            onChangeText={setName}
            leftIcon={<User size={20} color={colors.textSecondary} />}
            autoCapitalize="words"
            editable={canEdit}
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
            editable={canEdit}
          />

          <Button
            title={saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
            onPress={handleSave}
            loading={saving}
            disabled={saving || !hasChanges() || !canEdit}
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
            <Text style={styles.infoText}>• Ihr Name wird in der App und in Kommunikationen verwendet</Text>
            <Text style={styles.infoText}>• Alle Änderungen werden sofort wirksam</Text>
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
  warningCard: {
    marginBottom: 24,
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 4,
  },
  warningIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#92400E',
    marginBottom: 4,
  },
  warningText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
    marginBottom: 4,
  },
  warningSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#92400E',
    marginTop: 4,
  },
});
