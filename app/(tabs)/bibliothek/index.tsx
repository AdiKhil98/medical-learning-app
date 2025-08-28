import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, BookOpen, Filter, Grid } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Input from '@/components/ui/Input';
import { LinearGradient } from 'expo-linear-gradient';
import HierarchicalSectionCard from '@/components/ui/HierarchicalSectionCard';
import { medicalContentService, MedicalSection } from '@/lib/medicalContentService';

// Use MedicalSection from service
type Section = MedicalSection;


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

// Memoized section item component using HierarchicalSectionCard
const SectionItem = memo(({ section, onPress }: { 
  section: Section, 
  onPress: () => void
}) => {
  return (
    <HierarchicalSectionCard 
      section={section} 
      onPress={onPress} 
      hierarchyLevel={0} // Root level for main categories
    />
  );
});

const IndexScreen = memo(() => {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch root sections using medical content service
  const fetchRootSections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rootSections = await medicalContentService.getRootSections();
      setSections(rootSections);
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
    />
  ), [navigateTo]);
  
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
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[dynamicStyles.emptyText, { marginTop: 16 }]}>
            Lade medizinische Inhalte...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[dynamicStyles.container]}>
        <LinearGradient colors={gradientColors} style={styles.gradientBackground} />
        <View style={styles.header}>
          <Text style={dynamicStyles.title}>Bibliothek</Text>
        </View>
        <View style={styles.center}>
          <BookOpen size={60} color={colors.textSecondary} />
          <Text style={[dynamicStyles.errorText, { textAlign: 'center', marginTop: 16 }]}>
            Fehler beim Laden der Inhalte
          </Text>
          <Text style={[dynamicStyles.emptyText, { textAlign: 'center', marginTop: 8 }]}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchRootSections}
            style={{
              marginTop: 16,
              paddingHorizontal: 20,
              paddingVertical: 10,
              backgroundColor: colors.primary,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
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