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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

interface Topic {
  id: string;
  slug: string;
  title_de: string;
  gruppe: string;
  sort_order: number;
}

// Gruppe configuration with colors and icons
const gruppeConfig: {
  [key: string]: {
    gradient: [string, string];
    icon: keyof typeof Ionicons.glyphMap;
    emoji: string;
  };
} = {
  Gesprächsführung: {
    gradient: ['#6366f1', '#4f46e5'],
    icon: 'chatbubbles',
    emoji: '🗣️',
  },
  'Aktuelle Anamnese': {
    gradient: ['#ef4444', '#dc2626'],
    icon: 'alert-circle',
    emoji: '🎯',
  },
  Eigenanamnese: {
    gradient: ['#f59e0b', '#d97706'],
    icon: 'document-text',
    emoji: '📚',
  },
  'Familien- & Sozialanamnese': {
    gradient: ['#10b981', '#059669'],
    icon: 'people',
    emoji: '👨‍👩‍👧',
  },
  Systemanamnese: {
    gradient: ['#8b5cf6', '#7c3aed'],
    icon: 'body',
    emoji: '🔍',
  },
  'Reaktionen auf Patientenaussagen': {
    gradient: ['#ec4899', '#db2777'],
    icon: 'heart',
    emoji: '💬',
  },
  Abschluss: {
    gradient: ['#14b8a6', '#0d9488'],
    icon: 'checkmark-circle',
    emoji: '✅',
  },
};

export default function AnamneseIndex() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTopics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fsp_anamnese')
        .select('id, slug, title_de, gruppe, sort_order')
        .eq('status', 'active')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching Anamnese topics:', error);
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

  // Group topics by Gruppe
  const groupedTopics = useMemo(() => {
    const grouped: { [key: string]: Topic[] } = {};
    topics.forEach((topic) => {
      if (!grouped[topic.gruppe]) {
        grouped[topic.gruppe] = [];
      }
      grouped[topic.gruppe].push(topic);
    });
    return grouped;
  }, [topics]);

  // Get ordered gruppe keys
  const gruppeOrder = [
    'Gesprächsführung',
    'Aktuelle Anamnese',
    'Eigenanamnese',
    'Familien- & Sozialanamnese',
    'Systemanamnese',
    'Reaktionen auf Patientenaussagen',
    'Abschluss',
  ];

  // Filter topics by search
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return groupedTopics;

    const query = searchQuery.toLowerCase();
    const filtered: { [key: string]: Topic[] } = {};

    Object.entries(groupedTopics).forEach(([gruppe, topicList]) => {
      const matchingTopics = topicList.filter((t) => t.title_de.toLowerCase().includes(query));
      if (matchingTopics.length > 0) {
        filtered[gruppe] = matchingTopics;
      }
    });

    return filtered;
  }, [groupedTopics, searchQuery]);

  const handleTopicPress = (slug: string) => {
    router.push(`/bibliothek/fsp/anamnese/${slug}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Lade Anamnese...</Text>
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
          <Text style={styles.headerTitle}>Anamnese</Text>
          <Text style={styles.headerSubtitle}>{topics.length} Themen für das Patientengespräch</Text>
        </View>
      </View>

      {/* Search */}
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
        {gruppeOrder.map((gruppe) => {
          const gruppeTopics = filteredTopics[gruppe];
          if (!gruppeTopics || gruppeTopics.length === 0) return null;

          const config = gruppeConfig[gruppe] || gruppeConfig['Gesprächsführung'];

          return (
            <View key={gruppe} style={styles.gruppeSection}>
              {/* Gruppe Header */}
              <LinearGradient
                colors={config.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gruppeHeader}
              >
                <Text style={styles.gruppeEmoji}>{config.emoji}</Text>
                <Text style={styles.gruppeTitle}>{gruppe}</Text>
                <View style={styles.gruppeCountBadge}>
                  <Text style={styles.gruppeCountText}>{gruppeTopics.length}</Text>
                </View>
              </LinearGradient>

              {/* Topics */}
              <View style={styles.topicsList}>
                {gruppeTopics.map((topic, index) => (
                  <TouchableOpacity
                    key={topic.id}
                    style={[styles.topicCard, index === gruppeTopics.length - 1 && styles.topicCardLast]}
                    onPress={() => handleTopicPress(topic.slug)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.topicNumber, { backgroundColor: `${config.gradient[0]  }20` }]}>
                      <Text style={[styles.topicNumberText, { color: config.gradient[0] }]}>{topic.sort_order}</Text>
                    </View>
                    <Text style={styles.topicTitle}>{topic.title_de}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

        {Object.keys(filteredTopics).length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>Keine Ergebnisse für "{searchQuery}"</Text>
          </View>
        )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  gruppeSection: {
    marginBottom: 24,
  },
  gruppeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  gruppeEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  gruppeTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  gruppeCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gruppeCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  topicsList: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  topicCardLast: {
    borderBottomWidth: 0,
  },
  topicNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  topicNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  topicTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
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
