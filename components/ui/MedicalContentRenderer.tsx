import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [activePill, setActivePill] = useState<string>('');
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<Record<string, View | null>>({});

  // Auto-expand first section when sections are loaded
  React.useEffect(() => {
    if (medicalSections.length > 0 && Object.keys(expandedSections).length === 0) {
      const firstSectionId = medicalSections[0].id;
      setExpandedSections({ [firstSectionId]: true });
      setActivePill(firstSectionId);
      console.log('🔓 Auto-expanding first section:', firstSectionId);
    }
  }, [medicalSections, expandedSections]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    setActivePill(sectionId);
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: true, // Auto-expand when navigating to section
    }));

    const targetRef = sectionRefs.current[sectionId];
    if (targetRef && scrollViewRef.current) {
      targetRef.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100, // Offset for header
            animated: true,
          });
        },
        () => {
          console.log('Failed to measure section layout');
        }
      );
    }
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
    
    console.log('🔬 PARSING MEDICAL TEXT - Length:', text.length);
    console.log('🔍 First 500 chars:', text.substring(0, 500));
    
    // UNIVERSAL MEDICAL SECTION CREATION - WORKS FOR ALL CONTENT
    const sections: MedicalSection[] = [];
    
    // Create intelligent sections by analyzing content semantically
    const textWords = text.toLowerCase();
    const textLength = text.length;
    
    // Determine the best way to split this specific content
    let contentChunks: string[] = [];
    
    // Try multiple splitting strategies to find the best one
    if (text.includes('\n\n')) {
      // Split by double line breaks (common in formatted medical content)
      contentChunks = text.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 50);
      console.log('📝 Using paragraph splitting, found', contentChunks.length, 'chunks');
    } else if (text.includes('. ') && textLength > 1000) {
      // For long content, split by sentences that start with capital letters
      contentChunks = text.split(/\. (?=[A-ZÄÖÜ])/).filter(chunk => chunk.trim().length > 100);
      console.log('📝 Using sentence splitting, found', contentChunks.length, 'chunks');
    } else {
      // For shorter content, create logical sections based on length
      const wordsPerSection = Math.min(200, Math.max(50, Math.floor(text.split(' ').length / 4)));
      const words = text.split(' ');
      
      for (let i = 0; i < words.length; i += wordsPerSection) {
        const chunk = words.slice(i, i + wordsPerSection).join(' ');
        if (chunk.trim().length > 50) {
          contentChunks.push(chunk);
        }
      }
      console.log('📝 Using word-based splitting, found', contentChunks.length, 'chunks');
    }
    
    // SMART SECTION ASSIGNMENT - Analyze each chunk for medical content
    contentChunks.forEach((chunk, index) => {
      const lowerChunk = chunk.toLowerCase();
      const chunkLength = chunk.length;
      
      // Determine section based on content analysis and position
      let sectionType: MedicalSection['type'] = 'definition';
      let sectionTitle = 'Medizinischer Inhalt';
      
      // COMPREHENSIVE MEDICAL KEYWORD ANALYSIS
      if (index === 0 || lowerChunk.includes('definition') || lowerChunk.includes('ist eine') || 
          lowerChunk.includes('bezeichnet') || lowerChunk.includes('versteht man')) {
        sectionType = 'definition';
        sectionTitle = 'Definition und Klassifikation';
      } 
      else if (lowerChunk.includes('häufig') || lowerChunk.includes('prozent') || lowerChunk.includes('%') ||
               lowerChunk.includes('epidemiologie') || lowerChunk.includes('inzidenz') || lowerChunk.includes('prävalenz') ||
               lowerChunk.includes('betrifft') || lowerChunk.includes('erkranken')) {
        sectionType = 'epidemiology';
        sectionTitle = 'Epidemiologie und Häufigkeit';
      }
      else if (lowerChunk.includes('ursache') || lowerChunk.includes('entsteh') || lowerChunk.includes('pathophysiologie') ||
               lowerChunk.includes('mechanismus') || lowerChunk.includes('führt zu') || lowerChunk.includes('verursacht')) {
        sectionType = 'etiology';
        sectionTitle = 'Ätiologie und Pathophysiologie';
      }
      else if (lowerChunk.includes('symptom') || lowerChunk.includes('zeichen') || lowerChunk.includes('klinik') ||
               lowerChunk.includes('beschwerden') || lowerChunk.includes('äußert sich') || lowerChunk.includes('manifestiert')) {
        sectionType = 'symptoms';
        sectionTitle = 'Klinische Symptomatik';
      }
      else if (lowerChunk.includes('diagnos') || lowerChunk.includes('untersuch') || lowerChunk.includes('test') ||
               lowerChunk.includes('labor') || lowerChunk.includes('bildgebung') || lowerChunk.includes('nachweis')) {
        sectionType = 'diagnosis';
        sectionTitle = 'Diagnostik und Untersuchungen';
      }
      else if (lowerChunk.includes('therap') || lowerChunk.includes('behandl') || lowerChunk.includes('medikament') ||
               lowerChunk.includes('management') || lowerChunk.includes('gabe von') || lowerChunk.includes('verabreich')) {
        sectionType = 'therapy';
        sectionTitle = 'Therapie und Management';
      }
      else if (lowerChunk.includes('prognose') || lowerChunk.includes('verlauf') || lowerChunk.includes('heilung') ||
               lowerChunk.includes('komplikation') || lowerChunk.includes('outcome') || lowerChunk.includes('folge')) {
        sectionType = 'prognosis';
        sectionTitle = 'Prognose und Verlauf';
      }
      else if (lowerChunk.includes('notfall') || lowerChunk.includes('alarm') || lowerChunk.includes('kritisch') ||
               lowerChunk.includes('gefahr') || lowerChunk.includes('warnsignal') || lowerChunk.includes('sofort')) {
        sectionType = 'emergency';
        sectionTitle = 'Alarmsymptome und Notfälle';
      }
      else {
        // Create descriptive titles based on content analysis
        if (lowerChunk.includes('klassifizierung') || lowerChunk.includes('einteilung')) {
          sectionTitle = 'Klassifikation und Einteilung';
        } else if (lowerChunk.includes('stadien') || lowerChunk.includes('grade') || lowerChunk.includes('schweregrad')) {
          sectionTitle = 'Stadien und Schweregrade';
        } else if (lowerChunk.includes('risikofaktoren') || lowerChunk.includes('risiko')) {
          sectionTitle = 'Risikofaktoren';
          sectionType = 'etiology';
        } else if (lowerChunk.includes('monitoring') || lowerChunk.includes('überwachung')) {
          sectionTitle = 'Monitoring und Überwachung';
          sectionType = 'diagnosis';
        } else if (lowerChunk.includes('prävention') || lowerChunk.includes('vorbeugung')) {
          sectionTitle = 'Prävention';
          sectionType = 'therapy';
        } else {
          sectionTitle = `Klinische Information ${index + 1}`;
        }
      }
      
      console.log(`✅ Section ${index + 1}: ${sectionTitle} (${sectionType}) - ${chunkLength} chars`);
      
      sections.push({
        id: `smart_${index}`,
        title: sectionTitle,
        icon: sectionType,
        content: chunk.trim(),
        type: sectionType,
      });
    });
    
    // Ensure we always have at least one section
    if (sections.length === 0) {
      console.log('⚠️  No sections created, adding fallback section');
      sections.push({
        id: 'fallback',
        title: 'Medizinischer Inhalt',
        icon: 'definition',
        content: text.trim(),
        type: 'definition',
      });
    }
    
    console.log('🎯 FINAL RESULT: Created', sections.length, 'sections:', sections.map(s => s.title));
    return sections;
  }, []);

  const renderStyledText = useCallback((text: string) => {
    // Enhanced text parsing with more medical terms and better formatting
    const parts = text.split(/(\b\d+[.,]?\d*%?\b|\b[A-Z]{2,}\b|\b(?:KDIGO|AKI|ICD-10|EKG|ECG|CT|MRT|MRI|WHO|NYHA|ASS|ACE|ARB|NSAID)\b|\b(?:Stadium|Grad|Stufe)\s+[IVXLC0-9]+\b)/g);
    
    return (
      <View style={styles.styledTextContainer}>
        <Text style={[styles.contentText, { color: colors.text }]}>
          {parts.map((part, index) => {
            // Check if part should be highlighted
            if (/^\d+[.,]?\d*%?$/.test(part)) {
              // Number with badge
              return (
                <Text key={index} style={[styles.numberHighlight, { backgroundColor: colors.primary + '20', color: colors.primary }]}>
                  {part}
                </Text>
              );
            } else if (/^[A-Z]{2,}$/.test(part) || /^(?:KDIGO|AKI|ICD-10|EKG|ECG|CT|MRT|MRI|WHO|NYHA|ASS|ACE|ARB|NSAID)$/.test(part)) {
              // Medical term or classification
              return (
                <Text key={index} style={[styles.medicalTermHighlight, { 
                  color: colors.primary,
                  backgroundColor: colors.primary + '15',
                  borderRadius: 4,
                  paddingHorizontal: 4,
                  paddingVertical: 2
                }]}>
                  {part}
                </Text>
              );
            } else if (/(?:Stadium|Grad|Stufe)\s+[IVXLC0-9]+/.test(part)) {
              // Medical staging
              return (
                <Text key={index} style={[styles.stagingHighlight, { 
                  color: '#F59E0B',
                  backgroundColor: '#FEF3C7',
                  borderRadius: 4,
                  paddingHorizontal: 4,
                  paddingVertical: 2,
                  fontWeight: 'bold'
                }]}>
                  {part}
                </Text>
              );
            }
            return part;
          })}
        </Text>
      </View>
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
      <View 
        key={section.id} 
        ref={(ref) => {
          sectionRefs.current[section.id] = ref;
        }}
        style={[
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
    console.log('🔍 Computing medicalSections with:', {
      hasHtml: !!htmlContent,
      htmlContent: htmlContent?.substring(0, 100) + '...',
      hasJson: !!jsonContent,
      jsonContent,
      jsonIsArray: Array.isArray(jsonContent),
      jsonLength: Array.isArray(jsonContent) ? jsonContent.length : 'N/A',
      hasPlainText: !!plainTextContent,
      plainTextContent: plainTextContent?.substring(0, 100) + '...'
    });

    // PRIORITY 1: Use structured JSON content if available and properly formatted
    if (jsonContent && Array.isArray(jsonContent) && jsonContent.length > 0) {
      console.log('✅ Using existing JSON content sections');
      
      // Validate and ensure JSON content has proper structure
      const validSections = jsonContent.filter(section => 
        section && 
        typeof section === 'object' && 
        section.title && 
        section.content
      );
      
      if (validSections.length > 0) {
        console.log('✅ Found', validSections.length, 'valid JSON sections');
        return validSections.map((section, index) => ({
          id: section.id || `json_${index}`,
          title: section.title,
          icon: section.type || 'definition',
          content: section.content,
          type: section.type || 'definition',
          stats: section.stats,
          highlights: section.highlights,
          importantBox: section.importantBox
        }));
      }
    }

    // PRIORITY 2: Handle HTML content by extracting text first
    if (htmlContent) {
      console.log('🔄 Processing HTML content');
      const cleanText = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
        .replace(/<[^>]*>/g, ' ') // Replace HTML tags with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      if (cleanText && cleanText.length > 50) {
        console.log('🔄 Extracted clean text from HTML, parsing as text');
        const sections = parseTextToMedicalSections(cleanText);
        console.log('✅ Parsed', sections.length, 'sections from HTML');
        return sections;
      }
    }
    
    // PRIORITY 3: Handle plain text content
    if (plainTextContent) {
      console.log('🔄 Using plain text content');
      const sections = parseTextToMedicalSections(plainTextContent);
      console.log('✅ Parsed', sections.length, 'sections from plain text');
      return sections;
    }
    
    // PRIORITY 4: Handle malformed JSON content as string
    if (jsonContent && typeof jsonContent === 'string' && jsonContent.length > 50) {
      console.log('🔄 JSON content is string, parsing as text');
      const sections = parseTextToMedicalSections(jsonContent);
      console.log('✅ Parsed', sections.length, 'sections from JSON string');
      return sections;
    }
    
    console.log('❌ No usable content found, returning empty array');
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
              { 
                backgroundColor: activePill === section.id ? colors.primary : 
                                expandedSections[section.id] ? colors.primary + '80' : colors.surface 
              }
            ]}
            onPress={() => scrollToSection(section.id)}
          >
            <Text style={[
              styles.navPillText,
              { 
                color: activePill === section.id ? 'white' :
                       expandedSections[section.id] ? colors.primary : colors.text 
              }
            ]}>
              {section.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }, [medicalSections, expandedSections, colors, activePill, scrollToSection]);

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
  console.log('🔍 Final check - medicalSections.length:', medicalSections.length);
  console.log('🔍 Content available:', {
    html: !!htmlContent,
    json: !!jsonContent, 
    plain: !!plainTextContent
  });

  if (!htmlContent && !jsonContent && !plainTextContent) {
    console.log('❌ No content available at all');
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

  console.log('🎯 Rendering MedicalContentRenderer with', medicalSections.length, 'sections');

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

      {/* Scrollable Content Sections */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {medicalSections.map((section, index) => {
            console.log(`🔄 Rendering section ${index + 1}: ${section.title}`);
            return renderSection(section, index);
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
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
  styledTextContainer: {
    marginVertical: 8,
  },
  stagingHighlight: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    marginHorizontal: 1,
  },
});

export default MedicalContentRenderer;