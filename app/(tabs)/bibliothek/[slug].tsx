import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Stethoscope, Heart, Activity, Scissors, AlertTriangle, Shield, Droplets, Scan, BookOpen, FileText } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import MedicalContentRenderer from '@/components/ui/MedicalContentRenderer';

const SCREEN_WIDTH = Dimensions.get('window').width;

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

// Enhanced item details with 3D gradients for child items
const getItemDetails = (title: string, type: string, parentSlug?: string) => {
  const normalizedTitle = title.toLowerCase();
  
  // Base color and gradient logic
  let baseColor = MEDICAL_COLORS.primary;
  let gradient = ['#0EA5E9', '#0284C7', '#0369A1'];
  let hoverGradient = ['#38BDF8', '#0EA5E9', '#0284C7'];
  
  if (parentSlug) {
    switch (parentSlug) {
      case 'chirurgie': 
        baseColor = '#EF4444';
        gradient = ['#EF4444', '#DC2626', '#B91C1C'];
        hoverGradient = ['#F87171', '#EF4444', '#DC2626'];
        break;
      case 'innere-medizin': case 'kardiologie': case 'pneumologie': case 'gastroenterologie': case 'nephrologie': case 'endokrinologie-und-stoffwechsel':
        baseColor = '#0077B6';
        gradient = ['#0EA5E9', '#0284C7', '#0369A1'];
        hoverGradient = ['#38BDF8', '#0EA5E9', '#0284C7'];
        break;
      case 'notfallmedizin': 
        baseColor = '#F59E0B';
        gradient = ['#F59E0B', '#D97706', '#B45309'];
        hoverGradient = ['#FCD34D', '#F59E0B', '#D97706'];
        break;
      case 'infektiologie': 
        baseColor = '#10B981';
        gradient = ['#10B981', '#059669', '#047857'];
        hoverGradient = ['#34D399', '#10B981', '#059669'];
        break;
      case 'urologie': 
        baseColor = '#8B5CF6';
        gradient = ['#8B5CF6', '#7C3AED', '#6D28D9'];
        hoverGradient = ['#A78BFA', '#8B5CF6', '#7C3AED'];
        break;
      case 'radiologie': 
        baseColor = '#6366F1';
        gradient = ['#6366F1', '#4F46E5', '#4338CA'];
        hoverGradient = ['#818CF8', '#6366F1', '#4F46E5'];
        break;
    }
  }
  
  // Icon based on content and type
  let icon = 'BookOpen';
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
    icon = 'Stethoscope';
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
    case 'BookOpen':
    default: return BookOpen;
  }
};


// Modern 3D Circular Subcategory Component
const CircularSubcategory = ({ childItem, parentSlug, onPress }: { childItem: Section, parentSlug: string, onPress: () => void }) => {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];
  const elevationAnim = useState(new Animated.Value(0))[0];
  
  const { icon, gradient, hoverGradient } = getItemDetails(childItem.title, childItem.type, parentSlug);
  const IconComponent = getIconComponent(icon);
  const hasContent = childItem.content_improved && 
                    (typeof childItem.content_improved === 'object' || typeof childItem.content_improved === 'string');
  
  const handlePressIn = () => {
    setIsPressed(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.03,
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
    outputRange: [0.12, 0.3],
  });
  
  const shadowRadius = elevationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 16],
  });
  
  return (
    <Animated.View
      style={[
        styles.circularSubcategoryContainer,
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
        style={styles.circularSubcategoryButton}
      >
        <LinearGradient
          colors={isPressed ? hoverGradient : gradient}
          style={styles.circularSubcategoryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* 3D Ring Effect for Subcategories */}
          <View style={styles.subOuterRing}>
            <View style={styles.subInnerRing}>
              <View style={styles.subCenterCircle}>
                <IconComponent size={22} color="white" />
              </View>
            </View>
          </View>
          
          {/* Content Indicator Badge */}
          {hasContent && (
            <View style={styles.subContentBadge}>
              <View style={styles.contentBadgeDot} />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
      
      <Text style={styles.subcategoryLabel} numberOfLines={2}>{childItem.title}</Text>
    </Animated.View>
  );
};

export default function SectionDetailScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
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
            colors={['#667eea', '#764ba2']}
            style={styles.backButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ChevronLeft size={20} color="white" />
          </LinearGradient>
          <Text style={styles.modernBackText}>Zurück</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.modernTitle}>{currentItem.title}</Text>
          {currentItem.description && (
            <Text style={styles.modernSubtitle}>{currentItem.description}</Text>
          )}
        </View>
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
                  colors={['#667eea', '#764ba2']}
                  style={styles.contentHeaderIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <FileText size={20} color="white" />
                </LinearGradient>
                <Text style={styles.modernContentTitle}>Medizinischer Inhalt</Text>
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
        // Modern 3D Circular Subcategories Grid
        <ScrollView style={styles.modernContent} showsVerticalScrollIndicator={false}>
          <View style={styles.subcategoriesGrid}>
            {childItems.map((childItem) => (
              <CircularSubcategory
                key={childItem.slug}
                childItem={childItem}
                parentSlug={slug as string}
                onPress={() => navigateToChild(childItem.slug)}
              />
            ))}
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
    shadowColor: '#667eea',
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
    borderBottomColor: 'rgba(102, 126, 234, 0.2)',
  },

  // 3D Circular Subcategories Grid
  subcategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 32,
    gap: 16,
  },

  // 3D Circular Subcategory Styles
  circularSubcategoryContainer: {
    width: (SCREEN_WIDTH - 80) / 3,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  circularSubcategoryButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
    position: 'relative',
  },
  circularSubcategoryGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  // 3D Ring Effects for Subcategories
  subOuterRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  subInnerRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  subCenterCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },

  // Content Badge for Subcategories
  subContentBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  contentBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },

  // Subcategory Labels
  subcategoryLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 16,
    minHeight: 32,
    marginTop: 4,
  },

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