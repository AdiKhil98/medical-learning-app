import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowLeft, Search, AlertTriangle, CheckCircle, RefreshCw, Clock, CreditCard } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SubscriptionManager() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<any>(null);
  const [userSubscriptions, setUserSubscriptions] = useState<any>(null);

  // Check for duplicate subscriptions
  const checkDuplicates = async () => {
    setLoading(true);
    setDuplicates(null);
    try {
      const response = await fetch('/.netlify/functions/admin-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-duplicates' })
      });

      const result = await response.json();
      setDuplicates(result);

      if (result.duplicates_found === 0) {
        Alert.alert('Erfolg!', 'Keine doppelten Subscriptions gefunden! ✅');
      }
    } catch (error) {
      Alert.alert('Fehler', 'Fehler beim Überprüfen der Subscriptions');
    } finally {
      setLoading(false);
    }
  };

  // Search user subscriptions
  const searchUserSubscriptions = async () => {
    if (!email.trim()) {
      Alert.alert('Fehler', 'Bitte E-Mail-Adresse eingeben');
      return;
    }

    setLoading(true);
    setUserSubscriptions(null);
    try {
      const response = await fetch('/.netlify/functions/admin-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', email: email.trim() })
      });

      const result = await response.json();
      setUserSubscriptions(result);

      if (!result.success) {
        Alert.alert('Fehler', result.error || 'Benutzer nicht gefunden');
      }
    } catch (error) {
      Alert.alert('Fehler', 'Fehler beim Suchen der Subscriptions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Subscription Manager</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Abonnements verwalten
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Check Duplicates Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={24} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Doppelte Subscriptions prüfen
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Finde Benutzer mit mehreren aktiven Abonnements
          </Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={checkDuplicates}
            disabled={loading}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <AlertTriangle size={20} color="#FFF" />
                  <Text style={styles.buttonText}>Duplikate prüfen</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Duplicates Results */}
          {duplicates && (
            <View style={[styles.results, { backgroundColor: colors.background }]}>
              <View style={styles.resultHeader}>
                {duplicates.duplicates_found === 0 ? (
                  <CheckCircle size={20} color="#10B981" />
                ) : (
                  <AlertTriangle size={20} color="#EF4444" />
                )}
                <Text style={[styles.resultTitle, { color: colors.text }]}>
                  {duplicates.duplicates_found === 0
                    ? 'Keine Duplikate gefunden ✅'
                    : `${duplicates.duplicates_found} Duplikate gefunden!`}
                </Text>
              </View>

              {duplicates.users && duplicates.users.length > 0 && (
                <View style={styles.duplicatesList}>
                  {duplicates.users.map((user: any, index: number) => (
                    <View key={index} style={[styles.duplicateItem, { backgroundColor: '#FEF2F2' }]}>
                      <Text style={[styles.duplicateEmail, { color: '#991B1B' }]}>
                        {user.user_email}
                      </Text>
                      <Text style={[styles.duplicateCount, { color: '#DC2626' }]}>
                        {user.subscription_count} aktive Subscriptions
                      </Text>
                      <Text style={[styles.duplicateIds, { color: '#7F1D1D' }]}>
                        IDs: {user.subscription_ids.join(', ')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Search User Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Search size={24} color="#3B82F6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Benutzer-Subscriptions suchen
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Alle Abonnements eines Benutzers anzeigen
          </Text>

          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="E-Mail-Adresse eingeben..."
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.actionButton}
              onPress={searchUserSubscriptions}
              disabled={loading}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Search size={20} color="#FFF" />
                    <Text style={styles.buttonText}>Suchen</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* User Subscriptions Results */}
          {userSubscriptions && userSubscriptions.success && (
            <View style={[styles.results, { backgroundColor: colors.background }]}>
              {/* User Info */}
              <View style={[styles.userInfo, { borderColor: colors.border }]}>
                <Text style={[styles.userEmail, { color: colors.text }]}>
                  {userSubscriptions.user.email}
                </Text>
                <View style={styles.userStats}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tier:</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {userSubscriptions.user.subscription_tier || 'none'}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Limit:</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {userSubscriptions.user.simulation_limit || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Genutzt:</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {userSubscriptions.user.simulations_used_this_month || 0}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Subscriptions List */}
              <Text style={[styles.subsectionTitle, { color: colors.text }]}>
                Subscriptions ({userSubscriptions.total})
              </Text>
              {userSubscriptions.subscriptions.map((sub: any, index: number) => (
                <View key={index} style={[styles.subscriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.subHeader}>
                    <View style={[styles.statusBadge, {
                      backgroundColor: sub.status === 'active' ? '#DCFCE7' : '#FEE2E2'
                    }]}>
                      <Text style={[styles.statusText, {
                        color: sub.status === 'active' ? '#166534' : '#991B1B'
                      }]}>
                        {sub.status}
                      </Text>
                    </View>
                    <View style={[styles.tierBadge, { backgroundColor: '#DBEAFE' }]}>
                      <Text style={[styles.tierText, { color: '#1E40AF' }]}>
                        {sub.tier}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.subDetails}>
                    <View style={styles.detailRow}>
                      <CreditCard size={16} color={colors.textSecondary} />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Subscription ID:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {sub.lemonsqueezy_subscription_id}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <RefreshCw size={16} color={colors.textSecondary} />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Simulation Limit:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {sub.simulation_limit || 'Unlimited'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Clock size={16} color={colors.textSecondary} />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Erstellt:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {new Date(sub.created_at).toLocaleDateString('de-DE')}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  actionButton: {
    marginTop: 12,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  results: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  duplicatesList: {
    gap: 8,
  },
  duplicateItem: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  duplicateEmail: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  duplicateCount: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  duplicateIds: {
    fontSize: 12,
  },
  userInfo: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  userEmail: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  subscriptionCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  subHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  subDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
