import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

interface Begriff {
  fachbegriff: string;
  laiensprache: string;
  erklaerung: string;
  beispielsatz: string;
}

interface CategoryContent {
  einleitung?: string;
  begriffe?: Begriff[];
  tipps?: string[];
}

interface Category {
  id: string;
  slug: string;
  title_de: string;
  kategorie: string;
  content: CategoryContent;
}

const categoryColors: { [key: string]: [string, string] } = {
  Kardiologie: ['#ef4444', '#dc2626'],
  Pneumologie: ['#3b82f6', '#2563eb'],
  Gastroenterologie: ['#f59e0b', '#d97706'],
  Neurologie: ['#8b5cf6', '#7c3aed'],
  'Orthopädie & Traumatologie': ['#64748b', '#475569'],
  'Pharmakologie & Medikamente': ['#ec4899', '#db2777'],
  'Labor & Diagnostik': ['#14b8a6', '#0d9488'],
  'Allgemeine medizinische Begriffe': ['#6366f1', '#4f46e5'],
  'Symptome & Beschwerden': ['#f97316', '#ea580c'],
  'Prozeduren & Eingriffe': ['#10b981', '#059669'],
};

export default function FachbegriffeDetail() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const fetchCategory = useCallback(async () => {
    if (!slug) return;

    try {
      const { data, error } = await supabase.from('fsp_fachbegriffe').select('*').eq('slug', slug).single();

      if (error) throw error;

      // Parse content if it's a JSON string
      if (data && typeof data.content === 'string') {
        try {
          data.content = JSON.parse(data.content);
        } catch (parseError) {
          console.error('Error parsing content JSON:', parseError);
          data.content = {};
        }
      }

      setCategory(data);
    } catch (error) {
      console.error('Error fetching category:', error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  // Filter terms by search
  const filteredTerms = useMemo(() => {
    const begriffe = category?.content?.begriffe || [];
    if (!searchQuery.trim()) return begriffe;

    const query = searchQuery.toLowerCase();
    return begriffe.filter(
      (b) => b.fachbegriff?.toLowerCase().includes(query) || b.laiensprache?.toLowerCase().includes(query)
    );
  }, [category, searchQuery]);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Lade...</Text>
      </View>
    );
  }

  if (!category) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Kategorie nicht gefunden</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Zurück</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const colors = categoryColors[category.title_de] || ['#6366f1', '#4f46e5'];
  const content = category.content || {};
  const totalTerms = content.begriffe?.length || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{category.title_de}</Text>
          <Text style={styles.headerSubtitle}>{totalTerms} Fachbegriffe</Text>
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="In dieser Kategorie suchen..."
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

      {/* Results count */}
      {searchQuery.trim() !== '' && (
        <View style={styles.resultsCount}>
          <Text style={styles.resultsCountText}>
            {filteredTerms.length} von {totalTerms} Begriffen
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Einleitung */}
        {content.einleitung && !searchQuery.trim() && (
          <View style={styles.einleitungBox}>
            <Ionicons name="information-circle" size={20} color="#6366f1" />
            <Text style={styles.einleitungText}>{content.einleitung}</Text>
          </View>
        )}

        {/* Terms List */}
        {filteredTerms.map((begriff, index) => {
          const isExpanded = expandedIndex === index;

          return (
            <TouchableOpacity
              key={index}
              style={styles.termCard}
              onPress={() => toggleExpand(index)}
              activeOpacity={0.8}
            >
              <View style={styles.termHeader}>
                <View style={styles.termMainRow}>
                  <View style={[styles.termNumber, { backgroundColor: colors[0] }]}>
                    <Text style={styles.termNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.termTexts}>
                    <Text style={styles.fachbegriffText}>{begriff.fachbegriff}</Text>
                    <View style={styles.arrowRow}>
                      <Ionicons name="arrow-forward" size={14} color="#94a3b8" />
                      <Text style={styles.laienspracheText}>{begriff.laiensprache}</Text>
                    </View>
                  </View>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#94a3b8" />
                </View>
              </View>

              {isExpanded && (
                <View style={styles.termDetails}>
                  {/* Erklärung */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <Ionicons name="bulb-outline" size={16} color="#f59e0b" />
                      <Text style={styles.detailLabel}>Erklärung</Text>
                    </View>
                    <Text style={styles.detailText}>{begriff.erklaerung}</Text>
                  </View>

                  {/* Beispielsatz */}
                  {begriff.beispielsatz && (
                    <View style={styles.beispielBox}>
                      <View style={styles.detailHeader}>
                        <Ionicons name="chatbubble-outline" size={16} color="#10b981" />
                        <Text style={styles.detailLabel}>So erklären Sie es dem Patienten</Text>
                      </View>
                      <Text style={styles.beispielText}>„{begriff.beispielsatz}"</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Empty State */}
        {filteredTerms.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>Keine Begriffe gefunden</Text>
          </View>
        )}

        {/* Tipps */}
        {content.tipps && content.tipps.length > 0 && !searchQuery.trim() && (
          <View style={styles.tippSection}>
            <View style={styles.tippHeader}>
              <Ionicons name="bulb" size={20} color="#f59e0b" />
              <Text style={styles.tippTitle}>Tipps für die FSP</Text>
            </View>
            {content.tipps.map((tipp, index) => (
              <View key={index} style={styles.tippItem}>
                <Text style={styles.tippBullet}>💡</Text>
                <Text style={styles.tippText}>{tipp}</Text>
              </View>
            ))}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    marginTop: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -10,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  resultsCount: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  resultsCountText: {
    fontSize: 13,
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  einleitungBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  einleitungText: {
    flex: 1,
    fontSize: 14,
    color: '#3730a3',
    lineHeight: 20,
  },
  termCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  termHeader: {
    padding: 14,
  },
  termMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  termNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  termTexts: {
    flex: 1,
  },
  fachbegriffText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  laienspracheText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10b981',
  },
  termDetails: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  detailText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  beispielBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  beispielText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
    fontStyle: 'italic',
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
  tippSection: {
    backgroundColor: '#fef9c3',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  tippHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tippTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
    marginLeft: 8,
  },
  tippItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tippBullet: {
    marginRight: 8,
  },
  tippText: {
    flex: 1,
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
});
