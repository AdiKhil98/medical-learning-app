import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
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

// Skeleton loader for children items
const ChildrenSkeleton = memo(() => {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 16 }}>
      {Array.from({ length: 4 }, (_, i) => (
        <View key={i} style={{
          height: 64,
          marginBottom: 12,
          borderRadius: 12,
          backgroundColor: colors.card,
          opacity: 0.6,
        }} />
      ))}
    </View>
  );
});

// Memoized section card for performance
const SectionCard = memo(({ 
  section, 
  onPress, 
  colors 
}: { 
  section: Section; 
  onPress: () => void; 
  colors: any;
}) => {
  return (
    <HierarchicalSectionCard
      section={section}
      onPress={onPress}
      level={0}
    />
  );
});

export default function BibliothekSectionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [childSections, setChildSections] = useState<Section[]>([]);
  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<Section[]>([]);

  // Load section data
  const loadSectionData = useCallback(async () => {
    if (!slug) return;
    
    try {
      setLoading(true);
      setError(null);

      // Get current section
      const section = await medicalContentService.getSectionBySlug(slug);
      if (!section) {
        setError('Abschnitt nicht gefunden');
        return;
      }

      setCurrentSection(section);

      // Get child sections
      const children = await medicalContentService.getChildSections(slug);
      setChildSections(children || []);

      // Get breadcrumb path
      const path = await medicalContentService.getHierarchicalPath(slug);
      setBreadcrumbPath(path || []);

    } catch (error) {
      console.error('Error loading section:', error);
      setError('Fehler beim Laden der Inhalte');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadSectionData();
  }, [loadSectionData]);

  const handleSectionPress = useCallback((section: Section) => {
    if (section.type === 'folder') {
      router.push(`/bibliothek/${section.slug}`);
    } else {
      router.push(`/bibliothek/${section.slug}`);
    }
  }, [router]);

  const handleBackPress = useCallback(() => {
    if (breadcrumbPath.length > 1) {
      const parentSection = breadcrumbPath[breadcrumbPath.length - 2];
      router.push(`/bibliothek/${parentSection.slug}`);
    } else {
      router.push('/bibliothek');
    }
  }, [breadcrumbPath, router]);

  const renderSectionItem = useCallback(({ item }: { item: Section }) => (
    <SectionCard
      section={item}
      onPress={() => handleSectionPress(item)}
      colors={colors}
    />
  ), [handleSectionPress, colors]);

  const keyExtractor = useCallback((item: Section) => item.id, []);

  const getEmptyMessage = useMemo(() => {
    if (!currentSection) return 'Abschnitt nicht gefunden';
    if (currentSection.type === 'folder') return 'Dieser Ordner enthält keine Unterabschnitte.';
    return 'Keine Inhalte verfügbar.';
  }, [currentSection]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={handleBackPress}>
              <ChevronLeft size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Laden...</Text>
          </View>
        </LinearGradient>
        <ChildrenSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={handleBackPress}>
              <ChevronLeft size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Fehler</Text>
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity onPress={loadSectionData} style={styles.retryButton}>
            <Text style={[styles.retryText, { color: colors.primary }]}>
              Erneut versuchen
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBackPress}>
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentSection?.title || 'Bibliothek'}
          </Text>
        </View>
        
        {breadcrumbPath.length > 0 && (
          <Breadcrumb path={breadcrumbPath} />
        )}
      </LinearGradient>

      <FlatList
        data={childSections}
        keyExtractor={keyExtractor}
        renderItem={renderSectionItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <BookOpen size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {getEmptyMessage}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 16,
    flex: 1,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});