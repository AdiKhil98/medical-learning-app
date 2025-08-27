import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronDown,
  BookOpen,
  List,
  Lightbulb,
  Info,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';

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
  content_details?: string;
  content_improved?: any;
  content_html?: string;
  content_type?: string;
  has_content?: boolean;
  hierarchy_level?: number;
}

interface ContentSection {
  type: string;
  title?: string;
  content?: string;
  term?: string;
  definition?: string;
  items?: string[];
}

export default function ContentDetailScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSection = useCallback(async () => {
    if (!slug || typeof slug !== 'string') return;
    setLoading(true);
    
    try {
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('content_improved, content_html, title, description')
        .eq('slug', slug)
        .maybeSingle();

      if (sectionError) throw sectionError;
      if (!sectionData) throw new Error('Abschnitt nicht gefunden');
      
      setCurrentSection(sectionData);
      
      // Auto-expand first section if content_improved exists
      if (Array.isArray(sectionData.content_improved) && sectionData.content_improved.length > 0) {
        setExpandedSections({ '0': true });
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchSection();
  }, [fetchSection]);

  const toggleSection = (index: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getIconForContentType = (type: string) => {
    switch (type) {
      case 'overview':
        return <BookOpen size={20} color={colors.primary} />;
      case 'definition':
        return <Info size={20} color={colors.primary} />;
      case 'list':
        return <List size={20} color={colors.primary} />;
      case 'clinical_pearl':
      case 'clinical_relevance':
        return <Lightbulb size={20} color="#F59E0B" />;
      default:
        return <BookOpen size={20} color={colors.primary} />;
    }
  };

  const renderContentSection = (contentSection: ContentSection, index: number) => {
    const isExpanded = expandedSections[index.toString()];
    
    return (
      <Card key={index} style={dynamicStyles.contentCard}>
        <TouchableOpacity
          style={dynamicStyles.contentHeader}
          onPress={() => toggleSection(index.toString())}
          activeOpacity={0.7}
        >
          <View style={dynamicStyles.contentHeaderLeft}>
            {getIconForContentType(contentSection.type)}
            <Text style={dynamicStyles.contentTitle}>
              {contentSection.title || 
               (contentSection.type === 'definition' ? contentSection.term : `Abschnitt ${index + 1}`)}
            </Text>
          </View>
          <ChevronDown
            size={20}
            color={colors.textSecondary}
            style={[
              dynamicStyles.chevron,
              isExpanded && dynamicStyles.chevronExpanded
            ]}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={dynamicStyles.contentBody}>
            {contentSection.type === 'definition' && contentSection.definition && (
              <View style={dynamicStyles.definitionContainer}>
                <Text style={dynamicStyles.definitionTerm}>{contentSection.term}</Text>
                <Text style={dynamicStyles.definitionText}>{contentSection.definition}</Text>
              </View>
            )}
            
            {/* Render HTML content if available, otherwise use regular text */}
            {currentSection.content_html ? (
              <View style={dynamicStyles.htmlContainer}>
                <Text style={dynamicStyles.htmlNote}>📋 Enhanced content view</Text>
                <Text style={dynamicStyles.contentText}>{contentSection.content}</Text>
                {/* TODO: Add proper HTML rendering with react-native-webview or similar */}
              </View>
            ) : contentSection.content ? (
              <Text style={dynamicStyles.contentText}>{contentSection.content}</Text>
            ) : null}
            
            {contentSection.type === 'list' && contentSection.items && (
              <View style={dynamicStyles.listContainer}>
                {contentSection.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={dynamicStyles.listItem}>
                    <View style={dynamicStyles.listBullet} />
                    <Text style={dynamicStyles.listItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
            
            {contentSection.type === 'clinical_pearl' && (
              <View style={dynamicStyles.clinicalPearlContainer}>
                <View style={dynamicStyles.clinicalPearlHeader}>
                  <Lightbulb size={16} color="#F59E0B" />
                  <Text style={dynamicStyles.clinicalPearlTitle}>Klinischer Tipp</Text>
                </View>
                <Text style={dynamicStyles.clinicalPearlText}>{contentSection.content}</Text>
              </View>
            )}
          </View>
        )}
      </Card>
    );
  };

  const gradientColors = isDarkMode 
    ? ['#1F2937', '#111827', '#0F172A']
    : ['#e0f2fe', '#f0f9ff', '#ffffff'];

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.background,
    },
    backText: {
      marginLeft: 4,
      fontSize: 16,
      color: colors.primary,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerDescription: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 4,
    },
    contentCard: {
      marginBottom: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.05,
      shadowRadius: 8,
      elevation: 3,
      overflow: 'hidden',
    },
    contentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    contentHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    contentTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginLeft: 12,
      flex: 1,
    },
    chevron: {
      transform: [{ rotate: '0deg' }],
    },
    chevronExpanded: {
      transform: [{ rotate: '180deg' }],
    },
    contentBody: {
      padding: 20,
      paddingTop: 0,
    },
    contentText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
      marginTop: 16,
    },
    definitionContainer: {
      marginTop: 16,
    },
    definitionTerm: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 8,
    },
    definitionText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
    },
    listContainer: {
      marginTop: 16,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    listBullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
      marginTop: 8,
      marginRight: 12,
    },
    listItemText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
    },
    clinicalPearlContainer: {
      marginTop: 16,
      backgroundColor: '#FFFBEB',
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#F59E0B',
    },
    clinicalPearlHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    clinicalPearlTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#92400E',
      marginLeft: 8,
    },
    clinicalPearlText: {
      fontSize: 15,
      color: '#92400E',
      lineHeight: 22,
      fontStyle: 'italic',
    },
    fallbackContent: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    fallbackTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    fallbackText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
    },
    errorText: {
      fontSize: 16,
      color: colors.error,
      marginBottom: 8,
    },
    errorLink: {
      color: colors.primary,
    },
    htmlContainer: {
      marginTop: 16,
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    htmlNote: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: 'bold',
      marginBottom: 8,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={dynamicStyles.center}>
        <Text style={dynamicStyles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchSection}>
          <Text style={dynamicStyles.errorLink}>Erneut laden</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!currentSection) {
    return (
      <SafeAreaView style={dynamicStyles.center}>
        <Text style={dynamicStyles.errorText}>Inhalt nicht gefunden</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={dynamicStyles.errorLink}>← Zurück</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const contentSections = currentSection.content_improved || [];

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
      />
      
      {/* Header */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <ChevronLeft size={24} color={colors.primary} />
        <Text style={dynamicStyles.backText}>Zurück</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={dynamicStyles.headerTitle}>{currentSection.title}</Text>
        {currentSection.description && (
          <Text style={dynamicStyles.headerDescription}>{currentSection.description}</Text>
        )}
      </View>

      {/* Content */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {contentSections.length > 0 ? (
          contentSections.map((section: ContentSection, index: number) => 
            renderContentSection(section, index)
          )
        ) : (
          // Fallback content if no content_json
          <Card style={dynamicStyles.fallbackContent}>
            <Text style={dynamicStyles.fallbackTitle}>Inhalt</Text>
            <Text style={dynamicStyles.fallbackText}>
              {currentSection.content_details || 
               currentSection.description || 
               'Für diesen Abschnitt sind noch keine detaillierten Inhalte verfügbar.'}
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
});