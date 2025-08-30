import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Stethoscope, Heart, Activity, Scissors, AlertTriangle, Shield, Droplets, Scan, BookOpen } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

interface Section {
  id: string;
  slug: string;
  title: string;
  parent_slug: string | null;
  description: string | null;
  type: string;
  display_order: number;
  content_improved?: string;
}

// Get icon and color for sub-categories based on their title/type
const getSubCategoryDetails = (title: string, parentSlug: string) => {
  const normalizedTitle = title.toLowerCase();
  
  // Color based on parent category
  let baseColor = MEDICAL_COLORS.primary;
  switch (parentSlug) {
    case 'chirurgie': baseColor = '#EF4444'; break;
    case 'innere-medizin': baseColor = '#0077B6'; break;
    case 'notfallmedizin': baseColor = '#F59E0B'; break;
    case 'infektiologie': baseColor = '#10B981'; break;
    case 'urologie': baseColor = '#8B5CF6'; break;
    case 'radiologie': baseColor = '#6366F1'; break;
  }
  
  // Icon based on content
  let icon = 'BookOpen';
  if (normalizedTitle.includes('kardio') || normalizedTitle.includes('herz')) icon = 'Heart';
  else if (normalizedTitle.includes('chirurg') || normalizedTitle.includes('operation')) icon = 'Scissors';
  else if (normalizedTitle.includes('notfall') || normalizedTitle.includes('reanimat')) icon = 'AlertTriangle';
  else if (normalizedTitle.includes('diagnostik') || normalizedTitle.includes('röntgen')) icon = 'Scan';
  else if (normalizedTitle.includes('pneumo') || normalizedTitle.includes('lunge')) icon = 'Activity';
  else if (normalizedTitle.includes('urolog') || normalizedTitle.includes('niere')) icon = 'Droplets';
  else if (normalizedTitle.includes('infekt') || normalizedTitle.includes('hygiene')) icon = 'Shield';
  else icon = 'Stethoscope';
  
  return { icon, color: baseColor };
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
    case 'BookOpen':
    default: return BookOpen;
  }
};

export default function CategoryDetailScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  
  const [currentCategory, setCurrentCategory] = useState<Section | null>(null);
  const [subCategories, setSubCategories] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the current main category and its sub-categories
  const fetchCategoryData = async () => {
    if (!slug || typeof slug !== 'string') return;

    try {
      setLoading(true);
      
      if (!session) {
        setError('Sie müssen angemeldet sein, um die Bibliothek zu nutzen.');
        return;
      }

      console.log('Fetching category data for:', slug);

      // Fetch current category details (the main category)
      const { data: categoryData, error: categoryError } = await supabase
        .from('sections')
        .select('id, slug, title, description, type, display_order')
        .eq('slug', slug)
        .maybeSingle();

      if (categoryError) {
        throw categoryError;
      }

      if (!categoryData) {
        setError('Kategorie nicht gefunden.');
        return;
      }

      setCurrentCategory(categoryData);
      console.log('Current category:', categoryData.title);

      // Fetch sub-categories (items where parent_slug = current slug)
      const { data: subCategoriesData, error: subCategoriesError } = await supabase
        .from('sections')
        .select('id, slug, title, parent_slug, description, type, display_order, content_improved')
        .eq('parent_slug', slug)  // Get items that belong to this main category
        .order('display_order', { ascending: true });

      if (subCategoriesError) {
        throw subCategoriesError;
      }

      console.log(`Found ${subCategoriesData?.length || 0} sub-categories`);
      setSubCategories(subCategoriesData || []);

    } catch (e) {
      console.error('Error fetching category data:', e);
      setError(e instanceof Error ? e.message : 'Fehler beim Laden der Kategorie');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchCategoryData();
    }
  }, [slug, session, authLoading]);

  const navigateToSubCategory = (subCategorySlug: string) => {
    console.log('Navigating to sub-category:', subCategorySlug);
    router.push(`/bibliothek/${subCategorySlug}`);
  };

  const handleBackPress = () => {
    router.push('/bibliothek');
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={MEDICAL_COLORS.primary} />
        <Text style={styles.loadingText}>Lade Kategorien...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Fehler</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchCategoryData}>
          <Text style={styles.retryButtonText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!currentCategory) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Kategorie nicht gefunden</Text>
        <Text style={styles.errorText}>Die gesuchte Kategorie konnte nicht gefunden werden.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleBackPress}>
          <Text style={styles.retryButtonText}>Zurück zur Bibliothek</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[MEDICAL_COLORS.lightGradient[0], MEDICAL_COLORS.lightGradient[1], '#ffffff']}
        style={styles.gradientBackground}
      />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleBackPress}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={MEDICAL_COLORS.primary} />
          <Text style={styles.backText}>Zurück</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>{currentCategory.title}</Text>
        {currentCategory.description && (
          <Text style={styles.subtitle}>{currentCategory.description}</Text>
        )}
      </View>

      {subCategories.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Keine Unterkategorien gefunden.</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {subCategories.map((subCategory) => {
            const { icon, color } = getSubCategoryDetails(subCategory.title, slug as string);
            const IconComponent = getIconComponent(icon);
            
            return (
              <TouchableOpacity
                key={subCategory.slug}
                style={styles.subCategoryCard}
                onPress={() => navigateToSubCategory(subCategory.slug)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[`${color}15`, `${color}05`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.subCategoryGradient}
                >
                  <View style={[styles.subCategoryIcon, { backgroundColor: color }]}>
                    <IconComponent size={24} color="white" />
                  </View>
                  
                  <View style={styles.subCategoryContent}>
                    <Text style={styles.subCategoryTitle}>{subCategory.title}</Text>
                    <Text style={styles.subCategoryType}>{subCategory.type}</Text>
                    {subCategory.description && (
                      <Text style={styles.subCategoryDescription}>{subCategory.description}</Text>
                    )}
                  </View>
                  
                  <ChevronRight size={20} color={color} />
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
    fontFamily: 'Inter-Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Inter-Regular',
  },
  retryButton: {
    backgroundColor: MEDICAL_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: MEDICAL_COLORS.primary,
    marginLeft: 4,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 22,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  subCategoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  subCategoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  subCategoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subCategoryContent: {
    flex: 1,
  },
  subCategoryTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 2,
  },
  subCategoryType: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: MEDICAL_COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subCategoryDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: MEDICAL_COLORS.gray,
    marginTop: 4,
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: MEDICAL_COLORS.textSecondary,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 60,
  },
});