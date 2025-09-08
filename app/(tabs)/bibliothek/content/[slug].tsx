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
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/folder';
import AmboxMedicalContentRenderer from '@/components/ui/AmboxMedicalContentRenderer';

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

// Content cache to prevent re-fetching
const contentCache = new Map<string, { data: Section, timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const ContentDetailScreen = memo(() => {
  const { slug, previousPage } = useLocalSearchParams<{ slug: string; previousPage?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();
  const { session, loading: authLoading } = useAuth();

  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navigationSource, setNavigationSource] = useState<string | null>(null);

  const fetchSection = useCallback(async () => {
    if (!slug || typeof slug !== 'string') return;
    
    // Check if user is authenticated
    if (!session) {
      setError('Sie müssen angemeldet sein, um Inhalte zu sehen.');
      return;
    }
    
    // Check cache first
    const cached = contentCache.get(slug);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setCurrentSection(cached.data);
      
      // Update navigation title with the actual title
      navigation.setOptions({
        headerTitle: cached.data.title || slug,
      });
      
      // Auto-expand first section if content_improved exists
      if (Array.isArray(cached.data.content_improved) && cached.data.content_improved.length > 0) {
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
      
      // Cache the result
      contentCache.set(slug, { data: sectionData, timestamp: now });
      
      // Auto-expand first section if content_improved exists
      if (Array.isArray(sectionData.content_improved) && sectionData.content_improved.length > 0) {
        setExpandedSections({ '0': true });
      }
    } catch (e: any) {
      console.error(e);
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
      console.log('🔍 Navigation state:', state);
      
      // Try to determine the previous route
      if (state?.routes && state.routes.length >= 2) {
        const previousRoute = state.routes[state.routes.length - 2];
        console.log('🔍 Previous route:', previousRoute);
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
      // Priority 1: Use previousPage parameter if available
      if (previousPage && typeof previousPage === 'string') {
        router.push(previousPage);
        return;
      }
      
      // Priority 2: Use navigation history if available
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      
      // Priority 3: Fallback to main bibliothek
      router.push('/(tabs)/bibliothek');
    } catch (error) {
      // Final fallback - replace current route
      router.replace('/(tabs)/bibliothek');
    }
  }, [navigation, router, previousPage]);

  const handleRetry = useCallback(() => {
    setError(null);
    fetchSection();
  }, [fetchSection]);

  const gradientColors = useMemo(() => 
    isDarkMode 
      ? ['#1F2937', '#111827', '#0F172A']
      : ['#e0f2fe', '#f0f9ff', '#ffffff'],
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
      
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackPress}
        activeOpacity={0.7}
      >
        <ChevronLeft size={24} color={colors.primary} />
        <Text style={dynamicStyles.backText}>Zurück</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Universal Enhanced Medical Content Renderer */}
        <AmboxMedicalContentRenderer
          htmlContent={currentSection.content_html}
          jsonContent={currentSection.content_improved}
          plainTextContent={currentSection.content_details}
          title={currentSection.title}
          category={currentSection.category || 'Medizin'}
          lastUpdated="Juni 2025"
          completionStatus="Vollständiger Leitfaden"
        />
        
        <View style={{ height: 60 }} />
      </ScrollView>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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