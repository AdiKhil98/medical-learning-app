import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Scissors, Stethoscope, AlertTriangle, Shield, Droplets, Scan } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MainCategory {
  id: string;
  slug: string;
  title: string;
  type: string;
  display_order: number;
  description?: string;
}

// Map main categories to appropriate icons and colors with enhanced 3D gradients
const getMainCategoryDetails = (title: string) => {
  const normalizedTitle = title.toLowerCase();
  
  switch (true) {
    case normalizedTitle.includes('chirurgie'):
      return { 
        icon: 'Scissors', 
        color: '#EF4444',
        gradient: ['#EF4444', '#DC2626', '#B91C1C'],
        hoverGradient: ['#F87171', '#EF4444', '#DC2626']
      };
    case normalizedTitle.includes('innere medizin'):
      return { 
        icon: 'Stethoscope', 
        color: '#0077B6',
        gradient: ['#0EA5E9', '#0284C7', '#0369A1'],
        hoverGradient: ['#38BDF8', '#0EA5E9', '#0284C7']
      };
    case normalizedTitle.includes('notfall'):
      return { 
        icon: 'AlertTriangle', 
        color: '#F59E0B',
        gradient: ['#F59E0B', '#D97706', '#B45309'],
        hoverGradient: ['#FCD34D', '#F59E0B', '#D97706']
      };
    case normalizedTitle.includes('infektio'):
      return { 
        icon: 'Shield', 
        color: '#10B981',
        gradient: ['#10B981', '#059669', '#047857'],
        hoverGradient: ['#34D399', '#10B981', '#059669']
      };
    case normalizedTitle.includes('urologie'):
      return { 
        icon: 'Droplets', 
        color: '#8B5CF6',
        gradient: ['#8B5CF6', '#7C3AED', '#6D28D9'],
        hoverGradient: ['#A78BFA', '#8B5CF6', '#7C3AED']
      };
    case normalizedTitle.includes('radiologie'):
      return { 
        icon: 'Scan', 
        color: '#6366F1',
        gradient: ['#6366F1', '#4F46E5', '#4338CA'],
        hoverGradient: ['#818CF8', '#6366F1', '#4F46E5']
      };
    default:
      return { 
        icon: 'Stethoscope', 
        color: MEDICAL_COLORS.primary,
        gradient: [MEDICAL_COLORS.primary, '#0284C7', '#0369A1'],
        hoverGradient: ['#38BDF8', MEDICAL_COLORS.primary, '#0284C7']
      };
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
  const [currentSection, setCurrentSection] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

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

  // Navigation functions
  const scrollToSection = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true
    });
    setCurrentSection(index);
  };

  const scrollToPrevious = () => {
    const previousSection = Math.max(0, currentSection - 1);
    scrollToSection(previousSection);
  };

  const scrollToNext = () => {
    const nextSection = Math.min(mainCategories.length - 1, currentSection + 1);
    scrollToSection(nextSection);
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const sectionIndex = Math.round(contentOffset.x / screenWidth);
    setCurrentSection(sectionIndex);
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
    <SafeAreaView style={styles.slidingContainer}>
      {/* White Background */}
      <View style={styles.whiteBackground} />
      
      {/* Header */}
      <View style={styles.slidingHeader}>
        <Text style={styles.slidingTitle}>Bibliothek</Text>
        <Text style={styles.slidingSubtitle}>Wählen Sie Ihr Fachgebiet</Text>
      </View>

      {/* Navigation Arrows */}
      {currentSection > 0 && (
        <TouchableOpacity
          style={[styles.navigationArrow, styles.leftArrow]}
          onPress={scrollToPrevious}
          activeOpacity={0.8}
        >
          <View style={styles.arrowButton}>
            <ArrowLeft size={24} color="#333" />
          </View>
        </TouchableOpacity>
      )}

      {currentSection < mainCategories.length - 1 && (
        <TouchableOpacity
          style={[styles.navigationArrow, styles.rightArrow]}
          onPress={scrollToNext}
          activeOpacity={0.8}
        >
          <View style={styles.arrowButton}>
            <ArrowRight size={24} color="#333" />
          </View>
        </TouchableOpacity>
      )}

      {/* Section Indicators */}
      <View style={styles.sectionIndicators}>
        {mainCategories.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.indicator,
              currentSection === index && styles.activeIndicator
            ]}
            onPress={() => scrollToSection(index)}
          />
        ))}
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {mainCategories.map((category, index) => {
          const { icon, gradient } = getMainCategoryDetails(category.title);
          const IconComponent = getIconComponent(icon);

          return (
            <View key={category.slug} style={styles.slideContainer}>
              <View style={styles.categorySlide}>
                <TouchableOpacity
                  style={styles.categoryCircle}
                  onPress={() => navigateToCategory(category.slug)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={gradient}
                    style={styles.circleGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.circleRing}>
                      <View style={styles.circleInner}>
                        <IconComponent size={40} color="white" />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                
                <Text style={styles.categoryTitle}>{category.title}</Text>
                {category.description && (
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Sliding Container Styles
  slidingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  whiteBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#ffffff',
  },
  slidingHeader: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  slidingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  slidingSubtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  slideContainer: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  categorySlide: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  categoryCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  circleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  circleInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  categoryDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  navigationArrow: {
    position: 'absolute',
    top: '50%',
    zIndex: 10,
    marginTop: -25,
  },
  leftArrow: {
    left: 20,
  },
  rightArrow: {
    right: 20,
  },
  arrowButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  sectionIndicators: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#667eea',
    width: 24,
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
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#667eea',
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
});