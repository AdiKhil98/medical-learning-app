import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ChevronDown,
  Activity,
  AlertTriangle,
  Heart,
  Stethoscope,
  Target,
  BookOpen,
  Clock,
  TrendingUp,
  Info,
} from 'lucide-react-native';

interface MedicalSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  type: 'definition' | 'epidemiology' | 'etiology' | 'symptoms' | 'diagnosis' | 'therapy' | 'prognosis' | 'emergency';
}

interface MedicalContentRendererProps {
  htmlContent?: string;
  jsonContent?: any;
  plainTextContent?: string;
  title: string;
}

const MedicalContentRenderer: React.FC<MedicalContentRendererProps> = ({
  htmlContent,
  jsonContent,
  plainTextContent,
  title,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    '0': true,
  });

  // Error handling - return early if no title
  if (!title) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Fehler: Kein Titel verfügbar</Text>
      </View>
    );
  }

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const getIconForSection = useCallback((type: string) => {
    const iconProps = { size: 24, color: colors.primary };
    
    switch (type) {
      case 'definition':
        return <BookOpen {...iconProps} />;
      case 'symptoms':
        return <Stethoscope {...iconProps} />;
      case 'diagnosis':
        return <Activity {...iconProps} />;
      case 'therapy':
        return <Heart {...iconProps} />;
      case 'emergency':
        return <AlertTriangle {...iconProps} color="#EF4444" />;
      default:
        return <Info {...iconProps} />;
    }
  }, [colors.primary]);

  // Simple content parsing that won't crash
  const createContentSections = useCallback((content: string): MedicalSection[] => {
    if (!content || content.length < 10) return [];
    
    // Clean HTML if present
    const cleanContent = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Simple splitting - divide content into manageable chunks
    const words = cleanContent.split(' ');
    const sections: MedicalSection[] = [];
    const wordsPerSection = Math.max(50, Math.floor(words.length / 3));
    
    for (let i = 0; i < words.length; i += wordsPerSection) {
      const sectionWords = words.slice(i, i + wordsPerSection);
      const sectionContent = sectionWords.join(' ');
      
      if (sectionContent.length > 20) {
        sections.push({
          id: `section_${i}`,
          title: i === 0 ? 'Definition' : `Bereich ${Math.floor(i / wordsPerSection) + 1}`,
          icon: 'definition',
          content: sectionContent,
          type: 'definition',
        });
      }
    }
    
    return sections.length > 0 ? sections : [{
      id: 'single',
      title: 'Medizinischer Inhalt',
      icon: 'definition',
      content: cleanContent,
      type: 'definition',
    }];
  }, []);

  // Simple text rendering without complex highlighting
  const renderContent = useCallback((text: string) => {
    return (
      <Text style={[styles.contentText, { color: colors.text }]}>
        {text}
      </Text>
    );
  }, [colors.text]);

  const renderSection = useCallback((section: MedicalSection) => {
    const isExpanded = expandedSections[section.id];
    
    return (
      <View key={section.id} style={[styles.sectionCard, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(section.id)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            {getIconForSection(section.type)}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
          </View>
          <ChevronDown
            size={20}
            color={colors.textSecondary || '#666'}
            style={{
              transform: [{ rotate: isExpanded ? '180deg' : '0deg' }]
            }}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionContent}>
            {renderContent(section.content)}
          </View>
        )}
      </View>
    );
  }, [colors, expandedSections, toggleSection, getIconForSection, renderContent]);

  // Simple content processing - determine what content we have and use it
  const medicalSections = useMemo(() => {
    // Priority 1: Use JSON if it's properly structured
    if (jsonContent && Array.isArray(jsonContent) && jsonContent.length > 0) {
      const validSections = jsonContent.filter(section => 
        section && section.title && section.content
      );
      
      if (validSections.length > 0) {
        return validSections.map((section, index) => ({
          id: section.id || `json_${index}`,
          title: section.title,
          icon: section.type || 'definition',
          content: section.content,
          type: section.type || 'definition',
        }));
      }
    }

    // Priority 2: Use HTML content
    if (htmlContent && htmlContent.length > 10) {
      return createContentSections(htmlContent);
    }
    
    // Priority 3: Use plain text content
    if (plainTextContent && plainTextContent.length > 10) {
      return createContentSections(plainTextContent);
    }
    
    // Priority 4: Use JSON as string if necessary
    if (jsonContent && typeof jsonContent === 'string' && jsonContent.length > 10) {
      return createContentSections(jsonContent);
    }
    
    return [];
  }, [htmlContent, jsonContent, plainTextContent, createContentSections]);

  // Simple error state if no content
  if (medicalSections.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.card || '#fff' }]}>
        <BookOpen size={48} color={colors.textSecondary || '#666'} />
        <Text style={[styles.emptyStateText, { color: colors.textSecondary || '#666' }]}>
          Keine medizinischen Inhalte verfügbar
        </Text>
      </View>
    );
  }

  // Simple rendering - just show the content
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['#1F2937', '#111827'] : ['#66BB6A', '#81C784']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>💧 {title}</Text>
          <Text style={styles.headerSubtitle}>
            Medizinischer Leitfaden
          </Text>
        </View>
      </LinearGradient>

      {/* Content Sections */}
      <View style={styles.contentContainer}>
        {medicalSections.map((section) => renderSection(section))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  header: {
    padding: 24,
    borderRadius: 20,
    margin: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  sectionContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 16,
    margin: 16,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default MedicalContentRenderer;