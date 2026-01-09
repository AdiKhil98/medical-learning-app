// app/(tabs)/bibliothek/kp/[slug].tsx
// Improved KP Topic Detail Page - Beautiful medical content display

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface TableData {
  titel: string;
  spalten: string[];
  zeilen: string[][];
}

interface Section {
  content: string;
  merke?: string;
  pruefungsrelevanz?: string;
  tabellen?: TableData[];
}

interface KPContent {
  id: string;
  slug: string;
  title_de: string;
  title_short: string | null;
  fachgebiet: string;
  bereich: string;
  priority: string;
  content: string;
}

interface ParsedContent {
  definition?: Section;
  epidemiologie?: Section;
  aetiologie?: Section;
  klassifikation?: Section;
  pathophysiologie?: Section;
  symptome?: Section;
  diagnostik?: Section;
  differentialdiagnosen?: Section;
  therapie?: Section;
  komplikationen?: Section;
  prognose?: Section;
  praevention?: Section;
  pruefungsfokus?: Section;
}

// Section configuration
const SECTION_CONFIG: Record<string, { title: string; icon: string; color: string; emoji: string }> = {
  definition: { title: 'Definition', icon: 'book-outline', color: '#6366f1', emoji: '📖' },
  epidemiologie: { title: 'Epidemiologie', icon: 'stats-chart-outline', color: '#0ea5e9', emoji: '📊' },
  aetiologie: { title: 'Ätiologie & Risikofaktoren', icon: 'git-branch-outline', color: '#8b5cf6', emoji: '🔬' },
  klassifikation: { title: 'Klassifikation', icon: 'layers-outline', color: '#ec4899', emoji: '📋' },
  pathophysiologie: { title: 'Pathophysiologie', icon: 'pulse-outline', color: '#f59e0b', emoji: '⚙️' },
  symptome: { title: 'Symptome & Klinik', icon: 'body-outline', color: '#ef4444', emoji: '🩺' },
  diagnostik: { title: 'Diagnostik', icon: 'search-outline', color: '#10b981', emoji: '🔍' },
  differentialdiagnosen: { title: 'Differentialdiagnosen', icon: 'git-compare-outline', color: '#6366f1', emoji: '⚖️' },
  therapie: { title: 'Therapie', icon: 'medkit-outline', color: '#14b8a6', emoji: '💊' },
  komplikationen: { title: 'Komplikationen', icon: 'warning-outline', color: '#f97316', emoji: '⚠️' },
  prognose: { title: 'Prognose', icon: 'trending-up-outline', color: '#84cc16', emoji: '📈' },
  praevention: { title: 'Prävention', icon: 'shield-checkmark-outline', color: '#22c55e', emoji: '🛡️' },
  pruefungsfokus: { title: 'Prüfungsfokus', icon: 'school-outline', color: '#dc2626', emoji: '🎯' },
};

// Section order for display
const SECTION_ORDER = [
  'definition',
  'epidemiologie',
  'aetiologie',
  'klassifikation',
  'pathophysiologie',
  'symptome',
  'diagnostik',
  'differentialdiagnosen',
  'therapie',
  'komplikationen',
  'prognose',
  'praevention',
  'pruefungsfokus',
];

// Priority styles
const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case '+++':
      return {
        bg: '#fef2f2',
        text: '#dc2626',
        border: '#fecaca',
        label: 'Sehr hohe Prüfungsrelevanz',
        stars: '⭐⭐⭐',
      };
    case '++':
      return {
        bg: '#fffbeb',
        text: '#d97706',
        border: '#fde68a',
        label: 'Hohe Prüfungsrelevanz',
        stars: '⭐⭐',
      };
    case '+':
      return {
        bg: '#eff6ff',
        text: '#2563eb',
        border: '#bfdbfe',
        label: 'Normale Prüfungsrelevanz',
        stars: '⭐',
      };
    default:
      return {
        bg: '#f9fafb',
        text: '#6b7280',
        border: '#e5e7eb',
        label: priority,
        stars: '',
      };
  }
};

// Relevance badge styles
const getRelevanceConfig = (relevance: string) => {
  switch (relevance?.toLowerCase()) {
    case 'hoch':
      return { bg: '#fef2f2', text: '#dc2626', label: 'Hoch' };
    case 'mittel':
      return { bg: '#fffbeb', text: '#d97706', label: 'Mittel' };
    case 'niedrig':
      return { bg: '#f0fdf4', text: '#16a34a', label: 'Niedrig' };
    default:
      return { bg: '#f9fafb', text: '#6b7280', label: relevance || '' };
  }
};

export default function KPTopicDetail() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const [topic, setTopic] = useState<KPContent | null>(null);
  const [parsedContent, setParsedContent] = useState<ParsedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(SECTION_ORDER));

  // Fetch topic
  const fetchTopic = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('kp_medical_content')
        .select('*')
        .eq('slug', slug)
        .single();

      if (fetchError) throw fetchError;
      setTopic(data);

      // Parse JSON content
      if (data?.content) {
        try {
          let contentObj = data.content;
          if (typeof contentObj === 'string') {
            const jsonStart = contentObj.indexOf('{');
            if (jsonStart > 0) {
              contentObj = contentObj.substring(jsonStart);
            }
            contentObj = JSON.parse(contentObj);
          }
          setParsedContent(contentObj);
        } catch (parseError) {
          console.error('Error parsing content:', parseError);
          setError('Inhalt konnte nicht geladen werden');
        }
      }
    } catch (err) {
      console.error('Error fetching topic:', err);
      setError('Thema nicht gefunden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchTopic();
  }, [fetchTopic]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTopic();
  }, [fetchTopic]);

  // Toggle section
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

  // Expand/collapse all
  const toggleAllSections = () => {
    if (expandedSections.size === SECTION_ORDER.length) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(SECTION_ORDER));
    }
  };

  // Render table
  const renderTable = (table: TableData, index: number) => (
    <View key={`table-${index}`} style={styles.tableWrapper}>
      <View style={styles.tableHeader}>
        <Ionicons name="grid-outline" size={14} color="#6366f1" />
        <Text style={styles.tableTitle}>{table.titel}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeaderRow}>
            {table.spalten.map((header, idx) => (
              <View key={idx} style={[styles.tableCell, styles.tableHeaderCell]}>
                <Text style={styles.tableHeaderText}>{header}</Text>
              </View>
            ))}
          </View>
          {/* Data Rows */}
          {table.zeilen.map((row, rowIdx) => (
            <View key={rowIdx} style={[styles.tableDataRow, rowIdx % 2 === 0 && styles.tableRowStriped]}>
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

  // Render MERKE box
  const renderMerkeBox = (merke: string) => (
    <View style={styles.merkeBox}>
      <LinearGradient
        colors={['#fef3c7', '#fde68a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.merkeGradient}
      >
        <View style={styles.merkeIconContainer}>
          <Text style={styles.merkeIcon}>💡</Text>
        </View>
        <View style={styles.merkeContent}>
          <Text style={styles.merkeLabel}>MERKE</Text>
          <Text style={styles.merkeText}>{merke}</Text>
        </View>
      </LinearGradient>
    </View>
  );

  // Render section
  const renderSection = (key: string, section: Section) => {
    const config = SECTION_CONFIG[key];
    if (!config) return null;

    const isExpanded = expandedSections.has(key);
    const isPruefungsfokus = key === 'pruefungsfokus';
    const relevanceConfig = section.pruefungsrelevanz ? getRelevanceConfig(section.pruefungsrelevanz) : null;

    return (
      <View key={key} style={[styles.sectionCard, isPruefungsfokus && styles.sectionCardHighlight]}>
        {/* Section Header */}
        <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(key)} activeOpacity={0.7}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIconBg, { backgroundColor: `${config.color  }15` }]}>
              <Text style={styles.sectionEmoji}>{config.emoji}</Text>
            </View>
            <Text style={styles.sectionTitle}>{config.title}</Text>
          </View>
          <View style={styles.sectionHeaderRight}>
            {relevanceConfig && relevanceConfig.label && (
              <View style={[styles.relevanceBadge, { backgroundColor: relevanceConfig.bg }]}>
                <Text style={[styles.relevanceText, { color: relevanceConfig.text }]}>{relevanceConfig.label}</Text>
              </View>
            )}
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#9ca3af" />
          </View>
        </TouchableOpacity>

        {/* Section Content */}
        {isExpanded && (
          <View style={styles.sectionBody}>
            {/* Main Content Text */}
            <Text style={styles.contentText}>{section.content}</Text>

            {/* Tables */}
            {section.tabellen && section.tabellen.length > 0 && (
              <View style={styles.tablesContainer}>
                {section.tabellen.map((table, idx) => renderTable(table, idx))}
              </View>
            )}

            {/* MERKE Box - Always at the end */}
            {section.merke && renderMerkeBox(section.merke)}
          </View>
        )}
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Lade Inhalt...</Text>
      </View>
    );
  }

  // Error state
  if (error || !topic) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorText}>{error || 'Thema nicht gefunden'}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Zurück</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const priorityConfig = getPriorityConfig(topic.priority);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#6366f1', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.expandButton} onPress={toggleAllSections}>
            <Text style={styles.expandButtonText}>
              {expandedSections.size === SECTION_ORDER.length ? 'Alle einklappen' : 'Alle ausklappen'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Title Area */}
        <View style={styles.titleArea}>
          <View style={styles.breadcrumb}>
            <Text style={styles.breadcrumbText}>{topic.fachgebiet}</Text>
            <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.6)" />
            <Text style={styles.breadcrumbText}>{topic.bereich}</Text>
          </View>

          <Text style={styles.topicTitle}>{topic.title_de}</Text>

          {topic.title_short && <Text style={styles.topicShort}>({topic.title_short})</Text>}

          {/* Priority Badge */}
          <View style={styles.priorityContainer}>
            <View style={[styles.priorityBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.priorityStars}>{priorityConfig.stars}</Text>
              <Text style={styles.priorityLabel}>{priorityConfig.label}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Nav */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickNav}
        contentContainerStyle={styles.quickNavContent}
      >
        {SECTION_ORDER.map((key) => {
          if (!parsedContent || !parsedContent[key as keyof ParsedContent]) return null;
          const config = SECTION_CONFIG[key];
          return (
            <TouchableOpacity
              key={key}
              style={styles.quickNavItem}
              onPress={() => {
                if (!expandedSections.has(key)) {
                  setExpandedSections((prev) => new Set([...prev, key]));
                }
                // TODO: Scroll to section
              }}
            >
              <Text style={styles.quickNavEmoji}>{config.emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {parsedContent &&
          SECTION_ORDER.map((key) => {
            const section = parsedContent[key as keyof ParsedContent];
            return section ? renderSection(key, section) : null;
          })}

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  expandButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  titleArea: {
    paddingHorizontal: 20,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breadcrumbText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginHorizontal: 4,
  },
  topicTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 32,
  },
  topicShort: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  priorityContainer: {
    marginTop: 16,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  priorityStars: {
    fontSize: 14,
    marginRight: 8,
  },
  priorityLabel: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },

  // Quick Nav
  quickNav: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    maxHeight: 56,
  },
  quickNavContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  quickNavItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quickNavEmoji: {
    fontSize: 18,
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  bottomSpacer: {
    height: 100,
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      },
    }),
  },
  sectionCardHighlight: {
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relevanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  relevanceText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sectionBody: {
    padding: 20,
  },

  // Content Text
  contentText: {
    fontSize: 15,
    lineHeight: 26,
    color: '#374151',
    marginBottom: 16,
  },

  // Tables
  tablesContainer: {
    marginBottom: 16,
  },
  tableWrapper: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 8,
  },
  tableScroll: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
  },
  tableDataRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  tableRowStriped: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    minWidth: 120,
    maxWidth: 200,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderCell: {
    borderRightColor: '#374151',
    borderBottomColor: '#374151',
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  tableCellText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },

  // MERKE Box
  merkeBox: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  merkeGradient: {
    flexDirection: 'row',
    padding: 16,
  },
  merkeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  merkeIcon: {
    fontSize: 22,
  },
  merkeContent: {
    flex: 1,
  },
  merkeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
    letterSpacing: 1,
    marginBottom: 6,
  },
  merkeText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#78350f',
    fontStyle: 'italic',
  },
});
