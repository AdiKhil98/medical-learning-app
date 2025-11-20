import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Platform,
  Animated,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Home,
  ChevronRight,
  Search,
  Filter,
  Heart,
  Stethoscope,
  Activity,
  AlertTriangle,
  Droplet,
  Scan,
  SyringeIcon as Syringe,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { runGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Category {
  id: string;
  title: string;
  count: number;
  gradientColors: string[];
  iconName: string;
  slug: string;
  description?: string;
}

// Animated Stats Grid Component
const AnimatedStatsGrid: React.FC<{
  favorites: number;
  totalCategories: number;
  totalSections: number;
}> = ({ favorites, totalCategories, totalSections }) => {
  const statCards = [
    { number: totalCategories.toString(), label: 'Fachgebiete', color: '#B8846A' },
    { number: totalSections.toString(), label: 'Kategorien', color: '#3B82F6' },
    { number: '1.2k', label: 'Fragen', color: '#10B981' },
    { number: favorites.toString(), label: 'Favoriten', color: '#F97316' },
  ];

  return (
    <View style={styles.statsGrid}>
      {statCards.map((stat, index) => {
        const scaleAnim = useRef(new Animated.Value(0)).current;
        const fadeAnim = useRef(new Animated.Value(0)).current;

        useEffect(() => {
          Animated.parallel([
            Animated.spring(scaleAnim, {
              toValue: 1,
              delay: index * 80,
              friction: 4,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 300,
              delay: index * 80,
              useNativeDriver: true,
            }),
          ]).start();
        }, []);

        return (
          <Animated.View
            key={index}
            style={[
              styles.statCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Text style={[styles.statNumber, { color: stat.color }]}>{stat.number}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
};

// Enhanced Category Card Component with Animations
const AnimatedCategoryCard: React.FC<{
  category: Category;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  index: number;
}> = ({ category, isFavorite, onPress, onToggleFavorite, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered fade-in animation on mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      useNativeDriver: true,
    }).start();

    // Subtle continuous pulse for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const getIconComponent = (iconName: string) => {
    const iconProps = { size: 36, color: '#FFFFFF', strokeWidth: 2.5 };
    switch (iconName) {
      case 'stethoscope':
        return <Stethoscope {...iconProps} />;
      case 'heart':
        return <Heart {...iconProps} />;
      case 'alert':
        return <AlertTriangle {...iconProps} />;
      case 'activity':
        return <Activity {...iconProps} />;
      case 'droplet':
        return <Droplet {...iconProps} />;
      case 'scan':
        return <Scan {...iconProps} />;
      default:
        return <Stethoscope {...iconProps} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.categoryCardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={category.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.categoryCard}
        >

          {/* Content */}
          <View style={styles.cardContent}>
            {/* Favorite Button */}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={onToggleFavorite}
              activeOpacity={0.7}
            >
              <Heart
                size={24}
                color="rgba(255,255,255,0.9)"
                fill={isFavorite ? 'rgba(255,255,255,0.9)' : 'none'}
              />
            </TouchableOpacity>

            {/* Icon Container with Pulse */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [{ scale: iconPulse }],
                },
              ]}
            >
              {getIconComponent(category.iconName)}
            </Animated.View>

            {/* Title */}
            <Text style={styles.cardTitle}>{category.title}</Text>

            {/* Count and Arrow */}
            <View style={styles.cardFooter}>
              <Text style={styles.cardCount}>{category.count} Kategorien</Text>
              <ChevronRight size={24} color="rgba(255,255,255,0.7)" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Helper function to get gradient colors based on slug
const getGradientForSlug = (slug: string): string[] => {
  const gradientMap: Record<string, string[]> = {
    'chirurgie': ['#ef4444', '#dc2626', '#b91c1c'],
    'innere-medizin': ['#E2827F', '#E2827F', '#B15740'],
    'kardiologie': ['#f43f5e', '#e11d48', '#be185d'],
    'pneumologie': ['#E2827F', '#B15740', '#B15740'],
    'gastroenterologie': ['#f97316', '#ea580c', '#c2410c'],
    'nephrologie': ['#14b8a6', '#0891b2', '#0e7490'],
    'endokrinologie-und-stoffwechsel': ['#8b5cf6', '#7c3aed', '#6d28d9'],
    'notfallmedizin': ['#f59e0b', '#dc2626', '#b91c1c'],
    'infektiologie': ['#10b981', '#059669', '#047857'],
    'urologie': ['#a16207', '#7c2d12', '#92400e'],
    'radiologie': ['#6366f1', '#4338ca', '#3730a3'],
    'dermatologie': ['#ec4899', '#be185d', '#9d174d'],
    'neurologie': ['#7c3aed', '#5b21b6', '#4c1d95'],
    'orthopädie': ['#6b7280', '#374151', '#1f2937'],
  };
  return gradientMap[slug] || ['#06b6d4', '#0891b2', '#0e7490']; // Default teal
};

// Helper function to get icon name based on slug
const getIconForSlug = (slug: string, title: string): string => {
  const lowerTitle = title.toLowerCase();
  const lowerSlug = slug.toLowerCase();

  if (lowerSlug.includes('kardio') || lowerTitle.includes('herz')) return 'heart';
  if (lowerSlug.includes('chirurg') || lowerSlug.includes('trauma')) return 'stethoscope';
  if (lowerSlug.includes('notfall') || lowerSlug.includes('emergency')) return 'alert';
  if (lowerSlug.includes('diagnostik') || lowerSlug.includes('radio')) return 'scan';
  if (lowerSlug.includes('pneumo') || lowerTitle.includes('lunge')) return 'activity';
  if (lowerSlug.includes('urolog') || lowerSlug.includes('niere')) return 'droplet';
  if (lowerSlug.includes('infekt') || lowerSlug.includes('hygiene')) return 'activity';

  return 'stethoscope'; // Default icon
};

type SortOption = 'alphabetical' | 'count-desc' | 'count-asc' | 'favorites';

const BibliothekIndex: React.FC = () => {
  const router = useRouter();
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Ensure Voiceflow widget is cleaned up when entering Bibliothek
  useEffect(() => {
    runGlobalVoiceflowCleanup();
    const timeout = setTimeout(() => runGlobalVoiceflowCleanup(), 500);
    return () => clearTimeout(timeout);
  }, []);

  // Fetch top-level categories from database
  const fetchCategories = useCallback(async () => {
    if (!session) {
      setError('Sie müssen angemeldet sein.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch top-level sections (where parent_slug is null)
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('id, slug, title, description, parent_slug')
        .is('parent_slug', null)
        .order('display_order', { ascending: true });

      if (sectionsError) throw sectionsError;

      // For each section, count its children
      const categoriesWithCounts = await Promise.all(
        (sections || []).map(async (section) => {
          const { count } = await supabase
            .from('sections')
            .select('id', { count: 'exact', head: true })
            .eq('parent_slug', section.slug);

          return {
            id: section.id,
            title: section.title,
            slug: section.slug,
            description: section.description,
            count: count || 0,
            gradientColors: getGradientForSlug(section.slug),
            iconName: getIconForSlug(section.slug, section.title),
          };
        })
      );

      setCategories(categoriesWithCounts);
    } catch (e) {
      console.error('Error fetching categories:', e);
      setError(e instanceof Error ? e.message : 'Fehler beim Laden der Kategorien');
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Toggle favorite
  const toggleFavorite = (categoryId: string) => {
    setFavorites((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Handle category press
  const handleCategoryPress = (slug: string) => {
    router.push(`/(tabs)/bibliothek/${slug}`);
  };

  // Handle simulation start
  const handleStartSimulation = () => {
    router.push('/(tabs)/simulation');
  };

  // Filter and sort categories
  const filteredCategories = useMemo(() => {
    let result = [...categories];

    // Apply search filter
    if (searchQuery) {
      result = result.filter((cat) =>
        cat.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply favorites filter
    if (showOnlyFavorites) {
      result = result.filter((cat) => favorites.includes(cat.id));
    }

    // Apply sorting
    switch (sortBy) {
      case 'alphabetical':
        result.sort((a, b) => a.title.localeCompare(b.title, 'de'));
        break;
      case 'count-desc':
        result.sort((a, b) => b.count - a.count);
        break;
      case 'count-asc':
        result.sort((a, b) => a.count - b.count);
        break;
      case 'favorites':
        result.sort((a, b) => {
          const aIsFav = favorites.includes(a.id) ? 1 : 0;
          const bIsFav = favorites.includes(b.id) ? 1 : 0;
          return bIsFav - aIsFav;
        });
        break;
    }

    return result;
  }, [categories, searchQuery, showOnlyFavorites, sortBy, favorites]);

  // Calculate total sections count
  const totalSectionsCount = categories.reduce((sum, cat) => sum + cat.count, 0);

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#F8FAFC', '#FFFFFF', '#F1F5F9']}
          style={styles.backgroundGradient}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#B8846A" />
            <Text style={styles.loadingText}>Kategorien werden geladen...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#F8FAFC', '#FFFFFF', '#F1F5F9']}
          style={styles.backgroundGradient}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Fehler</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchCategories}>
              <Text style={styles.retryButtonText}>Erneut versuchen</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#F8FAFC', '#FFFFFF', '#F1F5F9']}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            {/* Breadcrumb */}
            <View style={styles.breadcrumb}>
              <Home size={16} color="#94A3B8" />
              <ChevronRight size={16} color="#94A3B8" style={styles.breadcrumbSeparator} />
              <Text style={styles.breadcrumbActive}>Bibliothek</Text>
            </View>

            {/* Title */}
            <Text style={styles.pageTitle}>Bibliothek</Text>
            <Text style={styles.pageSubtitle}>
              Entdecken Sie medizinische Fachgebiete und vertiefen Sie Ihr Wissen
            </Text>
          </View>

          {/* Search & Filter Bar */}
          <View style={styles.searchFilterContainer}>
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Search size={20} color="#94A3B8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Fachgebiet suchen..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filter Button */}
            <TouchableOpacity
              style={[
                styles.filterButton,
                (showOnlyFavorites || sortBy !== 'alphabetical') && styles.filterButtonActive,
              ]}
              onPress={() => setFilterModalVisible(true)}
            >
              <Filter size={20} color={(showOnlyFavorites || sortBy !== 'alphabetical') ? '#F97316' : '#475569'} />
              <Text style={[
                styles.filterText,
                (showOnlyFavorites || sortBy !== 'alphabetical') && styles.filterTextActive,
              ]}>
                Filter
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filter Modal */}
          <Modal
            visible={filterModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setFilterModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setFilterModalVisible(false)}
            >
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Filter & Sortieren</Text>
                  <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                    <Text style={styles.modalCloseText}>Fertig</Text>
                  </TouchableOpacity>
                </View>

                {/* Sort Options */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Sortieren nach</Text>

                  <TouchableOpacity
                    style={styles.filterOption}
                    onPress={() => setSortBy('alphabetical')}
                  >
                    <View style={styles.filterOptionContent}>
                      <Text style={styles.filterOptionText}>Alphabetisch (A-Z)</Text>
                      {sortBy === 'alphabetical' && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.filterOption}
                    onPress={() => setSortBy('count-desc')}
                  >
                    <View style={styles.filterOptionContent}>
                      <Text style={styles.filterOptionText}>Meiste Kategorien</Text>
                      {sortBy === 'count-desc' && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.filterOption}
                    onPress={() => setSortBy('count-asc')}
                  >
                    <View style={styles.filterOptionContent}>
                      <Text style={styles.filterOptionText}>Wenigste Kategorien</Text>
                      {sortBy === 'count-asc' && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.filterOption}
                    onPress={() => setSortBy('favorites')}
                  >
                    <View style={styles.filterOptionContent}>
                      <Text style={styles.filterOptionText}>Favoriten zuerst</Text>
                      {sortBy === 'favorites' && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Filter Options */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Anzeigen</Text>

                  <TouchableOpacity
                    style={styles.filterOption}
                    onPress={() => setShowOnlyFavorites(!showOnlyFavorites)}
                  >
                    <View style={styles.filterOptionContent}>
                      <Text style={styles.filterOptionText}>Nur Favoriten</Text>
                      {showOnlyFavorites && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Reset Button */}
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => {
                    setSortBy('alphabetical');
                    setShowOnlyFavorites(false);
                  }}
                >
                  <Text style={styles.resetButtonText}>Filter zurücksetzen</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Stats Grid - Animated */}
          <AnimatedStatsGrid
            favorites={favorites.length}
            totalCategories={categories.length}
            totalSections={totalSectionsCount}
          />

          {/* Section Header */}
          <Text style={styles.sectionHeader}>
            {searchQuery ? `Suchergebnisse (${filteredCategories.length})` : 'Alle Fachgebiete'}
          </Text>

          {/* Category Cards Grid */}
          <View style={styles.categoryGrid}>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category, index) => (
                <AnimatedCategoryCard
                  key={category.id}
                  category={category}
                  isFavorite={favorites.includes(category.id)}
                  onPress={() => handleCategoryPress(category.slug)}
                  onToggleFavorite={() => toggleFavorite(category.id)}
                  index={index}
                />
              ))
            ) : (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>
                  Keine Fachgebiete gefunden für "{searchQuery}"
                </Text>
              </View>
            )}
          </View>

          {/* Call to Action Banner */}
          <LinearGradient
            colors={['#FB923C', '#F97316', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBanner}
          >
            <Text style={styles.ctaTitle}>Bereit zum Lernen?</Text>
            <Text style={styles.ctaSubtitle}>
              Starten Sie jetzt mit einer Simulation und testen Sie Ihr Wissen
            </Text>

            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleStartSimulation}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>Simulation starten</Text>
              <ChevronRight size={20} color="#F97316" />
            </TouchableOpacity>
          </LinearGradient>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 96,
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  retryButton: {
    backgroundColor: '#B8846A',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  noResultsContainer: {
    width: '100%',
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Hero Section
  heroSection: {
    marginBottom: 32,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  breadcrumbSeparator: {
    marginHorizontal: 8,
  },
  breadcrumbActive: {
    fontSize: 14,
    color: '#FB923C',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#B8846A',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Search & Filter Bar
  searchFilterContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  searchContainer: {
    flex: 1,
    position: 'relative',
    height: 48,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  searchInput: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingLeft: 48,
    paddingRight: 16,
    fontSize: 16,
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    gap: 8,
  },
  filterButtonActive: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  filterText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  filterTextActive: {
    color: '#F97316',
  },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F97316',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  filterOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
  },
  filterOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '500',
  },

  // Section Header
  sectionHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Category Cards Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 48,
  },
  categoryCardWrapper: {
    width: '48%',
    marginBottom: 32,
  },
  categoryCard: {
    borderRadius: 28,
    padding: 28,
    minHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bgCircle: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 1000,
  },
  bgCircle1: {
    width: 128,
    height: 128,
    top: -64,
    right: -64,
  },
  bgCircle2: {
    width: 96,
    height: 96,
    bottom: -48,
    left: -48,
  },
  cardContent: {
    position: 'relative',
    zIndex: 10,
  },
  favoriteButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
  },
  iconContainer: {
    width: 72,
    height: 72,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCount: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // CTA Banner
  ctaBanner: {
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  ctaSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F97316',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default BibliothekIndex;
