import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Search,
  X,
  Filter,
  Clock,
  TrendingUp,
} from 'lucide-react-native';

interface SearchResult {
  sectionId: string;
  sectionTitle: string;
  matchText: string;
  context: string;
  matchType: 'title' | 'content' | 'term';
}

interface ContentSearchBarProps {
  searchableContent: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  onSearchResult?: (results: SearchResult[]) => void;
  onSectionSelect?: (sectionId: string) => void;
}

const ContentSearchBar: React.FC<ContentSearchBarProps> = ({
  searchableContent,
  onSearchResult,
  onSectionSelect,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Rheumatoide Arthritis',
    'Delir',
    'Autoimmunerkrankung',
  ]);

  // Animation values
  const [searchBarAnim] = useState(new Animated.Value(0));
  const [resultsAnim] = useState(new Animated.Value(0));

  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    searchableContent.forEach(section => {
      // Search in title
      if (section.title.toLowerCase().includes(searchTerm)) {
        results.push({
          sectionId: section.id,
          sectionTitle: section.title,
          matchText: section.title,
          context: section.content.slice(0, 100) + '...',
          matchType: 'title'
        });
      }

      // Search in content
      const contentLower = section.content.toLowerCase();
      const matchIndex = contentLower.indexOf(searchTerm);
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 50);
        const end = Math.min(section.content.length, matchIndex + 100);
        const context = section.content.slice(start, end);
        
        results.push({
          sectionId: section.id,
          sectionTitle: section.title,
          matchText: query,
          context: `...${context}...`,
          matchType: 'content'
        });
      }
    });

    setSearchResults(results);
    onSearchResult?.(results);
  }, [searchableContent, onSearchResult]);

  const handleSearchFocus = useCallback(() => {
    setIsSearchActive(true);
    Animated.parallel([
      Animated.timing(searchBarAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(resultsAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, [searchBarAnim, resultsAnim]);

  const handleSearchBlur = useCallback(() => {
    if (!searchQuery.trim()) {
      setIsSearchActive(false);
      Animated.parallel([
        Animated.timing(searchBarAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(resultsAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [searchQuery, searchBarAnim, resultsAnim]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    performSearch(text);
  }, [performSearch]);

  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim() && !recentSearches.includes(searchQuery)) {
      setRecentSearches(prev => [searchQuery, ...prev.slice(0, 4)]);
    }
  }, [searchQuery, recentSearches]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchActive(false);
    Animated.parallel([
      Animated.timing(searchBarAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(resultsAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, [searchBarAnim, resultsAnim]);

  const handleResultPress = useCallback((result: SearchResult) => {
    onSectionSelect?.(result.sectionId);
    clearSearch();
  }, [onSectionSelect, clearSearch]);

  const handleRecentSearchPress = useCallback((recentSearch: string) => {
    setSearchQuery(recentSearch);
    performSearch(recentSearch);
  }, [performSearch]);

  const highlightMatch = useCallback((text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        return (
          <Text key={index} style={styles.highlightedText}>
            {part}
          </Text>
        );
      }
      return part;
    });
  }, []);

  const renderSearchResult = useCallback((result: SearchResult, index: number) => (
    <TouchableOpacity
      key={`${result.sectionId}-${index}`}
      style={styles.searchResultItem}
      onPress={() => handleResultPress(result)}
      activeOpacity={0.7}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{result.sectionTitle}</Text>
        <View style={[styles.resultTypeBadge, getResultTypeBadgeStyle(result.matchType)]}>
          <Text style={styles.resultTypeText}>{getResultTypeLabel(result.matchType)}</Text>
        </View>
      </View>
      <Text style={styles.resultContext}>
        {highlightMatch(result.context, searchQuery)}
      </Text>
    </TouchableOpacity>
  ), [handleResultPress, highlightMatch, searchQuery]);

  const getResultTypeBadgeStyle = (type: SearchResult['matchType']) => {
    switch (type) {
      case 'title': return { backgroundColor: '#667eea' };
      case 'content': return { backgroundColor: '#10b981' };
      case 'term': return { backgroundColor: '#f59e0b' };
      default: return { backgroundColor: '#6b7280' };
    }
  };

  const getResultTypeLabel = (type: SearchResult['matchType']) => {
    switch (type) {
      case 'title': return 'Titel';
      case 'content': return 'Inhalt';
      case 'term': return 'Begriff';
      default: return 'Sonstige';
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.searchContainer,
          {
            borderColor: searchBarAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['#e5e7eb', '#667eea'],
            }),
            shadowOpacity: searchBarAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.1],
            }),
          }
        ]}
      >
        <View style={styles.searchInputContainer}>
          <Search size={20} color={isSearchActive ? '#667eea' : '#9ca3af'} />
          <TextInput
            style={styles.searchInput}
            placeholder="Suche in medizinischen Inhalten..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {isSearchActive && (
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={18} color="#667eea" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {isSearchActive && (
        <Animated.View
          style={[
            styles.searchResultsContainer,
            { opacity: resultsAnim, transform: [{ translateY: resultsAnim }] }
          ]}
        >
          <ScrollView
            style={styles.searchResults}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {searchResults.length > 0 ? (
              <>
                <Text style={styles.resultsHeader}>
                  {searchResults.length} Ergebnisse gefunden
                </Text>
                {searchResults.map(renderSearchResult)}
              </>
            ) : searchQuery.length > 0 ? (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>Keine Ergebnisse gefunden</Text>
                <Text style={styles.noResultsSubtext}>
                  Versuchen Sie andere Suchbegriffe
                </Text>
              </View>
            ) : (
              <View style={styles.recentSearchesContainer}>
                <View style={styles.recentHeader}>
                  <Clock size={16} color="#667eea" />
                  <Text style={styles.recentTitle}>Zuletzt gesucht</Text>
                </View>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentSearchItem}
                    onPress={() => handleRecentSearchPress(search)}
                  >
                    <TrendingUp size={14} color="#9ca3af" />
                    <Text style={styles.recentSearchText}>{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 10,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    marginLeft: 10,
    padding: 6,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    maxHeight: 400,
  },
  searchResults: {
    flex: 1,
  },
  resultsHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    padding: 15,
    paddingBottom: 10,
  },
  searchResultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  resultTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultTypeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  resultContext: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  highlightedText: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontWeight: '600',
  },
  noResultsContainer: {
    padding: 30,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  recentSearchesContainer: {
    padding: 15,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 8,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  recentSearchText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 10,
  },
});

export default ContentSearchBar;