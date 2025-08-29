import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, BookOpen, Activity, Heart, Stethoscope, Settings as Lungs, FlaskRound, Scissors, Plane as Ambulance, Baby, Brain } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  last_updated?: string;
  children?: Section[];
}

// Function to get the appropriate icon component based on icon name
const getIconComponent = (iconName: string) => {
  const iconProps = { size: 24 };
  
  switch (iconName) {
    case 'Stethoscope':
      return Stethoscope;
    case 'Heart':
      return Heart;
    case 'Activity':
      return Activity;
    case 'Lungs':
      return Lungs;
    case 'FlaskRound':
      return FlaskRound;
    case 'Scissors':
      return Scissors;
    case 'Ambulance':
      return Ambulance;
    case 'Baby':
      return Baby;
    case 'Brain':
      return Brain;
    case 'BookOpen':
    default:
      return BookOpen;
  }
};

// Map categories to icons and colors
const getCategoryDetails = (title: string, iconName?: string, color?: string) => {
  // Use provided icon and color if available
  if (iconName && color) {
    return { icon: iconName, color };
  }
  
  // Default mappings
  switch (title.toLowerCase()) {
    case 'innere medizin':
      return { icon: 'Stethoscope', color: '#0077B6' };
    case 'kardiologie':
      return { icon: 'Heart', color: '#0077B6' };
    case 'gastroenterologie':
      return { icon: 'Activity', color: '#48CAE4' };
    case 'pneumologie':
      return { icon: 'Lungs', color: '#22C55E' };
    case 'nephrologie':
      return { icon: 'Activity', color: '#8B5CF6' };
    case 'endokrinologie':
    case 'endokrinologie und stoffwechsel':
      return { icon: 'FlaskRound', color: '#EF4444' };
    case 'chirurgie':
      return { icon: 'Scissors', color: '#48CAE4' };
    case 'notfallmedizin':
      return { icon: 'Ambulance', color: '#EF4444' };
    case 'pädiatrie':
      return { icon: 'Baby', color: '#8B5CF6' };
    case 'gynäkologie':
      return { icon: 'Activity', color: '#EC4899' };
    case 'psychiatrie':
      return { icon: 'Brain', color: '#F59E0B' };
    case 'anatomie':
      return { icon: 'Heart', color: '#0077B6' };
    case 'radiologie':
      return { icon: 'Activity', color: '#22C55E' };
    case 'sonographie':
      return { icon: 'Activity', color: '#48CAE4' };
    default:
      return { icon: 'BookOpen', color: '#0077B6' };
  }
};

export default function SectionDetailScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const storageKey = `bibliothek_detail_${slug}`;

  // Fetch data from Supabase
  const fetchSections = useCallback(async () => {
    if (!slug || typeof slug !== 'string') return;

    try {
      setLoading(true);
      
      // Fetch the current section to get its title and ensure it exists
      const { data: currentSectionData, error: currentSectionError } = await supabase
        .from('sections')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (currentSectionError) {
        throw currentSectionError;
      }
      
      setCurrentSection(currentSectionData);

      // Fetch children sections
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('parent_slug', slug)
        .order('display_order', { ascending: true });

      if (error) {
        throw error;
      }

      // Build tree structure for deeper levels
      const sectionsTree = buildSectionsTree(data || []);
      setSections(sectionsTree);
      
      // Load expanded state from AsyncStorage
      const storedState = await AsyncStorage.getItem(storageKey);
      if (storedState) {
        setExpandedSections(JSON.parse(storedState));
      }
    } catch (e) {
      console.error('Error fetching sections:', e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [slug, storageKey]);

  // Build a tree structure from flat sections data (recursive for deeper levels)
  const buildSectionsTree = (flatSections: Section[]): Section[] => {
    if (typeof slug !== 'string') return [];
    
    const sectionsMap: Record<string, Section> = {};

    flatSections.forEach(section => {
      sectionsMap[section.slug] = {
        ...section,
        children: []
      };
    });

    const rootSections: Section[] = [];

    flatSections.forEach(section => {
      const currentSection = sectionsMap[section.slug];

      if (section.parent_slug === slug) { // Only consider direct children of the current slug as root for this screen
        rootSections.push(currentSection);
      } else if (sectionsMap[section.parent_slug]) {
        sectionsMap[section.parent_slug].children?.push(currentSection);
      }
    });

    const sortChildrenRecursively = (sections: Section[]) => {
      sections.forEach(section => {
        if (section.children && section.children.length > 0) {
          section.children.sort((a, b) => a.display_order - b.display_order);
          sortChildrenRecursively(section.children);
        }
      });
    };

    sortChildrenRecursively(rootSections);
    return rootSections.sort((a, b) => a.display_order - b.display_order);
  };

  useEffect(() => {
    if (typeof slug === 'string') {
      fetchSections();
    }
  }, [fetchSections, slug]);

  // Toggle section expansion
  const toggleSection = (sectionSlug: string) => {
    setExpandedSections(prev => {
      const newState = {
        ...prev,
        [sectionSlug]: !prev[sectionSlug]
      };
      
      // Save to AsyncStorage
      AsyncStorage.setItem(storageKey, JSON.stringify(newState)).catch(e => {
        console.error('Failed to save expanded state to AsyncStorage', e);
      });
      
      return newState;
    });
  };

  // Navigate to a section
  const navigateToSection = (sectionSlug: string) => {
    router.push(`/bibliothek/${sectionSlug}`);
  };

  // Render a section item recursively for deeper levels
  const renderSectionItem = (section: Section, depth: number = 0) => {
    const isExpanded = !!expandedSections[section.slug];
    const isLeafNode = section.type === 'file-text' || section.type === 'markdown';
    const hasChildren = section.children && section.children.length > 0;
    
    const { icon, color } = getCategoryDetails(section.category || section.title, section.icon, section.color);
    const IconComponent = getIconComponent(icon);
    const paddingLeft = 16 + (depth * 16); // Indent based on depth
    
    return (
      <View key={section.slug} style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => {
            if (isLeafNode) {
              // Navigate to content view for actual content
              navigateToSection(section.slug);
            } else if (section.type === 'folder') {
              // Always navigate for folder types (categories/subcategories)
              navigateToSection(section.slug);
            } else if (hasChildren) {
              // Only expand/collapse if it's not a folder and has children
              toggleSection(section.slug);
            } else {
              // Default: navigate
              navigateToSection(section.slug);
            }
          }}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[`${color}20`, `${color}05`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.sectionGradient, { paddingLeft }]}
          >
            <View style={[styles.sectionColorDot, { backgroundColor: color }]} />
            <IconComponent size={24} color={color} />
            <Text style={styles.sectionName}>{section.title}</Text>
            
            {hasChildren && (
              <ChevronRight 
                size={20} 
                color="#9CA3AF" 
                style={[
                  styles.chevron,
                  isExpanded && styles.chevronDown
                ]} 
              />
            )}
          </LinearGradient>
        </TouchableOpacity>

        {isExpanded && hasChildren && (
          <View style={styles.childContainer}>
            {section.children?.map((childSection) => 
              renderSectionItem(childSection, depth + 1)
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077B6" />
        <Text style={styles.loadingText}>Lade Inhalte...</Text>
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

  if (!currentSection) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Inhalt nicht gefunden</Text>
        <Text style={styles.errorText}>Der gesuchte Inhalt konnte nicht gefunden werden.</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => router.push('/bibliothek')}
        >
          <Text style={styles.retryButtonText}>Zurück zur Bibliothek</Text>
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
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#0077B6" />
          <Text style={styles.backText}>Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{currentSection.title}</Text>
        {currentSection?.description && (
          <Text style={styles.subtitle}>{currentSection.description}</Text>
        )}
        {currentSection?.content_details && (
          <Text style={styles.contentDetails}>{currentSection.content_details}</Text>
        )}
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Keine Unterkategorien gefunden.</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {sections.map(section => renderSectionItem(section))}
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#0077B6',
    marginLeft: 4,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  contentDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 8,
  },
  content: {
    paddingHorizontal: 16,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    paddingRight: 16,
  },
  sectionColorDot: {
    width: 20,
    height: 20,
    borderRadius: 6,
    marginRight: 12,
  },
  sectionName: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
    marginLeft: 8,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronDown: {
    transform: [{ rotate: '90deg' }],
  },
  childContainer: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  bottomPadding: {
    height: 60,
  }
});