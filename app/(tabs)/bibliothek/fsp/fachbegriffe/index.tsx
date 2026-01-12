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
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 20;
const CARD_WIDTH = (width - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

interface Category {
  id: string;
  slug: string;
  title_de: string;
  kategorie: string;
  sort_order: number;
  content: {
    begriffe?: any[];
  };
}

// Category configuration with colors and icons
const categoryConfig: {
  [key: string]: {
    gradient: [string, string];
    icon: keyof typeof Ionicons.glyphMap;
    emoji: string;
  };
} = {
  Kardiologie: {
    gradient: ['#ef4444', '#dc2626'],
    icon: 'heart',
    emoji: '🫀',
  },
  Pneumologie: {
    gradient: ['#3b82f6', '#2563eb'],
    icon: 'cloud',
    emoji: '🫁',
  },
  Gastroenterologie: {
    gradient: ['#f59e0b', '#d97706'],
    icon: 'restaurant',
    emoji: '🍽️',
  },
  Neurologie: {
    gradient: ['#8b5cf6', '#7c3aed'],
    icon: 'fitness',
    emoji: '🧠',
  },
  'Orthopädie & Traumatologie': {
    gradient: ['#64748b', '#475569'],
    icon: 'body',
    emoji: '🦴',
  },
  'Pharmakologie & Medikamente': {
    gradient: ['#ec4899', '#db2777'],
    icon: 'medkit',
    emoji: '💊',
  },
  'Labor & Diagnostik': {
    gradient: ['#14b8a6', '#0d9488'],
    icon: 'flask',
    emoji: '🔬',
  },
  'Allgemeine medizinische Begriffe': {
    gradient: ['#6366f1', '#4f46e5'],
    icon: 'medical',
    emoji: '🏥',
  },
  'Symptome & Beschwerden': {
    gradient: ['#f97316', '#ea580c'],
    icon: 'thermometer',
    emoji: '🩺',
  },
  'Prozeduren & Eingriffe': {
    gradient: ['#10b981', '#059669'],
    icon: 'cut',
    emoji: '⚕️',
  },
};

export default function FachbegriffeIndex() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fsp_fachbegriffe')
        .select('id, slug, title_de, kategorie, sort_order, content')
        .eq('status', 'active')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Parse content if it's a JSON string
      const parsedData = (data || []).map((item) => {
        if (typeof item.content === 'string') {
          try {
            item.content = JSON.parse(item.content);
          } catch (e) {
            item.content = {};
          }
        }
        return item;
      });

      setCategories(parsedData);
    } catch (error) {
      console.error('Error fetching Fachbegriffe:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCategories();
  }, [fetchCategories]);

  // Calculate total terms
  const totalTerms = useMemo(() => {
    return categories.reduce((sum, cat) => {
      return sum + (cat.content?.begriffe?.length || 0);
    }, 0);
  }, [categories]);

  // Search across all categories
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: { category: Category; begriff: any }[] = [];

    categories.forEach((category) => {
      category.content?.begriffe?.forEach((begriff: any) => {
        if (begriff.fachbegriff?.toLowerCase().includes(query) || begriff.laiensprache?.toLowerCase().includes(query)) {
          results.push({ category, begriff });
        }
      });
    });

    return results.slice(0, 20); // Limit to 20 results
  }, [categories, searchQuery]);

  const handleCategoryPress = (slug: string) => {
    router.push(`/bibliothek/fsp/fachbegriffe/${slug}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Lade Fachbegriffe...</Text>
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
          <Text style={styles.headerTitle}>Fachbegriffe</Text>
          <Text style={styles.headerSubtitle}>
            {totalTerms} Begriffe in {categories.length} Kategorien
          </Text>
        </View>
      </View>

      {/* Global Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Begriff suchen (Fach- oder Laiensprache)..."
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Results */}
        {searchQuery.trim() !== '' ? (
          <View style={styles.searchResults}>
            {searchResults.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color="#cbd5e1" />
                <Text style={styles.emptyStateText}>Keine Ergebnisse für "{searchQuery}"</Text>
              </View>
            ) : (
              <>
                <Text style={styles.searchResultsTitle}>{searchResults.length} Ergebnisse gefunden</Text>
                {searchResults.map((result, index) => {
                  const config =
                    categoryConfig[result.category.title_de] || categoryConfig['Allgemeine medizinische Begriffe'];
                  return (
                    <View key={index} style={styles.searchResultCard}>
                      <View style={styles.searchResultHeader}>
                        <View style={[styles.categoryBadge, { backgroundColor: config.gradient[0] }]}>
                          <Text style={styles.categoryBadgeText}>{result.category.title_de}</Text>
                        </View>
                      </View>
                      <View style={styles.termRow}>
                        <Text style={styles.fachbegriffText}>{result.begriff.fachbegriff}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
                        <Text style={styles.laienspracheText}>{result.begriff.laiensprache}</Text>
                      </View>
                      <Text style={styles.erklaerungText}>{result.begriff.erklaerung}</Text>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        ) : (
          /* Category Grid */
          <View style={styles.categoryGrid}>
            {categories.map((category) => {
              const config = categoryConfig[category.title_de] || categoryConfig['Allgemeine medizinische Begriffe'];
              const termCount = category.content?.begriffe?.length || 0;

              return (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryCard}
                  onPress={() => handleCategoryPress(category.slug)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={config.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.categoryCardGradient}
                  >
                    <Text style={styles.categoryEmoji}>{config.emoji}</Text>
                    <Text style={styles.categoryTitle} numberOfLines={2}>
                      {category.title_de}
                    </Text>
                    <View style={styles.termCountBadge}>
                      <Text style={styles.termCountText}>{termCount} Begriffe</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: CARD_WIDTH,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  categoryCardGradient: {
    padding: 16,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  categoryEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 20,
  },
  termCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  termCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  searchResults: {
    gap: 12,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  searchResultCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchResultHeader: {
    marginBottom: 10,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  fachbegriffText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  laienspracheText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#10b981',
    flex: 1,
  },
  erklaerungText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
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
