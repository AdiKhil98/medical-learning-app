import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronDown,
  BookOpen,
  List,
  Lightbulb,
  Info,
  Maximize2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/folder';
import MedicalContentLoader from '@/components/ui/MedicalContentLoader';
import MedicalContentModal from '@/components/ui/MedicalContentModal';
import { recentContentService } from '@/lib/recentContentService';
import { SecureLogger } from '@/lib/security';
import { TimedLRUCache } from '@/lib/lruCache';

// Define Section type directly
interface Section {
  id: string;
  slug: string;
  title: string;
  parent_slug: string | null;
  description: string | null;
  type: 'main-category' | 'sub-category' | 'section' | 'subsection' | 'sub-subsection' | 'document' | 'folder';
  icon: string;
  color: string;
  display_order: number;
  image_url?: string;
  category?: string;
  content_details?: string;
  content_improved?: any; // JSON content
  content_html?: string;
  last_updated?: string;
  children?: Section[];
}

interface ContentSection {
  type: string;
  title?: string;
  content?: string;
  term?: string;
  definition?: string;
  items?: string[];
}

// Content skeleton loader
const ContentSkeleton = memo(() => {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 16 }}>
      {Array.from({ length: 3 }, (_, i) => (
        <View key={i} style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          marginBottom: 16,
          padding: 20,
        }}>
          <View style={{ height: 24, backgroundColor: colors.border, borderRadius: 4, opacity: 0.7, marginBottom: 16 }} />
          <View style={{ height: 16, backgroundColor: colors.border, borderRadius: 4, opacity: 0.5, marginBottom: 8 }} />
          <View style={{ height: 16, backgroundColor: colors.border, borderRadius: 4, opacity: 0.5, width: '80%', marginBottom: 8 }} />
          <View style={{ height: 16, backgroundColor: colors.border, borderRadius: 4, opacity: 0.5, width: '60%' }} />
        </View>
      ))}
    </View>
  );
});

// FIX: Use LRU cache to prevent unbounded memory growth
// Max 50 content entries, 10 minute TTL
const contentCache = new TimedLRUCache<string, Section>(50, 10 * 60 * 1000);

const ContentDetailScreen = memo(() => {
  const { slug, previousPage } = useLocalSearchParams<{ slug: string; previousPage?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();
  const { session, user, loading: authLoading } = useAuth();

  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navigationSource, setNavigationSource] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [relatedSections, setRelatedSections] = useState<any[]>([]);

  const fetchSection = useCallback(async () => {
    if (!slug || typeof slug !== 'string') return;
    
    // Check if user is authenticated
    if (!session) {
      setError('Sie müssen angemeldet sein, um Inhalte zu sehen.');
      return;
    }
    
    // Check cache first (uses LRU with automatic expiration)
    const cached = contentCache.getValue(slug);

    if (cached) {
      setCurrentSection(cached);

      // Update navigation title with the actual title
      navigation.setOptions({
        headerTitle: cached.title || slug,
      });

      // Track content view for cached content too
      try {
        await recentContentService.trackContentView({
          slug: cached.slug,
          title: cached.title,
          description: cached.description,
          category: cached.category || cached.type,
          type: cached.type,
          icon: cached.icon,
          color: cached.color
        }, user?.id);
        SecureLogger.log('📖 Tracked cached content view:', cached.title, 'for user:', user?.id);
      } catch (trackingError) {
        SecureLogger.warn('⚠️ Failed to track cached content view:', trackingError);
      }

      // Auto-expand first section if content_improved exists
      if (Array.isArray(cached.content_improved) && cached.content_improved.length > 0) {
        setExpandedSections({ '0': true });
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      // Use direct Supabase query instead of service
      const { data: sectionData, error } = await supabase
        .from('sections')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
        
      if (error) throw error;
      if (!sectionData) throw new Error('Abschnitt nicht gefunden');
      
      setCurrentSection(sectionData);
      
      // Update navigation title with the actual title
      navigation.setOptions({
        headerTitle: sectionData.title || slug,
      });

      // Cache the result (LRU cache handles timestamp automatically)
      contentCache.setValue(slug, sectionData);
      
      // Track content view for recent content
      try {
        await recentContentService.trackContentView({
          slug: sectionData.slug,
          title: sectionData.title,
          description: sectionData.description,
          category: sectionData.category || sectionData.type,
          type: sectionData.type,
          icon: sectionData.icon,
          color: sectionData.color
        }, user?.id);
        SecureLogger.log('📖 Tracked content view:', sectionData.title, 'for user:', user?.id);
      } catch (trackingError) {
        SecureLogger.warn('⚠️ Failed to track content view:', trackingError);
      }
      
      // Auto-expand first section if content_improved exists
      if (Array.isArray(sectionData.content_improved) && sectionData.content_improved.length > 0) {
        setExpandedSections({ '0': true });
      }

      // Fetch related sections for modal navigation
      try {
        const { data: related } = await supabase
          .from('sections')
          .select('id, slug, title, type')
          .eq('parent_slug', sectionData.parent_slug)
          .neq('slug', slug)
          .order('display_order', { ascending: true });

        if (related) {
          setRelatedSections([
            { id: sectionData.id, slug: sectionData.slug, title: sectionData.title, type: sectionData.type },
            ...related
          ]);
        }
      } catch (relatedError) {
        SecureLogger.warn('Could not fetch related sections:', relatedError);
      }
    } catch (e: any) {
      SecureLogger.error(e);
      setError(e.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [slug, session]);

  useEffect(() => {
    if (!authLoading) {
      fetchSection();
    }
  }, [fetchSection, authLoading]);

  // Store navigation source when page is focused
  useFocusEffect(
    React.useCallback(() => {
      // Get the current navigation state to understand where we came from
      const state = navigation.getState();
      SecureLogger.log('🔍 Navigation state:', state);

      // Try to determine the previous route
      if (state?.routes && state.routes.length >= 2) {
        const previousRoute = state.routes[state.routes.length - 2];
        SecureLogger.log('🔍 Previous route:', previousRoute);
        setNavigationSource(previousRoute.name);
      }
    }, [navigation])
  );

  const toggleSection = useCallback((index: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  }, []);

  const handleBackPress = useCallback(() => {
    try {
      // Priority 1: If we have currentSection with parent_slug, navigate to parent
      if (currentSection?.parent_slug) {
        SecureLogger.log('Navigating to parent:', currentSection.parent_slug);
        router.push(`/(tabs)/bibliothek/${currentSection.parent_slug}` as any);
        return;
      }

      // Priority 2: Fallback to main bibliothek
      SecureLogger.log('No parent found, going to main bibliothek');
      router.push('/(tabs)/bibliothek');
    } catch (error) {
      SecureLogger.error('Error in back navigation:', error);
      // Final fallback - replace current route
      router.replace('/(tabs)/bibliothek');
    }
  }, [currentSection, router]);

  const handleRetry = useCallback(() => {
    setError(null);
    fetchSection();
  }, [fetchSection]);

  // Modal handlers
  const handleOpenModal = useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleModalSectionChange = useCallback((newSlug: string) => {
    // Navigate to the new slug
    router.replace(`/(tabs)/bibliothek/content/${newSlug}`);
  }, [router]);

  const gradientColors = useMemo(() =>
    isDarkMode
      ? ['#1F2937', '#111827', '#0F172A']
      : ['#F8F3E8', '#FBEEEC', '#FFFFFF'],  // White Linen to light coral to white
    [isDarkMode]
  );

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.background,
    },
    backText: {
      marginLeft: 4,
      fontSize: 16,
      color: colors.primary,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerDescription: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 4,
    },
    fallbackContent: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    fallbackTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    fallbackText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
    },
    errorText: {
      fontSize: 16,
      color: colors.error,
      marginBottom: 8,
    },
    errorLink: {
      color: colors.primary,
    },
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <LinearGradient colors={gradientColors as [string, string, ...string[]]} style={styles.gradientBackground} />
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.primary} />
          <Text style={dynamicStyles.backText}>Zurück</Text>
        </TouchableOpacity>
        <View style={styles.header}>
          <View style={{ height: 32, backgroundColor: colors.card, borderRadius: 8, opacity: 0.6, marginBottom: 8 }} />
          <View style={{ height: 20, backgroundColor: colors.card, borderRadius: 4, opacity: 0.4, width: '70%' }} />
        </View>
        <ContentSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={dynamicStyles.center}>
        <Text style={dynamicStyles.errorText}>{error}</Text>
        <TouchableOpacity onPress={handleRetry}>
          <Text style={dynamicStyles.errorLink}>Erneut laden</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!currentSection) {
    return (
      <SafeAreaView style={dynamicStyles.center}>
        <Text style={dynamicStyles.errorText}>Inhalt nicht gefunden</Text>
        <TouchableOpacity onPress={handleBackPress}>
          <Text style={dynamicStyles.errorLink}>← Zurück</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient colors={gradientColors as [string, string, ...string[]]} style={styles.gradientBackground} />

      {/* Medical Content - Full screen with integrated navigation */}
      <MedicalContentLoader
        slug={slug as string}
        onBackPress={handleBackPress}
        onOpenModal={handleOpenModal}
        currentSection={currentSection}
      />

      {/* Medical Content Modal */}
      <MedicalContentModal
        visible={modalVisible}
        onClose={handleCloseModal}
        initialSlug={slug as string}
        availableSections={relatedSections}
        onSectionChange={handleModalSectionChange}
      />
    </SafeAreaView>
  );
});

export default ContentDetailScreen;

const styles = StyleSheet.create({
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  minimalHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 10,
    elevation: 2,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  minimalTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  modalButtonMini: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  contentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  contentBody: {
    padding: 20,
    paddingTop: 0,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
  },
  definitionContainer: {
    marginTop: 16,
  },
  definitionTerm: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  definitionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  listContainer: {
    marginTop: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  listBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 12,
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  clinicalPearlContainer: {
    marginTop: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  clinicalPearlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clinicalPearlTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginLeft: 8,
  },
  clinicalPearlText: {
    fontSize: 15,
    color: '#92400E',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  htmlContainer: {
    marginTop: 16,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
  },
  htmlNote: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});