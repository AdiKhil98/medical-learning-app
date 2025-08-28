import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, BookOpen, ChevronLeft, Filter, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '@/components/ui/Input';
import HierarchicalSectionCard from '@/components/ui/HierarchicalSectionCard';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { medicalContentService, SearchResult, MedicalSection } from '@/lib/medicalContentService';

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

interface SearchFilters {
  category?: string;
  hasContent?: boolean;
  type?: 'folder' | 'file-text' | 'markdown';
}

export default function SearchPage() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  const debouncedQuery = useDebounce(searchQuery, 300);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await medicalContentService.searchSections(query, 50);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  const filteredResults = useMemo(() => {
    if (!filters.category && !filters.hasContent && !filters.type) {
      return searchResults;
    }

    return searchResults.filter(result => {
      const section = result.section;
      
      if (filters.category && section.category !== filters.category) {
        return false;
      }
      
      if (filters.hasContent !== undefined && !!section.has_content !== filters.hasContent) {
        return false;
      }
      
      if (filters.type && section.type !== filters.type) {
        return false;
      }
      
      return true;
    });
  }, [searchResults, filters]);

  const handleNavigation = useCallback((section: MedicalSection) => {
    const hasContent = section.has_content ||
      section.content_html ||
      (section.content_improved && Array.isArray(section.content_improved) && section.content_improved.length > 0) ||
      section.type === 'file-text' ||
      section.type === 'markdown';

    if (hasContent) {
      router.push(`/bibliothek/content/${section.slug}`);
    } else {
      router.push(`/bibliothek/${section.slug}`);
    }
  }, [router]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  }, []);

  const toggleFilter = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const renderSearchResult = useCallback(({ item }: { item: SearchResult }) => {
    return (
      <View style={styles.resultItem}>
        <HierarchicalSectionCard
          section={item.section}
          onPress={() => handleNavigation(item.section)}
          hierarchyLevel={0}
        />
        
        {item.snippet && (
          <Text style={[styles.snippet, { color: colors.textSecondary }]} numberOfLines={2}>
            ...{item.snippet}...
          </Text>
        )}
        
        <View style={styles.resultMeta}>
          <Text style={[styles.matchType, { color: colors.primary }]}>
            Gefunden in: {item.matchType === 'title' ? 'Titel' : 'Beschreibung'}
          </Text>
          {item.section.category && (
            <Text style={[styles.category, { color: colors.textSecondary }]}>
              {item.section.category}
            </Text>
          )}
        </View>
      </View>
    );
  }, [colors, handleNavigation]);

  const renderEmptyState = () => {
    if (loading) return null;
    
    if (!searchQuery.trim()) {
      return (
        <View style={styles.emptyState}>
          <Search size={60} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Durchsuchen Sie medizinische Inhalte
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            Geben Sie einen Suchbegriff ein, um relevante medizinische Abschnitte zu finden
          </Text>
        </View>
      );
    }
    
    if (filteredResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <BookOpen size={60} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Keine Ergebnisse gefunden
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            Versuchen Sie andere Suchbegriffe oder entfernen Sie Filter
          </Text>
          {Object.keys(filters).some(key => filters[key as keyof SearchFilters]) && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
              <Text style={[styles.clearFiltersText, { color: colors.primary }]}>
                Filter löschen
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    
    return null;
  };

  const gradientColors = useMemo(() => 
    isDarkMode 
      ? ['#1F2937', '#111827', '#0F172A']
      : ['#e0f2fe', '#f0f9ff', '#ffffff'],
    [isDarkMode]
  );

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      paddingBottom: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingRight: 16,
    },
    backText: {
      marginLeft: 4,
      fontSize: 16,
      color: colors.primary,
      fontFamily: 'Inter-Medium',
    },
    title: {
      flex: 1,
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      fontFamily: 'Inter-Bold',
    },
    searchContainer: {
      marginBottom: 8,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.card,
      marginLeft: 8,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
    },
    filterText: {
      marginLeft: 4,
      fontSize: 14,
      color: colors.text,
      fontFamily: 'Inter-Medium',
    },
    filterTextActive: {
      color: '#ffffff',
    },
    resultsContainer: {
      flex: 1,
    },
    resultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    resultsCount: {
      fontSize: 14,
      color: colors.textSecondary,
      fontFamily: 'Inter-Regular',
    },
    loadingContainer: {
      padding: 32,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 8,
      fontSize: 14,
      color: colors.textSecondary,
      fontFamily: 'Inter-Regular',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient colors={gradientColors} style={styles.gradientBackground} />
      
      {/* Header */}
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.headerRow}>
          <TouchableOpacity
            style={dynamicStyles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={colors.primary} />
            <Text style={dynamicStyles.backText}>Zurück</Text>
          </TouchableOpacity>
          
          <Text style={dynamicStyles.title}>Suche</Text>
          
          <TouchableOpacity
            style={[
              dynamicStyles.filterButton,
              showFilters && dynamicStyles.filterButtonActive
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} color={showFilters ? '#ffffff' : colors.text} />
            <Text style={[
              dynamicStyles.filterText,
              showFilters && dynamicStyles.filterTextActive
            ]}>
              Filter
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <Input
          placeholder="Suche nach medizinischen Inhalten..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Search size={20} color={colors.textSecondary} />}
          rightIcon={searchQuery ? (
            <TouchableOpacity onPress={clearSearch}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : undefined}
          containerStyle={dynamicStyles.searchContainer}
          autoFocus
        />
      </View>

      {/* Results */}
      <View style={dynamicStyles.resultsContainer}>
        {filteredResults.length > 0 && (
          <View style={dynamicStyles.resultsHeader}>
            <Text style={dynamicStyles.resultsCount}>
              {filteredResults.length} Ergebnis{filteredResults.length !== 1 ? 'se' : ''} gefunden
            </Text>
          </View>
        )}
        
        {loading && (
          <View style={dynamicStyles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={dynamicStyles.loadingText}>Suche...</Text>
          </View>
        )}
        
        {!loading && (
          <FlatList
            data={filteredResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.section.slug}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  resultItem: {
    marginBottom: 16,
  },
  snippet: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginHorizontal: 16,
    fontStyle: 'italic',
    fontFamily: 'Inter-Regular',
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginHorizontal: 16,
  },
  matchType: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  category: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textTransform: 'uppercase',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  clearFiltersButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-Medium',
  },
});