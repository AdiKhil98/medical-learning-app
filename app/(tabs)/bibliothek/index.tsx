import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Scissors, Stethoscope, AlertTriangle, Shield, Droplets, Scan } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

const SCREEN_WIDTH = Dimensions.get('window').width;

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

// 3D Circular Category Component
const CircularCategory = ({ category, onPress }: { category: MainCategory, onPress: () => void }) => {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];
  const elevationAnim = useState(new Animated.Value(0))[0];
  
  const { icon, gradient, hoverGradient } = getMainCategoryDetails(category.title);
  const IconComponent = getIconComponent(icon);
  
  const handlePressIn = () => {
    setIsPressed(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.timing(elevationAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };
  
  const handlePressOut = () => {
    setIsPressed(false);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.timing(elevationAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };
  
  const shadowOpacity = elevationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.35],
  });
  
  const shadowRadius = elevationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 20],
  });
  
  return (
    <Animated.View
      style={[
        styles.circularCategoryContainer,
        {
          transform: [{ scale: scaleAnim }],
          shadowOpacity,
          shadowRadius,
        },
      ]}
    >
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        activeOpacity={1}
        style={styles.circularCategoryButton}
      >
        <LinearGradient
          colors={isPressed ? hoverGradient : gradient}
          style={styles.circularCategoryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* 3D Ring Effect */}
          <View style={styles.outerRing}>
            <View style={styles.innerRing}>
              <View style={styles.centerCircle}>
                <IconComponent size={32} color="white" />
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
      
      <Text style={styles.categoryLabel}>{category.title}</Text>
      {category.description && (
        <Text style={styles.categoryDescription}>{category.description}</Text>
      )}
    </Animated.View>
  );
};

// Diamond Grid Background Component
const DiamondGridBackground = () => {
  const animationValue = useState(new Animated.Value(0))[0];

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animationValue, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: false,
        }),
        Animated.timing(animationValue, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animationValue]);

  const opacity = animationValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.02, 0.06, 0.02],
  });

  // Create diamond grid pattern
  const diamonds = [];
  const diamondSize = 80;
  const spacing = diamondSize * 0.7;
  
  // Calculate how many diamonds we need to cover the screen
  const screenHeight = 1000; // Approximate screen height
  const screenWidth = 500; // Approximate screen width
  
  const rows = Math.ceil(screenHeight / spacing) + 2;
  const cols = Math.ceil(screenWidth / spacing) + 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * spacing + (row % 2) * (spacing / 2) - spacing;
      const y = row * spacing - spacing;
      
      diamonds.push(
        <Animated.View
          key={`diamond-${row}-${col}`}
          style={[
            styles.diamond,
            {
              left: x,
              top: y,
              opacity,
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(255, 182, 193, 0.3)', 'rgba(255, 240, 245, 0.4)', 'rgba(255, 182, 193, 0.2)']}
            style={styles.diamondGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      );
    }
  }

  return (
    <View style={styles.diamondGridBackground}>
      {diamonds}
    </View>
  );
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
    <SafeAreaView style={styles.modernContainer}>
      {/* Enhanced Background with Subtle Pattern */}
      <LinearGradient
        colors={['#f8fafc', '#f1f5f9', '#e2e8f0', '#ffffff']}
        style={styles.modernGradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Animated Diamond Grid Background */}
      <DiamondGridBackground />
      
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.modernTitle}>Bibliothek</Text>
          <Text style={styles.modernSubtitle}>Wählen Sie Ihr Fachgebiet</Text>
        </View>
        
        {/* Decorative Element */}
        <View style={styles.headerDecorator}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.decoratorGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>
      </View>

      <ScrollView style={styles.modernContent} showsVerticalScrollIndicator={false}>
        {/* 3D Circular Categories Grid */}
        <View style={styles.categoriesGrid}>
          {mainCategories.map((category) => (
            <CircularCategory
              key={category.slug}
              category={category}
              onPress={() => navigateToCategory(category.slug)}
            />
          ))}
        </View>
        
        {/* Enhanced Medical Disclaimer */}
        <View style={styles.modernDisclaimerContainer}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.08)', 'rgba(118, 75, 162, 0.05)']}
            style={styles.modernDisclaimerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.modernDisclaimerContent}>
              <View style={styles.modernDisclaimerIcon}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.disclaimerIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.disclaimerEmoji}>⚕️</Text>
                </LinearGradient>
              </View>
              <View style={styles.modernDisclaimerTextContainer}>
                <Text style={styles.modernDisclaimerTitle}>Medizinischer Haftungsausschluss</Text>
                <Text style={styles.modernDisclaimerText}>
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
  // Modern Container Styles
  modernContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modernGradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
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

  // Modern Header
  modernHeader: {
    padding: 24,
    paddingBottom: 32,
    position: 'relative',
  },
  headerContent: {
    zIndex: 2,
  },
  modernTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: '#1e293b',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  modernSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  headerDecorator: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.1,
  },
  decoratorGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },

  // Modern Content
  modernContent: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // 3D Circular Categories Grid
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 32,
  },

  // 3D Circular Category Styles
  circularCategoryContainer: {
    width: (SCREEN_WIDTH - 60) / 2,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  circularCategoryButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  circularCategoryGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  // 3D Ring Effects
  outerRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  innerRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  centerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },

  // Category Labels
  categoryLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 20,
  },
  categoryDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },

  // Modern Disclaimer
  modernDisclaimerContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  modernDisclaimerGradient: {
    borderRadius: 20,
    padding: 2,
  },
  modernDisclaimerContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 18,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  modernDisclaimerIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  disclaimerIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimerEmoji: {
    fontSize: 20,
  },
  modernDisclaimerTextContainer: {
    flex: 1,
  },
  modernDisclaimerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 22,
  },
  modernDisclaimerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    lineHeight: 20,
  },

  bottomPadding: {
    height: 40,
  },

  // Diamond Grid Background Styles
  diamondGridBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  diamond: {
    position: 'absolute',
    width: 80,
    height: 80,
    transform: [{ rotate: '45deg' }],
  },
  diamondGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});