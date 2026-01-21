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

// Source table colors
const sourceColors: { [key: string]: [string, string] } = {
  fsp_bibliothek: ['#6366f1', '#4f46e5'],
  fsp_anamnese: ['#10b981', '#059669'],
  fsp_fachbegriffe: ['#f59e0b', '#d97706'],
};

const sourceLabels: { [key: string]: string } = {
  fsp_bibliothek: 'Bibliothek',
  fsp_anamnese: 'Anamnese',
  fsp_fachbegriffe: 'Fachbegriffe',
};

type ViewLevel = 'source' | 'topics';

export default function FSPAudioIndex() {
  const router = useRouter();
  const { session } = useAuth();
  const { hasAccess, loading: subscriptionLoading } = useAudioSubscription(session?.user?.id, 'fsp_audio');

  const [topics, setTopics] = useState<AudioTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewLevel, setViewLevel] = useState<ViewLevel>('source');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<AudioTopic | null>(null);

  const fetchTopics = useCallback(async () => {
    try {
      // Fetch from all three FSP tables
      const [bibliothekResult, anamneseResult, fachbegriffeResult] = await Promise.all([
        supabase
          .from('fsp_bibliothek')
          .select('id, slug, title_de, fachgebiet, bereich, priority, audio_url')
          .not('audio_url', 'is', null),
        supabase
          .from('fsp_anamnese')
          .select('id, slug, title_de, fachgebiet, bereich, priority, audio_url')
          .not('audio_url', 'is', null),
        supabase
          .from('fsp_fachbegriffe')
          .select('id, slug, title_de, fachgebiet, bereich, priority, audio_url')
          .not('audio_url', 'is', null),
      ]);

      const allTopics: AudioTopic[] = [];

      if (bibliothekResult.data) {
        allTopics.push(
          ...bibliothekResult.data.map((t) => ({
            ...t,
            source_table: 'fsp_bibliothek' as const,
          }))
        );
      }

      if (anamneseResult.data) {
        allTopics.push(
          ...anamneseResult.data.map((t) => ({
            ...t,
            source_table: 'fsp_anamnese' as const,
          }))
        );
      }

      if (fachbegriffeResult.data) {
        allTopics.push(
          ...fachbegriffeResult.data.map((t) => ({
            ...t,
            source_table: 'fsp_fachbegriffe' as const,
          }))
        );
      }

      setTopics(allTopics);
    } catch (error) {
      console.error('Error fetching FSP audio topics:', error);
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

  // Group topics by source
  const groupedBySource = useMemo(() => {
    const result: { [key: string]: AudioTopic[] } = {
      fsp_bibliothek: [],
      fsp_anamnese: [],
      fsp_fachbegriffe: [],
    };

    topics.forEach((topic) => {
      if (topic.source_table && result[topic.source_table]) {
        result[topic.source_table].push(topic);
      }
    });

    return result;
  }, [topics]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return topics.filter(
      (t) => t.title_de.toLowerCase().includes(query) || t.fachgebiet?.toLowerCase().includes(query)
    );
  }, [topics, searchQuery]);

  // Get topics for current source
  const currentTopics = useMemo(() => {
    if (!selectedSource) return [];
    return groupedBySource[selectedSource] || [];
  }, [groupedBySource, selectedSource]);

  const goBack = () => {
    if (viewLevel === 'topics') {
      setViewLevel('source');
      setSelectedSource(null);
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
    router.push(`/(tabs)/bibliothek/audio/fsp/${topic.slug}?source=${topic.source_table}`);
  };

  const handleSourcePress = (source: string) => {
    setSelectedSource(source);
    setViewLevel('topics');
  };

  // Render source cards (Level 1)
  const renderSourceCards = () => (
    <View style={styles.sourceGrid}>
      {Object.entries(groupedBySource).map(([source, sourceTopics]) => (
        <TouchableOpacity
          key={source}
          style={styles.sourceCard}
          onPress={() => handleSourcePress(source)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={sourceColors[source] || ['#64748b', '#475569']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sourceCardGradient}
          >
            <View style={styles.sourceIconContainer}>
              <Ionicons name="headset" size={28} color="#fff" />
            </View>
            <Text style={styles.sourceCardTitle}>{sourceLabels[source] || source}</Text>
            <Text style={styles.sourceCardSubtitle}>{sourceTopics.length} Audio-Themen</Text>
            {!hasAccess && (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={12} color="#fff" />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render topics grid (Level 2)
  const renderTopicsGrid = () => (
    <View style={styles.topicsGrid}>
      {currentTopics.map((topic) => (
        <TouchableOpacity
          key={topic.id}
          style={styles.topicCard}
          onPress={() => handleTopicPress(topic)}
          activeOpacity={0.7}
        >
          <View style={styles.topicHeader}>
            {hasAccess ? (
              <Ionicons name="headset" size={18} color="#6366f1" />
            ) : (
              <Ionicons name="lock-closed" size={18} color="#94a3b8" />
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
      ))}
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
        searchResults.map((topic) => (
          <TouchableOpacity key={topic.id} style={styles.searchResultCard} onPress={() => handleTopicPress(topic)}>
            <View
              style={[styles.sourcePill, { backgroundColor: sourceColors[topic.source_table || '']?.[0] || '#6366f1' }]}
            >
              <Text style={styles.sourcePillText}>{sourceLabels[topic.source_table || ''] || 'FSP'}</Text>
            </View>
            <View style={styles.searchResultContent}>
              <Text style={styles.searchResultTitle}>{topic.title_de}</Text>
              {topic.fachgebiet && <Text style={styles.searchResultMeta}>{topic.fachgebiet}</Text>}
            </View>
            {hasAccess ? (
              <Ionicons name="play-circle" size={24} color="#6366f1" />
            ) : (
              <Ionicons name="lock-closed" size={20} color="#94a3b8" />
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  if (loading || subscriptionLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Lade FSP Audio...</Text>
      </View>
    );
  }

  const headerGradient: [string, string] =
    viewLevel === 'topics' && selectedSource
      ? sourceColors[selectedSource] || ['#10b981', '#059669']
      : ['#10b981', '#059669'];

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
            <Text style={styles.headerTitleWhite}>{sourceLabels[selectedSource || ''] || 'FSP Audio'}</Text>
            <Text style={styles.headerSubtitleWhite}>{currentTopics.length} Audio-Themen</Text>
          </View>
        </LinearGradient>
      ) : (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>FSP Audio</Text>
            <Text style={styles.headerSubtitle}>{topics.length} Themen verfügbar</Text>
          </View>
          {!hasAccess && (
            <View style={styles.subscriptionBadge}>
              <Ionicons name="lock-closed" size={14} color="#fff" />
              <Text style={styles.subscriptionBadgeText}>7€/Mo</Text>
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

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {searchQuery.trim() !== ''
          ? renderSearchResults()
          : viewLevel === 'source'
            ? renderSourceCards()
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
        libraryType="fsp_audio"
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
    backgroundColor: '#10b981',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  sourceCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
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
  sourceCardGradient: {
    padding: 24,
    minHeight: 120,
  },
  sourceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sourceCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  sourceCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  lockBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 8,
    borderRadius: 16,
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
  topicHeader: {
    marginBottom: 8,
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 20,
    flex: 1,
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
  sourcePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sourcePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
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
