import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
<<<<<<< HEAD
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, BookOpen } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { medicalContentService, MedicalSection } from '@/lib/medicalContentService';
import HierarchicalSectionCard from '@/components/ui/HierarchicalSectionCard';
import Breadcrumb from '@/components/ui/Breadcrumb';

// Use MedicalSection from service
type Section = MedicalSection;
=======
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

interface Section {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  parent_slug: string | null;
  type: 'folder' | 'file-text' | 'markdown';
  content_type?: string;
  has_content?: boolean;
  content_json?: any;
  display_order: number;
}
>>>>>>> master

// Skeleton loader for children items
const ChildrenSkeleton = memo(() => {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 16 }}>
      {Array.from({ length: 4 }, (_, i) => (
        <View key={i} style={{
          height: 64,
          backgroundColor: colors.card,
          marginBottom: 8,
          borderRadius: 12,
          opacity: 0.5,
        }} />
      ))}
    </View>
  );
});

<<<<<<< HEAD
// Memoized child item component using HierarchicalSectionCard
const ChildItem = memo(({ section, onPress, hierarchyLevel }: {
  section: Section,
  onPress: () => void,
  hierarchyLevel: number
}) => {
  return (
    <HierarchicalSectionCard
      section={section}
      onPress={onPress}
      hierarchyLevel={hierarchyLevel}
    />
  );
});

=======
// Memoized child item component
const ChildItem = memo(({ section, onPress, colors }: {
  section: Section,
  onPress: () => void,
  colors: any
}) => {
  const itemStyles = useMemo(() => ({
    ...styles.item,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  }), [colors.card]);

  return (
    <TouchableOpacity
      style={itemStyles}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.itemText, { color: colors.text }]}>{section.title}</Text>
      <ChevronRight size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
});

// Cache for section data
const sectionCache = new Map<string, { data: Section, children: Section[], timestamp: number }>();
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes
>>>>>>> master

const SectionDetailScreen = memo(() => {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  const [current, setCurrent] = useState<Section | null>(null);
  const [children, setChildren] = useState<Section[]>([]);
<<<<<<< HEAD
  const [breadcrumbPath, setBreadcrumbPath] = useState<Section[]>([]);
  const [hierarchyLevel, setHierarchyLevel] = useState(1);
=======
>>>>>>> master
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSectionAndChildren = useCallback(async () => {
    if (!slug || typeof slug !== 'string') return;

<<<<<<< HEAD
    setLoading(true);
    setError(null);

    try {
      // Fetch current section and its hierarchical path
      const [currentSection, pathSections, childrenSections] = await Promise.all([
        medicalContentService.getSectionBySlug(slug),
        medicalContentService.getHierarchicalPath(slug),
        medicalContentService.getSectionsByParent(slug)
      ]);

      if (!currentSection) {
        throw new Error('Section not found');
      }

      // Check if this section has content - redirect to content viewer
      const hasContent = currentSection.has_content ||
        currentSection.content_html ||
        (currentSection.content_improved && Array.isArray(currentSection.content_improved) && currentSection.content_improved.length > 0) ||
        currentSection.type === 'file-text' ||
        currentSection.type === 'markdown';

      if (hasContent) {
=======
    // Check cache first
    const cacheKey = slug;
    const cached = sectionCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setCurrent(cached.data);
      setChildren(cached.children);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1) Fetch current section with minimal data
      const { data: cur, error: curErr } = await supabase
        .from('sections')
        .select('id,slug,title,description,type,content_type,has_content,content_improved,display_order')
        .eq('slug', slug)
        .maybeSingle();
      
      if (curErr) throw curErr;
      if (!cur) throw new Error('Section not found');

      // 2) Check if this section has content - redirect to content viewer
      if (Array.isArray(cur.content_improved) && cur.content_improved.length > 0) {
>>>>>>> master
        router.replace(`/bibliothek/content/${slug}`);
        return;
      }

<<<<<<< HEAD
      setCurrent(currentSection);
      setChildren(childrenSections);
      setBreadcrumbPath(pathSections);
      
      // Calculate hierarchy level based on breadcrumb path
      setHierarchyLevel(pathSections.length);
=======
      const hasContentImproved = cur.content_improved && 
        Array.isArray(cur.content_improved.sections) && 
        cur.content_improved.sections.length > 0;

      const isLeaf = 
        cur.type === 'file-text' ||
        cur.type === 'markdown' ||
        cur.content_type === 'document' ||
        cur.has_content ||
        hasContentImproved;

      if (isLeaf) {
        router.replace(`/bibliothek/content/${slug}`);
        return;
      }

      setCurrent(cur);

      // 3) Fetch direct children with minimal fields
      const { data: kids, error: kidsErr } = await supabase
        .from('sections')
        .select('id,slug,title,description,type,display_order')
        .eq('parent_slug', slug)
        .order('display_order', { ascending: true });
        
      if (kidsErr) throw kidsErr;
      
      const childrenData = kids || [];
      setChildren(childrenData);
      
      // Update cache
      sectionCache.set(cacheKey, {
        data: cur,
        children: childrenData,
        timestamp: now,
      });
>>>>>>> master

    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => {
    fetchSectionAndChildren();
  }, [fetchSectionAndChildren]);

  // Memoized navigation handler
  const handleChildNavigation = useCallback((sec: Section) => {
    router.push({
      pathname: '/bibliothek/[slug]',
      params: { slug: sec.slug },
    });
  }, [router]);

  // Memoized back handler
  const handleBackPress = useCallback(() => {
    router.back();
  }, [router]);

  // FlatList optimizations
  const renderChild = useCallback(({ item: sec }: { item: Section }) => (
    <ChildItem 
      section={sec} 
      onPress={() => handleChildNavigation(sec)} 
<<<<<<< HEAD
      hierarchyLevel={hierarchyLevel + 1}
    />
  ), [handleChildNavigation, hierarchyLevel]);
=======
      colors={colors} 
    />
  ), [handleChildNavigation, colors]);
>>>>>>> master

  const keyExtractor = useCallback((item: Section) => item.slug, []);

  const gradientColors = useMemo(() => 
    isDarkMode 
      ? ['#1F2937', '#111827', '#0F172A']
      : ['#e0f2fe', '#f0f9ff', '#ffffff'],
    [isDarkMode]
  );

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: colors.background 
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
    header: {
      marginHorizontal: 16,
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    subHeader: {
      marginHorizontal: 16,
      marginBottom: 12,
      fontSize: 16,
      color: colors.textSecondary,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 16,
    },
    error: {
      fontSize: 16,
      color: colors.error,
      marginBottom: 8,
    },
    link: {
      color: colors.primary,
      fontSize: 16,
    },
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <LinearGradient colors={gradientColors} style={styles.gradientBackground} />
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.primary} />
          <Text style={dynamicStyles.backText}>Zurück</Text>
        </TouchableOpacity>
        <View style={{ height: 80, paddingHorizontal: 16 }}>
          <View style={{ height: 32, backgroundColor: colors.card, borderRadius: 8, opacity: 0.6, marginBottom: 8 }} />
          <View style={{ height: 20, backgroundColor: colors.card, borderRadius: 4, opacity: 0.4, width: '70%' }} />
        </View>
        <ChildrenSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !current) {
    return (
      <SafeAreaView style={dynamicStyles.center}>
        <Text style={dynamicStyles.error}>Oops – konnte nichts laden.</Text>
        <TouchableOpacity onPress={handleBackPress}>
          <Text style={dynamicStyles.link}>← Zurück</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient colors={gradientColors} style={styles.gradientBackground} />
      
<<<<<<< HEAD
      {/* Breadcrumb Navigation */}
      <Breadcrumb 
        path={breadcrumbPath} 
        currentTitle={current.title}
      />

      <View style={{ padding: 16 }}>
        <Text style={dynamicStyles.header}>{current.title}</Text>
        {current.description && (
          <Text style={dynamicStyles.subHeader}>{current.description}</Text>
        )}
      </View>
=======
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackPress}
        activeOpacity={0.7}
      >
        <ChevronLeft size={24} color={colors.primary} />
        <Text style={dynamicStyles.backText}>Zurück</Text>
      </TouchableOpacity>

      <Text style={dynamicStyles.header}>{current.title}</Text>
      {current.description && (
        <Text style={dynamicStyles.subHeader}>{current.description}</Text>
      )}
>>>>>>> master

      {children.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={dynamicStyles.emptyText}>Keine weiteren Unterpunkte.</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={children}
          renderItem={renderChild}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={8}
          initialNumToRender={6}
          getItemLayout={(_, index) => ({
            length: 72, // Approximate item height
            offset: 72 * index,
            index,
          })}
        />
      )}
    </SafeAreaView>
  );
});

export default SectionDetailScreen;

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
  list: { marginTop: 8, paddingHorizontal: 16 },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  itemText: {
    flex: 1,
    fontSize: 16,
  },
});