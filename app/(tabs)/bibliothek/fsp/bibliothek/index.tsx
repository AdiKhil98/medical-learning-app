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
const CARD_WIDTH = (width - 48) / 2;

interface Topic {
  id: string;
  slug: string;
  title_de: string;
  fachgebiet: string;
  bereich: string;
  priority: string;
}

// Fachgebiet configuration with colors and icons
const fachgebietConfig: {
  [key: string]: {
    gradient: [string, string];
    icon: keyof typeof Ionicons.glyphMap;
    emoji: string;
  };
} = {
  'Innere Medizin': {
    gradient: ['#667eea', '#764ba2'],
    icon: 'heart',
    emoji: '🫀',
  },
  Chirurgie: {
    gradient: ['#f093fb', '#f5576c'],
    icon: 'cut',
    emoji: '🔪',
  },
  Neurologie: {
    gradient: ['#4facfe', '#00f2fe'],
    icon: 'flash',
    emoji: '🧠',
  },
  Notfallmedizin: {
    gradient: ['#fa709a', '#fee140'],
    icon: 'alert-circle',
    emoji: '🚨',
  },
  Sonstige: {
    gradient: ['#a8edea', '#fed6e3'],
    icon: 'ellipsis-horizontal',
    emoji: '📋',
  },
};

// Bereich configuration with colors
const bereichColors: { [key: string]: [string, string] } = {
  Kardiologie: ['#ef4444', '#dc2626'],
  Pneumologie: ['#3b82f6', '#2563eb'],
  Gastroenterologie: ['#f59e0b', '#d97706'],
  Endokrinologie: ['#8b5cf6', '#7c3aed'],
  Nephrologie: ['#06b6d4', '#0891b2'],
  Hämatologie: ['#ec4899', '#db2777'],
  Rheumatologie: ['#14b8a6', '#0d9488'],
  Allgemeinchirurgie: ['#f97316', '#ea580c'],
  Unfallchirurgie: ['#84cc16', '#65a30d'],
  Zerebrovaskulär: ['#6366f1', '#4f46e5'],
  Kopfschmerzen: ['#a855f7', '#9333ea'],
  Anfallsleiden: ['#eab308', '#ca8a04'],
  Infektionen: ['#22c55e', '#16a34a'],
  Wirbelsäule: ['#64748b', '#475569'],
  Leitsymptome: ['#e11d48', '#be123c'],
  Wundheilung: ['#78716c', '#57534e'],
  Suchtmedizin: ['#0ea5e9', '#0284c7'],
};

const priorityConfig: { [key: string]: { color: string; bgColor: string; stars: string } } = {
  '+++': { color: '#dc2626', bgColor: '#fee2e2', stars: '⭐⭐⭐' },
  '++': { color: '#d97706', bgColor: '#fef3c7', stars: '⭐⭐' },
  '+': { color: '#16a34a', bgColor: '#dcfce7', stars: '⭐' },
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
        .order('fachgebiet')
        .order('bereich')
        .order('priority', { ascending: false });

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

  // Group data
  const groupedData = useMemo(() => {
    const fachgebiete: {
      [key: string]: {
        bereiche: { [key: string]: Topic[] };
        count: number;
      };
    } = {};

    topics.forEach((topic) => {
      if (!fachgebiete[topic.fachgebiet]) {
        fachgebiete[topic.fachgebiet] = { bereiche: {}, count: 0 };
      }
      if (!fachgebiete[topic.fachgebiet].bereiche[topic.bereich]) {
        fachgebiete[topic.fachgebiet].bereiche[topic.bereich] = [];
      }
      fachgebiete[topic.fachgebiet].bereiche[topic.bereich].push(topic);
      fachgebiete[topic.fachgebiet].count++;
    });

    return fachgebiete;
  }, [topics]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return topics.filter(
      (t) =>
        t.title_de.toLowerCase().includes(query) ||
        t.bereich.toLowerCase().includes(query) ||
        t.fachgebiet.toLowerCase().includes(query)
    );
  }, [topics, searchQuery]);

  // Navigate back one level
  const goBack = () => {
    if (viewLevel === 'topics') {
      setViewLevel('bereich');
      setSelectedBereich(null);
    } else if (viewLevel === 'bereich') {
      setViewLevel('fachgebiet');
      setSelectedFachgebiet(null);
    } else {
      router.back();
    }
  };

  // Get current title
  const getTitle = () => {
    if (viewLevel === 'topics' && selectedBereich) return selectedBereich;
    if (viewLevel === 'bereich' && selectedFachgebiet) return selectedFachgebiet;
    return 'FSP Bibliothek';
  };

  // Get current subtitle
  const getSubtitle = () => {
    if (viewLevel === 'topics' && selectedFachgebiet) return selectedFachgebiet;
    if (viewLevel === 'bereich') {
      const count = groupedData[selectedFachgebiet!]?.count || 0;
      return `${count} Themen`;
    }
    return `${topics.length} Themen für das Prüfergespräch`;
  };

  const handleTopicPress = (slug: string) => {
    router.push(`/bibliothek/fsp/bibliothek/${slug}`);
  };

  // Render Fachgebiet cards (Level 1)
  const renderFachgebietGrid = () => {
    const fachgebiete = Object.keys(groupedData);

    return (
      <View style={styles.gridContainer}>
        {fachgebiete.map((fg) => {
          const config = fachgebietConfig[fg] || fachgebietConfig['Sonstige'];
          const count = groupedData[fg].count;
          const bereichCount = Object.keys(groupedData[fg].bereiche).length;

          return (
            <TouchableOpacity
              key={fg}
              style={styles.gridCard}
              onPress={() => {
                setSelectedFachgebiet(fg);
                setViewLevel('bereich');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={config.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gridCardGradient}
              >
                <Text style={styles.gridCardEmoji}>{config.emoji}</Text>
                <Text style={styles.gridCardTitle} numberOfLines={2}>
                  {fg}
                </Text>
                <View style={styles.gridCardStats}>
                  <Text style={styles.gridCardCount}>{count} Themen</Text>
                  <Text style={styles.gridCardBereich}>{bereichCount} Bereiche</Text>
                </View>
                <View style={styles.gridCardArrow}>
                  <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.8)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render Bereich cards (Level 2)
  const renderBereichGrid = () => {
    if (!selectedFachgebiet || !groupedData[selectedFachgebiet]) return null;

    const bereiche = Object.keys(groupedData[selectedFachgebiet].bereiche);

    return (
      <View style={styles.gridContainer}>
        {bereiche.map((bereich) => {
          const topicsInBereich = groupedData[selectedFachgebiet].bereiche[bereich];
          const colors = bereichColors[bereich] || ['#64748b', '#475569'];
          const priorityCounts = {
            '+++': topicsInBereich.filter((t) => t.priority === '+++').length,
            '++': topicsInBereich.filter((t) => t.priority === '++').length,
            '+': topicsInBereich.filter((t) => t.priority === '+').length,
          };

          return (
            <TouchableOpacity
              key={bereich}
              style={styles.gridCard}
              onPress={() => {
                setSelectedBereich(bereich);
                setViewLevel('topics');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gridCardGradient}
              >
                <Ionicons name="folder-open" size={28} color="rgba(255,255,255,0.9)" />
                <Text style={styles.gridCardTitle} numberOfLines={2}>
                  {bereich}
                </Text>
                <Text style={styles.gridCardCount}>{topicsInBereich.length} Themen</Text>
                <View style={styles.priorityRow}>
                  {priorityCounts['+++'] > 0 && (
                    <View style={[styles.miniPriorityBadge, { backgroundColor: 'rgba(239,68,68,0.3)' }]}>
                      <Text style={styles.miniPriorityText}>+++ {priorityCounts['+++']}</Text>
                    </View>
                  )}
                  {priorityCounts['++'] > 0 && (
                    <View style={[styles.miniPriorityBadge, { backgroundColor: 'rgba(245,158,11,0.3)' }]}>
                      <Text style={styles.miniPriorityText}>++ {priorityCounts['++']}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.gridCardArrow}>
                  <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.8)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render Topics list (Level 3)
  const renderTopicsList = () => {
    if (!selectedFachgebiet || !selectedBereich) return null;

    let topicsToShow = groupedData[selectedFachgebiet]?.bereiche[selectedBereich] || [];

    if (filterPriority) {
      topicsToShow = topicsToShow.filter((t) => t.priority === filterPriority);
    }

    return (
      <View style={styles.topicsContainer}>
        {/* Priority Filter */}
        <View style={styles.priorityFilterRow}>
          <Text style={styles.priorityFilterLabel}>Filter:</Text>
          {['+++', '++', '+'].map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.priorityFilterChip,
                {
                  backgroundColor: filterPriority === p ? priorityConfig[p].color : priorityConfig[p].bgColor,
                  borderColor: priorityConfig[p].color,
                },
              ]}
              onPress={() => setFilterPriority(filterPriority === p ? null : p)}
            >
              <Text
                style={[styles.priorityFilterText, { color: filterPriority === p ? '#fff' : priorityConfig[p].color }]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
          {filterPriority && (
            <TouchableOpacity style={styles.clearFilterButton} onPress={() => setFilterPriority(null)}>
              <Text style={styles.clearFilterText}>Alle</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Topics */}
        {topicsToShow.map((topic) => (
          <TouchableOpacity
            key={topic.id}
            style={styles.topicCard}
            onPress={() => handleTopicPress(topic.slug)}
            activeOpacity={0.7}
          >
            <View style={styles.topicCardContent}>
              <View
                style={[
                  styles.topicPriorityIndicator,
                  { backgroundColor: priorityConfig[topic.priority]?.color || '#64748b' },
                ]}
              />
              <View style={styles.topicCardText}>
                <Text style={styles.topicTitle}>{topic.title_de}</Text>
                <Text style={styles.topicStars}>{priorityConfig[topic.priority]?.stars}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        ))}

        {topicsToShow.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Keine Themen mit dieser Priorität</Text>
          </View>
        )}
      </View>
    );
  };

  // Render search results
  const renderSearchResults = () => (
    <View style={styles.searchResultsContainer}>
      <Text style={styles.searchResultsTitle}>
        {searchResults.length} Ergebnisse für "{searchQuery}"
      </Text>
      {searchResults.map((topic) => (
        <TouchableOpacity
          key={topic.id}
          style={styles.searchResultCard}
          onPress={() => handleTopicPress(topic.slug)}
          activeOpacity={0.7}
        >
          <View style={styles.searchResultContent}>
            <Text style={styles.searchResultTitle}>{topic.title_de}</Text>
            <Text style={styles.searchResultMeta}>
              {topic.fachgebiet} → {topic.bereich}
            </Text>
          </View>
          <View
            style={[
              styles.searchResultPriority,
              { backgroundColor: priorityConfig[topic.priority]?.color || '#64748b' },
            ]}
          >
            <Text style={styles.searchResultPriorityText}>{topic.priority}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Lade FSP Bibliothek...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={
          viewLevel === 'fachgebiet'
            ? ['#10b981', '#059669']
            : viewLevel === 'bereich' && selectedFachgebiet
              ? fachgebietConfig[selectedFachgebiet]?.gradient || ['#64748b', '#475569']
              : bereichColors[selectedBereich!] || ['#6366f1', '#4f46e5']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{getTitle()}</Text>
          <Text style={styles.headerSubtitle}>{getSubtitle()}</Text>
        </View>
        {viewLevel === 'fachgebiet' && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>FSP</Text>
          </View>
        )}
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
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
      </View>

      {/* Breadcrumb */}
      {viewLevel !== 'fachgebiet' && (
        <View style={styles.breadcrumb}>
          <TouchableOpacity
            onPress={() => {
              setViewLevel('fachgebiet');
              setSelectedFachgebiet(null);
              setSelectedBereich(null);
            }}
          >
            <Text style={styles.breadcrumbLink}>FSP Bibliothek</Text>
          </TouchableOpacity>
          {selectedFachgebiet && (
            <>
              <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
              <TouchableOpacity
                onPress={() => {
                  setViewLevel('bereich');
                  setSelectedBereich(null);
                }}
              >
                <Text style={[styles.breadcrumbLink, viewLevel === 'bereich' && styles.breadcrumbActive]}>
                  {selectedFachgebiet}
                </Text>
              </TouchableOpacity>
            </>
          )}
          {selectedBereich && (
            <>
              <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
              <Text style={[styles.breadcrumbLink, styles.breadcrumbActive]}>{selectedBereich}</Text>
            </>
          )}
        </View>
      )}

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
              : renderTopicsList()}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexWrap: 'wrap',
    gap: 6,
  },
  breadcrumbLink: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
  },
  breadcrumbActive: {
    color: '#1e293b',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: CARD_WIDTH,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  gridCardGradient: {
    padding: 16,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  gridCardEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  gridCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  gridCardStats: {
    marginBottom: 4,
  },
  gridCardCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  gridCardBereich: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  gridCardArrow: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  miniPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  miniPriorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  topicsContainer: {
    gap: 8,
  },
  priorityFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  priorityFilterLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  priorityFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  priorityFilterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  clearFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
  },
  clearFilterText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  topicCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicPriorityIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 14,
  },
  topicCardText: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  topicStars: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#94a3b8',
  },
  searchResultsContainer: {
    gap: 10,
  },
  searchResultsTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
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
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  searchResultMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  searchResultPriority: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
  },
  searchResultPriorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
});
