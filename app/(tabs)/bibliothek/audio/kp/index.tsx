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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioSubscription } from '@/hooks/useAudioSubscription';
import { AudioPaywallModal } from '@/components/audio/AudioPaywallModal';
import type { AudioTopic } from '@/types/audio';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (width - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

// Fachgebiet colors (same as KP bibliothek)
const fachgebietConfig: {
  [key: string]: {
    gradient: [string, string];
    icon: keyof typeof Ionicons.glyphMap;
  };
} = {
  Kardiologie: { gradient: ['#ef4444', '#dc2626'], icon: 'heart' },
  Pneumologie: { gradient: ['#3b82f6', '#2563eb'], icon: 'cloud' },
  Gastroenterologie: { gradient: ['#f59e0b', '#d97706'], icon: 'nutrition' },
  Endokrinologie: { gradient: ['#8b5cf6', '#7c3aed'], icon: 'fitness' },
  Nephrologie: { gradient: ['#06b6d4', '#0891b2'], icon: 'water' },
  Hämatologie: { gradient: ['#ec4899', '#db2777'], icon: 'water-outline' },
  Rheumatologie: { gradient: ['#14b8a6', '#0d9488'], icon: 'body' },
  Neurologie: { gradient: ['#6366f1', '#4f46e5'], icon: 'flash' },
  Infektiologie: { gradient: ['#22c55e', '#16a34a'], icon: 'bug' },
  Psychiatrie: { gradient: ['#a78bfa', '#8b5cf6'], icon: 'happy' },
  Dermatologie: { gradient: ['#fb7185', '#e11d48'], icon: 'hand-left' },
  Orthopädie: { gradient: ['#64748b', '#475569'], icon: 'man' },
  Chirurgie: { gradient: ['#a855f7', '#9333ea'], icon: 'cut' },
  Urologie: { gradient: ['#0ea5e9', '#0284c7'], icon: 'medical' },
  Gynäkologie: { gradient: ['#f472b6', '#ec4899'], icon: 'female' },
  Pädiatrie: { gradient: ['#fbbf24', '#f59e0b'], icon: 'people' },
  Notfallmedizin: { gradient: ['#ef4444', '#b91c1c'], icon: 'alert-circle' },
  Allgemeinmedizin: { gradient: ['#10b981', '#059669'], icon: 'medkit' },
};

// Priority colors
const priorityColors: { [key: string]: string } = {
  '+++': '#ef4444',
  '++': '#f59e0b',
  '+': '#22c55e',
};

type ViewLevel = 'fachgebiet' | 'topics';

export default function KPAudioIndex() {
  const router = useRouter();
  const { session } = useAuth();
  const { hasAccess, loading: subscriptionLoading } = useAudioSubscription(session?.user?.id, 'kp_audio');

  const [topics, setTopics] = useState<AudioTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewLevel, setViewLevel] = useState<ViewLevel>('fachgebiet');
  const [selectedFachgebiet, setSelectedFachgebiet] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<AudioTopic | null>(null);

  const fetchTopics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('kp_medical_content')
        .select('id, slug, title_de, fachgebiet, bereich, priority, audio_url')
        .not('audio_url', 'is', null)
        .order('title_de');

      if (error) throw error;
      setTopics(data?.map((t) => ({ ...t, source_table: 'kp_medical_content' as const })) || []);
    } catch (error) {
      console.error('Error fetching KP audio topics:', error);
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

  // Group data by Fachgebiet
  const groupedData = useMemo(() => {
    const result: {
      [fachgebiet: string]: {
        topics: AudioTopic[];
        priorityCounts: { [key: string]: number };
      };
    } = {};

    topics.forEach((topic) => {
      if (!result[topic.fachgebiet]) {
        result[topic.fachgebiet] = { topics: [], priorityCounts: { '+++': 0, '++': 0, '+': 0 } };
      }
      result[topic.fachgebiet].topics.push(topic);
      const priority = topic.bereich || topic.priority;
      if (priority && priority in result[topic.fachgebiet].priorityCounts) {
        result[topic.fachgebiet].priorityCounts[priority]++;
      }
    });

    return result;
  }, [topics]);

  // Get unique Fachgebiete sorted by topic count
  const fachgebiete = useMemo(() => {
    return Object.keys(groupedData).sort((a, b) => groupedData[b].topics.length - groupedData[a].topics.length);
  }, [groupedData]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return topics.filter((t) => t.title_de.toLowerCase().includes(query) || t.fachgebiet.toLowerCase().includes(query));
  }, [topics, searchQuery]);

  // Get filtered topics for current Fachgebiet
  const currentTopics = useMemo(() => {
    if (!selectedFachgebiet) return [];
    let result = groupedData[selectedFachgebiet]?.topics || [];
    if (filterPriority) {
      result = result.filter((t) => (t.bereich || t.priority) === filterPriority);
    }
    return result;
  }, [groupedData, selectedFachgebiet, filterPriority]);

  const goBack = () => {
    if (viewLevel === 'topics') {
      setViewLevel('fachgebiet');
      setSelectedFachgebiet(null);
      setFilterPriority(null);
    } else {
      router.back();
    }
  };

  const handleTopicPress = (topic: AudioTopic) => {
    if (!hasAccess) {
      setSelectedTopic(topic);
      setPaywallOpen(true);
      return;
    }
    router.push(`/(tabs)/bibliothek/audio/kp/${topic.slug}`);
  };

  const handleFachgebietPress = (fg: string) => {
    setSelectedFachgebiet(fg);
    setViewLevel('topics');
    setFilterPriority(null);
  };

  // Get priority counts for selected Fachgebiet
  const getPriorityCounts = () => {
    if (!selectedFachgebiet) return { '+++': 0, '++': 0, '+': 0 };
    return groupedData[selectedFachgebiet]?.priorityCounts || { '+++': 0, '++': 0, '+': 0 };
  };

  // Render Fachgebiet cards (Level 1)
  const renderFachgebietGrid = () => (
    <View style={styles.cardGrid}>
      {fachgebiete.map((fg) => {
        const config = fachgebietConfig[fg] || {
          gradient: ['#64748b', '#475569'] as [string, string],
          icon: 'folder' as keyof typeof Ionicons.glyphMap,
        };
        const data = groupedData[fg];
        const highPriorityCount = data.priorityCounts['+++'] || 0;

        return (
          <TouchableOpacity
            key={fg}
            style={styles.fachgebietCard}
            onPress={() => handleFachgebietPress(fg)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={config.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fachgebietCardGradient}
            >
              <View style={styles.fachgebietIconContainer}>
                <Ionicons name={config.icon} size={22} color="#fff" />
              </View>
              <Text style={styles.fachgebietCardTitle} numberOfLines={2}>
                {fg}
              </Text>
              <View style={styles.fachgebietMeta}>
                <Ionicons name="headset" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.fachgebietCardSubtitle}>{data.topics.length}</Text>
              </View>
              {highPriorityCount > 0 && (
                <View style={styles.highPriorityBadge}>
                  <Text style={styles.highPriorityText}>+++ {highPriorityCount}</Text>
                </View>
              )}
              {!hasAccess && (
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={10} color="#fff" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Render priority filter pills (Level 2)
  const renderPriorityFilter = () => {
    const counts = getPriorityCounts();
    return (
      <View style={styles.priorityFilterContainer}>
        <TouchableOpacity
          style={[styles.priorityPill, !filterPriority && styles.priorityPillActive]}
          onPress={() => setFilterPriority(null)}
        >
          <Text style={[styles.priorityPillText, !filterPriority && styles.priorityPillTextActive]}>Alle</Text>
          <View style={[styles.priorityCount, !filterPriority && styles.priorityCountActive]}>
            <Text style={[styles.priorityCountText, !filterPriority && styles.priorityCountTextActive]}>
              {groupedData[selectedFachgebiet ?? '']?.topics.length || 0}
            </Text>
          </View>
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
            <View style={[styles.priorityCount, filterPriority === p && styles.priorityCountActive]}>
              <Text style={[styles.priorityCountText, filterPriority === p && styles.priorityCountTextActive]}>
                {counts[p]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render topics grid (Level 2)
  const renderTopicsGrid = () => (
    <View style={styles.topicsGrid}>
      {currentTopics.map((topic) => {
        const priority = topic.bereich || topic.priority;
        return (
          <TouchableOpacity
            key={topic.id}
            style={styles.topicCard}
            onPress={() => handleTopicPress(topic)}
            activeOpacity={0.7}
          >
            {priority && (
              <View style={[styles.topicPriorityPill, { backgroundColor: priorityColors[priority] || '#64748b' }]}>
                <Text style={styles.topicPriorityText}>{priority}</Text>
              </View>
            )}
            <View style={styles.topicAudioIcon}>
              {hasAccess ? (
                <Ionicons name="headset" size={16} color="#6366f1" />
              ) : (
                <Ionicons name="lock-closed" size={16} color="#94a3b8" />
              )}
            </View>
            <Text style={[styles.topicTitle, !hasAccess && styles.topicTitleLocked]} numberOfLines={2}>
              {topic.title_de}
            </Text>
            <View style={styles.topicFooter}>
              {hasAccess ? (
                <Ionicons name="play-circle" size={22} color="#6366f1" />
              ) : (
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Render search results
  const renderSearchResults = () => (
    <View style={styles.searchResults}>
      {searchResults.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color="#cbd5e1" />
          <Text style={styles.emptyStateText}>Keine Ergebnisse für &quot;{searchQuery}&quot;</Text>
        </View>
      ) : (
        searchResults.map((topic) => {
          const priority = topic.bereich || topic.priority;
          return (
            <TouchableOpacity key={topic.id} style={styles.searchResultCard} onPress={() => handleTopicPress(topic)}>
              {priority && (
                <View style={[styles.topicPriorityPill, { backgroundColor: priorityColors[priority] }]}>
                  <Text style={styles.topicPriorityText}>{priority}</Text>
                </View>
              )}
              <View style={styles.searchResultContent}>
                <Text style={styles.searchResultTitle}>{topic.title_de}</Text>
                <Text style={styles.searchResultMeta}>{topic.fachgebiet}</Text>
              </View>
              {hasAccess ? (
                <Ionicons name="play-circle" size={24} color="#6366f1" />
              ) : (
                <Ionicons name="lock-closed" size={20} color="#94a3b8" />
              )}
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  if (loading || subscriptionLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Lade KP Audio...</Text>
      </View>
    );
  }

  // Get gradient for header based on selected Fachgebiet
  const headerGradient: [string, string] =
    viewLevel === 'topics' && selectedFachgebiet
      ? fachgebietConfig[selectedFachgebiet]?.gradient || ['#6366f1', '#4f46e5']
      : ['#6366f1', '#4f46e5'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      {viewLevel === 'topics' ? (
        <LinearGradient
          colors={headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity style={styles.backButtonWhite} onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitleWhite}>{selectedFachgebiet}</Text>
            <Text style={styles.headerSubtitleWhite}>
              {groupedData[selectedFachgebiet ?? '']?.topics.length || 0} Audio-Themen
            </Text>
          </View>
        </LinearGradient>
      ) : (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>KP Audio</Text>
            <Text style={styles.headerSubtitle}>{topics.length} Themen verfügbar</Text>
          </View>
          {!hasAccess && (
            <View style={styles.subscriptionBadge}>
              <Ionicons name="lock-closed" size={14} color="#fff" />
              <Text style={styles.subscriptionBadgeText}>10€/Mo</Text>
            </View>
          )}
        </View>
      )}

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

      {/* Priority Filter (only on Level 2) */}
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
            : renderTopicsGrid()}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Paywall Modal */}
      <AudioPaywallModal
        isOpen={paywallOpen}
        onClose={() => {
          setPaywallOpen(false);
          setSelectedTopic(null);
        }}
        libraryType="kp_audio"
        topicTitle={selectedTopic?.title_de}
      />
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 20,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  backButtonWhite: {
    marginRight: 16,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerTitleWhite: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  headerSubtitleWhite: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  subscriptionBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
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
  priorityFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  priorityPillActive: {
    backgroundColor: '#6366f1',
  },
  priorityPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  priorityPillTextActive: {
    color: '#fff',
  },
  priorityCount: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityCountActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  priorityCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  priorityCountTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  fachgebietCard: {
    width: CARD_WIDTH,
    marginBottom: 12,
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
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
    }),
  },
  fachgebietCardGradient: {
    padding: 16,
    minHeight: 130,
  },
  fachgebietIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  fachgebietCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  fachgebietMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fachgebietCardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  highPriorityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  highPriorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  lockBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 6,
    borderRadius: 12,
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
    padding: 14,
    marginBottom: 12,
    minHeight: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
    }),
  },
  topicPriorityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  topicPriorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  topicAudioIcon: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 20,
    paddingRight: 24,
  },
  topicTitleLocked: {
    color: '#64748b',
  },
  topicFooter: {
    position: 'absolute',
    bottom: 14,
    right: 14,
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
