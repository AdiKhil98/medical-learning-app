// app/(tabs)/bibliothek/kp/index.tsx
// Enhanced KP Bibliothek - Fachgebiet tabs + Bereich grid cards

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 8;
const CARD_WIDTH = (SCREEN_WIDTH - 48 - CARD_MARGIN) / 2;

// Types
interface KPTopic {
  id: string;
  slug: string;
  title_de: string;
  title_short: string | null;
  fachgebiet: string;
  bereich: string;
  priority: string;
  status: string;
}

interface BereichStats {
  bereich: string;
  count: number;
  priorities: { [key: string]: number };
}

interface FachgebietData {
  bereiche: { [bereich: string]: KPTopic[] };
  totalCount: number;
}

// Fachgebiet icons and colors
const FACHGEBIET_CONFIG: Record<string, { icon: string; color: string; gradient: string[] }> = {
  'Innere Medizin': { icon: 'heart', color: '#ef4444', gradient: ['#ef4444', '#dc2626'] },
  Chirurgie: { icon: 'cut', color: '#8b5cf6', gradient: ['#8b5cf6', '#7c3aed'] },
  Neurologie: { icon: 'flash', color: '#3b82f6', gradient: ['#3b82f6', '#2563eb'] },
  Notfallmedizin: { icon: 'warning', color: '#f59e0b', gradient: ['#f59e0b', '#d97706'] },
  Urologie: { icon: 'water', color: '#06b6d4', gradient: ['#06b6d4', '#0891b2'] },
  Rheumatologie: { icon: 'body', color: '#10b981', gradient: ['#10b981', '#059669'] },
  EKG: { icon: 'pulse', color: '#14b8a6', gradient: ['#14b8a6', '#0d9488'] },
};

// Bereich icons
const BEREICH_ICONS: Record<string, string> = {
  Kardiologie: 'heart',
  Pneumologie: 'cloud',
  Gastroenterologie: 'nutrition',
  Endokrinologie: 'flask',
  Nephrologie: 'water',
  Hämatologie: 'water',
  Allgemeinchirurgie: 'cut',
  Unfallchirurgie: 'bandage',
  'Zentrale Erkrankungen': 'flash',
  'Periphere Nerven': 'git-branch',
  Wirbelsäule: 'fitness',
  Schlafmedizin: 'moon',
  'Kardiologische Notfälle': 'pulse',
  'Gastrointestinale Notfälle': 'alert-circle',
  'Traumatologische Notfälle': 'medkit',
  Urologie: 'water',
  Rheumatologie: 'body',
  // EKG Bereiche
  'EKG Grundlagen': 'pulse',
  Rhythmusstörungen: 'heart-circle',
  'Ischämie und Infarkt': 'warning',
  'Weitere Pathologien': 'medical',
};

// Priority badge colors
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case '+++':
      return { bg: '#fee2e2', text: '#dc2626', label: 'Sehr hoch' };
    case '++':
      return { bg: '#fef3c7', text: '#d97706', label: 'Hoch' };
    case '+':
      return { bg: '#dbeafe', text: '#2563eb', label: 'Normal' };
    default:
      return { bg: '#f3f4f6', text: '#6b7280', label: priority };
  }
};

export default function KPBibliothekIndex() {
  const router = useRouter();
  const [topics, setTopics] = useState<KPTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFachgebiet, setSelectedFachgebiet] = useState<string | null>(null);
  const [selectedBereich, setSelectedBereich] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  // Fetch topics from Supabase
  const fetchTopics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('kp_medical_content')
        .select('id, slug, title_de, title_short, fachgebiet, bereich, priority, status')
        .eq('status', 'active')
        .order('fachgebiet', { ascending: true })
        .order('bereich', { ascending: true })
        .order('title_de', { ascending: true });

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching KP topics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTopics();
  }, [fetchTopics]);

  // Group topics by Fachgebiet and Bereich
  const groupedData = useMemo(() => {
    const grouped: { [fachgebiet: string]: FachgebietData } = {};

    topics.forEach((topic) => {
      if (!grouped[topic.fachgebiet]) {
        grouped[topic.fachgebiet] = { bereiche: {}, totalCount: 0 };
      }
      if (!grouped[topic.fachgebiet].bereiche[topic.bereich]) {
        grouped[topic.fachgebiet].bereiche[topic.bereich] = [];
      }
      grouped[topic.fachgebiet].bereiche[topic.bereich].push(topic);
      grouped[topic.fachgebiet].totalCount++;
    });

    return grouped;
  }, [topics]);

  // Get Fachgebiete list
  const fachgebiete = useMemo(() => Object.keys(groupedData), [groupedData]);

  // Get Bereiche for selected Fachgebiet
  const bereicheStats = useMemo((): BereichStats[] => {
    if (!selectedFachgebiet || !groupedData[selectedFachgebiet]) return [];

    const bereiche = groupedData[selectedFachgebiet].bereiche;
    return Object.entries(bereiche).map(([bereich, topicsList]) => {
      const priorities: { [key: string]: number } = { '+++': 0, '++': 0, '+': 0 };
      topicsList.forEach((t) => {
        if (priorities[t.priority] !== undefined) {
          priorities[t.priority]++;
        }
      });
      return { bereich, count: topicsList.length, priorities };
    });
  }, [selectedFachgebiet, groupedData]);

  // Get topics for selected Bereich
  const filteredTopics = useMemo(() => {
    if (!selectedFachgebiet || !selectedBereich) return [];

    let result = groupedData[selectedFachgebiet]?.bereiche[selectedBereich] || [];

    if (filterPriority) {
      result = result.filter((t) => t.priority === filterPriority);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title_de.toLowerCase().includes(query) || (t.title_short && t.title_short.toLowerCase().includes(query))
      );
    }

    return result;
  }, [selectedFachgebiet, selectedBereich, filterPriority, searchQuery, groupedData]);

  // Search across all topics
  const searchResults = useMemo(() => {
    if (!searchQuery || selectedBereich) return [];

    const query = searchQuery.toLowerCase();
    let results = topics.filter(
      (t) => t.title_de.toLowerCase().includes(query) || (t.title_short && t.title_short.toLowerCase().includes(query))
    );

    if (selectedFachgebiet) {
      results = results.filter((t) => t.fachgebiet === selectedFachgebiet);
    }

    if (filterPriority) {
      results = results.filter((t) => t.priority === filterPriority);
    }

    return results.slice(0, 20); // Limit search results
  }, [searchQuery, topics, selectedFachgebiet, selectedBereich, filterPriority]);

  // Navigation handlers
  const handleTopicPress = (slug: string) => {
    router.push(`/bibliothek/kp/${slug}` as any);
  };

  const handleBereichPress = (bereich: string) => {
    setSelectedBereich(bereich);
  };

  const handleBack = () => {
    if (selectedBereich) {
      setSelectedBereich(null);
    } else if (selectedFachgebiet) {
      setSelectedFachgebiet(null);
    } else {
      router.back();
    }
  };

  // Render Fachgebiet tabs
  const renderFachgebietTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
      contentContainerStyle={styles.tabsContent}
    >
      <TouchableOpacity
        style={[styles.tab, !selectedFachgebiet && styles.tabActive]}
        onPress={() => {
          setSelectedFachgebiet(null);
          setSelectedBereich(null);
        }}
      >
        <Text style={[styles.tabText, !selectedFachgebiet && styles.tabTextActive]}>Alle</Text>
        <View style={[styles.tabBadge, !selectedFachgebiet && styles.tabBadgeActive]}>
          <Text style={[styles.tabBadgeText, !selectedFachgebiet && styles.tabBadgeTextActive]}>{topics.length}</Text>
        </View>
      </TouchableOpacity>

      {fachgebiete.map((fach) => {
        const isActive = selectedFachgebiet === fach;
        const config = FACHGEBIET_CONFIG[fach] || { icon: 'folder', color: '#666', gradient: ['#666', '#444'] };
        const count = groupedData[fach].totalCount;

        return (
          <TouchableOpacity
            key={fach}
            style={[styles.tab, isActive && { backgroundColor: `${config.color}20`, borderColor: config.color }]}
            onPress={() => {
              setSelectedFachgebiet(fach);
              setSelectedBereich(null);
            }}
          >
            <Ionicons
              name={config.icon as any}
              size={16}
              color={isActive ? config.color : '#666'}
              style={styles.tabIcon}
            />
            <Text style={[styles.tabText, isActive && { color: config.color }]} numberOfLines={1}>
              {fach.replace('Innere Medizin', 'Innere').replace('Notfallmedizin', 'Notfall')}
            </Text>
            <View style={[styles.tabBadge, isActive && { backgroundColor: config.color }]}>
              <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{count}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // Render priority filters
  const renderPriorityFilters = () => (
    <View style={styles.priorityFilters}>
      {[null, '+++', '++', '+'].map((p) => {
        const isActive = filterPriority === p;
        const colors = p ? getPriorityColor(p) : { bg: '#667eea', text: '#fff', label: 'Alle' };

        return (
          <TouchableOpacity
            key={p || 'all'}
            style={[
              styles.priorityChip,
              isActive && { backgroundColor: p ? colors.bg : '#667eea', borderColor: p ? colors.text : '#667eea' },
            ]}
            onPress={() => setFilterPriority(p)}
          >
            <Text style={[styles.priorityChipText, isActive && { color: p ? colors.text : '#fff' }]}>
              {p || 'Alle'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Render Bereich grid cards
  const renderBereichGrid = () => (
    <View style={styles.bereichGrid}>
      {bereicheStats.map((item) => {
        const icon = BEREICH_ICONS[item.bereich] || 'folder';
        const fachConfig = FACHGEBIET_CONFIG[selectedFachgebiet!] || { color: '#666', gradient: ['#666', '#444'] };

        return (
          <TouchableOpacity
            key={item.bereich}
            style={styles.bereichCard}
            onPress={() => handleBereichPress(item.bereich)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={fachConfig.gradient as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bereichCardGradient}
            >
              <View style={styles.bereichIconContainer}>
                <Ionicons name={icon as any} size={28} color="#fff" />
              </View>
              <Text style={styles.bereichTitle} numberOfLines={2}>
                {item.bereich}
              </Text>
              <Text style={styles.bereichCount}>
                {item.count} {item.count === 1 ? 'Thema' : 'Themen'}
              </Text>
              <View style={styles.bereichPriorities}>
                {item.priorities['+++'] > 0 && (
                  <View style={[styles.miniPriorityBadge, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                    <Text style={styles.miniPriorityText}>+++ {item.priorities['+++']}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Render topic cards in grid
  const renderTopicGrid = () => (
    <View style={styles.topicGrid}>
      {filteredTopics.map((topic) => {
        const priorityColors = getPriorityColor(topic.priority);

        return (
          <TouchableOpacity
            key={topic.id}
            style={styles.topicCard}
            onPress={() => handleTopicPress(topic.slug)}
            activeOpacity={0.8}
          >
            <View style={styles.topicCardContent}>
              <View style={[styles.topicPriorityBadge, { backgroundColor: priorityColors.bg }]}>
                <Text style={[styles.topicPriorityText, { color: priorityColors.text }]}>{topic.priority}</Text>
              </View>
              <Text style={styles.topicTitle} numberOfLines={2}>
                {topic.title_de}
              </Text>
              {topic.title_short && <Text style={styles.topicShort}>({topic.title_short})</Text>}
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ccc" style={styles.topicArrow} />
          </TouchableOpacity>
        );
      })}

      {filteredTopics.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>Keine Themen gefunden</Text>
        </View>
      )}
    </View>
  );

  // Render search results
  const renderSearchResults = () => (
    <View style={styles.searchResults}>
      <Text style={styles.searchResultsTitle}>
        {searchResults.length} Ergebnis{searchResults.length !== 1 ? 'se' : ''} für "{searchQuery}"
      </Text>
      {searchResults.map((topic) => {
        const priorityColors = getPriorityColor(topic.priority);

        return (
          <TouchableOpacity key={topic.id} style={styles.searchResultItem} onPress={() => handleTopicPress(topic.slug)}>
            <View style={styles.searchResultContent}>
              <Text style={styles.searchResultTitle}>{topic.title_de}</Text>
              <Text style={styles.searchResultPath}>
                {topic.fachgebiet} → {topic.bereich}
              </Text>
            </View>
            <View style={[styles.topicPriorityBadge, { backgroundColor: priorityColors.bg }]}>
              <Text style={[styles.topicPriorityText, { color: priorityColors.text }]}>{topic.priority}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Render overview (all Fachgebiete as cards)
  const renderOverview = () => (
    <View style={styles.overviewGrid}>
      {fachgebiete.map((fach) => {
        const config = FACHGEBIET_CONFIG[fach] || { icon: 'folder', color: '#666', gradient: ['#666', '#444'] };
        const data = groupedData[fach];
        const bereichCount = Object.keys(data.bereiche).length;

        return (
          <TouchableOpacity
            key={fach}
            style={styles.overviewCard}
            onPress={() => setSelectedFachgebiet(fach)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={config.gradient as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.overviewCardGradient}
            >
              <View style={styles.overviewIconContainer}>
                <Ionicons name={config.icon as any} size={32} color="#fff" />
              </View>
              <Text style={styles.overviewTitle}>{fach}</Text>
              <Text style={styles.overviewStats}>
                {bereichCount} Bereiche • {data.totalCount} Themen
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Lade Inhalte...</Text>
      </View>
    );
  }

  // Determine current view title
  const getHeaderTitle = () => {
    if (selectedBereich) return selectedBereich;
    if (selectedFachgebiet) return selectedFachgebiet;
    return 'Bibliothek (444)';
  };

  const getHeaderSubtitle = () => {
    if (selectedBereich) return `${filteredTopics.length} Themen`;
    if (selectedFachgebiet)
      return `${bereicheStats.length} Bereiche • ${groupedData[selectedFachgebiet].totalCount} Themen`;
    return `${topics.length} Themen für die Kenntnisprüfung`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {getHeaderTitle()}
          </Text>
          <Text style={styles.headerSubtitle}>{getHeaderSubtitle()}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Thema suchen..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Fachgebiet Tabs */}
      {renderFachgebietTabs()}

      {/* Priority Filters (show when in Bereich view) */}
      {selectedBereich && renderPriorityFilters()}

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Show search results if searching */}
        {searchQuery && !selectedBereich && searchResults.length > 0 && renderSearchResults()}

        {/* Show overview if no Fachgebiet selected */}
        {!selectedFachgebiet && !searchQuery && renderOverview()}

        {/* Show Bereich grid if Fachgebiet selected but no Bereich */}
        {selectedFachgebiet && !selectedBereich && !searchQuery && renderBereichGrid()}

        {/* Show topic grid if Bereich selected */}
        {selectedBereich && renderTopicGrid()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 15,
    color: '#1a1a2e',
  },
  tabsContainer: {
    maxHeight: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#667eea20',
    borderColor: '#667eea',
  },
  tabIcon: {
    marginRight: 4,
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#667eea',
  },
  tabBadge: {
    marginLeft: 6,
    backgroundColor: '#ddd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: '#667eea',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  tabBadgeTextActive: {
    color: '#fff',
  },
  priorityFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  priorityChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  // Overview grid (all Fachgebiete)
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -CARD_MARGIN / 2,
  },
  overviewCard: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN / 2,
    marginBottom: CARD_MARGIN * 2,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  overviewCardGradient: {
    padding: 16,
    minHeight: 140,
  },
  overviewIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  overviewStats: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  // Bereich grid
  bereichGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -CARD_MARGIN / 2,
  },
  bereichCard: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN / 2,
    marginBottom: CARD_MARGIN * 2,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  bereichCardGradient: {
    padding: 14,
    minHeight: 120,
  },
  bereichIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  bereichTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  bereichCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  bereichPriorities: {
    flexDirection: 'row',
    marginTop: 8,
  },
  miniPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  miniPriorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  // Topic grid
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -CARD_MARGIN / 2,
  },
  topicCard: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN / 2,
    marginBottom: CARD_MARGIN * 1.5,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  topicCardContent: {
    flex: 1,
  },
  topicPriorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  topicPriorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    lineHeight: 18,
  },
  topicShort: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  topicArrow: {
    marginLeft: 8,
  },
  // Search results
  searchResults: {
    marginBottom: 16,
  },
  searchResultsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  searchResultPath: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  // Empty state
  emptyState: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
});
