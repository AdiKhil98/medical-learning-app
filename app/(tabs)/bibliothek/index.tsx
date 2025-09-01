import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Scissors, Stethoscope, AlertTriangle, Shield, Droplets, Scan } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

interface MainCategory {
  id: string;
  slug: string;
  title: string;
  type: string;
  display_order: number;
  description?: string;
}

// Map main categories to appropriate icons and colors
const getMainCategoryDetails = (title: string) => {
  const normalizedTitle = title.toLowerCase();
  
  switch (true) {
    case normalizedTitle.includes('chirurgie'):
      return { icon: 'Scissors', color: '#EF4444' };
    case normalizedTitle.includes('innere medizin'):
      return { icon: 'Stethoscope', color: '#0077B6' };
    case normalizedTitle.includes('notfall'):
      return { icon: 'AlertTriangle', color: '#F59E0B' };
    case normalizedTitle.includes('infektio'):
      return { icon: 'Shield', color: '#10B981' };
    case normalizedTitle.includes('urologie'):
      return { icon: 'Droplets', color: '#8B5CF6' };
    case normalizedTitle.includes('radiologie'):
      return { icon: 'Scan', color: '#6366F1' };
    default:
      return { icon: 'Stethoscope', color: MEDICAL_COLORS.primary };
  }
};

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'Scissors': return Scissors;
    case 'Stethoscope': return Stethoscope;
    case 'AlertTriangle': return AlertTriangle;
    case 'Shield': return Shield;
    case 'Droplets': return Droplets;
    case 'Scan': return Scan;
    default: return Stethoscope;
  }
};

export default function BibliothekMainScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch ONLY main categories (no parent_slug)
  const fetchMainCategories = async () => {
    try {
      setLoading(true);
      
      if (!session) {
        setError('Sie müssen angemeldet sein, um die Bibliothek zu nutzen.');
        return;
      }

      console.log('Fetching main categories...');
      
      const { data, error } = await supabase
        .from('sections')
        .select('id, slug, title, type, display_order, description')
        .is('parent_slug', null)  // Only main categories
        .order('display_order', { ascending: true });

      if (error) {
        throw error;
      }

      console.log('Main categories fetched:', data?.length || 0);
      setMainCategories(data || []);
      
    } catch (e) {
      console.error('Error fetching main categories:', e);
      setError(e instanceof Error ? e.message : 'Fehler beim Laden der Hauptkategorien');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchMainCategories();
    }
  }, [session, authLoading]);

  const navigateToCategory = (categorySlug: string) => {
    console.log('Navigating to category:', categorySlug);
    router.push(`/bibliothek/${categorySlug}`);
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={MEDICAL_COLORS.primary} />
        <Text style={styles.loadingText}>Lade Hauptkategorien...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Fehler</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMainCategories}>
          <Text style={styles.retryButtonText}>Erneut versuchen</Text>
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
        <Text style={styles.title}>Medizinische Bibliothek</Text>
        <Text style={styles.subtitle}>Wählen Sie eine Hauptkategorie</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {mainCategories.map((category) => {
          const { icon, color } = getMainCategoryDetails(category.title);
          const IconComponent = getIconComponent(icon);
          
          return (
            <TouchableOpacity
              key={category.slug}
              style={styles.categoryCard}
              onPress={() => navigateToCategory(category.slug)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[`${color}20`, `${color}05`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.categoryGradient}
              >
                <View style={[styles.categoryIcon, { backgroundColor: color }]}>
                  <IconComponent size={28} color="white" />
                </View>
                
                <View style={styles.categoryContent}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  {category.description && (
                    <Text style={styles.categoryDescription}>{category.description}</Text>
                  )}
                </View>
                
                <ChevronRight size={24} color={color} />
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
        
        {/* Medical Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <LinearGradient
            colors={[`${MEDICAL_COLORS.primary}08`, `${MEDICAL_COLORS.primary}05`]}
            style={styles.disclaimerGradient}
          >
            <View style={styles.disclaimerContent}>
              <View style={styles.disclaimerIcon}>
                <Text style={styles.disclaimerEmoji}>⚕️</Text>
              </View>
              <View style={styles.disclaimerTextContainer}>
                <Text style={styles.disclaimerTitle}>Medizinischer Haftungsausschluss</Text>
                <Text style={styles.disclaimerText}>
                  Diese Plattform stellt Lehrmaterialien ausschließlich für approbierte medizinische Fachkräfte zur Verfügung. Die Inhalte dienen der Prüfungsvorbereitung und stellen keine medizinische Beratung dar.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>
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
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: MEDICAL_COLORS.textSecondary,
  },
  content: {
    paddingHorizontal: 16,
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  categoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 4,
  },
  categoryDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: MEDICAL_COLORS.gray,
    marginTop: 4,
    lineHeight: 18,
  },
  bottomPadding: {
    height: 60,
  },
  
  // Medical Disclaimer Styles
  disclaimerContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  disclaimerGradient: {
    borderRadius: 16,
    padding: 1,
  },
  disclaimerContent: {
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  disclaimerEmoji: {
    fontSize: 24,
  },
  disclaimerTextContainer: {
    flex: 1,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 6,
  },
  disclaimerText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 18,
    opacity: 0.9,
  },
});