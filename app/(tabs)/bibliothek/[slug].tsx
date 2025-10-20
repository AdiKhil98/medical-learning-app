import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Platform, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { ChevronLeft, ChevronRight, Stethoscope, Heart, Activity, Scissors, AlertTriangle, Shield, Droplets, Scan, BookOpen, FileText, Folder, ArrowLeft, Home } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import MedicalContentRenderer from '@/components/ui/MedicalContentRenderer';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Responsive grid calculation
const getColumnsForScreen = () => {
  if (SCREEN_WIDTH >= 1024) return 3; // xl: 3 columns
  if (SCREEN_WIDTH >= 768) return 2;  // md: 2 columns
  return 2; // sm: 2 columns for mobile
};

const COLUMNS = getColumnsForScreen();
const CARD_PADDING = 24;
const CARD_GAP = 16;
const CARD_WIDTH = (SCREEN_WIDTH - (CARD_PADDING * 2) - (CARD_GAP * (COLUMNS - 1))) / COLUMNS;

interface Section {
  id: string;
  slug: string;
  title: string;
  parent_slug: string | null;
  description: string | null;
  type: string;
  display_order: number;
  content_improved?: string;
  content_html?: string;
}

// ============================================================================
// PRESERVE ALL EXISTING COLOR AND ICON LOGIC - DO NOT CHANGE
// ============================================================================

const getItemDetails = (title: string, type: string, parentSlug?: string) => {
  const normalizedTitle = title.toLowerCase();

  // Default vibrant medical teal
  let baseColor = '#06b6d4'; // Cyan-500
  let gradient = ['#06b6d4', '#0891b2', '#0e7490']; // Rich cyan gradient
  let hoverGradient = ['#22d3ee', '#06b6d4', '#0891b2']; // Bright cyan hover

  // Enhanced color distribution by medical specialty
  if (parentSlug) {
    switch (parentSlug) {
      case 'chirurgie':
        baseColor = '#dc2626'; // Surgical Red-600
        gradient = ['#ef4444', '#dc2626', '#b91c1c']; // Vibrant red gradient
        hoverGradient = ['#f87171', '#ef4444', '#dc2626'];
        break;
      case 'innere-medizin':
        baseColor = '#E2827F'; // Coral for internal medicine
        gradient = ['#E2827F', '#E2827F', '#B15740'];
        hoverGradient = ['#E5877E', '#E2827F', '#E2827F'];
        break;
      case 'kardiologie':
        baseColor = '#e11d48'; // Rose-600 for cardiology
        gradient = ['#f43f5e', '#e11d48', '#be185d'];
        hoverGradient = ['#fb7185', '#f43f5e', '#e11d48'];
        break;
      case 'pneumologie':
        baseColor = '#E2827F'; // Coral for pulmonology
        gradient = ['#E2827F', '#B15740', '#B15740'];
        hoverGradient = ['#E5877E', '#E2827F', '#B15740'];
        break;
      case 'gastroenterologie':
        baseColor = '#ea580c'; // Orange-600 for gastroenterology
        gradient = ['#f97316', '#ea580c', '#c2410c'];
        hoverGradient = ['#fb923c', '#f97316', '#ea580c'];
        break;
      case 'nephrologie':
        baseColor = '#0891b2'; // Teal-600 for nephrology
        gradient = ['#14b8a6', '#0891b2', '#0e7490'];
        hoverGradient = ['#2dd4bf', '#14b8a6', '#0891b2'];
        break;
      case 'endokrinologie-und-stoffwechsel':
        baseColor = '#7c3aed'; // Violet-600 for endocrinology
        gradient = ['#8b5cf6', '#7c3aed', '#6d28d9'];
        hoverGradient = ['#a78bfa', '#8b5cf6', '#7c3aed'];
        break;
      case 'notfallmedizin':
        baseColor = '#dc2626'; // Emergency Red-600
        gradient = ['#f59e0b', '#dc2626', '#b91c1c']; // Amber to red gradient
        hoverGradient = ['#fbbf24', '#f59e0b', '#dc2626'];
        break;
      case 'infektiologie':
        baseColor = '#059669'; // Emerald-600 for infectious diseases
        gradient = ['#10b981', '#059669', '#047857'];
        hoverGradient = ['#34d399', '#10b981', '#059669'];
        break;
      case 'urologie':
        baseColor = '#7c2d12'; // Brown-800 for urology
        gradient = ['#a16207', '#7c2d12', '#92400e'];
        hoverGradient = ['#d97706', '#a16207', '#7c2d12'];
        break;
      case 'radiologie':
        baseColor = '#4338ca'; // Indigo-700 for radiology
        gradient = ['#6366f1', '#4338ca', '#3730a3'];
        hoverGradient = ['#818cf8', '#6366f1', '#4338ca'];
        break;
      case 'dermatologie':
        baseColor = '#be185d'; // Pink-700 for dermatology
        gradient = ['#ec4899', '#be185d', '#9d174d'];
        hoverGradient = ['#f472b6', '#ec4899', '#be185d'];
        break;
      case 'neurologie':
        baseColor = '#5b21b6'; // Purple-800 for neurology
        gradient = ['#7c3aed', '#5b21b6', '#4c1d95'];
        hoverGradient = ['#8b5cf6', '#7c3aed', '#5b21b6'];
        break;
      case 'orthopädie':
        baseColor = '#374151'; // Gray-700 for orthopedics
        gradient = ['#6b7280', '#374151', '#1f2937'];
        hoverGradient = ['#9ca3af', '#6b7280', '#374151'];
        break;
    }
  }

  // Dynamic color distribution for items without specific parent categories
  if (!parentSlug || (parentSlug && ![
    'chirurgie', 'innere-medizin', 'kardiologie', 'pneumologie', 'gastroenterologie',
    'nephrologie', 'endokrinologie-und-stoffwechsel', 'notfallmedizin', 'infektiologie',
    'urologie', 'radiologie', 'dermatologie', 'neurologie', 'orthopädie'
  ].includes(parentSlug))) {
    // Assign colors based on content keywords
    if (normalizedTitle.includes('diagnos') || normalizedTitle.includes('befund')) {
      baseColor = '#7c3aed';
      gradient = ['#8b5cf6', '#7c3aed', '#6d28d9'];
      hoverGradient = ['#a78bfa', '#8b5cf6', '#7c3aed'];
    } else if (normalizedTitle.includes('therap') || normalizedTitle.includes('behandl')) {
      baseColor = '#059669';
      gradient = ['#10b981', '#059669', '#047857'];
      hoverGradient = ['#34d399', '#10b981', '#059669'];
    } else if (normalizedTitle.includes('medikament') || normalizedTitle.includes('pharma')) {
      baseColor = '#ea580c';
      gradient = ['#f97316', '#ea580c', '#c2410c'];
      hoverGradient = ['#fb923c', '#f97316', '#ea580c'];
    } else if (normalizedTitle.includes('labor') || normalizedTitle.includes('wert')) {
      baseColor = '#E2827F';
      gradient = ['#E2827F', '#B15740', '#B15740'];
      hoverGradient = ['#E5877E', '#E2827F', '#B15740'];
    } else if (normalizedTitle.includes('symptom') || normalizedTitle.includes('klinik')) {
      baseColor = '#be185d';
      gradient = ['#ec4899', '#be185d', '#9d174d'];
      hoverGradient = ['#f472b6', '#ec4899', '#be185d'];
    } else {
      const titleHash = normalizedTitle.split('').reduce((hash, char) => {
        return hash + char.charCodeAt(0);
      }, 0);
      const colorIndex = titleHash % 6;

      const colorPalettes = [
        { baseColor: '#0891b2', gradient: ['#14b8a6', '#0891b2', '#0e7490'], hoverGradient: ['#2dd4bf', '#14b8a6', '#0891b2'] },
        { baseColor: '#4f46e5', gradient: ['#6366f1', '#4f46e5', '#4338ca'], hoverGradient: ['#818cf8', '#6366f1', '#4f46e5'] },
        { baseColor: '#e11d48', gradient: ['#f43f5e', '#e11d48', '#be185d'], hoverGradient: ['#fb7185', '#f43f5e', '#e11d48'] },
        { baseColor: '#d97706', gradient: ['#f59e0b', '#d97706', '#b45309'], hoverGradient: ['#fbbf24', '#f59e0b', '#d97706'] },
        { baseColor: '#059669', gradient: ['#10b981', '#059669', '#047857'], hoverGradient: ['#34d399', '#10b981', '#059669'] },
        { baseColor: '#7c3aed', gradient: ['#8b5cf6', '#7c3aed', '#6d28d9'], hoverGradient: ['#a78bfa', '#8b5cf6', '#7c3aed'] }
      ];

      const selectedPalette = colorPalettes[colorIndex];
      baseColor = selectedPalette.baseColor;
      gradient = selectedPalette.gradient;
      hoverGradient = selectedPalette.hoverGradient;
    }
  }

  // Enhanced icon distribution
  let icon = 'Folder';
  if (normalizedTitle.includes('kardio') || normalizedTitle.includes('herz') || normalizedTitle.includes('koronar')) {
    icon = 'Heart';
  } else if (normalizedTitle.includes('chirurg') || normalizedTitle.includes('operation') || normalizedTitle.includes('trauma') || normalizedTitle.includes('op-')) {
    icon = 'Scissors';
  } else if (normalizedTitle.includes('notfall') || normalizedTitle.includes('reanimat') || normalizedTitle.includes('akut') || normalizedTitle.includes('emergency')) {
    icon = 'AlertTriangle';
  } else if (normalizedTitle.includes('diagnostik') || normalizedTitle.includes('röntgen') || normalizedTitle.includes('tomograf') || normalizedTitle.includes('mrt') || normalizedTitle.includes('ct')) {
    icon = 'Scan';
  } else if (normalizedTitle.includes('pneumo') || normalizedTitle.includes('lunge') || normalizedTitle.includes('atemweg') || normalizedTitle.includes('respirator')) {
    icon = 'Activity';
  } else if (normalizedTitle.includes('urolog') || normalizedTitle.includes('niere') || normalizedTitle.includes('harn') || normalizedTitle.includes('blase')) {
    icon = 'Droplets';
  } else if (normalizedTitle.includes('infekt') || normalizedTitle.includes('hygiene') || normalizedTitle.includes('bakteri') || normalizedTitle.includes('viral') || normalizedTitle.includes('antibio')) {
    icon = 'Shield';
  } else if (normalizedTitle.includes('medikament') || normalizedTitle.includes('pharma') || normalizedTitle.includes('dosier') || normalizedTitle.includes('therapie')) {
    icon = 'FileText';
  } else if (normalizedTitle.includes('labor') || normalizedTitle.includes('wert') || normalizedTitle.includes('analyse') || normalizedTitle.includes('befund')) {
    icon = 'Scan';
  } else if (normalizedTitle.includes('anamnes') || normalizedTitle.includes('untersuch') || normalizedTitle.includes('klinik')) {
    icon = 'Stethoscope';
  } else if (type.toLowerCase().includes('content') || normalizedTitle.includes('content')) {
    icon = 'FileText';
  } else {
    icon = 'Folder';
  }

  return { icon, color: baseColor, gradient, hoverGradient };
};

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'Heart': return Heart;
    case 'Scissors': return Scissors;
    case 'AlertTriangle': return AlertTriangle;
    case 'Scan': return Scan;
    case 'Activity': return Activity;
    case 'Droplets': return Droplets;
    case 'Shield': return Shield;
    case 'Stethoscope': return Stethoscope;
    case 'FileText': return FileText;
    case 'BookOpen': return BookOpen;
    case 'Folder':
    default: return Folder;
  }
};

// ============================================================================
// NEW: Enhanced Category Card Component
// ============================================================================

const EnhancedCategoryCard = React.memo(({
  childItem,
  parentSlug,
  onPress,
  isFavorite,
  onToggleFavorite
}: {
  childItem: Section;
  parentSlug: string;
  onPress: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) => {
  const itemDetails = useMemo(() => {
    return getItemDetails(childItem.title, childItem.type, parentSlug);
  }, [childItem.title, childItem.type, parentSlug]);

  const IconComponent = useMemo(() => {
    return getIconComponent(itemDetails.icon);
  }, [itemDetails.icon]);

  const hasContent = useMemo(() => {
    return childItem.content_improved &&
           (typeof childItem.content_improved === 'object' || typeof childItem.content_improved === 'string');
  }, [childItem.content_improved]);

  const gradientColors = itemDetails.gradient || ['#64748B', '#475569'];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.enhancedCard}
      activeOpacity={0.8}
    >
      {/* Gradient Top Stripe */}
      <LinearGradient
        colors={gradientColors as [string, string, ...string[]]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.cardTopStripe}
      />

      <View style={styles.cardContent}>
        {/* Header: Icon + Title + Heart */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            {/* Gradient Icon */}
            <LinearGradient
              colors={gradientColors as [string, string, ...string[]]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.cardIcon}
            >
              <IconComponent size={24} color="#FFFFFF" strokeWidth={2} />
            </LinearGradient>

            {/* Title and Count */}
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {childItem.title}
              </Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardMetaText}>
                  {hasContent ? 'Inhalt verfügbar' : 'Weitere Themen'}
                </Text>
              </View>
            </View>
          </View>

          {/* Heart Favorite Button */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            style={styles.favoriteButton}
          >
            <Heart
              size={20}
              color={isFavorite ? '#EF4444' : '#CBD5E1'}
              fill={isFavorite ? '#EF4444' : 'none'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>

        {/* Description */}
        {childItem.description && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {childItem.description}
          </Text>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>
            {hasContent ? 'Inhalt ansehen' : 'Thema öffnen'}
          </Text>
          <ChevronRight size={20} color="#94A3B8" strokeWidth={2} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ============================================================================
// MAIN COMPONENT - PRESERVE ALL STATE MANAGEMENT AND DATABASE LOGIC
// ============================================================================

export default function SectionDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { session, loading: authLoading } = useAuth();

  // PRESERVE ALL EXISTING STATE
  const [currentItem, setCurrentItem] = useState<Section | null>(null);
  const [childItems, setChildItems] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // PRESERVE EXISTING CACHE
  const dataCache = useRef<Map<string, { item: Section; children: Section[]; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000;

  // PRESERVE ALL EXISTING DATABASE FETCH LOGIC - DO NOT CHANGE
  const fetchItemData = useCallback(async (forceRefresh = false) => {
    if (!slug || typeof slug !== 'string') return;

    const cacheKey = `${slug}-${session?.user?.id || 'anonymous'}`;
    const cached = dataCache.current.get(cacheKey);
    const now = Date.now();

    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('Using cached data for:', slug);
      setCurrentItem(cached.item);
      setChildItems(cached.children);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      if (!session) {
        setError('Sie müssen angemeldet sein, um die Bibliothek zu nutzen.');
        return;
      }

      // PRESERVE: Fetch both current item and children in parallel
      const [itemResult, childrenResult] = await Promise.all([
        supabase
          .from('sections')
          .select('id, slug, title, parent_slug, description, type, display_order, content_improved, content_html, content_details')
          .eq('slug', slug)
          .maybeSingle(),
        supabase
          .from('sections')
          .select('id, slug, title, parent_slug, description, type, display_order, content_improved, content_html, content_details')
          .eq('parent_slug', slug)
          .order('display_order', { ascending: true })
      ]);

      const { data: itemData, error: itemError } = itemResult;
      const { data: childItemsData, error: childItemsError } = childrenResult;

      if (itemError) throw itemError;
      if (!itemData) {
        setError('Inhalt nicht gefunden.');
        return;
      }
      if (childItemsError) throw childItemsError;

      setCurrentItem(itemData);
      navigation.setOptions({ headerTitle: itemData.title || slug });

      const children = childItemsData || [];
      setChildItems(children);

      dataCache.current.set(cacheKey, {
        item: itemData,
        children: children,
        timestamp: now
      });

      const hasContent = !!(
        (itemData.content_improved &&
         (typeof itemData.content_improved === 'object' ||
          (typeof itemData.content_improved === 'string' && itemData.content_improved.trim()))) ||
        (itemData.content_html && itemData.content_html.trim()) ||
        (itemData.content_details && itemData.content_details.trim())
      );

      setShowContent(hasContent);

    } catch (e) {
      console.error('Error fetching item data:', e);
      setError(e instanceof Error ? e.message : 'Fehler beim Laden des Inhalts');
    } finally {
      setLoading(false);
    }
  }, [slug, session]);

  // PRESERVE: Focus effect and initial load
  useFocusEffect(
    useCallback(() => {
      if (!authLoading && session) {
        fetchItemData();
      }
    }, [fetchItemData, authLoading, session])
  );

  useEffect(() => {
    if (!authLoading && session) {
      fetchItemData();
    }
  }, []);

  // PRESERVE: Navigation logic - DO NOT CHANGE
  const navigateToChild = useCallback(async (childSlug: string, childItem?: Section) => {
    const currentPath = `/(tabs)/bibliothek/${slug}`;

    const hasContent = childItem && !!(
      (childItem.content_improved &&
       (typeof childItem.content_improved === 'object' ||
        (typeof childItem.content_improved === 'string' && childItem.content_improved.trim()))) ||
      (childItem.content_html && childItem.content_html.trim()) ||
      (childItem.content_details && childItem.content_details.trim())
    );

    try {
      const { data: childrenData, error: childrenError } = await supabase
        .from('sections')
        .select('id')
        .eq('parent_slug', childSlug)
        .limit(1);

      if (childrenError) {
        console.warn('Error checking for children:', childrenError);
      }

      const hasSubdivisions = childrenData && childrenData.length > 0;

      if (hasSubdivisions) {
        router.push({
          pathname: `/(tabs)/bibliothek/${childSlug}` as any,
          params: { previousPage: currentPath }
        });
      } else if (hasContent) {
        router.push({
          pathname: `/(tabs)/bibliothek/content/${childSlug}` as any,
          params: { previousPage: currentPath }
        });
      } else {
        router.push({
          pathname: `/(tabs)/bibliothek/${childSlug}` as any,
          params: { previousPage: currentPath }
        });
      }
    } catch (error) {
      console.error('Error in navigateToChild:', error);
      router.push({
        pathname: `/(tabs)/bibliothek/${childSlug}`,
        params: { previousPage: currentPath }
      });
    }
  }, [router, slug]);

  const handleBackPress = useCallback(() => {
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        router.push('/(tabs)/bibliothek');
      }
    } catch (error) {
      router.replace('/(tabs)/bibliothek');
    }
  }, [navigation, router]);

  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId);
      } else {
        newFavorites.add(itemId);
      }
      return newFavorites;
    });
  }, []);

  // LOADING STATE
  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F8FAFC', '#FFFFFF', '#F1F5F9']}
          style={styles.backgroundGradient}
        />

        {/* Skeleton Loading */}
        <View style={styles.stickyHeader}>
          <View style={styles.headerContent}>
            <View style={styles.skeletonBackButton} />
          </View>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <View style={[styles.skeletonBox, { width: 120, height: 32, marginBottom: 16 }]} />
            <View style={[styles.skeletonBox, { width: '80%', height: 40, marginBottom: 12 }]} />
            <View style={[styles.skeletonBox, { width: '60%', height: 20 }]} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Fehler</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchItemData()}>
          <Text style={styles.retryButtonText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!currentItem) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Inhalt nicht gefunden</Text>
        <Text style={styles.errorText}>Der gesuchte Inhalt konnte nicht gefunden werden.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleBackPress}>
          <Text style={styles.retryButtonText}>Zurück</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // MAIN RENDER - NEW MODERN UI
  // ============================================================================

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#F8FAFC', '#FFFFFF', '#F1F5F9']}
        style={styles.backgroundGradient}
      />

      {/* Modern Sticky Header */}
      <View style={styles.stickyHeader}>
        <View style={styles.headerContent}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backButton}
          >
            <View style={styles.backButtonCircle}>
              <ArrowLeft size={20} color="#475569" strokeWidth={2} />
            </View>
            <Text style={styles.backButtonText}>Zurück</Text>
          </TouchableOpacity>

          {/* Breadcrumb Center */}
          <View style={styles.breadcrumbCenter}>
            <Home size={16} color="#94A3B8" />
            <ChevronRight size={14} color="#94A3B8" style={styles.breadcrumbSeparator} />
            <Text style={styles.breadcrumbText}>Bibliothek</Text>
            <ChevronRight size={14} color="#94A3B8" style={styles.breadcrumbSeparator} />
            <Text style={styles.breadcrumbActive} numberOfLines={1}>
              {currentItem.title}
            </Text>
          </View>

          {/* Spacer for balance */}
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              {/* Category Badge */}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>Kategorie</Text>
              </View>

              {/* Title */}
              <Text style={styles.heroTitle}>{currentItem.title}</Text>

              {/* Description */}
              {currentItem.description && (
                <Text style={styles.heroDescription}>{currentItem.description}</Text>
              )}
            </View>

            {/* Update Date */}
            <View style={styles.updateInfo}>
              <Text style={styles.updateLabel}>Aktualisiert</Text>
              <Text style={styles.updateDate}>Juni 2025</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
              <Folder size={20} color="#2563EB" strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.statNumber}>{childItems.length}</Text>
              <Text style={styles.statLabel}>Themen</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <FileText size={20} color="#059669" strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.statNumber}>{showContent ? '1' : '—'}</Text>
              <Text style={styles.statLabel}>Inhalte</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Heart size={20} color="#EF4444" strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.statNumber}>{favorites.size}</Text>
              <Text style={styles.statLabel}>Favoriten</Text>
            </View>
          </View>
        </View>

        {/* Content Renderer if applicable */}
        {showContent && (
          <View style={styles.contentSection}>
            <MedicalContentRenderer
              htmlContent={currentItem.content_html}
              jsonContent={currentItem.content_improved}
              plainTextContent={currentItem.content_details}
              title={currentItem.title}
              category={currentItem.type || 'Medizin'}
              lastUpdated="Juni 2025"
              completionStatus="Vollständiger Leitfaden"
            />
          </View>
        )}

        {/* Enhanced Category Cards Grid */}
        {childItems.length > 0 && (
          <View style={styles.cardsSection}>
            <Text style={styles.sectionTitle}>Unterkategorien</Text>
            <FlatList
              data={childItems}
              renderItem={({ item }) => (
                <EnhancedCategoryCard
                  childItem={item}
                  parentSlug={slug as string}
                  onPress={() => navigateToChild(item.slug, item)}
                  isFavorite={favorites.has(item.id)}
                  onToggleFavorite={() => toggleFavorite(item.id)}
                />
              )}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.gridRow}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* Empty State */}
        {!showContent && childItems.length === 0 && (
          <View style={styles.emptyState}>
            <BookOpen size={48} color="#94A3B8" strokeWidth={2} />
            <Text style={styles.emptyStateText}>
              Keine Inhalte oder Unterkategorien verfügbar.
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES - NEW MODERN DESIGN
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  // Sticky Header
  stickyHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  breadcrumbCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  breadcrumbSeparator: {
    marginHorizontal: 4,
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  breadcrumbActive: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    maxWidth: 150,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerSpacer: {
    width: 128,
  },

  // Scroll Container
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 32,
  },

  // Hero Section
  heroSection: {
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLeft: {
    flex: 1,
    marginRight: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  categoryBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  heroDescription: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  updateInfo: {
    alignItems: 'flex-end',
  },
  updateLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  updateDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Content Section
  contentSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },

  // Cards Section
  cardsSection: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },

  // Enhanced Category Card
  enhancedCard: {
    width: (SCREEN_WIDTH - 64) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTopStripe: {
    height: 4,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    lineHeight: 22,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardMetaText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  favoriteButton: {
    padding: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardFooterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 8,
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
    backgroundColor: '#0891B2',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Skeleton
  skeletonBackButton: {
    width: 100,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  skeletonBox: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },

  bottomPadding: {
    height: 40,
  },
});
