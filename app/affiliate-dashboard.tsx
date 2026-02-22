import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Link2,
  Copy,
  MousePointerClick,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

interface AffiliateStats {
  affiliate: {
    name: string;
    code: string;
    commission_rate: number;
    status: string;
  };
  stats: {
    total_clicks: number;
    total_registrations: number;
    total_conversions: number;
    total_earned: number;
    total_paid: number;
    pending_amount: number;
    monthly_clicks: number;
    monthly_registrations: number;
  };
  recent_commissions: Array<{
    commission_amount: number;
    sale_amount: number;
    status: string;
    created_at: string;
  }>;
}

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

export default function AffiliateDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_affiliate_stats');

      if (error) throw error;

      if (data?.success) {
        setStats(data);
      } else {
        showAlert('Fehler', data?.message || 'Affiliate-Daten konnten nicht geladen werden.');
      }
    } catch (error: any) {
      logger.error('Error fetching affiliate stats:', error);
      showAlert('Fehler', 'Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const copyLink = () => {
    if (!stats) return;
    const link = `https://medmeister.eu/auth/register?ref=${stats.affiliate.code}`;
    if (Platform.OS === 'web' && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      showAlert('Kopiert', link);
    } else {
      showAlert('Dein Referral-Link', link);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#3B82F6';
      case 'paid': return '#10B981';
      case 'reversed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'approved': return 'Genehmigt';
      case 'paid': return 'Bezahlt';
      case 'reversed': return 'Storniert';
      default: return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Lade Daten...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Referral Dashboard</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Link2 size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Kein aktives Affiliate-Konto gefunden.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { affiliate, stats: s, recent_commissions } = stats;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Referral Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {affiliate.name} &bull; {(affiliate.commission_rate * 100).toFixed(0)}% Provision
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Referral Link Card */}
        <TouchableOpacity
          style={[styles.linkCard, { backgroundColor: colors.card }]}
          onPress={copyLink}
          activeOpacity={0.7}
        >
          <View style={styles.linkIconContainer}>
            <Link2 size={20} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.linkLabel, { color: colors.textSecondary }]}>Dein Referral-Link</Text>
            <Text style={[styles.linkText, { color: colors.text }]}>
              medmeister.eu/auth/register?ref={affiliate.code}
            </Text>
          </View>
          <Copy size={20} color="#3B82F6" />
        </TouchableOpacity>

        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <MousePointerClick size={20} color="#3B82F6" />
            <Text style={[styles.statValue, { color: colors.text }]}>{s.total_clicks}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Klicks gesamt</Text>
            <Text style={[styles.statSub, { color: '#3B82F6' }]}>
              {s.monthly_clicks} diesen Monat
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Users size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: colors.text }]}>{s.total_registrations}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Anmeldungen</Text>
            <Text style={[styles.statSub, { color: '#10B981' }]}>
              {s.monthly_registrations} diesen Monat
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <TrendingUp size={20} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: colors.text }]}>{s.total_conversions}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Conversions</Text>
            <Text style={[styles.statSub, { color: '#8B5CF6' }]}>
              {s.total_registrations > 0
                ? ((s.total_conversions / s.total_registrations) * 100).toFixed(0)
                : 0}% Rate
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <DollarSign size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {Number(s.total_earned).toFixed(0)}€
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Verdient</Text>
            <Text style={[styles.statSub, { color: '#F59E0B' }]}>
              {Number(s.total_paid).toFixed(0)}€ bezahlt
            </Text>
          </View>
        </View>

        {/* Earnings Summary */}
        <View style={[styles.earningsCard, { backgroundColor: colors.card }]}>
          <View style={styles.earningsRow}>
            <View style={styles.earningsItem}>
              <Clock size={18} color="#F59E0B" />
              <View>
                <Text style={[styles.earningsLabel, { color: colors.textSecondary }]}>Ausstehend</Text>
                <Text style={[styles.earningsValue, { color: '#F59E0B' }]}>
                  {Number(s.pending_amount).toFixed(2)}€
                </Text>
              </View>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsItem}>
              <CheckCircle size={18} color="#10B981" />
              <View>
                <Text style={[styles.earningsLabel, { color: colors.textSecondary }]}>Bezahlt</Text>
                <Text style={[styles.earningsValue, { color: '#10B981' }]}>
                  {Number(s.total_paid).toFixed(2)}€
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Commissions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Letzte Provisionen</Text>
        </View>

        {(!recent_commissions || recent_commissions.length === 0) ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <DollarSign size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
              Noch keine Provisionen. Teile deinen Referral-Link, um loszulegen!
            </Text>
          </View>
        ) : (
          recent_commissions.map((commission, index) => (
            <View key={index} style={[styles.commissionCard, { backgroundColor: colors.card }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.commissionAmount, { color: colors.text }]}>
                  €{Number(commission.commission_amount).toFixed(2)}
                </Text>
                <Text style={[styles.commissionDetail, { color: colors.textSecondary }]}>
                  Verkauf: €{Number(commission.sale_amount).toFixed(2)} &bull;{' '}
                  {new Date(commission.created_at).toLocaleDateString('de-DE')}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor(commission.status)}20` }]}>
                <Text style={[styles.statusText, { color: statusColor(commission.status) }]}>
                  {statusLabel(commission.status)}
                </Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  backButton: { padding: 4 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 2 },
  content: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  emptyText: { fontSize: 16, textAlign: 'center', paddingHorizontal: 40 },

  // Link Card
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  linkIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B98115',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: { fontSize: 11, marginBottom: 2 },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  statSub: { fontSize: 11, fontWeight: '600' },

  // Earnings Card
  earningsCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  earningsDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  earningsLabel: { fontSize: 12, marginBottom: 2 },
  earningsValue: { fontSize: 20, fontWeight: '700' },

  // Section
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },

  // Empty Card
  emptyCard: {
    marginHorizontal: 16,
    padding: 32,
    borderRadius: 14,
    alignItems: 'center',
    gap: 12,
  },
  emptyCardText: { fontSize: 14, textAlign: 'center' },

  // Commission Card
  commissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
  },
  commissionAmount: { fontSize: 17, fontWeight: '700' },
  commissionDetail: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
});
