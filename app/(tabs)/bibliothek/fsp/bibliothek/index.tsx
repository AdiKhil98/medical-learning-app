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
  Platform,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

interface Topic {
  id: string;
  slug: string;
  title_de: string;
  fachgebiet: string;
  bereich: string;
  priority: string;
}

interface BereichData {
  topics: Topic[];
  count: number;
}

interface GroupedTopics {
  [fachgebiet: string]: {
    [bereich: string]: BereichData;
  };
}

const priorityColors: { [key: string]: string } = {
  '+++': '#ef4444',
  '++': '#f59e0b',
  '+': '#22c55e',
};

const fachgebietIcons: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  'Innere Medizin': 'heart',
  Chirurgie: 'cut',
  Neurologie: 'flash',
  Notfallmedizin: 'alert-circle',
  Sonstige: 'ellipsis-horizontal',
};

const fachgebietColors: { [key: string]: [string, string] } = {
  'Innere Medizin': ['#6366f1', '#4f46e5'],
  Chirurgie: ['#ec4899', '#db2777'],
  Neurologie: ['#8b5cf6', '#7c3aed'],
  Notfallmedizin: ['#ef4444', '#dc2626'],
  Sonstige: ['#64748b', '#475569'],
};

export default function FSPBibliothekIndex() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFachgebiet, setSelectedFachgebiet] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fsp_bibliothek')
        .select('id, slug, title_de, fachgebiet, bereich, priority')
        .eq('status', 'active')
        .order('fachgebiet', { ascending: true })
        .order('bereich', { ascending: true })
        .order('title_de', { ascending: true });

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

  // Filter topics
  const filteredTopics = useMemo(() => {
    return topics.filter((topic) => {
      const matchesSearch =
        searchQuery === '' ||
        topic.title_de.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.bereich.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFachgebiet = !selectedFachgebiet || topic.fachgebiet === selectedFachgebiet;
      const matchesPriority = !filterPriority || topic.priority === filterPriority;
      return matchesSearch && matchesFachgebiet && matchesPriority;
    });
  }, [topics, searchQuery, selectedFachgebiet, filterPriority]);

  // Group topics by Fachgebiet and Bereich
  const groupedTopics = useMemo(() => {
    const grouped: GroupedTopics = {};
    filteredTopics.forEach((topic) => {
      if (!grouped[topic.fachgebiet]) {
        grouped[topic.fachgebiet] = {};
      }
      if (!grouped[topic.fachgebiet][topic.bereich]) {
        grouped[topic.fachgebiet][topic.bereich] = { topics: [], count: 0 };
      }
      grouped[topic.fachgebiet][topic.bereich].topics.push(topic);
      grouped[topic.fachgebiet][topic.bereich].count++;
    });
    return grouped;
  }, [filteredTopics]);

  // Get unique Fachgebiete
  const fachgebiete = useMemo(() => {
    return [...new Set(topics.map((t) => t.fachgebiet))];
  }, [topics]);

  const handleTopicPress = (slug: string) => {
    router.push(`/bibliothek/fsp/bibliothek/${slug}` as Href);
  };

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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>FSP Bibliothek</Text>
          <Text style={styles.headerSubtitle}>{topics.length} Themen für das Prüfergespräch</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
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

      {/* Fachgebiet Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, !selectedFachgebiet && styles.filterChipActive]}
          onPress={() => setSelectedFachgebiet(null)}
        >
          <Text style={[styles.filterChipText, !selectedFachgebiet && styles.filterChipTextActive]}>Alle</Text>
        </TouchableOpacity>
        {fachgebiete.map((fg) => (
          <TouchableOpacity
            key={fg}
            style={[styles.filterChip, selectedFachgebiet === fg && styles.filterChipActive]}
            onPress={() => setSelectedFachgebiet(selectedFachgebiet === fg ? null : fg)}
          >
            <Ionicons
              name={fachgebietIcons[fg] || 'folder'}
              size={14}
              color={selectedFachgebiet === fg ? '#fff' : '#64748b'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterChipText, selectedFachgebiet === fg && styles.filterChipTextActive]}>{fg}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Priority Filter */}
      <View style={styles.priorityFilterContainer}>
        <Text style={styles.priorityFilterLabel}>Priorität:</Text>
        {['+++', '++', '+'].map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.priorityChip,
              { borderColor: priorityColors[p] },
              filterPriority === p && { backgroundColor: priorityColors[p] },
            ]}
            onPress={() => setFilterPriority(filterPriority === p ? null : p)}
          >
            <Text style={[styles.priorityChipText, { color: filterPriority === p ? '#fff' : priorityColors[p] }]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Topics List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(groupedTopics).map(([fachgebiet, bereiche]) => (
          <View key={fachgebiet} style={styles.fachgebietSection}>
            {/* Fachgebiet Header */}
            <LinearGradient
              colors={fachgebietColors[fachgebiet] || ['#64748b', '#475569']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fachgebietHeader}
            >
              <Ionicons name={fachgebietIcons[fachgebiet] || 'folder'} size={20} color="#fff" />
              <Text style={styles.fachgebietTitle}>{fachgebiet}</Text>
              <Text style={styles.fachgebietCount}>
                {Object.values(bereiche).reduce((sum, b) => sum + b.count, 0)} Themen
              </Text>
            </LinearGradient>

            {/* Bereiche */}
            {Object.entries(bereiche).map(([bereich, data]) => (
              <View key={bereich} style={styles.bereichSection}>
                <Text style={styles.bereichTitle}>{bereich}</Text>
                <View style={styles.topicsGrid}>
                  {data.topics.map((topic) => (
                    <TouchableOpacity
                      key={topic.id}
                      style={styles.topicCard}
                      onPress={() => handleTopicPress(topic.slug)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.topicCardContent}>
                        <Text style={styles.topicTitle} numberOfLines={2}>
                          {topic.title_de}
                        </Text>
                        <View style={[styles.priorityBadge, { backgroundColor: priorityColors[topic.priority] }]}>
                          <Text style={styles.priorityBadgeText}>{topic.priority}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ))}

        {filteredTopics.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>Keine Themen gefunden</Text>
          </View>
        )}

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
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
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
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  priorityFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  priorityFilterLabel: {
    fontSize: 13,
    color: '#64748b',
    marginRight: 12,
  },
  priorityChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    marginRight: 8,
  },
  priorityChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  fachgebietSection: {
    marginTop: 16,
  },
  fachgebietHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  fachgebietTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
  fachgebietCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  bereichSection: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  bereichTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 4,
  },
  topicsGrid: {
    gap: 8,
  },
  topicCard: {
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
  topicCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 8,
  },
  topicTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    marginRight: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94a3b8',
  },
});
