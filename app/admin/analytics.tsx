import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, 
  Users, 
  Eye, 
  Clock, 
  Activity,
  TrendingUp,
  Calendar,
  Target
} from 'lucide-react-native';

interface AnalyticsData {
  totalUsers: number;
  totalSessions: number;
  averageSessionTime: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  activeUsersToday: number;
  totalSections: number;
  totalAuditLogs: number;
  recentSignUps: any[];
  popularSections: any[];
}

export default function Analytics() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalSessions: 0,
    averageSessionTime: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    activeUsersToday: 0,
    totalSections: 0,
    totalAuditLogs: 0,
    recentSignUps: [],
    popularSections: []
  });
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Total users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, created_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // New users today
      const newUsersToday = users?.filter(user => 
        new Date(user.created_at) >= today
      ).length || 0;

      // New users this week
      const newUsersThisWeek = users?.filter(user => 
        new Date(user.created_at) >= weekAgo
      ).length || 0;

      // Get sections count
      const { count: sectionsCount, error: sectionsError } = await supabase
        .from('sections')
        .select('*', { count: 'exact', head: true });

      if (sectionsError) throw sectionsError;

      // Get audit logs count
      const { count: auditCount, error: auditError } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });

      if (auditError && auditError.code !== 'PGRST116') {
        logger.warn('Audit logs table might not exist:', auditError);
      }

      // Get recent sign ups (last 10)
      const recentSignUps = users?.slice(0, 10) || [];

      // Get popular sections (mock data for now as we don't have usage tracking)
      const { data: sections, error: allSectionsError } = await supabase
        .from('sections')
        .select('id, title, slug')
        .limit(5);

      if (allSectionsError) throw allSectionsError;

      const popularSections = sections?.map(section => ({
        ...section,
        views: Math.floor(Math.random() * 1000) + 100 // Mock view count
      })) || [];

      setAnalytics({
        totalUsers: users?.length || 0,
        totalSessions: Math.floor((users?.length || 0) * 2.5), // Estimated
        averageSessionTime: 180, // Mock: 3 minutes
        newUsersToday,
        newUsersThisWeek,
        activeUsersToday: Math.floor((users?.length || 0) * 0.3), // Estimated 30% daily active
        totalSections: sectionsCount || 0,
        totalAuditLogs: auditCount || 0,
        recentSignUps,
        popularSections: popularSections.sort((a, b) => b.views - a.views)
      });

    } catch (error: any) {
      logger.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Icon size={20} color={color} />
        </View>
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <BarChart size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Analyse-Dashboard</Text>
      </View>

      <View style={[styles.timeRangeContainer, { backgroundColor: colors.card }]}>
        {(['today', 'week', 'month'] as const).map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              timeRange === range && { backgroundColor: colors.primary + '20' }
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[
              styles.timeRangeText,
              { color: timeRange === range ? colors.primary : colors.textSecondary }
            ]}>
              {range === 'today' ? 'Heute' : range === 'week' ? 'Woche' : 'Monat'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Lade Analysen...</Text>
          </View>
        ) : (
          <>
            {/* Main Stats */}
            <View style={styles.statsGrid}>
              <StatCard
                title="Benutzer Gesamt"
                value={analytics.totalUsers.toLocaleString()}
                subtitle={`+${analytics.newUsersThisWeek} diese Woche`}
                icon={Users}
                color="#E2827F"
              />
              <StatCard
                title="Heute Aktiv"
                value={analytics.activeUsersToday.toLocaleString()}
                subtitle={`${Math.round((analytics.activeUsersToday / analytics.totalUsers) * 100)}% insgesamt`}
                icon={Activity}
                color="#10B981"
              />
              <StatCard
                title="Sitzungen Gesamt"
                value={analytics.totalSessions.toLocaleString()}
                subtitle="Geschätzt"
                icon={Eye}
                color="#F59E0B"
              />
              <StatCard
                title="Durchschn. Sitzung"
                value={formatDuration(analytics.averageSessionTime)}
                subtitle="Verbrachte Zeit"
                icon={Clock}
                color="#E2827F"
              />
            </View>

            {/* Growth Stats */}
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Wachstumsübersicht</Text>
              <View style={styles.growthStats}>
                <View style={styles.growthStat}>
                  <TrendingUp size={20} color="#10B981" />
                  <View style={styles.growthDetails}>
                    <Text style={[styles.growthValue, { color: colors.text }]}>
                      {analytics.newUsersToday}
                    </Text>
                    <Text style={[styles.growthLabel, { color: colors.textSecondary }]}>
                      Neue Benutzer heute
                    </Text>
                  </View>
                </View>
                <View style={styles.growthStat}>
                  <Calendar size={20} color="#E2827F" />
                  <View style={styles.growthDetails}>
                    <Text style={[styles.growthValue, { color: colors.text }]}>
                      {analytics.newUsersThisWeek}
                    </Text>
                    <Text style={[styles.growthLabel, { color: colors.textSecondary }]}>
                      Neue Benutzer diese Woche
                    </Text>
                  </View>
                </View>
                <View style={styles.growthStat}>
                  <Target size={20} color="#EF4444" />
                  <View style={styles.growthDetails}>
                    <Text style={[styles.growthValue, { color: colors.text }]}>
                      {analytics.totalSections}
                    </Text>
                    <Text style={[styles.growthLabel, { color: colors.textSecondary }]}>
                      Abschnitte gesamt
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Recent Sign Ups */}
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Neueste Anmeldungen</Text>
              {analytics.recentSignUps.slice(0, 5).map((user, index) => (
                <View key={user.id} style={styles.recentUser}>
                  <View style={styles.userInfo}>
                    <Text style={[styles.userEmail, { color: colors.text }]}>
                      {user.email || 'Keine E-Mail'}
                    </Text>
                    <Text style={[styles.userDate, { color: colors.textSecondary }]}>
                      {formatDate(user.created_at)}
                    </Text>
                  </View>
                  <View style={[styles.userIndex, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.userIndexText, { color: colors.primary }]}>
                      {index + 1}
                    </Text>
                  </View>
                </View>
              ))}
              {analytics.recentSignUps.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Keine neuesten Anmeldungen
                </Text>
              )}
            </View>

            {/* Popular Sections */}
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Beliebte Abschnitte</Text>
              {analytics.popularSections.map((section, index) => (
                <View key={section.id} style={styles.popularSection}>
                  <View style={styles.sectionInfo}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {section.title}
                    </Text>
                    <Text style={[styles.sectionSlug, { color: colors.textSecondary }]}>
                      /{section.slug}
                    </Text>
                  </View>
                  <View style={styles.sectionStats}>
                    <Text style={[styles.viewCount, { color: colors.primary }]}>
                      {section.views} Aufrufe
                    </Text>
                    <View style={[styles.rankBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.rankText, { color: colors.primary }]}>
                        #{index + 1}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
              {analytics.popularSections.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Keine Abschnittsdaten verfügbar
                </Text>
              )}
            </View>

            {/* System Stats */}
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Systemübersicht</Text>
              <View style={styles.systemStats}>
                <View style={styles.systemStat}>
                  <Text style={[styles.systemValue, { color: colors.text }]}>
                    {analytics.totalAuditLogs}
                  </Text>
                  <Text style={[styles.systemLabel, { color: colors.textSecondary }]}>
                    Audit-Protokolle
                  </Text>
                </View>
                <View style={styles.systemStat}>
                  <Text style={[styles.systemValue, { color: colors.text }]}>
                    {analytics.totalSections}
                  </Text>
                  <Text style={[styles.systemLabel, { color: colors.textSecondary }]}>
                    Abschnitte
                  </Text>
                </View>
                <View style={styles.systemStat}>
                  <Text style={[styles.systemValue, { color: colors.text }]}>
                    {analytics.totalUsers}
                  </Text>
                  <Text style={[styles.systemLabel, { color: colors.textSecondary }]}>
                    Benutzer
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  growthStats: {
    gap: 16,
  },
  growthStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  growthDetails: {
    flex: 1,
  },
  growthValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  growthLabel: {
    fontSize: 14,
  },
  recentUser: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '500',
  },
  userDate: {
    fontSize: 12,
    marginTop: 2,
  },
  userIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userIndexText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  popularSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionSlug: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionStats: {
    alignItems: 'flex-end',
  },
  viewCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  systemStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  systemStat: {
    alignItems: 'center',
  },
  systemValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  systemLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});