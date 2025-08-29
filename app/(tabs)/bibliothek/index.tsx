import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Search, BookOpen, Activity, Heart, Stethoscope, Scissors, AlertTriangle, Baby, Brain, FlaskRound, Settings as Lungs, Pill, Plane as Ambulance, Scan, Circle, Syringe, Zap, Soup, Shield, Users, Eye, Bone, Smile, Thermometer, Zap as Lightning, CircuitBoard, Microscope, TestTube, FileText, Italic as Hospital, Cross, Droplets } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Input from '@/components/ui/Input';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '@/components/ui/Card';

// Type for section data from Supabase
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
  image_url?: string;
  category?: string;
  content_details?: string;
  content_improved?: any[];
  content_html?: string;
  last_updated?: string;
  children?: Section[];
}

// Enhanced function to map categories/titles to icons and colors
const getCategoryDetails = (title: string, iconName?: string, color?: string) => {
  // Use provided icon and color if available
  if (iconName && color) {
    return { icon: iconName, color };
  }
  
  // Normalize title for better matching
  const normalizedTitle = title.toLowerCase().trim();
  
  // Comprehensive medical specialty mappings
  switch (true) {
    // Cardiology
    case normalizedTitle.includes('kardio') || normalizedTitle.includes('herz'):
      return { icon: 'Heart', color: '#EF4444' };
    
    // Internal Medicine and subspecialties
    case normalizedTitle.includes('innere medizin'):
      return { icon: 'Stethoscope', color: '#0077B6' };
    case normalizedTitle.includes('gastro') || normalizedTitle.includes('verdau'):
      return { icon: 'Circle', color: '#48CAE4' };
    case normalizedTitle.includes('pneumo') || normalizedTitle.includes('lunge') || normalizedTitle.includes('atemweg'):
      return { icon: 'Lungs', color: '#22C55E' };
    case normalizedTitle.includes('nephro') || normalizedTitle.includes('niere'):
      return { icon: 'Droplets', color: '#8B5CF6' };
    case normalizedTitle.includes('endokrin') || normalizedTitle.includes('stoffwechsel') || normalizedTitle.includes('hormon'):
      return { icon: 'FlaskRound', color: '#EF4444' };
    case normalizedTitle.includes('hämatolog') || normalizedTitle.includes('onkolog'):
      return { icon: 'TestTube', color: '#DC2626' };
    case normalizedTitle.includes('rheumatolog') || normalizedTitle.includes('immunolog'):
      return { icon: 'Shield', color: '#7C3AED' };
    
    // Surgery specialties
    case normalizedTitle.includes('chirurgie') || normalizedTitle.includes('operativ'):
      return { icon: 'Scissors', color: '#48CAE4' };
    case normalizedTitle.includes('allgemein') && normalizedTitle.includes('chirurgie'):
      return { icon: 'Scissors', color: '#0EA5E9' };
    case normalizedTitle.includes('viszeralchirurgie') || normalizedTitle.includes('viszeral'):
      return { icon: 'Scissors', color: '#0284C7' };
    case normalizedTitle.includes('unfall') || normalizedTitle.includes('orthopäd') || normalizedTitle.includes('trauma'):
      return { icon: 'Bone', color: '#059669' };
    case normalizedTitle.includes('neurochirurg'):
      return { icon: 'Brain', color: '#7C2D12' };
    case normalizedTitle.includes('thoraxchirurg'):
      return { icon: 'Lungs', color: '#0F766E' };
    case normalizedTitle.includes('herzchirurg'):
      return { icon: 'Heart', color: '#BE123C' };
    case normalizedTitle.includes('gefäß') || normalizedTitle.includes('vascular'):
      return { icon: 'Activity', color: '#C2410C' };
    case normalizedTitle.includes('mkg') || normalizedTitle.includes('mund') || normalizedTitle.includes('kiefer'):
      return { icon: 'Smile', color: '#9333EA' };
    case normalizedTitle.includes('plastisch') || normalizedTitle.includes('ästhetisch'):
      return { icon: 'Syringe', color: '#BE185D' };
    
    // Emergency Medicine
    case normalizedTitle.includes('notfall') || normalizedTitle.includes('emergency'):
      return { icon: 'AlertTriangle', color: '#EF4444' };
    case normalizedTitle.includes('intensiv') || normalizedTitle.includes('icu'):
      return { icon: 'Cross', color: '#DC2626' };
    case normalizedTitle.includes('rettung') || normalizedTitle.includes('ambulan'):
      return { icon: 'Ambulance', color: '#F59E0B' };
    
    // Other specialties
    case normalizedTitle.includes('pädiatrie') || normalizedTitle.includes('kinder'):
      return { icon: 'Baby', color: '#8B5CF6' };
    case normalizedTitle.includes('gynäkolog') || normalizedTitle.includes('geburtshilf'):
      return { icon: 'Users', color: '#EC4899' };
    case normalizedTitle.includes('psychiatrie') || normalizedTitle.includes('psycholog'):
      return { icon: 'Brain', color: '#F59E0B' };
    case normalizedTitle.includes('neurolog'):
      return { icon: 'Zap', color: '#6366F1' };
    case normalizedTitle.includes('radiolog') || normalizedTitle.includes('bildgeb'):
      return { icon: 'Scan', color: '#22C55E' };
    case normalizedTitle.includes('sonograph') || normalizedTitle.includes('ultraschall'):
      return { icon: 'Soup', color: '#48CAE4' };
    case normalizedTitle.includes('anatomie'):
      return { icon: 'Heart', color: '#0077B6' };
    
    // Default fallback
    default:
      return { icon: 'BookOpen', color: '#6B7280' };
  }
};

// Enhanced icon component mapping
const getIconComponent = (iconName: string, color: string, size: number = 24) => {
  switch (iconName) {
    case 'Heart':
      return <Heart size={size} color={color} />;
    case 'Lungs':
      return <Lungs size={size} color={color} />;
    case 'Brain':
      return <Brain size={size} color={color} />;
    case 'Activity':
      return <Activity size={size} color={color} />;
    case 'Pill':
      return <Pill size={size} color={color} />;
    case 'Stethoscope':
      return <Stethoscope size={size} color={color} />;
    case 'Scissors':
      return <Scissors size={size} color={color} />;
    case 'Ambulance':
      return <Ambulance size={size} color={color} />;
    case 'Baby':
      return <Baby size={size} color={color} />;
    case 'FlaskRound':
      return <FlaskRound size={size} color={color} />;
    case 'Scan':
      return <Scan size={size} color={color} />;
    case 'Circle':
      return <Circle size={size} color={color} />;
    case 'Syringe':
      return <Syringe size={size} color={color} />;
    case 'Zap':
      return <Zap size={size} color={color} />;
    case 'Soup':
      return <Soup size={size} color={color} />;
    case 'AlertTriangle':
      return <AlertTriangle size={size} color={color} />;
    case 'Users':
      return <Users size={size} color={color} />;
    case 'Eye':
      return <Eye size={size} color={color} />;
    case 'Bone':
      return <Bone size={size} color={color} />;
    case 'Smile':
      return <Smile size={size} color={color} />;
    case 'Thermometer':
      return <Thermometer size={size} color={color} />;
    case 'CircuitBoard':
      return <CircuitBoard size={size} color={color} />;
    case 'Microscope':
      return <Microscope size={size} color={color} />;
    case 'TestTube':
      return <TestTube size={size} color={color} />;
    case 'Shield':
      return <Shield size={size} color={color} />;
    case 'Hospital':
      return <Hospital size={size} color={color} />;
    case 'Cross':
      return <Cross size={size} color={color} />;
    case 'Droplets':
      return <Droplets size={size} color={color} />;
    default:
      return <BookOpen size={size} color={color} />;
  }
};

export default function BibliothekScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from Supabase - ONLY ROOT SECTIONS for main page
  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch ONLY root sections (main categories) for the main page
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .is('parent_slug', null)
        .order('display_order', { ascending: true });

      if (error) {
        throw error;
      }

      setSections(data || []);
    } catch (e) {
      console.error('Error fetching sections:', e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchSections();
    
    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('sections-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sections' }, () => {
        fetchSections();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchSections]);

  // Navigate to a section - ALWAYS navigate to section page for main categories
  const navigateToSection = (section: Section) => {
    // For main page, always navigate to section page to show subcategories
    router.push(`/bibliothek/${section.slug}`);
  };

  // Filter sections based on search query - simple filter for root sections only
  const filteredSections = searchQuery 
    ? sections.filter(section => 
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (section.description && section.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : sections;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077B6" />
        <Text style={styles.loadingText}>Lade Bibliothek...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Fehler</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchSections}>
          <Text style={styles.retryButtonText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#e0f2fe', '#f0f9ff', '#ffffff']}
        style={styles.gradientBackground}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Bibliothek</Text>
        <Input
          placeholder="Fachgebiet suchen..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Search size={20} color="#9CA3AF" />}
          containerStyle={styles.searchContainer}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredSections.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={60} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>
              Keine Inhalte gefunden für "{searchQuery}"
            </Text>
          </View>
        ) : (
          filteredSections.map((section) => {
            // Use enhanced category detection
            const { icon, color } = getCategoryDetails(section.title, section.icon, section.color);
            
            return (
              <Card key={section.slug} style={styles.categoryContainer}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => navigateToSection(section)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[`${color}20`, `${color}10`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.categoryGradient}
                  >
                    <View style={[styles.categoryColor, { backgroundColor: color }]} />
                    {getIconComponent(icon, color)}
                    <Text style={styles.categoryName}>{section.title}</Text>
                    <ChevronRight size={20} color="#9CA3AF" />
                  </LinearGradient>
                </TouchableOpacity>
              </Card>
            );
          })
        )}
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
    backgroundColor: '#0077B6',
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
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1F2937',
    marginBottom: 16,
  },
  searchContainer: {
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: 16,
  },
  categoryContainer: {
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 16,
  },
  categoryColor: {
    width: 20,
    height: 20,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
});