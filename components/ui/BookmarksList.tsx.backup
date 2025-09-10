import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { 
  Heart, 
  Search, 
  Folder, 
  Calendar,
  ChevronRight,
  Trash2,
  MessageCircle,
  BookOpen
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { bookmarksService, UserBookmark } from '@/lib/bookmarksService';
import { format } from 'date-fns';

interface BookmarksListProps {
  onNavigateToContent?: (slug: string) => void;
  showSearch?: boolean;
  showCategories?: boolean;
  maxItems?: number;
}

const BookmarksList: React.FC<BookmarksListProps> = ({
  onNavigateToContent,
  showSearch = true,
  showCategories = true,
  maxItems,
}) => {
  const { colors } = useTheme();
  const router = useRouter();
  
  const [bookmarks, setBookmarks] = useState<UserBookmark[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<UserBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch bookmarks on component mount
  useEffect(() => {
    fetchBookmarks();
  }, []);

  // Filter bookmarks when search or category changes
  useEffect(() => {
    filterBookmarks();
  }, [bookmarks, searchQuery, selectedCategory]);

  const fetchBookmarks = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const userBookmarks = await bookmarksService.getUserBookmarks();
      setBookmarks(userBookmarks);
      
      console.log(`📚 Loaded ${userBookmarks.length} bookmarks`);
      
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      Alert.alert('Fehler', 'Lesezeichen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterBookmarks = () => {
    let filtered = [...bookmarks];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bookmark =>
        bookmark.section_title.toLowerCase().includes(query) ||
        (bookmark.bookmark_notes && bookmark.bookmark_notes.toLowerCase().includes(query)) ||
        (bookmark.section_category && bookmark.section_category.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(bookmark => 
        bookmark.section_category === selectedCategory
      );
    }

    // Apply max items limit
    if (maxItems) {
      filtered = filtered.slice(0, maxItems);
    }

    setFilteredBookmarks(filtered);
  };

  const handleBookmarkPress = (bookmark: UserBookmark) => {
    if (onNavigateToContent) {
      onNavigateToContent(bookmark.section_slug);
    } else {
      router.push(`/(tabs)/bibliothek/content/${bookmark.section_slug}`);
    }
  };

  const handleRemoveBookmark = async (bookmark: UserBookmark) => {
    Alert.alert(
      'Lesezeichen entfernen',
      `Möchten Sie "${bookmark.section_title}" aus den Favoriten entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfernen',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookmarksService.removeBookmark(bookmark.section_slug);
              await fetchBookmarks(); // Refresh list
            } catch (error) {
              console.error('Error removing bookmark:', error);
              Alert.alert('Fehler', 'Lesezeichen konnte nicht entfernt werden.');
            }
          },
        },
      ]
    );
  };

  const onRefresh = useCallback(() => {
    fetchBookmarks(true);
  }, []);

  // Get unique categories
  const categories = Array.from(
    new Set(bookmarks.map(b => b.section_category).filter(Boolean))
  ).sort();

  // Render category filter
  const renderCategoryFilter = () => {
    if (!showCategories || categories.length === 0) return null;

    return (
      <View style={styles.categoryContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryButton,
              { 
                backgroundColor: selectedCategory === null ? colors.primary : colors.card,
                borderColor: selectedCategory === null ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[
              styles.categoryButtonText,
              { color: selectedCategory === null ? colors.background : colors.text }
            ]}>
              Alle
            </Text>
          </TouchableOpacity>
          
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                { 
                  backgroundColor: selectedCategory === category ? colors.primary : colors.card,
                  borderColor: selectedCategory === category ? colors.primary : colors.border,
                }
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryButtonText,
                { color: selectedCategory === category ? colors.background : colors.text }
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render bookmark item
  const renderBookmarkItem = (bookmark: UserBookmark) => (
    <TouchableOpacity
      key={bookmark.id}
      style={[styles.bookmarkItem, { backgroundColor: colors.card }]}
      onPress={() => handleBookmarkPress(bookmark)}
      activeOpacity={0.7}
    >
      <View style={styles.bookmarkContent}>
        <View style={styles.bookmarkHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
            <BookOpen size={12} color={colors.primary} />
            <Text style={[styles.categoryText, { color: colors.primary }]}>
              {bookmark.section_category || 'Allgemein'}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => handleRemoveBookmark(bookmark)}
            style={styles.deleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.bookmarkTitle, { color: colors.text }]} numberOfLines={2}>
          {bookmark.section_title}
        </Text>

        {bookmark.bookmark_notes && (
          <View style={styles.notesContainer}>
            <MessageCircle size={14} color={colors.textSecondary} />
            <Text 
              style={[styles.bookmarkNotes, { color: colors.textSecondary }]} 
              numberOfLines={2}
            >
              {bookmark.bookmark_notes}
            </Text>
          </View>
        )}

        <View style={styles.bookmarkFooter}>
          <View style={styles.dateContainer}>
            <Calendar size={12} color={colors.textSecondary} />
            <Text style={[styles.bookmarkDate, { color: colors.textSecondary }]}>
              {format(new Date(bookmark.created_at), 'dd.MM.yyyy')}
            </Text>
          </View>
          
          <ChevronRight size={16} color={colors.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Lade deine Favoriten...
        </Text>
      </View>
    );
  }

  // Empty state
  if (bookmarks.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Heart size={48} color={colors.textSecondary} style={styles.emptyIcon} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Keine Favoriten gespeichert
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Speichern Sie medizinische Inhalte, um sie später schnell wiederzufinden
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Stats */}
      <View style={styles.headerStats}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Heart size={20} color={colors.primary} fill={colors.primary} />
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {bookmarks.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Favoriten
          </Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Folder size={20} color={colors.primary} />
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {categories.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Kategorien
          </Text>
        </View>
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Bookmarks List */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredBookmarks.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Search size={32} color={colors.textSecondary} />
            <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
              Keine Favoriten gefunden
            </Text>
          </View>
        ) : (
          filteredBookmarks.map(renderBookmarkItem)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyIcon: {
    opacity: 0.5,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  headerStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  categoryContainer: {
    paddingVertical: 12,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  bookmarkItem: {
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookmarkContent: {
    padding: 16,
  },
  bookmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  bookmarkTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  bookmarkNotes: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  bookmarkFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookmarkDate: {
    fontSize: 12,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    marginTop: 12,
  },
});

export default BookmarksList;