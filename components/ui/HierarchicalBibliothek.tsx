import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
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
  Home
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import BookmarkButton from '@/components/ui/BookmarkButton';

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
}

interface BreadcrumbItem {
  title: string;
  slug: string | null;
}

interface HierarchicalBibliothekProps {
  onNavigateToContent?: (slug: string) => void;
}

const HierarchicalBibliothek: React.FC<HierarchicalBibliothekProps> = ({ onNavigateToContent }) => {
  const { colors } = useTheme();
  const router = useRouter();
  
  const [currentItems, setCurrentItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ title: 'Bibliothek', slug: null }]);
  const [currentParent, setCurrentParent] = useState<string | null>(null);

  // Icon mapping for categories
  const getIconComponent = useCallback((iconName: string) => {
    const iconMap: Record<string, any> = {
      'Stethoscope': Stethoscope,
      'Heart': Heart,
      'Activity': Activity,
      'Brain': Brain,
      'Baby': Baby,
      'Users': Users,
      'AlertTriangle': AlertTriangle,
      'Scan': Scan,
      'FileText': FileText,
      'FolderOpen': FolderOpen,
    };
    return iconMap[iconName] || FolderOpen;
  }, []);

  // Fetch items for current level
  const fetchItems = useCallback(async (parentSlug: string | null = null) => {
    setLoading(true);
    try {
      
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

      if (error) {
        return;
      }

      if (data) {
        // Check which items have children
        const itemsWithChildrenInfo = await Promise.all(
          data.map(async (item) => {
            const { data: children } = await supabase
              .from('sections')
              .select('id')
              .eq('parent_slug', item.slug)
              .limit(1);
            
            return {
              ...item,
              hasChildren: children && children.length > 0
            };
          })
        );

        setCurrentItems(itemsWithChildrenInfo);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Navigate to category or content
  const handleItemPress = useCallback(async (item: CategoryItem) => {
    if (item.hasChildren) {
      // Navigate to subcategory
      
      setBreadcrumbs(prev => [...prev, { title: item.title, slug: item.slug }]);
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
  }, [fetchItems, onNavigateToContent, router]);

  // Navigate back in breadcrumbs
  const handleBreadcrumbPress = useCallback(async (index: number) => {
    const targetBreadcrumb = breadcrumbs[index];
    
    // Update breadcrumbs
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setCurrentParent(targetBreadcrumb.slug);
    
    // Fetch items for target level
    await fetchItems(targetBreadcrumb.slug);
  }, [breadcrumbs, fetchItems]);

  // Render breadcrumb navigation
  const renderBreadcrumbs = () => (
    <View style={styles.breadcrumbContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.breadcrumbContent}
      >
        {breadcrumbs.map((crumb, index) => (
          <View key={`${crumb.slug}-${index}`} style={styles.breadcrumbItem}>
            <TouchableOpacity
              onPress={() => handleBreadcrumbPress(index)}
              style={styles.breadcrumbButton}
              disabled={index === breadcrumbs.length - 1}
            >
              {index === 0 && <Home size={16} color={colors.primary} style={styles.homeIcon} />}
              <Text style={[
                styles.breadcrumbText,
                { 
                  color: index === breadcrumbs.length - 1 ? colors.text : colors.primary 
                }
              ]}>
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

  // Render category card
  const renderCategoryCard = (item: CategoryItem) => {
    const IconComponent = getIconComponent(item.icon);
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.categoryCard, { backgroundColor: colors.card }]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
          <IconComponent size={24} color={item.color} />
        </View>
        
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          
          {item.description && (
            <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        
        <View style={styles.cardIndicator}>
          {item.hasChildren ? (
            <ChevronRight size={20} color={colors.textSecondary} />
          ) : (
            <View style={styles.contentActions}>
              <BookmarkButton
                sectionSlug={item.slug}
                sectionTitle={item.title}
                sectionCategory={item.type}
                size={18}
                style={styles.bookmarkButton}
              />
              <FileText size={18} color={colors.primary} style={styles.fileIcon} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && currentItems.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Lade medizinische Kategorien...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Breadcrumb Navigation */}
      {renderBreadcrumbs()}
      
      {/* Content Header */}
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {breadcrumbs[breadcrumbs.length - 1].title}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {currentItems.length} {currentItems.length === 1 ? 'Kategorie' : 'Kategorien'}
        </Text>
      </View>

      {/* Category Grid */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {currentItems.map(renderCategoryCard)}
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
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
  categoryCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 120,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardIndicator: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  contentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookmarkButton: {
    padding: 4,
  },
  fileIcon: {
    marginLeft: 4,
  },
  bottomPadding: {
    height: 40,
  },
});

export default HierarchicalBibliothek;