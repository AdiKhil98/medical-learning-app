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
  Menu as MenuIcon,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { runGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Menu from '@/components/ui/Menu';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';

import { SecureLogger } from '@/lib/security';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '@/constants/tokens';
import { withErrorBoundary } from '@/components/withErrorBoundary';
import { colors } from '@/constants/colors';
import { useResponsive } from '@/hooks/useResponsive';

interface Category {
  id: string;
  title: string;
  count: number;
  gradientColors: string[];
  iconName: string;
  slug: string;
  description?: string;
}

// Individual Stat Card Component (extracted to properly use hooks)
const AnimatedStatCard: React.FC<{
  number: string;
  label: string;
  color: string;
  index: number;
  cardStyle?: StyleSheet.NamedStyles<unknown>;
  labelColor?: string;
}> = ({ number, label, color, index, cardStyle, labelColor }) => {
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
  }, [index, scaleAnim, fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.statCard,
        cardStyle,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={[styles.statNumber, { color }]}>{number}</Text>
      <Text style={[styles.statLabel, labelColor && { color: labelColor }]}>{label}</Text>
    </Animated.View>
  );
};

// Animated Stats Grid Component
const AnimatedStatsGrid: React.FC<{
  favorites: number;
  totalCategories: number;
  totalSections: number;
  cardStyle?: StyleSheet.NamedStyles<unknown>;
  labelColor?: string;
}> = ({ favorites, totalCategories, totalSections, cardStyle, labelColor }) => {
  const statCards = [
    { number: totalCategories.toString(), label: 'Fachgebiete', color: MEDICAL_COLORS.secondary },
    { number: totalSections.toString(), label: 'Kategorien', color: MEDICAL_COLORS.blue },
    { number: '1.2k', label: 'Fragen', color: MEDICAL_COLORS.success },
    { number: favorites.toString(), label: 'Favoriten', color: MEDICAL_COLORS.warmOrangeDark },
  ];

  return (
    <View style={styles.statsGrid}>
      {statCards.map((stat, index) => (
        <AnimatedStatCard
          key={index}
          number={stat.number}
          label={stat.label}
          color={stat.color}
          index={index}
          cardStyle={cardStyle}
          labelColor={labelColor}
        />
      ))}
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
    const iconProps = { size: 36, color: MEDICAL_COLORS.white, strokeWidth: 2.5 };
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
      <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={1}>
        <LinearGradient
          colors={category.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.categoryCard}
        >
          {/* Content */}
          <View style={styles.cardContent}>
            {/* Favorite Button */}
            <TouchableOpacity style={styles.favoriteButton} onPress={onToggleFavorite} activeOpacity={0.7}>
              <Heart size={24} color={MEDICAL_COLORS.white} fill={isFavorite ? MEDICAL_COLORS.white : 'none'} />
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
              <ChevronRight size={24} color={MEDICAL_COLORS.white} />
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
    chirurgie: MEDICAL_COLORS.redGradient,
    'innere-medizin': MEDICAL_COLORS.primaryGradient,
    kardiologie: MEDICAL_COLORS.pinkGradient,
    pneumologie: MEDICAL_COLORS.primaryGradient,
    gastroenterologie: MEDICAL_COLORS.orangeGradient,
    nephrologie: MEDICAL_COLORS.cyanGradient,
    'endokrinologie-und-stoffwechsel': MEDICAL_COLORS.purpleGradient,
    notfallmedizin: MEDICAL_COLORS.warmOrangeGradient,
    infektiologie: MEDICAL_COLORS.greenGradient,
    urologie: MEDICAL_COLORS.amberGradient,
    radiologie: MEDICAL_COLORS.blueGradient,
    dermatologie: MEDICAL_COLORS.pinkGradient,
    neurologie: MEDICAL_COLORS.purpleGradient,
    orthopädie: [...MEDICAL_COLORS.darkMenuGradient].reverse(),
  };
  return gradientMap[slug] || MEDICAL_COLORS.cyanGradient; // Default cyan
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
  const { width: screenWidth, isMobile, isSmallMobile, isTablet } = useResponsive();

  const [menuOpen, setMenuOpen] = useState(false);
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
      if (!sections || sections.length === 0) {
        setCategories([]);
        return;
      }

      // FIX: Fetch all child counts in a SINGLE query instead of N queries
      // Get all children where parent_slug matches any of our sections
      const parentSlugs = sections.map((s) => s.slug);
      const { data: allChildren, error: childrenError } = await supabase
        .from('sections')
        .select('parent_slug')
        .in('parent_slug', parentSlugs);

      if (childrenError) throw childrenError;

      // Create a map of parent_slug -> count for O(1) lookup
      const childCountMap = new Map<string, number>();
      (allChildren || []).forEach((child) => {
        const currentCount = childCountMap.get(child.parent_slug) || 0;
        childCountMap.set(child.parent_slug, currentCount + 1);
      });

      // Map sections to categories with their counts
      const categoriesWithCounts = sections.map((section) => ({
        id: section.id,
        title: section.title,
        slug: section.slug,
        description: section.description,
        count: childCountMap.get(section.slug) || 0,
        gradientColors: getGradientForSlug(section.slug),
        iconName: getIconForSlug(section.slug, section.title),
      }));

      setCategories(categoriesWithCounts);
    } catch (e) {
      SecureLogger.error('Error fetching categories:', e);
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
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
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
      result = result.filter((cat) => cat.title.toLowerCase().includes(searchQuery.toLowerCase()));
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

  // Gradient colors
  const backgroundGradient = MEDICAL_COLORS.backgroundGradient;

  // Dynamic styles for dark mode support
  const dynamicStyles = StyleSheet.create({
    loadingText: {
      ...styles.loadingText,
      color: colors.textSecondary,
    },
    errorText: {
      ...styles.errorText,
      color: colors.textSecondary,
    },
    retryButton: {
      ...styles.retryButton,
      backgroundColor: colors.primary,
    },
    breadcrumbActive: {
      ...styles.breadcrumbActive,
      color: colors.primary,
    },
    pageTitle: {
      ...styles.pageTitle,
      color: colors.text,
    },
    pageSubtitle: {
      ...styles.pageSubtitle,
      color: colors.textSecondary,
    },
    searchContainer: {
      ...styles.searchContainer,
    },
    searchInput: {
      ...styles.searchInput,
      backgroundColor: colors.card,
      borderColor: MEDICAL_COLORS.slate200,
      color: colors.text,
    },
    filterButton: {
      ...styles.filterButton,
      backgroundColor: colors.card,
      borderColor: MEDICAL_COLORS.slate200,
    },
    filterButtonActive: {
      ...styles.filterButtonActive,
      backgroundColor: MEDICAL_COLORS.warmOrangeBg,
    },
    filterText: {
      ...styles.filterText,
      color: colors.text,
    },
    modalContent: {
      ...styles.modalContent,
      backgroundColor: colors.card,
    },
    modalTitle: {
      ...styles.modalTitle,
      color: colors.text,
    },
    filterSectionTitle: {
      ...styles.filterSectionTitle,
      color: colors.textSecondary,
    },
    filterOption: {
      ...styles.filterOption,
      backgroundColor: MEDICAL_COLORS.slate50,
    },
    filterOptionText: {
      ...styles.filterOptionText,
      color: colors.text,
    },
    resetButtonText: {
      ...styles.resetButtonText,
      color: colors.textSecondary,
    },
    statCard: {
      ...styles.statCard,
      backgroundColor: colors.card,
      borderColor: MEDICAL_COLORS.slate100,
    },
    statLabel: {
      ...styles.statLabel,
      color: colors.textSecondary,
    },
    sectionHeader: {
      ...styles.sectionHeader,
      color: colors.text,
    },
    noResultsText: {
      ...styles.noResultsText,
      color: colors.textSecondary,
    },
    ctaButton: {
      ...styles.ctaButton,
      backgroundColor: MEDICAL_COLORS.white,
    },
    ctaButtonText: {
      ...styles.ctaButtonText,
      color: MEDICAL_COLORS.warmOrangeDark,
    },
  });

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={backgroundGradient} style={styles.backgroundGradient} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={dynamicStyles.loadingText}>Kategorien werden geladen...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={backgroundGradient} style={styles.backgroundGradient} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Fehler</Text>
            <Text style={dynamicStyles.errorText}>{error}</Text>
            <TouchableOpacity style={dynamicStyles.retryButton} onPress={fetchCategories}>
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
      <LinearGradient colors={backgroundGradient} style={styles.backgroundGradient} />

      <SafeAreaView style={styles.safeArea}>
        {/* Modern Header - Matching Homepage */}
        <View
          style={[
            styles.modernHeader,
            Platform.OS === 'web' && {
              position: 'sticky' as any,
              top: 0,
              zIndex: 1000,
            },
          ]}
        >
          {/* Orange accent line at top */}
          {Platform.OS === 'web' && (
            <LinearGradient
              colors={['#FF8C42', '#FF6B6B', '#FFA66B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 3, width: '100%' }}
            />
          )}
          <LinearGradient colors={MEDICAL_COLORS.headerGradient as any} style={styles.headerGradient}>
            <View style={styles.headerContent}>
              {/* Left Section: Menu + Logo */}
              <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.menuButton} onPress={() => setMenuOpen(true)} activeOpacity={0.7}>
                  <LinearGradient
                    colors={['rgba(251, 146, 60, 0.15)', 'rgba(239, 68, 68, 0.10)']}
                    style={styles.menuButtonGradient}
                  >
                    <MenuIcon size={22} color={MEDICAL_COLORS.warmOrange} />
                  </LinearGradient>
                </TouchableOpacity>
                <Logo size="medium" variant="medical" textColor={MEDICAL_COLORS.warmOrange} animated={false} />
              </View>
              {/* Right Section: User Avatar */}
              <UserAvatar size="medium" />
            </View>
          </LinearGradient>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            {/* Breadcrumb */}
            <View style={styles.breadcrumb}>
              <Home size={16} color={colors.textSecondary} />
              <ChevronRight size={16} color={colors.textSecondary} style={styles.breadcrumbSeparator} />
              <Text style={dynamicStyles.breadcrumbActive}>Bibliothek</Text>
            </View>

            {/* Title */}
            <Text style={dynamicStyles.pageTitle}>Bibliothek</Text>
            <Text style={dynamicStyles.pageSubtitle}>
              Entdecken Sie medizinische Fachgebiete und vertiefen Sie Ihr Wissen
            </Text>
          </View>

          {/* Search & Filter Bar */}
          <View style={styles.searchFilterContainer}>
            {/* Search Input */}
            <View style={dynamicStyles.searchContainer}>
              <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={dynamicStyles.searchInput}
                placeholder="Fachgebiet suchen..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filter Button */}
            <TouchableOpacity
              style={[
                dynamicStyles.filterButton,
                (showOnlyFavorites || sortBy !== 'alphabetical') && dynamicStyles.filterButtonActive,
              ]}
              onPress={() => setFilterModalVisible(true)}
            >
              <Filter
                size={20}
                color={showOnlyFavorites || sortBy !== 'alphabetical' ? MEDICAL_COLORS.warmOrangeDark : colors.text}
              />
              <Text
                style={[
                  dynamicStyles.filterText,
                  (showOnlyFavorites || sortBy !== 'alphabetical') && styles.filterTextActive,
                ]}
              >
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
              <View style={dynamicStyles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={dynamicStyles.modalTitle}>Filter & Sortieren</Text>
                  <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                    <Text style={styles.modalCloseText}>Fertig</Text>
                  </TouchableOpacity>
                </View>

                {/* Sort Options */}
                <View style={styles.filterSection}>
                  <Text style={dynamicStyles.filterSectionTitle}>Sortieren nach</Text>

                  <TouchableOpacity style={dynamicStyles.filterOption} onPress={() => setSortBy('alphabetical')}>
                    <View style={styles.filterOptionContent}>
                      <Text style={dynamicStyles.filterOptionText}>Alphabetisch (A-Z)</Text>
                      {sortBy === 'alphabetical' && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={dynamicStyles.filterOption} onPress={() => setSortBy('count-desc')}>
                    <View style={styles.filterOptionContent}>
                      <Text style={dynamicStyles.filterOptionText}>Meiste Kategorien</Text>
                      {sortBy === 'count-desc' && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={dynamicStyles.filterOption} onPress={() => setSortBy('count-asc')}>
                    <View style={styles.filterOptionContent}>
                      <Text style={dynamicStyles.filterOptionText}>Wenigste Kategorien</Text>
                      {sortBy === 'count-asc' && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={dynamicStyles.filterOption} onPress={() => setSortBy('favorites')}>
                    <View style={styles.filterOptionContent}>
                      <Text style={dynamicStyles.filterOptionText}>Favoriten zuerst</Text>
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
                  <Text style={dynamicStyles.filterSectionTitle}>Anzeigen</Text>

                  <TouchableOpacity
                    style={dynamicStyles.filterOption}
                    onPress={() => setShowOnlyFavorites(!showOnlyFavorites)}
                  >
                    <View style={styles.filterOptionContent}>
                      <Text style={dynamicStyles.filterOptionText}>Nur Favoriten</Text>
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
                  <Text style={dynamicStyles.resetButtonText}>Filter zurücksetzen</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Stats Grid - Animated */}
          <AnimatedStatsGrid
            favorites={favorites.length}
            totalCategories={categories.length}
            totalSections={totalSectionsCount}
            cardStyle={dynamicStyles.statCard}
            labelColor={colors.textSecondary}
          />

          {/* Section Header */}
          <Text style={dynamicStyles.sectionHeader}>
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
                <Text style={dynamicStyles.noResultsText}>
                  Keine Fachgebiete gefunden für &ldquo;{searchQuery}&rdquo;
                </Text>
              </View>
            )}
          </View>

          {/* Call to Action Banner */}
          <LinearGradient
            colors={MEDICAL_COLORS.warmOrangeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBanner}
          >
            <Text style={styles.ctaTitle}>Bereit zum Lernen?</Text>
            <Text style={styles.ctaSubtitle}>Starten Sie jetzt mit einer Simulation und testen Sie Ihr Wissen</Text>

            <TouchableOpacity style={dynamicStyles.ctaButton} onPress={handleStartSimulation} activeOpacity={0.8}>
              <Text style={dynamicStyles.ctaButtonText}>Simulation starten</Text>
              <ChevronRight size={20} color={MEDICAL_COLORS.warmOrangeDark} />
            </TouchableOpacity>
          </LinearGradient>
        </ScrollView>

        {/* Menu */}
        <Menu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
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

  // Header Styles - Matching Homepage
  modernHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerGradient: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    minWidth: 44,
    minHeight: 44,
  },
  menuButtonGradient: {
    padding: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 96,
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxxxl,
  },
  loadingText: {
    marginTop: SPACING.lg,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.slate500,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxxxl,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.warmRed,
    marginBottom: SPACING.md,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.slate500,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  retryButton: {
    backgroundColor: MEDICAL_COLORS.secondary,
    paddingHorizontal: SPACING.xxxl,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  retryButtonText: {
    color: MEDICAL_COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  noResultsContainer: {
    width: '100%',
    padding: SPACING.xxxxxl,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.slate500,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Hero Section
  heroSection: {
    marginBottom: SPACING.xxxl,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  breadcrumbSeparator: {
    marginHorizontal: SPACING.sm,
  },
  breadcrumbActive: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: MEDICAL_COLORS.warmOrange,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000000',
    marginBottom: SPACING.md,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: MEDICAL_COLORS.slate600,
    lineHeight: 26,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: TYPOGRAPHY.fontWeight.normal,
  },

  // Search & Filter Bar
  searchFilterContainer: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.xxxl,
  },
  searchContainer: {
    flex: 1,
    position: 'relative',
    height: 48,
  },
  searchIcon: {
    position: 'absolute',
    left: SPACING.lg,
    top: 14,
    zIndex: 1,
  },
  searchInput: {
    height: '100%',
    backgroundColor: MEDICAL_COLORS.white,
    borderWidth: 2,
    borderColor: MEDICAL_COLORS.slate200,
    borderRadius: BORDER_RADIUS.lg,
    paddingLeft: 48,
    paddingRight: SPACING.lg,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.slate900,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    backgroundColor: MEDICAL_COLORS.white,
    borderWidth: 2,
    borderColor: MEDICAL_COLORS.slate200,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  filterButtonActive: {
    borderColor: MEDICAL_COLORS.warmOrangeDark,
    backgroundColor: MEDICAL_COLORS.warmOrangeBg,
  },
  filterText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: MEDICAL_COLORS.slate700,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  filterTextActive: {
    color: MEDICAL_COLORS.warmOrangeDark,
  },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: MEDICAL_COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxxxxl,
    paddingHorizontal: SPACING.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: MEDICAL_COLORS.slate200,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.slate900,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modalCloseText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: MEDICAL_COLORS.warmOrangeDark,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  filterSection: {
    marginBottom: SPACING.xxl,
  },
  filterSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: MEDICAL_COLORS.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  filterOption: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    backgroundColor: MEDICAL_COLORS.slate50,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  filterOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterOptionText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.slate900,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: MEDICAL_COLORS.warmOrangeDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: MEDICAL_COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  resetButton: {
    backgroundColor: MEDICAL_COLORS.slate100,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  resetButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: MEDICAL_COLORS.slate500,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xxxl,
    justifyContent: 'flex-start',
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.lg,
    borderWidth: 1,
    borderColor: MEDICAL_COLORS.slate100,
  },
  statNumber: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: MEDICAL_COLORS.slate500,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },

  // Section Header
  sectionHeader: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.slate900,
    marginBottom: SPACING.xxl,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Category Cards Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.xxxxxl,
  },
  categoryCardWrapper: {
    width: '48%',
    marginBottom: SPACING.xxxl,
  },
  categoryCard: {
    borderRadius: BORDER_RADIUS.xxxl,
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
    minHeight: 220,
    ...SHADOWS.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  bgCircle: {
    position: 'absolute',
    backgroundColor: MEDICAL_COLORS.white,
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
    flex: 1,
  },
  favoriteButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: SPACING.xs,
  },
  iconContainer: {
    width: 72,
    height: 72,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.white,
    marginBottom: SPACING.md,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCount: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: MEDICAL_COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // CTA Banner
  ctaBanner: {
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xxxxxl,
    alignItems: 'center',
    marginTop: SPACING.xxxxxl,
    marginBottom: SPACING.xxxl,
    ...SHADOWS.xl,
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.white,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  ctaSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.white,
    marginBottom: SPACING.xxl,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MEDICAL_COLORS.white,
    paddingHorizontal: SPACING.xxxl,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  ctaButtonText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.warmOrangeDark,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default withErrorBoundary(BibliothekIndex, 'Bibliothek');
