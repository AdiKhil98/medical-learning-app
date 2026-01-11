import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');
const CARD_GAP = 16;
const HORIZONTAL_PADDING = 20;
const CARD_WIDTH = (width - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

interface Topic {
  id: string;
  slug: string;
  title_de: string;
  fachgebiet: string;
  bereich: string;
  priority: string;
}

// Fachgebiet configuration matching KP (444) exactly
const fachgebietConfig: {
  [key: string]: {
    gradient: [string, string];
    icon: keyof typeof Ionicons.glyphMap;
  };
} = {
  'Innere Medizin': {
    gradient: ['#ef4444', '#dc2626'],
    icon: 'heart',
  },
  Chirurgie: {
    gradient: ['#a855f7', '#7c3aed'],
    icon: 'cut',
  },
  Neurologie: {
    gradient: ['#3b82f6', '#2563eb'],
    icon: 'flash',
  },
  Notfallmedizin: {
    gradient: ['#f97316', '#ea580c'],
    icon: 'alert-circle',
  },
  Sonstige: {
    gradient: ['#06b6d4', '#0891b2'],
    icon: 'ellipsis-horizontal-circle',
  },
};

// Priority colors
const priorityColors: { [key: string]: string } = {
  '+++': '#ef4444',
  '++': '#a855f7',
  '+': '#3b82f6',
};

type ViewLevel = 'fachgebiet' | 'bereich' | 'topics';

export default function FSPBibliothekIndex() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewLevel, setViewLevel] = useState<ViewLevel>('fachgebiet');
  const [selectedFachgebiet, setSelectedFachgebiet] = useState<string | null>(null);
  const [selectedBereich, setSelectedBereich] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fsp_bibliothek')
        .select('id, slug, title_de, fachgebiet, bereich, priority')
        .eq('status', 'active')
        .order('title_de');

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching FSP topics:', error);
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

  // Group data by Fachgebiet and Bereich
  const groupedData = useMemo(() => {
    const result: {
      [fachgebiet: string]: {
        bereiche: { [bereich: string]: Topic[] };
        totalCount: number;
        bereichCount: number;
      };
    } = {};

    topics.forEach((topic) => {
      if (!result[topic.fachgebiet]) {
        result[topic.fachgebiet] = { bereiche: {}, totalCount: 0, bereichCount: 0 };
      }
      if (!result[topic.fachgebiet].bereiche[topic.bereich]) {
        result[topic.fachgebiet].bereiche[topic.bereich] = [];
        result[topic.fachgebiet].bereichCount++;
      }
      result[topic.fachgebiet].bereiche[topic.bereich].push(topic);
      result[topic.fachgebiet].totalCount++;
    });

    return result;
  }, [topics]);

  // Get unique Fachgebiete for filter tabs
  const fachgebiete = useMemo(() => Object.keys(groupedData), [groupedData]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return topics.filter((t) => t.title_de.toLowerCase().includes(query) || t.bereich.toLowerCase().includes(query));
  }, [topics, searchQuery]);

  // Get filtered topics for current view
  const currentTopics = useMemo(() => {
    if (!selectedFachgebiet || !selectedBereich) return [];
    let result = groupedData[selectedFachgebiet]?.bereiche[selectedBereich] || [];
    if (filterPriority) {
      result = result.filter((t) => t.priority === filterPriority);
    }
    return result;
  }, [groupedData, selectedFachgebiet, selectedBereich, filterPriority]);

  // Navigation
  const goBack = () => {
    if (viewLevel === 'topics') {
      setViewLevel('bereich');
      setSelectedBereich(null);
      setFilterPriority(null);
    } else if (viewLevel === 'bereich') {
      setViewLevel('fachgebiet');
      setSelectedFachgebiet(null);
    } else {
      router.back();
    }
  };

  const getTitle = () => {
    if (viewLevel === 'topics') return selectedBereich || '';
    if (viewLevel === 'bereich') return selectedFachgebiet || '';
    return 'FSP Bibliothek';
  };

  const getSubtitle = () => {
    if (viewLevel === 'topics') {
      const count = groupedData[selectedFachgebiet!]?.bereiche[selectedBereich!]?.length || 0;
      return `${count} Themen`;
    }
    if (viewLevel === 'bereich') {
      const data = groupedData[selectedFachgebiet!];
      return `${data?.bereichCount || 0} Bereiche • ${data?.totalCount || 0} Themen`;
    }
    return `${topics.length} Themen für die Fachsprachprüfung`;
  };

  const handleTopicPress = (slug: string) => {
    router.push(`/bibliothek/fsp/bibliothek/${slug}`);
  };

  // Render Fachgebiet filter tabs (horizontal scroll)
  const renderFilterTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterTabsContainer}
      contentContainerStyle={styles.filterTabsContent}
    >
      <TouchableOpacity
        style={[styles.filterTab, !selectedFachgebiet && viewLevel === 'fachgebiet' && styles.filterTabActive]}
        onPress={() => {
          setViewLevel('fachgebiet');
          setSelectedFachgebiet(null);
          setSelectedBereich(null);
        }}
      >
        <Text
          style={[
            styles.filterTabText,
            !selectedFachgebiet && viewLevel === 'fachgebiet' && styles.filterTabTextActive,
          ]}
        >
          Alle
        </Text>
        <View
          style={[
            styles.filterTabBadge,
            !selectedFachgebiet && viewLevel === 'fachgebiet' && styles.filterTabBadgeActive,
          ]}
        >
          <Text
            style={[
              styles.filterTabBadgeText,
              !selectedFachgebiet && viewLevel === 'fachgebiet' && styles.filterTabBadgeTextActive,
            ]}
          >
            {topics.length}
          </Text>
        </View>
      </TouchableOpacity>

      {fachgebiete.map((fg) => {
        const config = fachgebietConfig[fg] || fachgebietConfig['Sonstige'];
        const isActive = selectedFachgebiet === fg;
        const count = groupedData[fg]?.totalCount || 0;

        return (
          <TouchableOpacity
            key={fg}
            style={[styles.filterTab, isActive && styles.filterTabActive]}
            onPress={() => {
              setSelectedFachgebiet(fg);
              setViewLevel('bereich');
              setSelectedBereich(null);
            }}
          >
            <Ionicons name={config.icon} size={16} color={isActive ? '#fff' : '#64748b'} style={{ marginRight: 6 }} />
            <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
              {fg.replace('Innere Medizin', 'Innere').replace('Notfallmedizin', 'Notfall')}
            </Text>
            <View style={[styles.filterTabBadge, isActive && styles.filterTabBadgeActive]}>
              <Text style={[styles.filterTabBadgeText, isActive && styles.filterTabBadgeTextActive]}>{count}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // Render Fachgebiet cards (Level 1)
  const renderFachgebietGrid = () => (
    <View style={styles.cardGrid}>
      {fachgebiete.map((fg) => {
        const config = fachgebietConfig[fg] || fachgebietConfig['Sonstige'];
        const data = groupedData[fg];

        return (
          <TouchableOpacity
            key={fg}
            style={styles.fachgebietCard}
            onPress={() => {
              setSelectedFachgebiet(fg);
              setViewLevel('bereich');
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={config.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fachgebietCardGradient}
            >
              <View style={styles.fachgebietIconContainer}>
                <Ionicons name={config.icon} size={24} color="#fff" />
              </View>
              <Text style={styles.fachgebietCardTitle}>{fg}</Text>
              <Text style={styles.fachgebietCardSubtitle}>
                {data.bereichCount} Bereiche • {data.totalCount} Themen
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Render Bereich cards (Level 2)
  const renderBereichGrid = () => {
    if (!selectedFachgebiet) return null;
    const bereiche = Object.keys(groupedData[selectedFachgebiet]?.bereiche || {});
    const config = fachgebietConfig[selectedFachgebiet] || fachgebietConfig['Sonstige'];

    return (
      <View style={styles.cardGrid}>
        {bereiche.map((bereich) => {
          const bereichTopics = groupedData[selectedFachgebiet].bereiche[bereich];
          const highPriorityCount = bereichTopics.filter((t) => t.priority === '+++').length;

          return (
            <TouchableOpacity
              key={bereich}
              style={styles.bereichCard}
              onPress={() => {
                setSelectedBereich(bereich);
                setViewLevel('topics');
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[`${config.gradient[0]  }dd`, `${config.gradient[1]  }dd`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bereichCardGradient}
              >
                <View style={styles.bereichIconContainer}>
                  <Ionicons name="folder-open" size={20} color="#fff" />
                </View>
                <Text style={styles.bereichCardTitle}>{bereich}</Text>
                <Text style={styles.bereichCardSubtitle}>{bereichTopics.length} Themen</Text>
                {highPriorityCount > 0 && (
                  <View style={styles.bereichPriorityBadge}>
                    <Text style={styles.bereichPriorityText}>+++ {highPriorityCount}</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render priority filter pills (Level 3)
  const renderPriorityFilter = () => (
    <View style={styles.priorityFilterContainer}>
      <TouchableOpacity
        style={[styles.priorityPill, !filterPriority && styles.priorityPillActive]}
        onPress={() => setFilterPriority(null)}
      >
        <Text style={[styles.priorityPillText, !filterPriority && styles.priorityPillTextActive]}>Alle</Text>
      </TouchableOpacity>
      {['+++', '++', '+'].map((p) => (
        <TouchableOpacity
          key={p}
          style={[
            styles.priorityPill,
            filterPriority === p && styles.priorityPillActive,
            filterPriority === p && { backgroundColor: priorityColors[p] },
          ]}
          onPress={() => setFilterPriority(filterPriority === p ? null : p)}
        >
          <Text style={[styles.priorityPillText, filterPriority === p && styles.priorityPillTextActive]}>{p}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render topics grid (Level 3) - 2 column like KP (444)
  const renderTopicsGrid = () => (
    <View style={styles.topicsGrid}>
      {currentTopics.map((topic) => (
        <TouchableOpacity
          key={topic.id}
          style={styles.topicCard}
          onPress={() => handleTopicPress(topic.slug)}
          activeOpacity={0.7}
        >
          <View style={[styles.topicPriorityPill, { backgroundColor: priorityColors[topic.priority] || '#64748b' }]}>
            <Text style={styles.topicPriorityText}>{topic.priority}</Text>
          </View>
          <Text style={styles.topicTitle} numberOfLines={2}>
            {topic.title_de}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" style={styles.topicArrow} />
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render search results
  const renderSearchResults = () => (
    <View style={styles.searchResults}>
      {searchResults.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color="#cbd5e1" />
          <Text style={styles.emptyStateText}>Keine Ergebnisse für "{searchQuery}"</Text>
        </View>
      ) : (
        searchResults.map((topic) => (
          <TouchableOpacity key={topic.id} style={styles.searchResultCard} onPress={() => handleTopicPress(topic.slug)}>
            <View style={[styles.topicPriorityPill, { backgroundColor: priorityColors[topic.priority] }]}>
              <Text style={styles.topicPriorityText}>{topic.priority}</Text>
            </View>
            <View style={styles.searchResultContent}>
              <Text style={styles.searchResultTitle}>{topic.title_de}</Text>
              <Text style={styles.searchResultMeta}>
                {topic.fachgebiet} › {topic.bereich}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={styles.loadingText}>Lade FSP Bibliothek...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{getTitle()}</Text>
          <Text style={styles.headerSubtitle}>{getSubtitle()}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Thema suchen..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Priority Filter (only on Level 3) */}
      {viewLevel === 'topics' && renderPriorityFilter()}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {searchQuery.trim() !== ''
          ? renderSearchResults()
          : viewLevel === 'fachgebiet'
            ? renderFachgebietGrid()
            : viewLevel === 'bereich'
              ? renderBereichGrid()
              : renderTopicsGrid()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  filterTabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterTabsContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 10,
  },
  filterTabActive: {
    backgroundColor: '#a855f7',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterTabBadge: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  filterTabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterTabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabBadgeTextActive: {
    color: '#fff',
  },
  priorityFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  priorityPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  priorityPillActive: {
    backgroundColor: '#a855f7',
  },
  priorityPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  priorityPillTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  fachgebietCard: {
    width: CARD_WIDTH,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  fachgebietCardGradient: {
    padding: 20,
    minHeight: 140,
  },
  fachgebietIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fachgebietCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  fachgebietCardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  bereichCard: {
    width: CARD_WIDTH,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  bereichCardGradient: {
    padding: 20,
    minHeight: 130,
  },
  bereichIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bereichCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  bereichCardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  bereichPriorityBadge: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bereichPriorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  topicCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topicPriorityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  topicPriorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  topicTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 20,
  },
  topicArrow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  searchResults: {
    gap: 10,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchResultContent: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  searchResultMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 15,
    color: '#94a3b8',
  },
});
