import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronRight,
  ChevronLeft,
  Stethoscope,
  Heart,
  Activity,
  Brain,
  Baby,
  Users,
  AlertTriangle,
  Scan,
  FileText,
  FolderOpen,
  Home,
  Menu as MenuIcon,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { SecureLogger } from '@/lib/security';
import { LRUCache } from '@/lib/lruCache';
import MedicalContentModal from '@/components/ui/MedicalContentModal';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';
import Menu from '@/components/ui/Menu';
import { MobileBibliothekLayout, Section } from '@/components/ui/MobileBibliothekLayout';
import { colors } from '@/constants/colors';

interface CategoryItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  type: 'main-category' | 'sub-category' | 'section' | 'subsection' | 'content';
  icon: string;
  color: string;
  parent_slug: string | null;
  hasChildren?: boolean;
  content_improved?: any;
  childCount?: number;
}

interface BreadcrumbItem {
  title: string;
  slug: string | null;
}

interface HierarchicalBibliothekProps {
  onNavigateToContent?: (slug: string) => void;
}

// FIX: Use LRU cache to prevent unbounded memory growth
// Max 100 category levels cached, Max 200 children existence checks
const itemsCache = new LRUCache<string, CategoryItem[]>(100);
const childrenCache = new LRUCache<string, boolean>(200);

const HierarchicalBibliothek: React.FC<HierarchicalBibliothekProps> = ({ onNavigateToContent }) => {
  const router = useRouter();

  const [currentItems, setCurrentItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ title: 'Bibliothek', slug: null }]);
  const [currentParent, setCurrentParent] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSlug, setModalSlug] = useState<string | null>(null);
  const [availableSections, setAvailableSections] = useState<CategoryItem[]>([]);

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);

  // Bookmarks state
  const [bookmarkedSections, setBookmarkedSections] = useState<Set<string>>(new Set());

  // Icon mapping for categories
  const getIconComponent = useCallback((iconName: string) => {
    const iconMap: Record<string, any> = {
      Stethoscope,
      Heart,
      Activity,
      Brain,
      Baby,
      Users,
      AlertTriangle,
      Scan: Heart, // Replace magnifying glass with heart icon
      FileText,
      FolderOpen,
    };
    return iconMap[iconName] || FolderOpen;
  }, []);

  // Progressive data loading - load only what's needed
  const loadLevelData = useCallback(async (parentSlug: string | null = null) => {
    const cacheKey = parentSlug || 'null';

    // Return cached data if available
    if (itemsCache.has(cacheKey)) {
      return itemsCache.get(cacheKey) || [];
    }

    try {
      // Load only current level items
      let query = supabase
        .from('sections')
        .select('*')
        .order('display_order', { ascending: true })
        .order('title', { ascending: true });

      if (parentSlug) {
        query = query.eq('parent_slug', parentSlug);
      } else {
        query = query.is('parent_slug', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data) return [];

      // Get children info in a single query for this level
      const parentSlugs = data.map((item) => item.slug);
      let childrenData: any[] = [];

      if (parentSlugs.length > 0) {
        const { data: children } = await supabase.from('sections').select('parent_slug').in('parent_slug', parentSlugs);

        childrenData = children || [];
      }

      // Create hasChildren lookup
      const hasChildrenSet = new Set(childrenData.map((child) => child.parent_slug));

      // Process items with children info
      const processedItems = data.map((item) => {
        const hasChildren = hasChildrenSet.has(item.slug);
        const childCount = childrenData.filter((child) => child.parent_slug === item.slug).length;
        childrenCache.set(item.slug, hasChildren);
        return {
          ...item,
          hasChildren,
          childCount: hasChildren ? childCount : undefined,
          content_improved: !hasChildren ? true : undefined, // Mark items with content as having content
        };
      });

      // Cache the results
      itemsCache.set(cacheKey, processedItems);
      return processedItems;
    } catch (error) {
      SecureLogger.error('Error loading level data:', error);
      return [];
    }
  }, []);

  // Get items from cache if available
  const getItemsFromCache = useCallback((parentSlug: string | null = null) => {
    const key = parentSlug || 'null';
    return itemsCache.get(key) || null;
  }, []);

  // Fetch items for current level (progressive loading)
  const fetchItems = useCallback(
    async (parentSlug: string | null = null) => {
      // Check cache first for instant loading
      const cachedItems = getItemsFromCache(parentSlug);
      if (cachedItems) {
        setCurrentItems(cachedItems);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Load only this level's data
        const items = await loadLevelData(parentSlug);
        setCurrentItems(items);
      } catch (error) {
        SecureLogger.error('Error fetching items:', error);
      } finally {
        setLoading(false);
      }
    },
    [loadLevelData, getItemsFromCache]
  );

  // Initial load
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Preload next level data in background for better UX
  const preloadNextLevel = useCallback(async () => {
    if (currentItems.length > 0) {
      // Preload children for items that have them
      const itemsWithChildren = currentItems.filter((item) => item.hasChildren);

      // Load the first few children levels in background
      itemsWithChildren.slice(0, 3).forEach((item) => {
        setTimeout(() => {
          loadLevelData(item.slug);
        }, 100);
      });
    }
  }, [currentItems, loadLevelData]);

  // Trigger preloading when current items change
  useEffect(() => {
    if (currentItems.length > 0 && !loading) {
      preloadNextLevel();
    }
  }, [currentItems, loading, preloadNextLevel]);

  // Navigate to category or content
  const handleItemPress = useCallback(
    async (item: Section) => {
      if (item.hasChildren) {
        // Navigate to subcategory

        setBreadcrumbs((prev) => [...prev, { title: item.title, slug: item.slug }]);
        setCurrentParent(item.slug);
        await fetchItems(item.slug);
      } else {
        // Navigate to content

        if (onNavigateToContent) {
          onNavigateToContent(item.slug);
        } else {
          router.push(`/(tabs)/bibliothek/content/${item.slug}`);
        }
      }
    },
    [fetchItems, onNavigateToContent, router]
  );

  // Open content in modal
  const handleOpenModal = useCallback(
    async (item: CategoryItem) => {
      // Only open modal for content items (not categories with children)
      if (!item.hasChildren) {
        // Get all content sections at current level for navigation
        const contentSections = currentItems.filter((i) => !i.hasChildren);
        setAvailableSections(contentSections);
        setModalSlug(item.slug);
        setModalVisible(true);
      }
    },
    [currentItems]
  );

  // Handle modal section change
  const handleModalSectionChange = useCallback((slug: string) => {
    setModalSlug(slug);
  }, []);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setModalSlug(null);
    setAvailableSections([]);
  }, []);

  // Handle bookmark press
  const handleBookmarkPress = useCallback((item: Section) => {
    setBookmarkedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(item.slug)) {
        newSet.delete(item.slug);
      } else {
        newSet.add(item.slug);
      }
      return newSet;
    });
  }, []);

  // Navigate back in breadcrumbs (optimized)
  const handleBreadcrumbPress = useCallback(
    async (index: number) => {
      const targetBreadcrumb = breadcrumbs[index];

      // Update breadcrumbs
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      setCurrentParent(targetBreadcrumb.slug);

      // Get items from cache immediately (no loading state for cached navigation)
      const cachedItems = getItemsFromCache(targetBreadcrumb.slug);
      if (cachedItems) {
        setCurrentItems(cachedItems);
      } else {
        // Fallback to fetch if cache miss
        await fetchItems(targetBreadcrumb.slug);
      }
    },
    [breadcrumbs, fetchItems, getItemsFromCache]
  );

  // Render breadcrumb navigation
  const renderBreadcrumbs = () => (
    <View style={styles.breadcrumbContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbContent}>
        {breadcrumbs.map((crumb, index) => (
          <View key={`${crumb.slug}-${index}`} style={styles.breadcrumbItem}>
            <TouchableOpacity
              onPress={() => handleBreadcrumbPress(index)}
              style={styles.breadcrumbButton}
              disabled={index === breadcrumbs.length - 1}
            >
              {index === 0 && <Home size={16} color={colors.primary} style={styles.homeIcon} />}
              <Text
                style={[
                  styles.breadcrumbText,
                  {
                    color: index === breadcrumbs.length - 1 ? colors.text : colors.primary,
                  },
                ]}
              >
                {crumb.title}
              </Text>
            </TouchableOpacity>
            {index < breadcrumbs.length - 1 && (
              <ChevronRight size={16} color={colors.textSecondary} style={styles.breadcrumbSeparator} />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  // Loading skeleton for better perceived performance
  const LoadingSkeleton = useMemo(
    () => (
      <View style={styles.grid}>
        {Array(6)
          .fill(0)
          .map((_, index) => (
            <View key={index} style={[styles.categoryCard, styles.skeletonCard, { backgroundColor: colors.card }]}>
              <View style={[styles.skeletonIcon, { backgroundColor: colors.background }]} />
              <View style={styles.skeletonContent}>
                <View style={[styles.skeletonTitle, { backgroundColor: colors.background }]} />
                <View style={[styles.skeletonDescription, { backgroundColor: colors.background }]} />
              </View>
            </View>
          ))}
      </View>
    ),
    [colors]
  );

  // Show skeleton only if no items and loading
  const showSkeleton = loading && currentItems.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header matching homepage - Modern Glassmorphism */}
      <View style={styles.modernHeader}>
        <LinearGradient colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.menuButton} onPress={() => setMenuOpen(true)} activeOpacity={0.7}>
              <LinearGradient
                colors={['rgba(184,126,112,0.15)', 'rgba(184,126,112,0.10)']}
                style={styles.menuButtonGradient}
              >
                <MenuIcon size={24} color="#B87E70" />
              </LinearGradient>
            </TouchableOpacity>
            <Logo size="medium" variant="medical" textColor="#B15740" animated={true} />
            <UserAvatar size="medium" />
          </View>
        </LinearGradient>
      </View>

      {/* Breadcrumb Navigation */}
      {renderBreadcrumbs()}

      {/* Mobile Bibliothek Layout */}
      {showSkeleton ? (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        >
          {LoadingSkeleton}
          <View style={styles.bottomPadding} />
        </ScrollView>
      ) : (
        <View style={styles.scrollContainer}>
          <MobileBibliothekLayout
            sections={currentItems}
            title={breadcrumbs[breadcrumbs.length - 1].title}
            subtitle={`${currentItems.length} ${currentItems.length === 1 ? 'Kategorie' : 'Kategorien'}${loading && currentItems.length > 0 ? ' • Lade mehr...' : ''}`}
            onSectionPress={handleItemPress}
            onBookmarkPress={handleBookmarkPress}
            bookmarkedSections={bookmarkedSections}
            showViewToggle={true}
            loading={loading && currentItems.length > 0}
          />
        </View>
      )}

      {/* Medical Content Modal */}
      <MedicalContentModal
        visible={modalVisible}
        onClose={handleCloseModal}
        initialSlug={modalSlug ?? undefined}
        availableSections={availableSections.map((section) => ({
          id: section.id,
          slug: section.slug,
          title: section.title,
          type: section.type,
        }))}
        onSectionChange={handleModalSectionChange}
      />

      {/* Menu */}
      <Menu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header Styles (matching homepage)
  modernHeader: {
    shadowColor: 'rgba(181,87,64,0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1000,
  },
  headerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuButtonGradient: {
    padding: 12,
    borderRadius: 12,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  breadcrumbContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20, // Match header padding
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184, 126, 112, 0.2)', // Old Rose border for consistency
    backgroundColor: 'rgba(248, 243, 232, 0.3)', // Subtle background tint
  },
  breadcrumbContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  homeIcon: {
    marginRight: 4,
  },
  breadcrumbText: {
    fontSize: 14,
    fontWeight: '500',
  },
  breadcrumbSeparator: {
    marginHorizontal: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  gridContainer: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bottomPadding: {
    height: 40,
  },
  // Category card for skeleton
  categoryCard: {
    width: '47%',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  // Skeleton loading styles
  skeletonCard: {
    opacity: 0.7,
  },
  skeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 12,
    opacity: 0.3,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonTitle: {
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
    opacity: 0.3,
  },
  skeletonDescription: {
    height: 12,
    borderRadius: 4,
    width: '80%',
    opacity: 0.2,
  },
});

export default HierarchicalBibliothek;
