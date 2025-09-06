import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { ChevronLeft, ChevronRight, Stethoscope, Heart, Activity, Scissors, AlertTriangle, Shield, Droplets, Scan, BookOpen, FileText, Folder } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import MedicalContentRenderer from '@/components/ui/MedicalContentRenderer';
import Card from '@/components/ui/folder';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Responsive grid calculation
const getColumnsForScreen = () => {
  if (SCREEN_WIDTH >= 1024) return 3; // xl: 3 columns
  if (SCREEN_WIDTH >= 768) return 2;  // md: 2 columns
  return 1; // sm: 1 column
};

const COLUMNS = getColumnsForScreen();
const CARD_PADDING = 24;
const CARD_GAP = 16;
const CARD_WIDTH = (SCREEN_WIDTH - (CARD_PADDING * 2) - (CARD_GAP * (COLUMNS - 1))) / COLUMNS;

interface Section {
  id: string;
  slug: string;
  title: string;
  parent_slug: string | null;
  description: string | null;
  type: string;
  display_order: number;
  content_improved?: string;
  content_html?: string;
}

// Medical teal/indigo/sky color palette for folder cards
const getItemDetails = (title: string, type: string, parentSlug?: string) => {
  const normalizedTitle = title.toLowerCase();
  
  // Updated medical color palette - teal/indigo/sky instead of red
  let baseColor = '#0891b2'; // Teal-600
  let gradient = ['#0891b2', '#0e7490', '#155e75']; // Teal gradient
  let hoverGradient = ['#22d3ee', '#0891b2', '#0e7490']; // Lighter teal hover
  
  if (parentSlug) {
    switch (parentSlug) {
      case 'chirurgie': 
        baseColor = '#4f46e5'; // Indigo-600 instead of red
        gradient = ['#4f46e5', '#4338ca', '#3730a3'];
        hoverGradient = ['#6366f1', '#4f46e5', '#4338ca'];
        break;
      case 'innere-medizin': case 'kardiologie': case 'pneumologie': case 'gastroenterologie': case 'nephrologie': case 'endokrinologie-und-stoffwechsel':
        baseColor = '#0891b2'; // Teal-600
        gradient = ['#0891b2', '#0e7490', '#155e75'];
        hoverGradient = ['#22d3ee', '#0891b2', '#0e7490'];
        break;
      case 'notfallmedizin': 
        baseColor = '#0ea5e9'; // Sky-500
        gradient = ['#0ea5e9', '#0284c7', '#0369a1'];
        hoverGradient = ['#38bdf8', '#0ea5e9', '#0284c7'];
        break;
      case 'infektiologie': 
        baseColor = '#059669'; // Emerald-600
        gradient = ['#059669', '#047857', '#065f46'];
        hoverGradient = ['#10b981', '#059669', '#047857'];
        break;
      case 'urologie': 
        baseColor = '#7c3aed'; // Violet-600
        gradient = ['#7c3aed', '#6d28d9', '#5b21b6'];
        hoverGradient = ['#8b5cf6', '#7c3aed', '#6d28d9'];
        break;
      case 'radiologie': 
        baseColor = '#4f46e5'; // Indigo-600
        gradient = ['#4f46e5', '#4338ca', '#3730a3'];
        hoverGradient = ['#6366f1', '#4f46e5', '#4338ca'];
        break;
    }
  }
  
  // Icon based on content and type
  let icon = 'Folder';
  if (normalizedTitle.includes('kardio') || normalizedTitle.includes('herz') || normalizedTitle.includes('koronar')) {
    icon = 'Heart';
  } else if (normalizedTitle.includes('chirurg') || normalizedTitle.includes('operation') || normalizedTitle.includes('trauma')) {
    icon = 'Scissors';
  } else if (normalizedTitle.includes('notfall') || normalizedTitle.includes('reanimat') || normalizedTitle.includes('akut')) {
    icon = 'AlertTriangle';
  } else if (normalizedTitle.includes('diagnostik') || normalizedTitle.includes('röntgen') || normalizedTitle.includes('tomograf')) {
    icon = 'Scan';
  } else if (normalizedTitle.includes('pneumo') || normalizedTitle.includes('lunge') || normalizedTitle.includes('atemweg')) {
    icon = 'Activity';
  } else if (normalizedTitle.includes('urolog') || normalizedTitle.includes('niere') || normalizedTitle.includes('harn')) {
    icon = 'Droplets';
  } else if (normalizedTitle.includes('infekt') || normalizedTitle.includes('hygiene') || normalizedTitle.includes('bakteri') || normalizedTitle.includes('viral')) {
    icon = 'Shield';
  } else if (type.toLowerCase().includes('content') || normalizedTitle.includes('content')) {
    icon = 'FileText';
  } else {
    icon = 'Folder';
  }
  
  return { icon, color: baseColor, gradient, hoverGradient };
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
    case 'FileText': return FileText;
    case 'BookOpen': return BookOpen;
    case 'Folder':
    default: return Folder;
  }
};


// Simplified Folder Card Component using the reusable Card
const FolderCard = ({ childItem, parentSlug, onPress }: { childItem: Section, parentSlug: string, onPress: () => void }) => {
  const { icon, gradient, hoverGradient } = getItemDetails(childItem.title, childItem.type, parentSlug);
  const IconComponent = getIconComponent(icon);
  const hasContent = childItem.content_improved && 
                    (typeof childItem.content_improved === 'object' || typeof childItem.content_improved === 'string');

  return (
    <View style={{ width: CARD_WIDTH }}>
      <Card
        title={childItem.title}
        icon={IconComponent}
        gradient={gradient}
        hoverGradient={hoverGradient}
        hasContent={hasContent}
        onPress={onPress}
        size="medium"
        showBadge={true}
      />
    </View>
  );
};

export default function SectionDetailScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { session, loading: authLoading } = useAuth();
  
  const [currentItem, setCurrentItem] = useState<Section | null>(null);
  const [childItems, setChildItems] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);

  // Fetch the current item and its children
  const fetchItemData = async () => {
    if (!slug || typeof slug !== 'string') return;

    try {
      setLoading(true);
      
      if (!session) {
        setError('Sie müssen angemeldet sein, um die Bibliothek zu nutzen.');
        return;
      }

      console.log('Fetching item data for:', slug);

      // Fetch current item details
      const { data: itemData, error: itemError } = await supabase
        .from('sections')
        .select('id, slug, title, parent_slug, description, type, display_order, content_improved, content_html')
        .eq('slug', slug)
        .maybeSingle();

      if (itemError) {
        throw itemError;
      }

      if (!itemData) {
        setError('Inhalt nicht gefunden.');
        return;
      }

      setCurrentItem(itemData);
      console.log('Current item:', itemData.title, 'Type:', itemData.type);
      
      // Update navigation title with the actual title
      navigation.setOptions({
        headerTitle: itemData.title || slug,
      });

      // Fetch child items (items where parent_slug = current slug)
      const { data: childItemsData, error: childItemsError } = await supabase
        .from('sections')
        .select('id, slug, title, parent_slug, description, type, display_order, content_improved, content_html')
        .eq('parent_slug', slug)
        .order('display_order', { ascending: true });

      if (childItemsError) {
        throw childItemsError;
      }

      const children = childItemsData || [];
      setChildItems(children);
      console.log(`Found ${children.length} child items`);

      // Determine if we should show content or navigation
      const hasChildren = children.length > 0;
      // content_improved is JSONB - check if it exists and has content
      const hasContent = itemData.content_improved && 
                        (typeof itemData.content_improved === 'object' || typeof itemData.content_improved === 'string');
      
      console.log('Has children:', hasChildren, 'Has content:', hasContent);
      console.log('Content type:', typeof itemData.content_improved);
      
      // Show content if no children OR if this is a final content item
      setShowContent(!hasChildren && hasContent);

    } catch (e) {
      console.error('Error fetching item data:', e);
      setError(e instanceof Error ? e.message : 'Fehler beim Laden des Inhalts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchItemData();
    }
  }, [slug, session, authLoading]);

  const navigateToChild = (childSlug: string) => {
    console.log('Navigating to child:', childSlug);
    router.push(`/bibliothek/${childSlug}`);
  };

  const handleBackPress = () => {
    if (currentItem?.parent_slug) {
      // Go back to parent
      router.push(`/bibliothek/${currentItem.parent_slug}`);
    } else {
      // Go back to main bibliothek
      router.push('/bibliothek');
    }
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={MEDICAL_COLORS.primary} />
        <Text style={styles.loadingText}>Lade Inhalt...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Fehler</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchItemData}>
          <Text style={styles.retryButtonText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!currentItem) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Inhalt nicht gefunden</Text>
        <Text style={styles.errorText}>Der gesuchte Inhalt konnte nicht gefunden werden.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleBackPress}>
          <Text style={styles.retryButtonText}>Zurück</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.modernContainer}>
      {/* Modern Background */}
      <LinearGradient
        colors={['#f8fafc', '#f1f5f9', '#e2e8f0', '#ffffff']}
        style={styles.modernGradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <TouchableOpacity 
          onPress={handleBackPress}
          style={styles.modernBackButton}
        >
          <LinearGradient
            colors={['#0891b2', '#0e7490']}
            style={styles.backButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ChevronLeft size={20} color="white" />
          </LinearGradient>
          <Text style={styles.modernBackText}>Zurück</Text>
        </TouchableOpacity>
        
      </View>

      {showContent ? (
        // Modern Content Display
        <ScrollView style={styles.modernContent} showsVerticalScrollIndicator={false}>
          <View style={styles.modernContentCard}>
            <LinearGradient
              colors={['rgba(102, 126, 234, 0.08)', 'rgba(118, 75, 162, 0.05)']}
              style={styles.contentCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.modernContentHeader}>
                <LinearGradient
                  colors={['#0891b2', '#0e7490']}
                  style={styles.contentHeaderIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <FileText size={20} color="white" />
                </LinearGradient>
              </View>
              <View style={styles.contentBody}>
                <MedicalContentRenderer 
                  htmlContent={currentItem.content_html}
                  jsonContent={currentItem.content_improved}
                  plainTextContent={typeof currentItem.content_improved === 'string' ? currentItem.content_improved : JSON.stringify(currentItem.content_improved, null, 2)}
                  title={currentItem.title}
                />
              </View>
            </LinearGradient>
          </View>
          <View style={styles.bottomPadding} />
        </ScrollView>
      ) : childItems.length === 0 ? (
        // Modern Empty State
        <View style={styles.modernEmptyState}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.05)']}
            style={styles.emptyStateGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <BookOpen size={48} color="#94a3b8" />
            <Text style={styles.modernEmptyStateText}>
              Keine weiteren Inhalte oder Unterkategorien verfügbar.
            </Text>
          </LinearGradient>
        </View>
      ) : (
        // Modern Folder Cards with Section Panel
        <ScrollView style={styles.modernContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionPanel}>
            <LinearGradient
              colors={['rgba(14, 165, 233, 0.08)', 'rgba(59, 130, 246, 0.05)', 'rgba(147, 197, 253, 0.03)']}
              style={styles.sectionPanelGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.sectionTitle}>{currentItem.title}</Text>
              <View style={styles.foldersGrid}>
                {childItems.map((childItem) => (
                  <FolderCard
                    key={childItem.slug}
                    childItem={childItem}
                    parentSlug={slug as string}
                    onPress={() => navigateToChild(childItem.slug)}
                  />
                ))}
              </View>
            </LinearGradient>
          </View>
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Modern Container
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
    backgroundColor: '#0891b2',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#0891b2',
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
    padding: 20,
    paddingBottom: 24,
  },
  modernBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#0891b2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modernBackText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1e293b',
  },
  headerContent: {
    zIndex: 1,
  },
  modernTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  modernSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748b',
    lineHeight: 22,
  },

  // Modern Content
  modernContent: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Modern Content Card
  modernContentCard: {
    marginBottom: 20,
  },
  contentCardGradient: {
    borderRadius: 20,
    padding: 2,
  },
  modernContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  contentHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modernContentTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1e293b',
  },
  contentBody: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  contentText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#475569',
    lineHeight: 26,
  },
  contentSection: {
    marginBottom: 24,
  },
  contentSectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1e293b',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(8, 145, 178, 0.2)',
  },

  // Section Panel with Gradient Background
  sectionPanel: {
    marginBottom: 24,
  },
  sectionPanelGradient: {
    borderRadius: 16,
    padding: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },

  // Responsive Folders Grid (3/2/1 columns)
  foldersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },

  // Folder card styles are now handled by the reusable Card component

  // Modern Empty State
  modernEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateGradient: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    borderRadius: 20,
    width: '100%',
  },
  modernEmptyStateText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
  },

  bottomPadding: {
    height: 40,
  },
});