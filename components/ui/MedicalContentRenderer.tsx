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
    const iconProps = { size: 24, color: colors.primary || '#4CAF50' };
    
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
    try {
      if (!content || content.length < 10) return [];
      
      // Clean HTML if present
      const cleanContent = content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Simple splitting approach
      const words = cleanContent.split(' ');
      const sections: MedicalSection[] = [];
      const wordsPerSection = Math.max(100, Math.floor(words.length / 3));
      
      if (words.length > 100) {
        // Multiple sections
        for (let i = 0; i < words.length; i += wordsPerSection) {
          const sectionWords = words.slice(i, i + wordsPerSection);
          const sectionContent = sectionWords.join(' ');
          
          if (sectionContent.length > 50) {
            const sectionIndex = Math.floor(i / wordsPerSection);
            sections.push({
              id: `section_${sectionIndex}`,
              title: sectionIndex === 0 ? 'Definition' : `Bereich ${sectionIndex + 1}`,
              icon: 'definition',
              content: sectionContent,
              type: 'definition',
            });
          }
        }
      } else {
        // Single section
        sections.push({
          id: 'single',
          title: 'Medizinischer Inhalt',
          icon: 'definition',
          content: cleanContent,
          type: 'definition',
        });
      }
      
      return sections.length > 0 ? sections : [{
        id: 'fallback',
        title: 'Inhalt',
        icon: 'definition',
        content: cleanContent,
        type: 'definition',
      }];
    } catch (error) {
      // Fallback section
      return [{
        id: 'error',
        title: 'Medizinischer Inhalt',
        icon: 'definition',
        content: content || 'Fehler beim Laden des Inhalts',
        type: 'definition',
      }];
    }
  }, []);

  // Safe text rendering with basic highlighting
  const renderContent = useCallback((text: string) => {
    try {
      // Simple highlighting that won't crash
      const parts = text.split(/(\d+)/g);
      
      return (
        <Text style={[styles.contentText, { color: colors.text || '#333' }]}>
          {parts.map((part, index) => {
            // Highlight numbers
            if (/^\d+$/.test(part)) {
              return (
                <Text key={index} style={styles.numberBadge}>
                  {part}
                </Text>
              );
            }
            return part;
          })}
        </Text>
      );
    } catch (error) {
      // Fallback to plain text
      return (
        <Text style={[styles.contentText, { color: colors.text || '#333' }]}>
          {text}
        </Text>
      );
    }
  }, [colors.text]);

  const renderSection = useCallback((section: MedicalSection) => {
    const isExpanded = expandedSections[section.id];
    
    return (
      <View key={section.id} style={[styles.sectionCard, { backgroundColor: colors.card || '#fff' }]}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(section.id)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            {getIconForSection(section.type)}
            <Text style={[styles.sectionTitle, { color: colors.text || '#333' }]}>
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

  // Enhanced content processing 
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

  // Quick stats component
  const renderQuickStats = useCallback(() => {
    const stats = [
      { number: medicalSections.length.toString(), label: 'Themenbereiche' },
      { number: '3', label: 'Klassifikationen' },
      { number: '60-70%', label: 'Prävalenz' },
    ];

    return (
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <View key={index} style={[styles.statCard, { backgroundColor: colors.card || '#fff' }]}>
            <LinearGradient
              colors={['#ffffff', '#f8fafc']}
              style={styles.statCardGradient}
            >
              <Text style={[styles.statNumber, { color: colors.primary || '#4CAF50' }]}>{stat.number}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary || '#666' }]}>{stat.label}</Text>
            </LinearGradient>
          </View>
        ))}
      </View>
    );
  }, [medicalSections, colors]);

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

  // Enhanced rendering with rich formatting
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
            Vollständiger medizinischer Leitfaden
          </Text>
        </View>
      </LinearGradient>

      {/* Quick Stats */}
      {renderQuickStats()}

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
    padding: 30,
    borderRadius: 20,
    margin: 16,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
  },
  // Quick Stats Styles
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardGradient: {
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  // Content Styles
  contentContainer: {
    padding: 16,
    gap: 20,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderLeftWidth: 5,
    borderLeftColor: '#66BB6A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 25,
    borderBottomWidth: 2,
    borderBottomColor: '#e8f5e9',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
    color: '#2c3e50',
  },
  sectionContent: {
    paddingHorizontal: 25,
    paddingBottom: 25,
    paddingTop: 20,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#4a5568',
    textAlign: 'justify',
  },
  // Medical Highlighting Styles
  numberBadge: {
    backgroundColor: '#2196F3',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
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