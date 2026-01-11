import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

interface TableData {
  titel: string;
  spalten: string[];
  zeilen: string[][];
}

interface PrueferFrage {
  frage: string;
  antwort: string;
}

interface SectionContent {
  content?: string;
  merke?: string;
  pruefungsrelevanz?: string;
  tabellen?: TableData[];
  fragen?: PrueferFrage[];
}

interface TopicContent {
  definition?: SectionContent;
  leitsymptome?: SectionContent;
  diagnostik?: SectionContent;
  differentialdiagnosen?: SectionContent;
  therapie?: SectionContent;
  komplikationen?: SectionContent;
  typische_prueferfragen?: SectionContent;
}

interface Topic {
  id: string;
  slug: string;
  title_de: string;
  fachgebiet: string;
  bereich: string;
  priority: string;
  content: TopicContent;
}

const sectionConfig: { key: keyof TopicContent; title: string; icon: string; emoji: string }[] = [
  { key: 'definition', title: 'Definition', icon: 'book', emoji: '📖' },
  { key: 'leitsymptome', title: 'Leitsymptome', icon: 'pulse', emoji: '🩺' },
  { key: 'diagnostik', title: 'Diagnostik', icon: 'search', emoji: '🔍' },
  { key: 'differentialdiagnosen', title: 'Differentialdiagnosen', icon: 'git-branch', emoji: '⚖️' },
  { key: 'therapie', title: 'Therapie', icon: 'medkit', emoji: '💊' },
  { key: 'komplikationen', title: 'Komplikationen', icon: 'warning', emoji: '⚠️' },
  { key: 'typische_prueferfragen', title: 'Typische Prüferfragen', icon: 'help-circle', emoji: '❓' },
];

const priorityColors: { [key: string]: string } = {
  '+++': '#ef4444',
  '++': '#f59e0b',
  '+': '#22c55e',
};

export default function FSPTopicDetail() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['definition']));

  const fetchTopic = useCallback(async () => {
    if (!slug) return;

    try {
      const { data, error } = await supabase.from('fsp_bibliothek').select('*').eq('slug', slug).single();

      if (error) throw error;

      // Parse content if it's a JSON string (database stores it as text)
      if (data && typeof data.content === 'string') {
        try {
          data.content = JSON.parse(data.content);
        } catch (parseError) {
          console.error('Error parsing content JSON:', parseError);
          data.content = {};
        }
      }

      setTopic(data);
    } catch (error) {
      console.error('Error fetching topic:', error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchTopic();
  }, [fetchTopic]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleAllSections = () => {
    const availableSections = sectionConfig.filter((s) => topic?.content?.[s.key]);
    if (expandedSections.size === availableSections.length) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(availableSections.map((s) => s.key)));
    }
  };

  const renderTable = (table: TableData, idx: number) => (
    <View key={`${table.titel}-${idx}`} style={styles.tableContainer}>
      <Text style={styles.tableTitle}>{table.titel}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeaderRow}>
            {table.spalten.map((col, colIdx) => (
              <View key={colIdx} style={styles.tableHeaderCell}>
                <Text style={styles.tableHeaderText}>{col}</Text>
              </View>
            ))}
          </View>
          {/* Data Rows */}
          {table.zeilen.map((row, rowIdx) => (
            <View key={rowIdx} style={[styles.tableRow, rowIdx % 2 === 0 && styles.tableRowEven]}>
              {row.map((cell, cellIdx) => (
                <View key={cellIdx} style={styles.tableCell}>
                  <Text style={styles.tableCellText}>{cell}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderPrueferFragen = (fragen: PrueferFrage[]) => (
    <View style={styles.fragenContainer}>
      {fragen.map((frage, idx) => (
        <View key={idx} style={styles.frageItem}>
          <View style={styles.frageHeader}>
            <View style={styles.frageNumber}>
              <Text style={styles.frageNumberText}>{idx + 1}</Text>
            </View>
            <Text style={styles.frageText}>{frage.frage}</Text>
          </View>
          <View style={styles.antwortContainer}>
            <Text style={styles.antwortLabel}>Musterantwort:</Text>
            <Text style={styles.antwortText}>{frage.antwort}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderSection = (config: (typeof sectionConfig)[0]) => {
    const sectionData = topic?.content?.[config.key];
    if (!sectionData) return null;

    const isExpanded = expandedSections.has(config.key);

    return (
      <View key={config.key} style={styles.section}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(config.key)} activeOpacity={0.7}>
          <Text style={styles.sectionEmoji}>{config.emoji}</Text>
          <Text style={styles.sectionTitle}>{config.title}</Text>
          {sectionData.pruefungsrelevanz && (
            <View
              style={[
                styles.relevanzBadge,
                {
                  backgroundColor:
                    sectionData.pruefungsrelevanz === 'hoch'
                      ? '#fee2e2'
                      : sectionData.pruefungsrelevanz === 'mittel'
                        ? '#fef3c7'
                        : '#dcfce7',
                },
              ]}
            >
              <Text
                style={[
                  styles.relevanzText,
                  {
                    color:
                      sectionData.pruefungsrelevanz === 'hoch'
                        ? '#dc2626'
                        : sectionData.pruefungsrelevanz === 'mittel'
                          ? '#d97706'
                          : '#16a34a',
                  },
                ]}
              >
                {sectionData.pruefungsrelevanz}
              </Text>
            </View>
          )}
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#64748b" />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionContent}>
            {/* Main Content */}
            {sectionData.content && <Text style={styles.contentText}>{sectionData.content}</Text>}

            {/* Tables */}
            {sectionData.tabellen?.map((table, idx) => renderTable(table, idx))}

            {/* Prüferfragen */}
            {sectionData.fragen && renderPrueferFragen(sectionData.fragen)}

            {/* MERKE Box */}
            {sectionData.merke && (
              <View style={styles.merkeBox}>
                <View style={styles.merkeHeader}>
                  <Text style={styles.merkeIcon}>💡</Text>
                  <Text style={styles.merkeLabel}>MERKE</Text>
                </View>
                <Text style={styles.merkeText}>{sectionData.merke}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Lade Thema...</Text>
      </View>
    );
  }

  if (!topic) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Thema nicht gefunden</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Zurück</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const availableSections = sectionConfig.filter((s) => topic?.content?.[s.key]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Single ScrollView for full page scrolling */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentFull}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={['#6366f1', '#4f46e5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerBreadcrumb}>
              <Text style={styles.breadcrumbText}>{topic.fachgebiet}</Text>
              <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.breadcrumbText}>{topic.bereich}</Text>
            </View>
            <Text style={styles.headerTitle}>{topic.title_de}</Text>
            <View style={styles.headerBadges}>
              <View style={[styles.priorityBadge, { backgroundColor: priorityColors[topic.priority] }]}>
                <Text style={styles.priorityBadgeText}>{topic.priority}</Text>
              </View>
              <View style={styles.fspBadge}>
                <Text style={styles.fspBadgeText}>FSP</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Nav - inside ScrollView */}
        <View style={styles.quickNav}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickNavContent}
            nestedScrollEnabled={true}
          >
            {sectionConfig.map((config) => {
              const hasContent = topic?.content?.[config.key];
              if (!hasContent) return null;
              return (
                <TouchableOpacity
                  key={config.key}
                  style={[styles.quickNavItem, expandedSections.has(config.key) && styles.quickNavItemActive]}
                  onPress={() => toggleSection(config.key)}
                >
                  <Text style={styles.quickNavEmoji}>{config.emoji}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.toggleAllButton} onPress={toggleAllSections}>
              <Ionicons
                name={expandedSections.size === availableSections.length ? 'contract' : 'expand'}
                size={16}
                color="#6366f1"
              />
              <Text style={styles.toggleAllText}>
                {expandedSections.size === availableSections.length ? 'Alle ▲' : 'Alle ▼'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Content sections */}
        <View style={styles.contentArea}>{sectionConfig.map((config) => renderSection(config))}</View>

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContentFull: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 18,
    color: '#ef4444',
    fontWeight: '600',
  },
  errorButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6366f1',
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 8 : 30,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    marginBottom: 8,
  },
  headerContent: {
    marginLeft: 4,
  },
  headerBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  breadcrumbText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginHorizontal: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  fspBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  fspBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  quickNav: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  quickNavContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  quickNavItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  quickNavItemActive: {
    backgroundColor: '#e0e7ff',
  },
  quickNavEmoji: {
    fontSize: 18,
  },
  toggleAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    marginLeft: 8,
  },
  toggleAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 4,
  },
  contentArea: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  sectionEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  relevanzBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 10,
  },
  relevanzText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
    marginBottom: 12,
  },
  tableContainer: {
    marginVertical: 12,
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  table: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
  },
  tableHeaderCell: {
    minWidth: 140,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: '#334155',
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    minWidth: 140,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  tableCellText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  fragenContainer: {
    marginTop: 8,
  },
  frageItem: {
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  frageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  frageNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  frageNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  frageText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 22,
  },
  antwortContainer: {
    marginLeft: 40,
  },
  antwortLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  antwortText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
  merkeBox: {
    marginTop: 16,
    backgroundColor: '#fef9c3',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#eab308',
  },
  merkeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  merkeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  merkeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a16207',
    textTransform: 'uppercase',
  },
  merkeText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#713f12',
    fontWeight: '500',
  },
});
