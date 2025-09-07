import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { ChevronLeft, ChevronRight, Stethoscope, Heart, Activity, Scissors, AlertTriangle, Shield, Droplets, Scan, BookOpen, FileText, Folder } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import MedicalContentRenderer from '@/components/ui/MedicalContentRenderer';
import Card from '@/components/ui/folder';

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

// Enhanced Medical Color Palette with Rich Gradients
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
        baseColor = '#2563eb'; // Blue-600 for internal medicine
        gradient = ['#3b82f6', '#2563eb', '#1d4ed8'];
        hoverGradient = ['#60a5fa', '#3b82f6', '#2563eb'];
        break;
      case 'kardiologie':
        baseColor = '#e11d48'; // Rose-600 for cardiology
        gradient = ['#f43f5e', '#e11d48', '#be185d'];
        hoverGradient = ['#fb7185', '#f43f5e', '#e11d48'];
        break;
      case 'pneumologie':
        baseColor = '#0ea5e9'; // Sky-500 for pulmonology
        gradient = ['#0ea5e9', '#0284c7', '#0369a1'];
        hoverGradient = ['#38bdf8', '#0ea5e9', '#0284c7'];
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
  // This creates visual variety when folders don't match specific medical specialties
  if (!parentSlug || (parentSlug && ![
    'chirurgie', 'innere-medizin', 'kardiologie', 'pneumologie', 'gastroenterologie', 
    'nephrologie', 'endokrinologie-und-stoffwechsel', 'notfallmedizin', 'infektiologie', 
    'urologie', 'radiologie', 'dermatologie', 'neurologie', 'orthopädie'
  ].includes(parentSlug))) {
    // Assign colors based on content keywords for better visual distribution
    if (normalizedTitle.includes('diagnos') || normalizedTitle.includes('befund')) {
      baseColor = '#7c3aed'; // Purple for diagnostics
      gradient = ['#8b5cf6', '#7c3aed', '#6d28d9'];
      hoverGradient = ['#a78bfa', '#8b5cf6', '#7c3aed'];
    } else if (normalizedTitle.includes('therap') || normalizedTitle.includes('behandl')) {
      baseColor = '#059669'; // Green for therapy
      gradient = ['#10b981', '#059669', '#047857'];
      hoverGradient = ['#34d399', '#10b981', '#059669'];
    } else if (normalizedTitle.includes('medikament') || normalizedTitle.includes('pharma')) {
      baseColor = '#ea580c'; // Orange for medications
      gradient = ['#f97316', '#ea580c', '#c2410c'];
      hoverGradient = ['#fb923c', '#f97316', '#ea580c'];
    } else if (normalizedTitle.includes('labor') || normalizedTitle.includes('wert')) {
      baseColor = '#0ea5e9'; // Sky blue for lab values
      gradient = ['#0ea5e9', '#0284c7', '#0369a1'];
      hoverGradient = ['#38bdf8', '#0ea5e9', '#0284c7'];
    } else if (normalizedTitle.includes('symptom') || normalizedTitle.includes('klinik')) {
      baseColor = '#be185d'; // Pink for symptoms
      gradient = ['#ec4899', '#be185d', '#9d174d'];
      hoverGradient = ['#f472b6', '#ec4899', '#be185d'];
    } else {
      // Use a rotating color scheme based on title hash for consistent variety
      const titleHash = normalizedTitle.split('').reduce((hash, char) => {
        return hash + char.charCodeAt(0);
      }, 0);
      const colorIndex = titleHash % 6;
      
      const colorPalettes = [
        { // Teal
          baseColor: '#0891b2',
          gradient: ['#14b8a6', '#0891b2', '#0e7490'],
          hoverGradient: ['#2dd4bf', '#14b8a6', '#0891b2']
        },
        { // Indigo
          baseColor: '#4f46e5',
          gradient: ['#6366f1', '#4f46e5', '#4338ca'],
          hoverGradient: ['#818cf8', '#6366f1', '#4f46e5']
        },
        { // Rose
          baseColor: '#e11d48',
          gradient: ['#f43f5e', '#e11d48', '#be185d'],
          hoverGradient: ['#fb7185', '#f43f5e', '#e11d48']
        },
        { // Amber
          baseColor: '#d97706',
          gradient: ['#f59e0b', '#d97706', '#b45309'],
          hoverGradient: ['#fbbf24', '#f59e0b', '#d97706']
        },
        { // Emerald
          baseColor: '#059669',
          gradient: ['#10b981', '#059669', '#047857'],
          hoverGradient: ['#34d399', '#10b981', '#059669']
        },
        { // Violet
          baseColor: '#7c3aed',
          gradient: ['#8b5cf6', '#7c3aed', '#6d28d9'],
          hoverGradient: ['#a78bfa', '#8b5cf6', '#7c3aed']
        }
      ];
      
      const selectedPalette = colorPalettes[colorIndex];
      baseColor = selectedPalette.baseColor;
      gradient = selectedPalette.gradient;
      hoverGradient = selectedPalette.hoverGradient;
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
      <Card
        title={childItem.title}
        icon={IconComponent}
        gradient={itemDetails.gradient}
        hoverGradient={itemDetails.hoverGradient}
        hasContent={Boolean(hasContent)}
        onPress={onPress}
        size="medium"
        showBadge={true}
      />
    </View>
  );
});

export default function SectionDetailScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { session, loading: authLoading } = useAuth();
  
  const [currentItem, setCurrentItem] = useState<Section | null>(null);
  const [childItems, setChildItems] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);
  
  // Cache to prevent re-fetching on tab switches
  const dataCache = useRef<Map<string, { item: Section; children: Section[]; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // Optimized fetch with caching
  const fetchItemData = useCallback(async (forceRefresh = false) => {
    if (!slug || typeof slug !== 'string') return;

    // Check cache first
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

      console.log('Fetching fresh data for:', slug);

      // Optimized: Fetch both current item and children in parallel
      const [itemResult, childrenResult] = await Promise.all([
        supabase
          .from('sections')
          .select('id, slug, title, parent_slug, description, type, display_order, content_improved, content_html')
          .eq('slug', slug)
          .maybeSingle(),
        supabase
          .from('sections')
          .select('id, slug, title, parent_slug, description, type, display_order')
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
      console.log('Current item:', itemData.title, 'Type:', itemData.type);
      
      // Update navigation title with the actual title
      navigation.setOptions({
        headerTitle: itemData.title || slug,
      });

      const children = childItemsData || [];
      setChildItems(children);
      console.log(`Found ${children.length} child items`);

      // Cache the results
      dataCache.current.set(cacheKey, {
        item: itemData,
        children: children,
        timestamp: now
      });

      // Determine if we should show content or navigation
      const hasChildren = children.length > 0;
      // content_improved is JSONB - check if it exists and has content
      const hasContent = itemData.content_improved && 
                        (typeof itemData.content_improved === 'object' || typeof itemData.content_improved === 'string');
      
      console.log('Has children:', hasChildren, 'Has content:', hasContent);
      console.log('Content type:', typeof itemData.content_improved);
      
      // Show content if no children OR if this is a final content item
      setShowContent(!hasChildren && hasContent);

    } catch (e) {
      console.error('Error fetching item data:', e);
      setError(e instanceof Error ? e.message : 'Fehler beim Laden des Inhalts');
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

  const navigateToChild = (childSlug: string) => {
    console.log('Navigating to child:', childSlug);
    router.push(`/(tabs)/bibliothek/${childSlug}`);
  };

  const handleBackPress = () => {
    console.log('🔙 Category back button pressed - going to previous page');
    
    try {
      // Simply go back to the previous page in history
      if (router.canGoBack()) {
        console.log('🔙 Using router.back() to return to previous page');
        router.back();
      } else {
        // Only if there's no history, go to main bibliothek
        console.log('🔙 No history available, going to main bibliothek');
        router.push('/(tabs)/bibliothek');
      }
    } catch (error) {
      console.error('🔙 Navigation error:', error);
      router.replace('/(tabs)/bibliothek');
    }
  };

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

      {showContent ? (
        // Modern Content Display
        <ScrollView style={styles.modernContent} showsVerticalScrollIndicator={false}>
          <View style={styles.modernContentCard}>
            <LinearGradient
              colors={['rgba(102, 126, 234, 0.08)', 'rgba(118, 75, 162, 0.05)']}
              style={styles.contentCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.modernContentHeader}>
                <LinearGradient
                  colors={['#0891b2', '#0e7490']}
                  style={styles.contentHeaderIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <FileText size={20} color="white" />
                </LinearGradient>
              </View>
              <View style={styles.contentBody}>
                <MedicalContentRenderer 
                  htmlContent={currentItem.content_html}
                  jsonContent={currentItem.content_improved}
                  plainTextContent={typeof currentItem.content_improved === 'string' ? currentItem.content_improved : JSON.stringify(currentItem.content_improved, null, 2)}
                  title={currentItem.title}
                />
              </View>
            </LinearGradient>
          </View>
          <View style={styles.bottomPadding} />
        </ScrollView>
      ) : childItems.length === 0 ? (
        // Modern Empty State
        <View style={styles.modernEmptyState}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.05)']}
            style={styles.emptyStateGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <BookOpen size={48} color="#94a3b8" />
            <Text style={styles.modernEmptyStateText}>
              Keine weiteren Inhalte oder Unterkategorien verfügbar.
            </Text>
          </LinearGradient>
        </View>
      ) : (
        // Modern Folder Cards with Section Panel
        <ScrollView style={styles.modernContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionPanel}>
            <LinearGradient
              colors={['rgba(14, 165, 233, 0.08)', 'rgba(59, 130, 246, 0.05)', 'rgba(147, 197, 253, 0.03)']}
              style={styles.sectionPanelGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.sectionTitle}>{currentItem.title}</Text>
              <View style={styles.foldersGrid}>
                {childItems.map((childItem) => (
                  <FolderCard
                    key={childItem.slug}
                    childItem={childItem}
                    parentSlug={slug as string}
                    onPress={() => navigateToChild(childItem.slug)}
                  />
                ))}
              </View>
            </LinearGradient>
          </View>
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
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

  // Modern Content Card
  modernContentCard: {
    marginBottom: 20,
  },
  contentCardGradient: {
    borderRadius: 20,
    padding: 2,
  },
  modernContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  contentHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modernContentTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1e293b',
  },
  contentBody: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  contentText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#475569',
    lineHeight: 26,
  },
  contentSection: {
    marginBottom: 24,
  },
  contentSectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1e293b',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(8, 145, 178, 0.2)',
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
});