import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Search, BookOpen, Activity, Heart, Stethoscope, Scissors, AlertTriangle, Baby, Brain, FlaskRound, Settings as Lungs, Pill, Plane as Ambulance, Scan, Circle, Syringe, Zap, Soup, Shield, Users, Eye, Bone, Smile, Thermometer, Zap as Lightning, CircuitBoard, Microscope, TestTube, FileText, Italic as Hospital, Cross, Droplets } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Input from '@/components/ui/Input';
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
    
    // Pediatrics
    case normalizedTitle.includes('pädiatrie') || normalizedTitle.includes('kinder'):
      return { icon: 'Baby', color: '#8B5CF6' };
    
    // Obstetrics & Gynecology
    case normalizedTitle.includes('gynäkolog') || normalizedTitle.includes('geburtshilf'):
      return { icon: 'Users', color: '#EC4899' };
    
    // Psychiatry & Neurology
    case normalizedTitle.includes('psychiatrie') || normalizedTitle.includes('psycholog'):
      return { icon: 'Brain', color: '#F59E0B' };
    case normalizedTitle.includes('neurolog'):
      return { icon: 'Zap', color: '#6366F1' };
    
    // Radiology & Imaging
    case normalizedTitle.includes('radiolog') || normalizedTitle.includes('bildgeb'):
      return { icon: 'Scan', color: '#22C55E' };
    case normalizedTitle.includes('sonograph') || normalizedTitle.includes('ultraschall'):
      return { icon: 'Soup', color: '#48CAE4' };
    case normalizedTitle.includes('ct') || normalizedTitle.includes('computertomograph'):
      return { icon: 'CircuitBoard', color: '#10B981' };
    case normalizedTitle.includes('mrt') || normalizedTitle.includes('kernspintomograph'):
      return { icon: 'Zap', color: '#6366F1' };
    
    // Infectious Diseases
    case normalizedTitle.includes('infektio') || normalizedTitle.includes('mikrobiolog'):
      return { icon: 'Microscope', color: '#DC2626' };
    
    // Urology
    case normalizedTitle.includes('urolog'):
      return { icon: 'Droplets', color: '#0369A1' };
    
    // Dermatology
    case normalizedTitle.includes('dermatolog') || normalizedTitle.includes('haut'):
      return { icon: 'Eye', color: '#F97316' };
    
    // Ophthalmology
    case normalizedTitle.includes('ophthalmolog') || normalizedTitle.includes('auge'):
      return { icon: 'Eye', color: '#0891B2' };
    
    // ENT
    case normalizedTitle.includes('hno') || normalizedTitle.includes('otolaryngolog'):
      return { icon: 'Thermometer', color: '#7C3AED' };
    
    // Anesthesiology
    case normalizedTitle.includes('anästhesi') || normalizedTitle.includes('narkose'):
      return { icon: 'Syringe', color: '#4C1D95' };
    
    // Pathology
    case normalizedTitle.includes('patholog'):
      return { icon: 'Microscope', color: '#7F1D1D' };
    
    // Laboratory Medicine
    case normalizedTitle.includes('labor') || normalizedTitle.includes('klinische chemie'):
      return { icon: 'TestTube', color: '#059669' };
    
    // Pharmacology
    case normalizedTitle.includes('pharmakolog') || normalizedTitle.includes('medikament'):
      return { icon: 'Pill', color: '#9333EA' };
    
    // Anatomy
    case normalizedTitle.includes('anatomie'):
      return { icon: 'Heart', color: '#0077B6' };
    
    // Perioperative Management
    case normalizedTitle.includes('perioperativ'):
      return { icon: 'Hospital', color: '#0369A1' };
    
    // Soft tissue and lymph nodes
    case normalizedTitle.includes('weichteile') || normalizedTitle.includes('lymph'):
      return { icon: 'Circle', color: '#10B981' };
    
    // Default fallback
    default:
      return { icon: 'BookOpen', color: '#6B7280' };
  }
};

// Enhanced icon component mapping with many more medical icons
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
  const { session, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Fetch data from Supabase
  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      if (!session) {
        setError('Sie müssen angemeldet sein, um die Bibliothek zu nutzen.');
        return;
      }
      
      // Fetch all sections to build the hierarchy
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        throw error;
      }

      // Build tree structure
      const sectionsTree = buildSectionsTree(data || []);
      setSections(sectionsTree);
      
      // Load expanded state from AsyncStorage
      const storedState = await AsyncStorage.getItem('bibliothek_expanded');
      if (storedState) {
        setExpandedSections(JSON.parse(storedState));
      }
    } catch (e) {
      console.error('Error fetching sections:', e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Build a tree structure from flat sections data
  const buildSectionsTree = (flatSections: Section[]): Section[] => {
    const sectionsMap: Record<string, Section> = {};
    
    // First pass: map all sections by slug
    flatSections.forEach(section => {
      sectionsMap[section.slug] = {
        ...section,
        children: []
      };
    });
    
    // Second pass: build the tree
    const rootSections: Section[] = [];
    
    flatSections.forEach(section => {
      const currentSection = sectionsMap[section.slug];
      
      if (section.parent_slug === null) {
        // This is a root section
        rootSections.push(currentSection);
      } else if (sectionsMap[section.parent_slug]) {
        // This is a child section, add to parent's children
        sectionsMap[section.parent_slug].children?.push(currentSection);
      } else {
        // Parent not found, add to root
        rootSections.push(currentSection);
      }
    });

    // Sort children by display_order
    const sortChildren = (sections: Section[]) => {
      sections.forEach(section => {
        if (section.children && section.children.length > 0) {
          section.children.sort((a, b) => a.display_order - b.display_order);
          sortChildren(section.children);
        }
      });
    };
    
    sortChildren(rootSections);
    return rootSections.sort((a, b) => a.display_order - b.display_order);
  };

  useEffect(() => {
    if (!authLoading) {
      fetchSections();
    }
    
    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('sections-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sections' }, () => {
        if (session) {
          fetchSections();
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchSections, authLoading, session]);

  // Toggle section expansion
  const toggleSection = (slug: string) => {
    setExpandedSections(prev => {
      const newState = {
        ...prev,
        [slug]: !prev[slug]
      };
      
      // Save to AsyncStorage
      AsyncStorage.setItem('bibliothek_expanded', JSON.stringify(newState)).catch(e => {
        console.error('Failed to save expanded state to AsyncStorage', e);
      });
      
      return newState;
    });
  };

  // Navigate to a section
  const navigateToSection = (section: Section) => {
    if (section.type === 'file-text' || section.type === 'markdown') {
      // Navigate to content page for leaf nodes
      router.push(`/bibliothek/content/${section.slug}`);
    } else {
      // Navigate to section page for folders
      router.push(`/bibliothek/${section.slug}`);
    }
  };

  // Filter sections based on search query
  const filterSections = (sections: Section[], query: string): Section[] => {
    if (!query.trim()) return sections;
    
    return sections.filter(section => {
      const matchesQuery = 
        section.title.toLowerCase().includes(query.toLowerCase()) || 
        (section.description && section.description.toLowerCase().includes(query.toLowerCase())) ||
        (section.category && section.category.toLowerCase().includes(query.toLowerCase())) ||
        (section.content_details && section.content_details.toLowerCase().includes(query.toLowerCase()));
      
      if (matchesQuery) return true;
      
      if (section.children && section.children.length > 0) {
        const filteredChildren = filterSections(section.children, query);
        if (filteredChildren.length > 0) {
          section.children = filteredChildren;
          return true;
        }
      }
      
      return false;
    });
  };

  // Filtered sections based on search query
  const filteredSections = searchQuery ? filterSections([...sections], searchQuery) : sections;

  // Show loading while auth is initializing or while fetching data
  if (authLoading || loading) {
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
              {searchQuery 
                ? `Keine Inhalte gefunden für "${searchQuery}"`
                : 'Die Bibliothek ist zurzeit leer. Medizinische Inhalte werden bald hinzugefügt.'}
            </Text>
          </View>
        ) : (
          filteredSections.map((section) => {
            const isExpanded = !!expandedSections[section.slug];
            const hasChildren = section.children && section.children.length > 0;
            const isFolder = section.type === 'folder';
            const isLeafNode = section.type === 'file-text' || section.type === 'markdown';
            
            // Use enhanced category detection
            const { icon, color } = getCategoryDetails(section.title, section.icon, section.color);
            
            return (
              <Card key={section.slug} style={styles.categoryContainer}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => {
                    if (isLeafNode) {
                      navigateToSection(section);
                    } else if (isFolder && hasChildren) {
                      toggleSection(section.slug);
                    } else {
                      navigateToSection(section);
                    }
                  }}
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
                  <View style={styles.subsectionContainer}>
                    {section.children?.map((subsection) => {
                      const subIcon = getCategoryDetails(subsection.title, subsection.icon, subsection.color);
                      return (
                        <TouchableOpacity
                          key={subsection.slug}
                          style={styles.subsectionItem}
                          onPress={() => navigateToSection(subsection)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.subsectionDot, { backgroundColor: subIcon.color }]} />
                          <Text style={styles.subsectionName}>{subsection.title}</Text>
                          <View style={styles.subsectionIconContainer}>
                            {getIconComponent(subIcon.icon, subIcon.color, 20)}
                          </View>
                          <ChevronRight size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
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
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronDown: {
    transform: [{ rotate: '90deg' }],
  },
  subsectionContainer: {
    paddingVertical: 8,
    paddingRight: 16,
    backgroundColor: '#F9FAFB',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  subsectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  subsectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  subsectionName: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  subsectionIconContainer: {
    marginRight: 8,
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