import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import {
  Link2,
  Plus,
  Search,
  Copy,
  Pause,
  Play,
  Ban,
  DollarSign,
  Users,
  MousePointerClick,
  TrendingUp,
  ArrowLeft,
  X,
  Check,
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useRouter } from 'expo-router';
import { logger } from '@/utils/logger';

interface Affiliate {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  affiliate_code: string;
  commission_rate: number;
  status: 'active' | 'paused' | 'banned';
  payout_method: string | null;
  payout_details: any;
  total_clicks: number;
  total_registrations: number;
  total_conversions: number;
  total_earned: number;
  total_paid: number;
  notes: string | null;
  created_at: string;
}

interface Commission {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  sale_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'reversed';
  created_at: string;
  lemonsqueezy_order_id: string | null;
}

// Cross-platform alert
const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Bestätigen', onPress: onConfirm },
    ]);
  }
};

export default function AffiliateManagement() {
  const router = useRouter();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCommissionsModal, setShowCommissionsModal] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [tab, setTab] = useState<'affiliates' | 'commissions'>('affiliates');

  // Add form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newRate, setNewRate] = useState('20');
  const [newPayoutMethod, setNewPayoutMethod] = useState('paypal');
  const [addingAffiliate, setAddingAffiliate] = useState(false);

  useEffect(() => {
    fetchAffiliates();
    fetchAllCommissions();
  }, []);

  const fetchAffiliates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAffiliates(data || []);
    } catch (error: any) {
      logger.error('Error fetching affiliates:', error);
      showAlert('Fehler', 'Affiliates konnten nicht geladen werden: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCommissions = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_commissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setCommissions(data || []);
    } catch (error: any) {
      logger.error('Error fetching commissions:', error);
    }
  };

  const fetchAffiliateCommissions = async (affiliateId: string) => {
    try {
      const { data, error } = await supabase
        .from('referral_commissions')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommissions(data || []);
    } catch (error: any) {
      logger.error('Error fetching commissions:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAffiliates();
    await fetchAllCommissions();
    setRefreshing(false);
  };

  const generateCode = (name: string): string => {
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
    const random = Math.random().toString(36).substring(2, 6);
    return clean ? `${clean}_${random}` : `ref_${random}`;
  };

  const addAffiliate = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      showAlert('Fehler', 'Name und E-Mail sind erforderlich.');
      return;
    }

    const rate = parseFloat(newRate) / 100;
    if (isNaN(rate) || rate <= 0 || rate > 1) {
      showAlert('Fehler', 'Provision muss zwischen 1% und 100% liegen.');
      return;
    }

    const code = newCode.trim() || generateCode(newName);

    setAddingAffiliate(true);
    try {
      // Check if user exists to link user_id
      let userId = null;
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .ilike('email', newEmail.trim())
        .maybeSingle();

      if (existingUser) {
        userId = existingUser.id;
      }

      const { error } = await supabase.from('affiliates').insert({
        user_id: userId,
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        affiliate_code: code.toLowerCase(),
        commission_rate: rate,
        payout_method: newPayoutMethod,
      });

      if (error) {
        if (error.message.includes('duplicate')) {
          showAlert('Fehler', 'E-Mail oder Code existiert bereits.');
        } else {
          throw error;
        }
        return;
      }

      showAlert('Erfolg', `Affiliate "${newName}" erstellt.\n\nLink: kpmed.de/auth/register?ref=${code.toLowerCase()}`);
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewCode('');
      setNewRate('20');
      await fetchAffiliates();
    } catch (error: any) {
      showAlert('Fehler', error.message);
    } finally {
      setAddingAffiliate(false);
    }
  };

  const updateAffiliateStatus = async (affiliate: Affiliate, newStatus: 'active' | 'paused' | 'banned') => {
    const statusLabels = { active: 'Aktivieren', paused: 'Pausieren', banned: 'Sperren' };
    showConfirm(
      statusLabels[newStatus],
      `${affiliate.name} wirklich ${statusLabels[newStatus].toLowerCase()}?`,
      async () => {
        try {
          const { error } = await supabase
            .from('affiliates')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', affiliate.id);

          if (error) throw error;
          await fetchAffiliates();
        } catch (error: any) {
          showAlert('Fehler', error.message);
        }
      }
    );
  };

  const updateCommissionStatus = async (commissionId: string, newStatus: 'approved' | 'paid' | 'reversed') => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'approved') updateData.approved_at = new Date().toISOString();
      if (newStatus === 'paid') updateData.paid_at = new Date().toISOString();
      if (newStatus === 'reversed') updateData.reversed_at = new Date().toISOString();

      const { error } = await supabase
        .from('referral_commissions')
        .update(updateData)
        .eq('id', commissionId);

      if (error) throw error;

      // If marking as paid, update affiliate's total_paid
      if (newStatus === 'paid') {
        const commission = commissions.find((c) => c.id === commissionId);
        if (commission) {
          // Fetch current total_paid to increment it
          const { data: aff } = await supabase
            .from('affiliates')
            .select('total_paid')
            .eq('id', commission.affiliate_id)
            .single();

          const { error: updateErr } = await supabase
            .from('affiliates')
            .update({
              total_paid: Number(aff?.total_paid || 0) + Number(commission.commission_amount),
              updated_at: new Date().toISOString(),
            })
            .eq('id', commission.affiliate_id);
          if (updateErr) logger.error('Error updating total_paid:', updateErr);
        }
      }

      await fetchAllCommissions();
      if (selectedAffiliate) {
        await fetchAffiliateCommissions(selectedAffiliate.id);
      }
      showAlert('Erfolg', `Status auf "${newStatus}" geändert.`);
    } catch (error: any) {
      showAlert('Fehler', error.message);
    }
  };

  const copyLink = (code: string) => {
    const link = `https://kpmed.de/auth/register?ref=${code}`;
    if (Platform.OS === 'web' && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      showAlert('Kopiert', link);
    } else {
      showAlert('Referral Link', link);
    }
  };

  const filteredAffiliates = affiliates.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.affiliate_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStats = {
    totalAffiliates: affiliates.length,
    activeAffiliates: affiliates.filter((a) => a.status === 'active').length,
    totalClicks: affiliates.reduce((sum, a) => sum + a.total_clicks, 0),
    totalRegistrations: affiliates.reduce((sum, a) => sum + a.total_registrations, 0),
    totalConversions: affiliates.reduce((sum, a) => sum + a.total_conversions, 0),
    totalEarned: affiliates.reduce((sum, a) => sum + Number(a.total_earned), 0),
    totalPaid: affiliates.reduce((sum, a) => sum + Number(a.total_paid), 0),
    pendingCommissions: commissions.filter((c) => c.status === 'pending' || c.status === 'approved').length,
    pendingAmount: commissions
      .filter((c) => c.status === 'pending' || c.status === 'approved')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0),
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'paused': return '#F59E0B';
      case 'banned': return '#EF4444';
      case 'pending': return '#F59E0B';
      case 'approved': return '#3B82F6';
      case 'paid': return '#10B981';
      case 'reversed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Link2 size={28} color="#10B981" />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Affiliate Manager</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {totalStats.activeAffiliates} aktive Partner
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <MousePointerClick size={18} color="#3B82F6" />
          <Text style={[styles.statValue, { color: colors.text }]}>{totalStats.totalClicks}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Klicks</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Users size={18} color="#10B981" />
          <Text style={[styles.statValue, { color: colors.text }]}>{totalStats.totalRegistrations}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Anmeldungen</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <TrendingUp size={18} color="#8B5CF6" />
          <Text style={[styles.statValue, { color: colors.text }]}>{totalStats.totalConversions}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Conversions</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <DollarSign size={18} color="#F59E0B" />
          <Text style={[styles.statValue, { color: colors.text }]}>{totalStats.pendingAmount.toFixed(0)}€</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Offen</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'affiliates' && styles.tabActive]}
          onPress={() => setTab('affiliates')}
        >
          <Text style={[styles.tabText, tab === 'affiliates' && styles.tabTextActive]}>Partner</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'commissions' && styles.tabActive]}
          onPress={() => { setTab('commissions'); fetchAllCommissions(); }}
        >
          <Text style={[styles.tabText, tab === 'commissions' && styles.tabTextActive]}>
            Provisionen {totalStats.pendingCommissions > 0 ? `(${totalStats.pendingCommissions})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      {tab === 'affiliates' && (
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Name, E-Mail oder Code suchen..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tab === 'affiliates' ? (
          /* Affiliates List */
          loading ? (
            <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} />
          ) : filteredAffiliates.length === 0 ? (
            <View style={styles.emptyState}>
              <Link2 size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'Keine Ergebnisse' : 'Noch keine Affiliates'}
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)}>
                <Text style={styles.emptyButtonText}>Ersten Partner hinzufügen</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredAffiliates.map((affiliate) => (
              <View key={affiliate.id} style={[styles.affiliateCard, { backgroundColor: colors.card }]}>
                <View style={styles.affiliateHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.affiliateName, { color: colors.text }]}>{affiliate.name}</Text>
                    <Text style={[styles.affiliateEmail, { color: colors.textSecondary }]}>{affiliate.email}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor(affiliate.status)}20` }]}>
                    <Text style={[styles.statusText, { color: statusColor(affiliate.status) }]}>
                      {affiliate.status}
                    </Text>
                  </View>
                </View>

                {/* Code & Link */}
                <TouchableOpacity style={styles.codeRow} onPress={() => copyLink(affiliate.affiliate_code)}>
                  <Text style={[styles.codeText, { color: colors.textSecondary }]}>
                    kpmed.de/auth/register?ref={affiliate.affiliate_code}
                  </Text>
                  <Copy size={16} color="#3B82F6" />
                </TouchableOpacity>

                {/* Stats */}
                <View style={styles.affiliateStats}>
                  <View style={styles.affiliateStat}>
                    <Text style={[styles.affiliateStatValue, { color: colors.text }]}>{affiliate.total_clicks}</Text>
                    <Text style={[styles.affiliateStatLabel, { color: colors.textSecondary }]}>Klicks</Text>
                  </View>
                  <View style={styles.affiliateStat}>
                    <Text style={[styles.affiliateStatValue, { color: colors.text }]}>{affiliate.total_registrations}</Text>
                    <Text style={[styles.affiliateStatLabel, { color: colors.textSecondary }]}>Anmeldungen</Text>
                  </View>
                  <View style={styles.affiliateStat}>
                    <Text style={[styles.affiliateStatValue, { color: colors.text }]}>{affiliate.total_conversions}</Text>
                    <Text style={[styles.affiliateStatLabel, { color: colors.textSecondary }]}>Conversions</Text>
                  </View>
                  <View style={styles.affiliateStat}>
                    <Text style={[styles.affiliateStatValue, { color: colors.text }]}>
                      {Number(affiliate.total_earned).toFixed(0)}€
                    </Text>
                    <Text style={[styles.affiliateStatLabel, { color: colors.textSecondary }]}>Verdient</Text>
                  </View>
                  <View style={styles.affiliateStat}>
                    <Text style={[styles.affiliateStatValue, { color: colors.text }]}>
                      {(affiliate.commission_rate * 100).toFixed(0)}%
                    </Text>
                    <Text style={[styles.affiliateStatLabel, { color: colors.textSecondary }]}>Provision</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  {affiliate.status !== 'active' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#10B98120' }]}
                      onPress={() => updateAffiliateStatus(affiliate, 'active')}
                    >
                      <Play size={14} color="#10B981" />
                      <Text style={[styles.actionText, { color: '#10B981' }]}>Aktivieren</Text>
                    </TouchableOpacity>
                  )}
                  {affiliate.status === 'active' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#F59E0B20' }]}
                      onPress={() => updateAffiliateStatus(affiliate, 'paused')}
                    >
                      <Pause size={14} color="#F59E0B" />
                      <Text style={[styles.actionText, { color: '#F59E0B' }]}>Pausieren</Text>
                    </TouchableOpacity>
                  )}
                  {affiliate.status !== 'banned' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#EF444420' }]}
                      onPress={() => updateAffiliateStatus(affiliate, 'banned')}
                    >
                      <Ban size={14} color="#EF4444" />
                      <Text style={[styles.actionText, { color: '#EF4444' }]}>Sperren</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#3B82F620' }]}
                    onPress={() => {
                      setSelectedAffiliate(affiliate);
                      fetchAffiliateCommissions(affiliate.id);
                      setShowCommissionsModal(true);
                    }}
                  >
                    <DollarSign size={14} color="#3B82F6" />
                    <Text style={[styles.actionText, { color: '#3B82F6' }]}>Provisionen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : (
          /* All Commissions Tab */
          commissions.length === 0 ? (
            <View style={styles.emptyState}>
              <DollarSign size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Noch keine Provisionen</Text>
            </View>
          ) : (
            commissions.map((commission) => {
              const affiliate = affiliates.find((a) => a.id === commission.affiliate_id);
              return (
                <View key={commission.id} style={[styles.commissionCard, { backgroundColor: colors.card }]}>
                  <View style={styles.commissionHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.commissionAmount, { color: colors.text }]}>
                        €{Number(commission.commission_amount).toFixed(2)}
                      </Text>
                      <Text style={[styles.commissionDetail, { color: colors.textSecondary }]}>
                        {affiliate?.name || 'Unknown'} • Verkauf: €{Number(commission.sale_amount).toFixed(2)} •{' '}
                        {(commission.commission_rate * 100).toFixed(0)}%
                      </Text>
                      <Text style={[styles.commissionDate, { color: colors.textSecondary }]}>
                        {new Date(commission.created_at).toLocaleDateString('de-DE')}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor(commission.status)}20` }]}>
                      <Text style={[styles.statusText, { color: statusColor(commission.status) }]}>
                        {commission.status}
                      </Text>
                    </View>
                  </View>
                  {(commission.status === 'pending' || commission.status === 'approved') && (
                    <View style={styles.commissionActions}>
                      {commission.status === 'pending' && (
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#3B82F620' }]}
                          onPress={() => updateCommissionStatus(commission.id, 'approved')}
                        >
                          <Check size={14} color="#3B82F6" />
                          <Text style={[styles.actionText, { color: '#3B82F6' }]}>Genehmigen</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#10B98120' }]}
                        onPress={() => updateCommissionStatus(commission.id, 'paid')}
                      >
                        <DollarSign size={14} color="#10B981" />
                        <Text style={[styles.actionText, { color: '#10B981' }]}>Bezahlt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#EF444420' }]}
                        onPress={() => updateCommissionStatus(commission.id, 'reversed')}
                      >
                        <X size={14} color="#EF4444" />
                        <Text style={[styles.actionText, { color: '#EF4444' }]}>Stornieren</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Affiliate Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Neuen Affiliate hinzufügen</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Name *</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="z.B. Dr. Ahmed"
                placeholderTextColor={colors.textSecondary}
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>E-Mail *</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="email@beispiel.de"
                placeholderTextColor={colors.textSecondary}
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Referral Code (optional)</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Wird automatisch generiert"
                placeholderTextColor={colors.textSecondary}
                value={newCode}
                onChangeText={setNewCode}
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Provision (%)</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="20"
                placeholderTextColor={colors.textSecondary}
                value={newRate}
                onChangeText={setNewRate}
                keyboardType="numeric"
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Auszahlungsmethode</Text>
              <View style={styles.payoutMethodRow}>
                {['paypal', 'bank_transfer', 'wise'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.payoutMethodButton,
                      { borderColor: newPayoutMethod === method ? '#10B981' : colors.border },
                      newPayoutMethod === method && { backgroundColor: '#10B98120' },
                    ]}
                    onPress={() => setNewPayoutMethod(method)}
                  >
                    <Text
                      style={[
                        styles.payoutMethodText,
                        { color: newPayoutMethod === method ? '#10B981' : colors.textSecondary },
                      ]}
                    >
                      {method === 'paypal' ? 'PayPal' : method === 'bank_transfer' ? 'Bank' : 'Wise'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, addingAffiliate && { opacity: 0.6 }]}
                onPress={addAffiliate}
                disabled={addingAffiliate}
              >
                {addingAffiliate ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Hinzufügen</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Affiliate Commissions Modal */}
      <Modal visible={showCommissionsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedAffiliate?.name}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Verdient: €{Number(selectedAffiliate?.total_earned || 0).toFixed(2)} | Bezahlt: €
                  {Number(selectedAffiliate?.total_paid || 0).toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCommissionsModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {commissions.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary, textAlign: 'center', marginTop: 20 }]}>
                  Noch keine Provisionen
                </Text>
              ) : (
                commissions.map((commission) => (
                  <View key={commission.id} style={[styles.commissionCard, { backgroundColor: colors.background }]}>
                    <View style={styles.commissionHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.commissionAmount, { color: colors.text }]}>
                          €{Number(commission.commission_amount).toFixed(2)}
                        </Text>
                        <Text style={[styles.commissionDetail, { color: colors.textSecondary }]}>
                          Verkauf: €{Number(commission.sale_amount).toFixed(2)} •{' '}
                          {new Date(commission.created_at).toLocaleDateString('de-DE')}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusColor(commission.status)}20` }]}>
                        <Text style={[styles.statusText, { color: statusColor(commission.status) }]}>
                          {commission.status}
                        </Text>
                      </View>
                    </View>
                    {(commission.status === 'pending' || commission.status === 'approved') && (
                      <View style={styles.commissionActions}>
                        {commission.status === 'pending' && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#3B82F620' }]}
                            onPress={() => updateCommissionStatus(commission.id, 'approved')}
                          >
                            <Check size={14} color="#3B82F6" />
                            <Text style={[styles.actionText, { color: '#3B82F6' }]}>Genehmigen</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#10B98120' }]}
                          onPress={() => updateCommissionStatus(commission.id, 'paid')}
                        >
                          <DollarSign size={14} color="#10B981" />
                          <Text style={[styles.actionText, { color: '#10B981' }]}>Bezahlt</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 2 },
  addButton: {
    backgroundColor: '#10B981',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 10 },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: '#10B981' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },

  content: { flex: 1 },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: { fontSize: 16 },
  emptyButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '600' },

  // Affiliate Card
  affiliateCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  affiliateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  affiliateName: { fontSize: 16, fontWeight: '700' },
  affiliateEmail: { fontSize: 13, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },

  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  codeText: { flex: 1, fontSize: 13, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },

  affiliateStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  affiliateStat: { alignItems: 'center' },
  affiliateStatValue: { fontSize: 16, fontWeight: '700' },
  affiliateStatLabel: { fontSize: 10, marginTop: 2 },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  actionText: { fontSize: 12, fontWeight: '600' },

  // Commission Card
  commissionCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commissionAmount: { fontSize: 18, fontWeight: '700' },
  commissionDetail: { fontSize: 12, marginTop: 2 },
  commissionDate: { fontSize: 11, marginTop: 2 },
  commissionActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalSubtitle: { fontSize: 13, marginTop: 2 },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  payoutMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  payoutMethodButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  payoutMethodText: { fontSize: 13, fontWeight: '600' },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: { fontWeight: '600' },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  saveButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
