import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Stethoscope, Heart, Activity, Scissors, AlertTriangle, Shield, Droplets, Scan, BookOpen, FileText } from 'lucide-react-native';
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

// Get icon and color for items based on their title/type
const getItemDetails = (title: string, type: string, parentSlug?: string) => {
  const normalizedTitle = title.toLowerCase();
  
  // Base color logic
  let baseColor = MEDICAL_COLORS.primary;
  if (parentSlug) {
    switch (parentSlug) {
      case 'chirurgie': baseColor = '#EF4444'; break;
      case 'innere-medizin': case 'kardiologie': case 'pneumologie': case 'gastroenterologie': case 'nephrologie': case 'endokrinologie-und-stoffwechsel':
        baseColor = '#0077B6'; break;
      case 'notfallmedizin': baseColor = '#F59E0B'; break;
      case 'infektiologie': baseColor = '#10B981'; break;
      case 'urologie': baseColor = '#8B5CF6'; break;
      case 'radiologie': baseColor = '#6366F1'; break;
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
    case 'FileText': return FileText;
    case 'BookOpen':
    default: return BookOpen;
  }
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
        .select('id, slug, title, parent_slug, description, type, display_order, content_improved')
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
        .select('id, slug, title, parent_slug, description, type, display_order, content_improved')
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
      const hasContent = itemData.content_improved && itemData.content_improved.trim() !== '';
      
      console.log('Has children:', hasChildren, 'Has content:', hasContent);
      
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
        
        <Text style={styles.title}>{currentItem.title}</Text>
        <Text style={styles.typeLabel}>{currentItem.type}</Text>
        {currentItem.description && (
          <Text style={styles.subtitle}>{currentItem.description}</Text>
        )}
      </View>

      {showContent ? (
        // Show the final content
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.contentCard}>
            <View style={styles.contentHeader}>
              <FileText size={24} color={MEDICAL_COLORS.primary} />
              <Text style={styles.contentTitle}>Medizinischer Inhalt</Text>
            </View>
            <Text style={styles.contentText}>{currentItem.content_improved}</Text>
          </View>
          <View style={styles.bottomPadding} />
        </ScrollView>
      ) : childItems.length === 0 ? (
        // Empty state
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Keine weiteren Inhalte oder Unterkategorien verfügbar.
          </Text>
        </View>
      ) : (
        // Show child navigation
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {childItems.map((childItem) => {
            const { icon, color } = getItemDetails(childItem.title, childItem.type, slug as string);
            const IconComponent = getIconComponent(icon);
            const hasContent = childItem.content_improved && childItem.content_improved.trim() !== '';
            
            return (
              <TouchableOpacity
                key={childItem.slug}
                style={styles.childCard}
                onPress={() => navigateToChild(childItem.slug)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[`${color}12`, `${color}05`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.childGradient}
                >
                  <View style={[styles.childIcon, { backgroundColor: color }]}>
                    <IconComponent size={22} color="white" />
                  </View>
                  
                  <View style={styles.childContent}>
                    <Text style={styles.childTitle}>{childItem.title}</Text>
                    <View style={styles.childMeta}>
                      <Text style={styles.childType}>{childItem.type}</Text>
                      {hasContent && (
                        <View style={styles.contentIndicator}>
                          <FileText size={12} color={MEDICAL_COLORS.success} />
                          <Text style={styles.contentIndicatorText}>Inhalt</Text>
                        </View>
                      )}
                    </View>
                    {childItem.description && (
                      <Text style={styles.childDescription}>{childItem.description}</Text>
                    )}
                  </View>
                  
                  <ChevronRight size={18} color={color} />
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
    fontSize: 22,
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 2,
  },
  typeLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: MEDICAL_COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  // Content display styles
  contentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: MEDICAL_COLORS.lightGray,
  },
  contentTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: MEDICAL_COLORS.textPrimary,
    marginLeft: 8,
  },
  contentText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 24,
  },
  // Child navigation styles
  childCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  childGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  childIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  childContent: {
    flex: 1,
  },
  childTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 4,
  },
  childMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  childType: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: MEDICAL_COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  contentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${MEDICAL_COLORS.success}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contentIndicatorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: MEDICAL_COLORS.success,
    marginLeft: 3,
  },
  childDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: MEDICAL_COLORS.gray,
    marginTop: 2,
    lineHeight: 15,
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
    lineHeight: 22,
  },
  bottomPadding: {
    height: 60,
  },
});