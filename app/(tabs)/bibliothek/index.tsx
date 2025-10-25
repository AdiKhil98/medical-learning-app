import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Home,
  ChevronRight,
  Search,
  Filter,
  Heart,
  Stethoscope,
  Activity,
  AlertTriangle,
  Droplet,
  Scan,
  SyringeIcon as Syringe,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { runGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';

interface Category {
  id: number;
  title: string;
  count: number;
  gradientColors: string[];
  iconName: string;
  slug: string;
}

// Animated Stats Grid Component
const AnimatedStatsGrid: React.FC<{ favorites: number }> = ({ favorites }) => {
  const statCards = [
    { number: '6', label: 'Fachgebiete', color: '#B8846A' },
    { number: '52', label: 'Kategorien', color: '#3B82F6' },
    { number: '1.2k', label: 'Fragen', color: '#10B981' },
    { number: favorites.toString(), label: 'Favoriten', color: '#F97316' },
  ];

  return (
    <View style={styles.statsGrid}>
      {statCards.map((stat, index) => {
        const scaleAnim = useRef(new Animated.Value(0)).current;
        const fadeAnim = useRef(new Animated.Value(0)).current;

        useEffect(() => {
          Animated.parallel([
            Animated.spring(scaleAnim, {
              toValue: 1,
              delay: index * 80,
              friction: 4,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 300,
              delay: index * 80,
              useNativeDriver: true,
            }),
          ]).start();
        }, []);

        return (
          <Animated.View
            key={index}
            style={[
              styles.statCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Text style={[styles.statNumber, { color: stat.color }]}>{stat.number}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
};

// Enhanced Category Card Component with Animations
const AnimatedCategoryCard: React.FC<{
  category: Category;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  index: number;
}> = ({ category, isFavorite, onPress, onToggleFavorite, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered fade-in animation on mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      useNativeDriver: true,
    }).start();

    // Subtle continuous pulse for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const getIconComponent = (iconName: string) => {
    const iconProps = { size: 32, color: '#FFFFFF', strokeWidth: 2 };
    switch (iconName) {
      case 'stethoscope':
        return <Stethoscope {...iconProps} />;
      case 'heart':
        return <Heart {...iconProps} />;
      case 'alert':
        return <AlertTriangle {...iconProps} />;
      case 'activity':
        return <Activity {...iconProps} />;
      case 'droplet':
        return <Droplet {...iconProps} />;
      case 'scan':
        return <Scan {...iconProps} />;
      default:
        return <Stethoscope {...iconProps} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.categoryCardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={category.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.categoryCard}
        >
          {/* Background Pattern */}
          <View style={styles.bgPattern}>
            <View style={[styles.bgCircle, styles.bgCircle1]} />
            <View style={[styles.bgCircle, styles.bgCircle2]} />
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            {/* Favorite Button */}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={onToggleFavorite}
              activeOpacity={0.7}
            >
              <Heart
                size={24}
                color="rgba(255,255,255,0.9)"
                fill={isFavorite ? 'rgba(255,255,255,0.9)' : 'none'}
              />
            </TouchableOpacity>

            {/* Icon Container with Pulse */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [{ scale: iconPulse }],
                },
              ]}
            >
              {getIconComponent(category.iconName)}
            </Animated.View>

            {/* Title */}
            <Text style={styles.cardTitle}>{category.title}</Text>

            {/* Count and Arrow */}
            <View style={styles.cardFooter}>
              <Text style={styles.cardCount}>{category.count} Kategorien</Text>
              <ChevronRight size={24} color="rgba(255,255,255,0.7)" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const BibliothekIndex: React.FC = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);

  // Ensure Voiceflow widget is cleaned up when entering Bibliothek
  useEffect(() => {
    console.log('📚 Bibliothek page loaded - running Voiceflow cleanup');
    runGlobalVoiceflowCleanup();

    const timeout = setTimeout(() => runGlobalVoiceflowCleanup(), 500);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  // Category data with gradients and icons
  const categories: Category[] = [
    {
      id: 1,
      title: 'Chirurgie',
      count: 5,
      gradientColors: ['#3B82F6', '#06B6D4', '#38BDF8'],
      iconName: 'stethoscope',
      slug: 'chirurgie',
    },
    {
      id: 2,
      title: 'Innere Medizin',
      count: 5,
      gradientColors: ['#818CF8', '#3B82F6', '#9333EA'],
      iconName: 'heart',
      slug: 'innere-medizin',
    },
    {
      id: 3,
      title: 'Notfallmedizin',
      count: 10,
      gradientColors: ['#34D399', '#10B981', '#14B8A6'],
      iconName: 'alert',
      slug: 'notfallmedizin',
    },
    {
      id: 4,
      title: 'Infektiologie',
      count: 8,
      gradientColors: ['#F87171', '#F97316', '#EC4899'],
      iconName: 'activity',
      slug: 'infektiologie',
    },
    {
      id: 5,
      title: 'Urologie',
      count: 7,
      gradientColors: ['#FBBF24', '#F97316', '#EAB308'],
      iconName: 'droplet',
      slug: 'urologie',
    },
    {
      id: 6,
      title: 'Radiologie',
      count: 15,
      gradientColors: ['#EA580C', '#DC2626', '#F43F5E'],
      iconName: 'scan',
      slug: 'radiologie',
    },
  ];

  // Toggle favorite
  const toggleFavorite = (categoryId: number) => {
    setFavorites((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Handle category press
  const handleCategoryPress = (slug: string) => {
    router.push(`/(tabs)/bibliothek/${slug}`);
  };

  // Handle simulation start
  const handleStartSimulation = () => {
    router.push('/(tabs)/simulation');
  };

  // Filter categories based on search
  const filteredCategories = categories.filter((cat) =>
    cat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#F8FAFC', '#FFFFFF', '#F1F5F9']}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            {/* Breadcrumb */}
            <View style={styles.breadcrumb}>
              <Home size={16} color="#94A3B8" />
              <ChevronRight size={16} color="#94A3B8" style={styles.breadcrumbSeparator} />
              <Text style={styles.breadcrumbActive}>Bibliothek</Text>
            </View>

            {/* Title */}
            <Text style={styles.pageTitle}>Bibliothek</Text>
            <Text style={styles.pageSubtitle}>
              Entdecken Sie medizinische Fachgebiete und vertiefen Sie Ihr Wissen
            </Text>
          </View>

          {/* Search & Filter Bar */}
          <View style={styles.searchFilterContainer}>
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Search size={20} color="#94A3B8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Fachgebiet suchen..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filter Button */}
            <TouchableOpacity style={styles.filterButton}>
              <Filter size={20} color="#475569" />
              <Text style={styles.filterText}>Filter</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Grid - Animated */}
          <AnimatedStatsGrid favorites={favorites.length} />

          {/* Section Header */}
          <Text style={styles.sectionHeader}>Alle Fachgebiete</Text>

          {/* Category Cards Grid */}
          <View style={styles.categoryGrid}>
            {filteredCategories.map((category, index) => (
              <AnimatedCategoryCard
                key={category.id}
                category={category}
                isFavorite={favorites.includes(category.id)}
                onPress={() => handleCategoryPress(category.slug)}
                onToggleFavorite={() => toggleFavorite(category.id)}
                index={index}
              />
            ))}
          </View>

          {/* Call to Action Banner */}
          <LinearGradient
            colors={['#FB923C', '#F97316', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBanner}
          >
            <Text style={styles.ctaTitle}>Bereit zum Lernen?</Text>
            <Text style={styles.ctaSubtitle}>
              Starten Sie jetzt mit einer Simulation und testen Sie Ihr Wissen
            </Text>

            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleStartSimulation}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>Simulation starten</Text>
              <ChevronRight size={20} color="#F97316" />
            </TouchableOpacity>
          </LinearGradient>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 96,
  },

  // Hero Section
  heroSection: {
    marginBottom: 32,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  breadcrumbSeparator: {
    marginHorizontal: 8,
  },
  breadcrumbActive: {
    fontSize: 14,
    color: '#FB923C',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#B8846A',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Search & Filter Bar
  searchFilterContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  searchContainer: {
    flex: 1,
    position: 'relative',
    height: 48,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  searchInput: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingLeft: 48,
    paddingRight: 16,
    fontSize: 16,
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    gap: 8,
  },
  filterText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Section Header
  sectionHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Category Cards Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 48,
  },
  categoryCardWrapper: {
    width: '48%',
    marginBottom: 24,
  },
  categoryCard: {
    borderRadius: 24,
    padding: 24,
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  bgPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  bgCircle: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 1000,
  },
  bgCircle1: {
    width: 128,
    height: 128,
    top: -64,
    right: -64,
  },
  bgCircle2: {
    width: 96,
    height: 96,
    bottom: -48,
    left: -48,
  },
  cardContent: {
    position: 'relative',
    zIndex: 10,
  },
  favoriteButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCount: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // CTA Banner
  ctaBanner: {
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  ctaSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F97316',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default BibliothekIndex;
