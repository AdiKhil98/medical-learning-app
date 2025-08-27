import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Search, BookOpen, Stethoscope, Scissors, AlertTriangle, Microscope, Droplets, Scan, BookOpen as FolderIcon } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import Input from '@/components/ui/Input';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '@/components/ui/Card';

// Section type
interface Section {
  id: string;
  slug: string;
  title: string;
  parent_slug: string | null;
  description: string | null;
  type: 'folder' | 'file-text' | 'markdown';
  icon: string;
  color: string;
  display_order: number;
}

// Map title/iconName to icon component and color
const getCategoryDetails = (title: string, iconName?: string, color?: string) => {
  const name = title.toLowerCase().trim();
  switch (true) {
    case name === 'innere medizin': return { icon: 'Stethoscope', color: '#0077B6' };
    case name === 'chirurgie': return { icon: 'Scissors', color: '#48CAE4' };
    case name === 'notfallmedizin': return { icon: 'AlertTriangle', color: '#EF4444' };
    case name === 'infektiologie': return { icon: 'Microscope', color: '#DC2626' };
    case name === 'urologie': return { icon: 'Droplets', color: '#0369A1' };
    case name === 'radiologie': return { icon: 'Scan', color: '#22C55E' };
    default: return { icon: iconName || 'FileText', color: color || '#6B7280' };
  }
};

// Memoized icon components cache
const iconCache = new Map();

// Optimized icon component with memoization
const getIconComponent = (iconName: string, color: string, size = 24) => {
  const cacheKey = `${iconName}-${color}-${size}`;
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey);
  }
  
  let icon;
  switch (iconName) {
    case 'Stethoscope': icon = <Stethoscope size={size} color={color} />; break;
    case 'Scissors': icon = <Scissors size={size} color={color} />; break;
    case 'AlertTriangle': icon = <AlertTriangle size={size} color={color} />; break;
    case 'Microscope': icon = <Microscope size={size} color={color} />; break;
    case 'Droplets': icon = <Droplets size={size} color={color} />; break;
    case 'Scan': icon = <Scan size={size} color={color} />; break;
    default: icon = <FolderIcon size={size} color={color} />; break;
  }
  
  iconCache.set(cacheKey, icon);
  return icon;
};

// Skeleton loader component
const SkeletonLoader = memo(() => {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 16 }}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={{
          height: 76,
          backgroundColor: colors.card,
          marginBottom: 12,
          borderRadius: 12,
          opacity: 0.6,
        }} />
      ))}
    </View>
  );
});

// Memoized section item component
const SectionItem = memo(({ section, onPress, colors }: { 
  section: Section, 
  onPress: () => void, 
  colors: any 
}) => {
  const { icon, color } = useMemo(() => 
    getCategoryDetails(section.title, section.icon, section.color), 
    [section.title, section.icon, section.color]
  );
  
  const gradientColors = useMemo(() => [`${color}20`, `${color}10`], [color]);
  
  return (
    <Card style={[styles.card, { backgroundColor: colors.card }]}>
      <TouchableOpacity onPress={onPress} style={styles.row} activeOpacity={0.7}>
        <LinearGradient colors={gradientColors} style={styles.rowBg}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          {getIconComponent(icon, color)}
          <Text style={[styles.itemText, { color: colors.text }]}>{section.title}</Text>
          <ChevronRight size={20} color={colors.textSecondary} />
        </LinearGradient>
      </TouchableOpacity>
    </Card>
  );
});

// Data cache to prevent unnecessary API calls
let sectionsCache: Section[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const IndexScreen = memo(() => {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Optimized fetch with caching
  const fetchRootSections = useCallback(async () => {
    // Check cache first
    const now = Date.now();
    if (sectionsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      setSections(sectionsCache);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id,slug,title,description,type,icon,color,display_order')
        .is('parent_slug', null)
        .order('display_order', { ascending: true });
      if (error) throw error;
      
      const sectionsData = data || [];
      setSections(sectionsData);
      
      // Update cache
      sectionsCache = sectionsData;
      cacheTimestamp = now;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRootSections(); }, [fetchRootSections]);

  // Optimized navigation with useCallback
  const navigateTo = useCallback((sec: Section) => {
    const isLeaf = sec.type === 'file-text' || sec.type === 'markdown';
    const path = isLeaf ? `/bibliothek/content/${sec.slug}` : `/bibliothek/${sec.slug}`;
    router.push(path);
  }, [router]);

  // Memoized filtered sections
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    return sections.filter(s =>
      s.title.toLowerCase().includes(query) ||
      (s.description?.toLowerCase() || '').includes(query)
    );
  }, [sections, searchQuery]);

  // Memoized gradient colors
  const gradientColors = useMemo(() => 
    isDarkMode 
      ? ['#1F2937', '#111827', '#0F172A']
      : ['#e0f2fe', '#f0f9ff', '#ffffff'],
    [isDarkMode]
  );
  
  // Optimized search handler
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);
  
  // FlatList render item
  const renderSection = useCallback(({ item: sec }: { item: Section }) => (
    <SectionItem 
      section={sec} 
      onPress={() => navigateTo(sec)} 
      colors={colors} 
    />
  ), [navigateTo, colors]);
  
  const keyExtractor = useCallback((item: Section) => item.slug, []);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
      color: colors.text,
    },
    errorText: {
      color: colors.error,
    },
    emptyText: {
      marginTop: 8,
      fontSize: 16,
      color: colors.textSecondary,
    },
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={[dynamicStyles.container]}>
        <LinearGradient colors={gradientColors} style={styles.gradientBackground} />
        <View style={styles.header}>
          <Text style={dynamicStyles.title}>Bibliothek</Text>
          <View style={styles.searchContainer}>
            <View style={{ height: 56, backgroundColor: colors.card, borderRadius: 8, opacity: 0.6 }} />
          </View>
        </View>
        <SkeletonLoader />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={dynamicStyles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
      />
      
      <View style={styles.header}>
        <Text style={dynamicStyles.title}>Bibliothek</Text>
        <Input
          placeholder="Fachgebiet suchen..."
          value={searchQuery}
          onChangeText={handleSearchChange}
          leftIcon={<Search size={20} color={colors.textSecondary} />}
          containerStyle={styles.searchContainer}
        />
      </View>
      
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <BookOpen size={60} color={colors.textSecondary} />
          <Text style={dynamicStyles.emptyText}>Keine Kategorien gefunden</Text>
        </View>
      ) : (
        <FlatList
          style={styles.content}
          data={filtered}
          renderItem={renderSection}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={8}
          getItemLayout={(_, index) => ({
            length: 76,
            offset: 76 * index,
            index,
          })}
        />
      )}
    </SafeAreaView>
  );
});

export default IndexScreen;

const styles = StyleSheet.create({
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  header: { padding: 16 },
  searchContainer: { marginBottom: 12 },
  content: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBg: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  itemText: { flex: 1, marginLeft: 8, fontSize: 16 },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
});