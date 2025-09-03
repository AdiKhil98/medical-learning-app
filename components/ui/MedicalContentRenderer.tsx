import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
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
  Lightbulb,
  AlertCircle,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface MedicalSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  type: 'definition' | 'epidemiology' | 'etiology' | 'symptoms' | 'diagnosis' | 'therapy' | 'prognosis' | 'emergency';
  stats?: Array<{
    number: string;
    label: string;
  }>;
  highlights?: Array<{
    type: 'number' | 'medical-term' | 'classification' | 'critical';
    text: string;
  }>;
  importantBox?: {
    title: string;
    content: string;
    type: 'warning' | 'info' | 'tip';
  };
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
    '0': true, // Auto-expand first section
  });

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
      case 'epidemiology':
        return <TrendingUp {...iconProps} />;
      case 'etiology':
        return <Target {...iconProps} />;
      case 'symptoms':
        return <Stethoscope {...iconProps} />;
      case 'diagnosis':
        return <Activity {...iconProps} />;
      case 'therapy':
        return <Heart {...iconProps} />;
      case 'prognosis':
        return <Clock {...iconProps} />;
      case 'emergency':
        return <AlertTriangle {...iconProps} color="#EF4444" />;
      default:
        return <Info {...iconProps} />;
    }
  }, [colors.primary]);

  const parseHTMLToSections = useCallback((html: string): MedicalSection[] => {
    console.log('Parsing HTML content:', html.substring(0, 200) + '...');
    
    // First, try to extract clean text content from HTML
    const cleanText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]*>/g, ' ') // Replace HTML tags with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    console.log('Cleaned text from HTML:', cleanText.substring(0, 200) + '...');
    
    // If HTML parsing failed, return empty to trigger fallback
    console.log('HTML parsing cleaned text, returning empty to let medicalSections logic handle it');
    return [];
  }, []);

  const parseTextToMedicalSections = useCallback((text: string): MedicalSection[] => {
    if (!text) return [];
    
    console.log('Parsing medical text, length:', text.length);
    console.log('First 300 chars:', text.substring(0, 300));
    
    const sections: MedicalSection[] = [];
    
    // Medical section patterns with better recognition
    const medicalSectionPatterns = [
      {
        pattern: /(?:^|\n)\s*(?:1\.|I\.|\*\*|#)?\s*(Definition|Klassifikation|Begriff|Was ist|Allgemeines?)[\s:]*([^\n]*(?:\n(?!\s*(?:\d+\.|[IVX]+\.|[\*#]|[A-ZÄÖÜ][a-zäöüß]+:))[^\n]*)*)/gim,
        title: 'Definition und Klassifikation',
        type: 'definition' as const
      },
      {
        pattern: /(?:^|\n)\s*(?:2\.|II\.|\*\*|#)?\s*(Epidemiologie|Häufigkeit|Inzidenz|Prävalenz|Verteilung|Statistik)[\s:]*([^\n]*(?:\n(?!\s*(?:\d+\.|[IVX]+\.|[\*#]|[A-ZÄÖÜ][a-zäöüß]+:))[^\n]*)*)/gim,
        title: 'Epidemiologie',
        type: 'epidemiology' as const
      },
      {
        pattern: /(?:^|\n)\s*(?:3\.|III\.|\*\*|#)?\s*(Ätiologie|Ursache|Pathophysiologie|Entstehung|Pathogenese)[\s:]*([^\n]*(?:\n(?!\s*(?:\d+\.|[IVX]+\.|[\*#]|[A-ZÄÖÜ][a-zäöüß]+:))[^\n]*)*)/gim,
        title: 'Ätiologie und Pathophysiologie',
        type: 'etiology' as const
      },
      {
        pattern: /(?:^|\n)\s*(?:4\.|IV\.|\*\*|#)?\s*(Symptom|Klinik|Beschwerden|Zeichen|Symptomatik|Klinisches?\s*Bild)[\s:]*([^\n]*(?:\n(?!\s*(?:\d+\.|[IVX]+\.|[\*#]|[A-ZÄÖÜ][a-zäöüß]+:))[^\n]*)*)/gim,
        title: 'Klinische Symptomatik',
        type: 'symptoms' as const
      },
      {
        pattern: /(?:^|\n)\s*(?:5\.|V\.|\*\*|#)?\s*(Diagnostik|Untersuchung|Befund|Labor|Bildgebung|Test)[\s:]*([^\n]*(?:\n(?!\s*(?:\d+\.|[IVX]+\.|[\*#]|[A-ZÄÖÜ][a-zäöüß]+:))[^\n]*)*)/gim,
        title: 'Diagnostik',
        type: 'diagnosis' as const
      },
      {
        pattern: /(?:^|\n)\s*(?:6\.|VI\.|\*\*|#)?\s*(Therapie|Behandlung|Medikament|Management|Intervention)[\s:]*([^\n]*(?:\n(?!\s*(?:\d+\.|[IVX]+\.|[\*#]|[A-ZÄÖÜ][a-zäöüß]+:))[^\n]*)*)/gim,
        title: 'Therapie',
        type: 'therapy' as const
      },
      {
        pattern: /(?:^|\n)\s*(?:7\.|VII\.|\*\*|#)?\s*(Prognose|Verlauf|Heilung|Outcome|Komplikation)[\s:]*([^\n]*(?:\n(?!\s*(?:\d+\.|[IVX]+\.|[\*#]|[A-ZÄÖÜ][a-zäöüß]+:))[^\n]*)*)/gim,
        title: 'Prognose und Verlauf',
        type: 'prognosis' as const
      },
      {
        pattern: /(?:^|\n)\s*(?:8\.|VIII\.|\*\*|#)?\s*(Alarm|Notfall|Kritisch|Red\s*Flags?|Warnsignal)[\s:]*([^\n]*(?:\n(?!\s*(?:\d+\.|[IVX]+\.|[\*#]|[A-ZÄÖÜ][a-zäöüß]+:))[^\n]*)*)/gim,
        title: 'Alarmsymptome',
        type: 'emergency' as const
      }
    ];

    // Try to find structured medical sections
    let usedText = '';
    medicalSectionPatterns.forEach((pattern, index) => {
      const matches = text.matchAll(pattern.pattern);
      
      for (const match of matches) {
        const content = match[2]?.trim();
        if (content && content.length > 30 && !usedText.includes(content.substring(0, 50))) {
          console.log(`Found section: ${pattern.title}, content length: ${content.length}`);
          
          sections.push({
            id: `medical_${index}_${sections.length}`,
            title: pattern.title,
            icon: pattern.type,
            content: content,
            type: pattern.type,
          });
          
          usedText += content;
        }
      }
    });

    // If no structured sections found, create intelligent sections based on content analysis
    if (sections.length === 0) {
      console.log('No structured sections found, using intelligent fallback parsing');
      
      // Split by major content breaks, but more intelligently
      const chunks = text.split(/(?:\n\s*\n|\.\s*(?=[A-ZÄÖÜ])|;\s*(?=[A-ZÄÖÜ]))/);
      const meaningfulChunks = chunks.filter(chunk => chunk.trim().length > 100);
      
      if (meaningfulChunks.length > 1) {
        meaningfulChunks.forEach((chunk, index) => {
          const cleanChunk = chunk.trim();
          
          // Analyze content to determine section type
          const lowerChunk = cleanChunk.toLowerCase();
          let sectionType: MedicalSection['type'] = 'definition';
          let sectionTitle = 'Medizinischer Inhalt';

          // More sophisticated content analysis
          if (lowerChunk.includes('definition') || lowerChunk.includes('klassifikation') || index === 0) {
            sectionType = 'definition';
            sectionTitle = 'Definition und Klassifikation';
          } else if (lowerChunk.includes('häufig') || lowerChunk.includes('prozent') || lowerChunk.includes('%')) {
            sectionType = 'epidemiology';
            sectionTitle = 'Epidemiologie';
          } else if (lowerChunk.includes('ursache') || lowerChunk.includes('pathophysiologie')) {
            sectionType = 'etiology';
            sectionTitle = 'Ätiologie und Pathophysiologie';
          } else if (lowerChunk.includes('symptom') || lowerChunk.includes('zeichen') || lowerChunk.includes('klinik')) {
            sectionType = 'symptoms';
            sectionTitle = 'Klinische Symptomatik';
          } else if (lowerChunk.includes('diagnos') || lowerChunk.includes('untersuch') || lowerChunk.includes('labor')) {
            sectionType = 'diagnosis';
            sectionTitle = 'Diagnostik';
          } else if (lowerChunk.includes('therap') || lowerChunk.includes('behandl') || lowerChunk.includes('medikament')) {
            sectionType = 'therapy';
            sectionTitle = 'Therapie';
          } else if (lowerChunk.includes('prognose') || lowerChunk.includes('verlauf')) {
            sectionType = 'prognosis';
            sectionTitle = 'Prognose und Verlauf';
          } else {
            sectionTitle = `Klinische Information ${index + 1}`;
          }
          
          sections.push({
            id: `fallback_${index}`,
            title: sectionTitle,
            icon: sectionType,
            content: cleanChunk,
            type: sectionType,
          });
        });
      } else {
        // Single large content block - create one comprehensive section
        sections.push({
          id: '0',
          title: 'Vollständiger medizinischer Inhalt',
          icon: 'definition',
          content: text.trim(),
          type: 'definition',
        });
      }
    }
    
    console.log(`Created ${sections.length} medical sections:`, sections.map(s => s.title));
    return sections;
  }, []);

  const renderStyledText = useCallback((text: string) => {
    // Split text by highlighted elements
    const parts = text.split(/(\b\d+[.,]?\d*%?\b|\b[A-Z]{2,}\b|\b(?:KDIGO|AKI|ICD-10)\b)/g);
    
    return (
      <Text style={[styles.contentText, { color: colors.text }]}>
        {parts.map((part, index) => {
          // Check if part should be highlighted
          if (/^\d+[.,]?\d*%?$/.test(part)) {
            // Number
            return (
              <Text key={index} style={styles.numberHighlight}>
                {part}
              </Text>
            );
          } else if (/^[A-Z]{2,}$/.test(part) || /^(?:KDIGO|AKI|ICD-10)$/.test(part)) {
            // Medical term or classification
            return (
              <Text key={index} style={[styles.medicalTermHighlight, { color: colors.primary }]}>
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  }, [colors.text, colors.primary]);

  const renderProgressStats = useCallback(() => {
    // Mock stats from content analysis
    const stats = [
      { number: '15', label: 'Themenbereiche' },
      { number: '3', label: 'KDIGO-Stadien' },
      { number: '60-70%', label: 'Prärenale Ursachen' },
    ];

    return (
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <View key={index} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <LinearGradient
              colors={isDarkMode ? ['#1F2937', '#111827'] : ['#ffffff', '#f8fafc']}
              style={styles.statCardGradient}
            >
              <Text style={[styles.statNumber, { color: colors.primary }]}>{stat.number}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </LinearGradient>
          </View>
        ))}
      </View>
    );
  }, [colors, isDarkMode]);

  const renderSection = useCallback((section: MedicalSection, index: number) => {
    const isExpanded = expandedSections[section.id];
    const isEmergency = section.type === 'emergency';
    
    return (
      <View key={section.id} style={[
        styles.sectionCard, 
        { 
          backgroundColor: colors.card,
          borderLeftColor: isEmergency ? '#EF4444' : colors.primary,
        }
      ]}>
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
            color={colors.textSecondary}
            style={{
              transform: [{ rotate: isExpanded ? '180deg' : '0deg' }]
            }}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionContent}>
            {renderStyledText(section.content)}
            
            {isEmergency && (
              <View style={[styles.emergencyBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <View style={styles.emergencyHeader}>
                  <AlertCircle size={16} color="#EF4444" />
                  <Text style={styles.emergencyTitle}>Lebensbedrohliche Komplikationen</Text>
                </View>
                <Text style={[styles.emergencyText, { color: colors.text }]}>
                  Sofortige medizinische Intervention erforderlich
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }, [colors, expandedSections, toggleSection, getIconForSection, renderStyledText]);

  const medicalSections = useMemo(() => {
    console.log('Computing medicalSections with:', {
      hasHtml: !!htmlContent,
      htmlContent: htmlContent?.substring(0, 100) + '...',
      hasJson: !!jsonContent,
      jsonContent,
      jsonIsArray: Array.isArray(jsonContent),
      jsonLength: Array.isArray(jsonContent) ? jsonContent.length : 'N/A',
      hasPlainText: !!plainTextContent,
      plainTextContent: plainTextContent?.substring(0, 100) + '...'
    });

    // Handle HTML content by extracting text first
    if (htmlContent) {
      console.log('Processing HTML content');
      const cleanText = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
        .replace(/<[^>]*>/g, ' ') // Replace HTML tags with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      if (cleanText && cleanText.length > 50) {
        console.log('Extracted clean text from HTML, parsing as text');
        const sections = parseTextToMedicalSections(cleanText);
        console.log('Parsed sections from HTML:', sections.length);
        return sections;
      }
    }
    
    if (jsonContent && Array.isArray(jsonContent) && jsonContent.length > 0) {
      console.log('Using JSON content');
      return jsonContent;
    }
    
    if (plainTextContent) {
      console.log('Using plain text content');
      const sections = parseTextToMedicalSections(plainTextContent);
      console.log('Parsed sections from plain text:', sections);
      return sections;
    }
    
    console.log('No content found, returning empty array');
    return [];
  }, [htmlContent, jsonContent, plainTextContent, parseTextToMedicalSections]);

  const renderNavigationPills = useCallback(() => {
    if (medicalSections.length === 0) return null;
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.navigationContainer}
        contentContainerStyle={styles.navigationContent}
      >
        {medicalSections.map((section, index) => (
          <TouchableOpacity
            key={section.id}
            style={[
              styles.navPill,
              { backgroundColor: expandedSections[section.id] ? colors.primary : colors.surface }
            ]}
            onPress={() => toggleSection(section.id)}
          >
            <Text style={[
              styles.navPillText,
              { color: expandedSections[section.id] ? 'white' : colors.text }
            ]}>
              {section.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }, [medicalSections, expandedSections, colors, toggleSection]);

  // Debug logging
  console.log('MedicalContentRenderer received:', {
    htmlContent: htmlContent,
    jsonContent: jsonContent,
    plainTextContent: plainTextContent,
    title,
    htmlContentType: typeof htmlContent,
    jsonContentType: typeof jsonContent,
    plainTextContentType: typeof plainTextContent
  });

  // Debug: show what we actually have
  console.log('Final check - medicalSections.length:', medicalSections.length);

  if (!htmlContent && !jsonContent && !plainTextContent) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
        <BookOpen size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
          Keine medizinischen Inhalte verfügbar
        </Text>
      </View>
    );
  }

  // If we have content but no sections were parsed, create a fallback section
  if (medicalSections.length === 0 && (htmlContent || jsonContent || plainTextContent)) {
    const fallbackContent = htmlContent || 
      (typeof jsonContent === 'string' ? jsonContent : JSON.stringify(jsonContent, null, 2)) || 
      plainTextContent || 
      'Inhalt konnte nicht geladen werden';
    
    const fallbackSections = [{
      id: 'fallback',
      title: 'Medizinischer Inhalt',
      icon: 'definition',
      content: fallbackContent,
      type: 'definition' as const,
    }];
    
    console.log('Using fallback sections:', fallbackSections);
    
    return (
      <View style={styles.container}>
        {/* Header with gradient */}
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
        {renderProgressStats()}

        {/* Content Sections */}
        <View style={styles.contentContainer}>
          {fallbackSections.map((section, index) => renderSection(section, index))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with gradient */}
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
      {renderProgressStats()}

      {/* Navigation Pills */}
      {renderNavigationPills()}

      {/* Content Sections */}
      <View style={styles.contentContainer}>
        {medicalSections.map((section, index) => renderSection(section, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  navigationContainer: {
    marginBottom: 20,
  },
  navigationContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  navPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  navPillText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  contentContainer: {
    gap: 16,
  },
  sectionCard: {
    borderRadius: 16,
    borderLeftWidth: 4,
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
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-Regular',
  },
  numberHighlight: {
    backgroundColor: '#2196F3',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    overflow: 'hidden',
  },
  medicalTermHighlight: {
    fontFamily: 'Inter-Bold',
    borderBottomWidth: 2,
    borderBottomColor: 'currentColor',
    borderStyle: 'dotted',
  },
  emergencyBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emergencyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
    marginLeft: 8,
  },
  emergencyText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 16,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default MedicalContentRenderer;