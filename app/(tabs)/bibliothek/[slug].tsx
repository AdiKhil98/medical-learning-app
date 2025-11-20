import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect, Href } from 'expo-router';
import { ChevronLeft, Stethoscope, Heart, Activity, Scissors, AlertTriangle, Shield, Droplets, Scan, BookOpen, FileText, Folder } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import ModernMedicalCard from '@/components/ui/ModernMedicalCard';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Responsive grid calculation
const getColumnsForScreen = () => {
  if (SCREEN_WIDTH >= 1024) return 3; // xl: 3 columns
  if (SCREEN_WIDTH >= 768) return 2;  // md: 2 columns
  return 1; // sm: 1 column
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

// Enhanced Medical Color Palette with Rich Gradients - UNIFIED BY PARENT
const getItemDetails = (title: string, type: string, parentSlug?: string) => {
  const normalizedTitle = title.toLowerCase();

  // Default vibrant medical teal
  let baseColor = '#06b6d4'; // Cyan-500
  let gradient = ['#06b6d4', '#0891b2', '#0e7490']; // Rich cyan gradient
  let hoverGradient = ['#22d3ee', '#06b6d4', '#0891b2']; // Bright cyan hover

  // ALL CARDS ON THE SAME PAGE USE THE SAME COLOR (based on parent category)
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
      default:
        // For unrecognized parent slugs, use default teal
        baseColor = '#06b6d4';
        gradient = ['#06b6d4', '#0891b2', '#0e7490'];
        hoverGradient = ['#22d3ee', '#06b6d4', '#0891b2'];
        break;
    }
  }
  
  // Enhanced icon distribution based on content and medical specialty
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
  } else if ((type && type.toLowerCase().includes('content')) || normalizedTitle.includes('content')) {
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


// Optimized Folder Card Component with memoized calculations
const FolderCard = React.memo(({ childItem, parentSlug, onPress }: { childItem: Section, parentSlug: string, onPress: () => void }) => {
  // Memoize expensive calculations
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

  return (
    <View style={{ width: CARD_WIDTH }}>
      <ModernMedicalCard
        title={childItem.title}
        icon={IconComponent}
        gradient={itemDetails.gradient}
        hoverGradient={itemDetails.hoverGradient}
        hasContent={Boolean(hasContent)}
        onPress={onPress}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  // FIX: Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.childItem.slug === nextProps.childItem.slug &&
    prevProps.childItem.title === nextProps.childItem.title &&
    prevProps.childItem.type === nextProps.childItem.type &&
    prevProps.parentSlug === nextProps.parentSlug
  );
});

export default function SectionDetailScreen() {
  const { slug, previousPage } = useLocalSearchParams<{ slug: string; previousPage?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { session, loading: authLoading } = useAuth();

  const [currentItem, setCurrentItem] = useState<Section | null>(null);
  const [childItems, setChildItems] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache to prevent re-fetching on tab switches
  const dataCache = useRef<Map<string, { item: Section; children: Section[]; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // FIX: Track navigation intent to prevent race conditions
  const navigationIntentRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // FIX: Cleanup on unmount - cancel any pending navigation
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      navigationIntentRef.current = null;
    };
  }, []);

  // Optimized fetch with caching
  const fetchItemData = useCallback(async (forceRefresh = false) => {
    if (!slug || typeof slug !== 'string') return;

    // Check cache first
    const cacheKey = `${slug}-${session?.user?.id || 'anonymous'}`;
    const cached = dataCache.current.get(cacheKey);
    const now = Date.now();
    
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_DURATION) {
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

      // Optimized: Fetch both current item and children in parallel
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

      if (itemError) {
        throw itemError;
      }

      if (!itemData) {
        setError('Inhalt nicht gefunden.');
        return;
      }

      if (childItemsError) {
        throw childItemsError;
      }

      setCurrentItem(itemData);
      
      // Update navigation title with the actual title
      navigation.setOptions({
        headerTitle: itemData.title || slug,
      });

      const children = childItemsData || [];
      setChildItems(children);

      // Cache the results
      dataCache.current.set(cacheKey, {
        item: itemData,
        children: children,
        timestamp: now
      });

    } catch (e) {
      console.error('Error fetching item data:', e);
      // FIX: Provide more specific error messages
      let errorMessage = 'Fehler beim Laden des Inhalts';
      if (e instanceof Error) {
        if (e.message.includes('network') || e.message.includes('fetch')) {
          errorMessage = 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
        } else if (e.message.includes('timeout')) {
          errorMessage = 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.';
        } else if (e.message.includes('auth') || e.message.includes('permission')) {
          errorMessage = 'Sie haben keine Berechtigung für diesen Inhalt.';
        } else {
          errorMessage = e.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [slug, session]);

  // Use focus effect instead of useEffect to handle tab switching properly
  useFocusEffect(
    useCallback(() => {
      if (!authLoading && session) {
        fetchItemData();
      }
    }, [fetchItemData, authLoading, session])
  );

  // Initial load effect (only runs once)
  useEffect(() => {
    if (!authLoading && session) {
      fetchItemData();
    }
  }, []); // Empty dependency array for initial load only

  const navigateToChild = useCallback(async (childSlug: string, childItem?: Section) => {
    // FIX: Set navigation intent to track which navigation is intended
    navigationIntentRef.current = childSlug;

    // FIX: Cancel any previous ongoing navigation request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // FIX: Create new AbortController for this navigation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const currentPath = `/(tabs)/bibliothek/${slug}`;

    // Check if child has any content (improved, html, or details)
    const hasContent = childItem && !!(
      (childItem.content_improved &&
       (typeof childItem.content_improved === 'object' ||
        (typeof childItem.content_improved === 'string' && childItem.content_improved.trim()))) ||
      (childItem.content_html && childItem.content_html.trim()) ||
      (childItem.content_details && childItem.content_details.trim())
    );

    // Check if child has children (subdivisions) first - this is the key fix
    try {
      const { data: childrenData, error: childrenError } = await supabase
        .from('sections')
        .select('id')
        .eq('parent_slug', childSlug)
        .limit(1)
        .abortSignal(abortController.signal);

      // FIX: Check if navigation intent has changed (user clicked another item)
      if (navigationIntentRef.current !== childSlug) {
        return;
      }

      if (childrenError) {
        // Check if error is from abort
        if (childrenError.message?.includes('aborted')) {
          return;
        }
        console.warn('Error checking for children:', childrenError);
      }

      const hasSubdivisions = childrenData && childrenData.length > 0;

      // FIX: Final check before navigation - ensure intent hasn't changed
      if (navigationIntentRef.current !== childSlug) {
        return;
      }

      // FIXED LOGIC: Priority is subdivisions over content
      // If has children/subdivisions, always go to category page for navigation
      // Only go to content page if it has content but no children
      if (hasSubdivisions) {
        router.push({
          pathname: `/(tabs)/bibliothek/${childSlug}` as Href,
          params: { previousPage: currentPath }
        });
      } else if (hasContent) {
        router.push({
          pathname: `/(tabs)/bibliothek/content/${childSlug}` as Href,
          params: { previousPage: currentPath }
        });
      } else {
        router.push({
          pathname: `/(tabs)/bibliothek/${childSlug}` as Href,
          params: { previousPage: currentPath }
        });
      }
    } catch (error) {
      // FIX: Check if error is from abort
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.error('Error in navigateToChild:', error);

      // FIX: Only fallback if intent hasn't changed
      if (navigationIntentRef.current === childSlug) {
        // Fallback to category page on error
        router.push({
          pathname: `/(tabs)/bibliothek/${childSlug}`,
          params: { previousPage: currentPath }
        });
      }
    }
  }, [router, slug, supabase]);

  const handleBackPress = useCallback(() => {
    try {
      // Priority 1: If we have currentItem with parent_slug, navigate to parent
      if (currentItem?.parent_slug) {
        router.push(`/(tabs)/bibliothek/${currentItem.parent_slug}` as Href);
        return;
      }

      // Priority 2: Fallback to main bibliothek
      router.push('/(tabs)/bibliothek' as Href);
    } catch (error) {
      console.error('Error in back navigation:', error);
      // Final fallback - replace current route
      router.replace('/(tabs)/bibliothek' as Href);
    }
  }, [currentItem, router]);

  // FIX: Memoize folder grid to prevent unnecessary re-renders
  const folderGrid = useMemo(() => {
    if (childItems.length === 0) return null;

    return (
      <View style={styles.sectionPanel}>
        <LinearGradient
          colors={['rgba(14, 165, 233, 0.08)', 'rgba(59, 130, 246, 0.05)', 'rgba(147, 197, 253, 0.03)']}
          style={styles.sectionPanelGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.foldersGrid}>
            {childItems.map((childItem) => (
              <FolderCard
                key={childItem.slug}
                childItem={childItem}
                parentSlug={slug as string}
                onPress={() => navigateToChild(childItem.slug, childItem)}
              />
            ))}
          </View>
        </LinearGradient>
      </View>
    );
  }, [childItems, slug, navigateToChild]);

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.modernContainer}>
        <LinearGradient
          colors={['#f8fafc', '#f1f5f9', '#e2e8f0', '#ffffff']}
          style={styles.modernGradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        <View style={styles.modernHeader}>
          <View style={styles.skeletonBackButton} />
        </View>
        
        <ScrollView style={styles.modernContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionPanel}>
            <LinearGradient
              colors={['rgba(14, 165, 233, 0.08)', 'rgba(59, 130, 246, 0.05)', 'rgba(147, 197, 253, 0.03)']}
              style={styles.sectionPanelGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.skeletonTitle} />
              <View style={styles.foldersGrid}>
                {[...Array(6)].map((_, index) => (
                  <View key={index} style={[{ width: CARD_WIDTH }, styles.skeletonCard]}>
                    <View style={styles.skeletonFolderTab} />
                    <View style={styles.skeletonFolderBody} />
                    <View style={styles.skeletonFolderLabel} />
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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

  return (
    <SafeAreaView style={styles.modernContainer}>
      {/* Modern Background */}
      <LinearGradient
        colors={['#f8fafc', '#f1f5f9', '#e2e8f0', '#ffffff']}
        style={styles.modernGradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <TouchableOpacity 
          onPress={handleBackPress}
          style={styles.modernBackButton}
        >
          <LinearGradient
            colors={['#0891b2', '#0e7490']}
            style={styles.backButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ChevronLeft size={20} color="white" />
          </LinearGradient>
          <Text style={styles.modernBackText}>Zurück</Text>
        </TouchableOpacity>
        
      </View>

      <ScrollView style={styles.modernContent} showsVerticalScrollIndicator={false}>

        {/* FIX: Use memoized folder grid */}
        {folderGrid}

        {/* Empty state shown only when no children */}
        {childItems.length === 0 && (
          <View style={styles.modernEmptyState}>
            <LinearGradient
              colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.05)']}
              style={styles.emptyStateGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <BookOpen size={48} color="#94a3b8" />
              <Text style={styles.modernEmptyStateText}>
                Keine Inhalte oder Unterkategorien verfügbar.
              </Text>
            </LinearGradient>
          </View>
        )}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Modern Container
  modernContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modernGradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#0891b2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },

  // Modern Header
  modernHeader: {
    padding: 20,
    paddingBottom: 24,
  },
  modernBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#0891b2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modernBackText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1e293b',
  },
  headerContent: {
    zIndex: 1,
  },
  modernTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  modernSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748b',
    lineHeight: 22,
  },

  // Modern Content
  modernContent: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Section Panel with Gradient Background
  sectionPanel: {
    marginBottom: 24,
  },
  sectionPanelGradient: {
    borderRadius: 16,
    padding: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },

  // Responsive Folders Grid (3/2/1 columns)
  foldersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },

  // Folder card styles are now handled by the reusable Card component

  // Modern Empty State
  modernEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateGradient: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    borderRadius: 20,
    width: '100%',
  },
  modernEmptyStateText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
  },

  bottomPadding: {
    height: 40,
  },

  // Skeleton Loading Styles
  skeletonBackButton: {
    width: 80,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
  },
  skeletonTitle: {
    width: 200,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    marginBottom: 20,
    alignSelf: 'center',
  },
  skeletonCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  skeletonFolderTab: {
    width: '65%',
    height: 16,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#cbd5e1',
    marginBottom: -2,
  },
  skeletonFolderBody: {
    width: '100%',
    height: 90,
    borderRadius: 14,
    backgroundColor: '#cbd5e1',
    marginBottom: 12,
  },
  skeletonFolderLabel: {
    width: '80%',
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  backToMainButton: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  backToMainText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});