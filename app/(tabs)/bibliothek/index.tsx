import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, BookOpen } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { medicalContentService, MedicalSection } from '@/lib/medicalContentService';
import HierarchicalSectionCard from '@/components/ui/HierarchicalSectionCard';

// Use MedicalSection from service
type Section = MedicalSection;

// Skeleton loader
const SectionSkeleton = React.memo(() => {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 16, paddingTop: 0 }}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={{
          height: 72,
          marginBottom: 12,
          borderRadius: 12,
          backgroundColor: colors.card,
          opacity: 0.6,
        }} />
      ))}
    </View>
  );
});

// Memoized section card
const SectionCard = React.memo(({ 
  section, 
  onPress 
}: { 
  section: Section; 
  onPress: () => void; 
}) => {
  return (
    <HierarchicalSectionCard
      section={section}
      onPress={onPress}
      level={0}
    />
  );
});

export default function BibliothekScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadSections = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);

      // Check if user is authenticated
      if (!user) {
        setError('Sie müssen angemeldet sein, um die Bibliothek zu verwenden');
        return;
      }

      console.log('🚀 Loading sections for authenticated user:', user.id);

      // Get root sections (sections without parent)
      const rootSections = await medicalContentService.getRootSections();
      console.log('📊 Received root sections:', rootSections?.length || 0);
      
      if (!rootSections || rootSections.length === 0) {
        console.log('⚠️ No root sections found - table might be empty');
        setError('Keine Inhalte in der Bibliothek gefunden. Die Bibliothek ist möglicherweise leer.');
        setSections([]);
      } else {
        console.log('✅ Successfully loaded sections:', rootSections.map(s => s.title));
        setSections(rootSections);
      }

    } catch (error) {
      console.error('💥 ERROR loading sections:', error);
      console.error('📋 Full error details:', JSON.stringify(error, null, 2));
      console.error('📋 Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // More specific error message
      let errorMessage = 'Fehler beim Laden der Bibliothek';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      console.error('📋 Setting error message:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    // Only load sections after auth loading is complete
    if (!authLoading) {
      loadSections();
    }
  }, [loadSections, authLoading]);

  const handleRefresh = useCallback(() => {
    loadSections(true);
  }, [loadSections]);

  const handleSectionPress = useCallback((section: Section) => {
    if (section.type === 'folder') {
      router.push(`/bibliothek/${section.slug}`);
    } else {
      router.push(`/bibliothek/${section.slug}`);
    }
  }, [router]);

  const handleSearchPress = useCallback(() => {
    router.push('/bibliothek/search');
  }, [router]);

  const renderSectionItem = useCallback(({ item }: { item: Section }) => (
    <SectionCard
      section={item}
      onPress={() => handleSectionPress(item)}
    />
  ), [handleSectionPress]);

  const keyExtractor = useCallback((item: Section) => item.id, []);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  ), [refreshing, handleRefresh, colors.primary]);

  if (authLoading || loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Bibliothek</Text>
            <TouchableOpacity
              onPress={handleSearchPress}
              style={styles.searchButton}
            >
              <Search size={24} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <SectionSkeleton />
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
            <Text style={styles.headerTitle}>Bibliothek</Text>
            <TouchableOpacity
              onPress={handleSearchPress}
              style={styles.searchButton}
            >
              <Search size={24} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity onPress={() => loadSections()} style={styles.retryButton}>
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
          <Text style={styles.headerTitle}>Bibliothek</Text>
          <TouchableOpacity
            onPress={handleSearchPress}
            style={styles.searchButton}
          >
            <Search size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={sections}
        keyExtractor={keyExtractor}
        renderItem={renderSectionItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <BookOpen size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Keine Inhalte in der Bibliothek verfügbar.
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
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  searchButton: {
    padding: 8,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
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