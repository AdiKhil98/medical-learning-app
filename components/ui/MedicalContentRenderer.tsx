import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<Record<string, View | null>>({});
  const [visibleSections, setVisibleSections] = useState<string[]>([]);

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

  const scrollToSection = useCallback((sectionId: string) => {
    const sectionRef = sectionRefs.current[sectionId];
    if (sectionRef && scrollViewRef.current) {
      sectionRef.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100, // Offset for header
            animated: true,
          });
        },
        () => {}
      );
    }
  }, []);

  // Enhanced navigation with better visual feedback
  const handleNavPillPress = useCallback((section: MedicalSection) => {
    const isCurrentlyExpanded = expandedSections[section.id];
    
    if (isCurrentlyExpanded) {
      // If already expanded, scroll to it
      scrollToSection(section.id);
    } else {
      // If not expanded, expand it first, then scroll
      toggleSection(section.id);
      setTimeout(() => scrollToSection(section.id), 150);
    }
  }, [expandedSections, toggleSection, scrollToSection]);

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

  // Enhanced medical text rendering with rich highlighting
  const renderContent = useCallback((text: string) => {
    try {
      // Enhanced pattern matching for medical content (JavaScript-compatible)
      const medicalPattern = /(\b\d+[.,]?\d*\s*(?:mg\/dl|mmol\/l|Jahre?|Stunden?|Tagen?|ml\/24h|ml\/kg\s*KG\/h|%|Fälle?)\b|\b\d+[.,]?\d*%?\b|\b(?:KDIGO|AKI|ICD-10|EKG|ECG|CT|MRT|MRI|WHO|NYHA|ACE|ARB|NSAID)\b|\b(?:Tubulusnekrose|Glomerulonephritis|Kussmaul-Atmung|KDIGO-Kriterien|KDIGO-Stadien)\b|\b(?:Stadium|Grad|Stufe)\s+[IVXLC0-9]+\b|\b(?:AKI-Stadium)\s+\d+\b|\bICD-10\s+unter\s+[A-Z]\d+\b)/gi;
      
      const parts = text.split(medicalPattern).filter(part => part != null);
      
      return (
        <Text style={[styles.contentText, { color: colors.text || '#333' }]}>
          {parts.map((part, index) => {
            if (!part) return null;
            
            const trimmedPart = part.trim();
            
            // Medical numbers with units (blue badges)
            if (/^\d+[.,]?\d*\s*(mg\/dl|mmol\/l|Jahre?|Stunden?|Tagen?|ml\/24h|ml\/kg\s*KG\/h|%|Fälle?)$/i.test(trimmedPart)) {
              return (
                <Text key={index} style={styles.numberBadgeWithUnit}>
                  {trimmedPart}
                </Text>
              );
            }
            
            // Simple numbers (smaller blue badges)
            if (/^\d+[.,]?\d*%?$/.test(trimmedPart)) {
              return (
                <Text key={index} style={styles.numberBadge}>
                  {trimmedPart}
                </Text>
              );
            }
            
            // Medical terms (purple with dotted underline)
            if (/^(?:KDIGO|AKI|ICD-10|EKG|ECG|CT|MRT|MRI|WHO|NYHA|ACE|ARB|NSAID|Tubulusnekrose|Glomerulonephritis|Kussmaul-Atmung|KDIGO-Kriterien|KDIGO-Stadien)$/i.test(trimmedPart)) {
              return (
                <Text key={index} style={styles.medicalTerm}>
                  {trimmedPart}
                </Text>
              );
            }
            
            // Medical stages and classifications (gradient purple badges)
            if (/^(?:Stadium|Grad|Stufe)\s+[IVXLC0-9]+$|^AKI-Stadium\s+\d+$/i.test(trimmedPart)) {
              return (
                <Text key={index} style={styles.classificationBadge}>
                  {trimmedPart}
                </Text>
              );
            }
            
            // ICD codes (special classification)
            if (/^ICD-10\s+unter\s+[A-Z]\d+$/i.test(trimmedPart)) {
              return (
                <Text key={index} style={styles.icdCodeBadge}>
                  {trimmedPart}
                </Text>
              );
            }
            
            return trimmedPart;
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

  // Render important warning boxes based on content analysis
  const renderImportantBoxes = useCallback((content: string, sectionType: string) => {
    const boxes = [];
    const lowerContent = content.toLowerCase();
    
    // Emergency/Critical information boxes
    if (sectionType === 'emergency' || lowerContent.includes('lebensbedrohlich') || 
        lowerContent.includes('sofort') || lowerContent.includes('notfall')) {
      boxes.push(
        <View key="emergency" style={styles.emergencyBox}>
          <View style={styles.importantBoxHeader}>
            <AlertTriangle size={16} color="#EF4444" />
            <Text style={styles.emergencyBoxTitle}>⚠️ Lebensbedrohliche Komplikationen</Text>
          </View>
          <Text style={[styles.importantBoxText, { color: colors.text || '#333' }]}>
            Sofortige medizinische Intervention erforderlich bei Hyperkaliämie, Lungenödem oder schwerer Azidose.
          </Text>
        </View>
      );
    }
    
    // Therapy/Treatment boxes
    if (sectionType === 'therapy' || lowerContent.includes('nierenersatztherapie') || 
        lowerContent.includes('dialyse') || lowerContent.includes('indikationen')) {
      boxes.push(
        <View key="therapy" style={styles.therapyBox}>
          <View style={styles.importantBoxHeader}>
            <Heart size={16} color="#F57C00" />
            <Text style={styles.therapyBoxTitle}>🎯 Indikationen zur Nierenersatztherapie</Text>
          </View>
          <View style={styles.bulletPoints}>
            <Text style={[styles.bulletPoint, { color: colors.text || '#333' }]}>• Therapierefraktäre Hyperkaliämie über 6,5 mmol/l</Text>
            <Text style={[styles.bulletPoint, { color: colors.text || '#333' }]}>• Schwere Azidose mit pH unter 7,1</Text>
            <Text style={[styles.bulletPoint, { color: colors.text || '#333' }]}>• Lungenödem bei Flüssigkeitsretention</Text>
            <Text style={[styles.bulletPoint, { color: colors.text || '#333' }]}>• Urämische Komplikationen</Text>
          </View>
        </View>
      );
    }
    
    // Diagnostic boxes
    if (sectionType === 'diagnosis' || lowerContent.includes('kdigo') || lowerContent.includes('stadien')) {
      boxes.push(
        <View key="diagnostic" style={styles.diagnosticBox}>
          <View style={styles.importantBoxHeader}>
            <Activity size={16} color="#2196F3" />
            <Text style={styles.diagnosticBoxTitle}>📊 KDIGO-Klassifikation</Text>
          </View>
          <Text style={[styles.importantBoxText, { color: colors.text || '#333' }]}>
            Stadium 1: Kreatinin-Anstieg ≥0,3 mg/dl oder 1,5-1,9x Baseline{'\n'}
            Stadium 2: Kreatinin-Anstieg 2,0-2,9x Baseline{'\n'}
            Stadium 3: Kreatinin-Anstieg ≥3,0x Baseline oder Dialysepflichtigkeit
          </Text>
        </View>
      );
    }
    
    return boxes;
  }, [colors.text]);

  const renderSection = useCallback((section: MedicalSection) => {
    const isExpanded = expandedSections[section.id];
    
    return (
      <View 
        key={section.id} 
        ref={(ref) => {
          sectionRefs.current[section.id] = ref;
        }}
        style={[styles.sectionCard, { backgroundColor: colors.card || '#fff' }]}
      >
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
            {renderImportantBoxes(section.content, section.type)}
          </View>
        )}
      </View>
    );
  }, [colors, expandedSections, toggleSection, getIconForSection, renderContent, renderImportantBoxes]);

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

  // Interactive navigation pills with scroll-to functionality
  const renderNavigationPills = useCallback(() => {
    if (medicalSections.length <= 1) return null;
    
    return (
      <View style={styles.navigationWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.navigationContainer}
          contentContainerStyle={styles.navigationContent}
        >
          {medicalSections.map((section) => {
            const isActive = expandedSections[section.id];
            const isVisible = visibleSections.includes(section.id);
            
            return (
              <TouchableOpacity
                key={section.id}
                style={[
                  styles.navPill,
                  { 
                    backgroundColor: isActive ? (colors.primary || '#4CAF50') : (colors.card || '#f0f0f0'),
                    borderColor: colors.primary || '#4CAF50',
                    borderWidth: isActive ? 0 : 1,
                    transform: [{ scale: isVisible ? 1.05 : 1 }],
                  }
                ]}
                onPress={() => handleNavPillPress(section)}
                activeOpacity={0.7}
              >
                <View style={styles.navPillContent}>
                  {isVisible && (
                    <View style={[styles.visibilityIndicator, { backgroundColor: colors.primary || '#4CAF50' }]} />
                  )}
                  <Text style={[
                    styles.navPillText,
                    { 
                      color: isActive ? 'white' : (colors.primary || '#4CAF50'),
                      fontWeight: isVisible ? '700' : '600',
                    }
                  ]}>
                    {section.title}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [medicalSections, expandedSections, visibleSections, colors.primary, colors.card, handleNavPillPress]);

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
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container} 
      showsVerticalScrollIndicator={false}
    >
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

      {/* Navigation Pills */}
      {renderNavigationPills()}

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
  // Navigation Styles
  navigationWrapper: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  navigationContainer: {
    paddingVertical: 15,
  },
  navigationContent: {
    paddingHorizontal: 15,
    gap: 10,
  },
  navPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 80,
    alignItems: 'center',
  },
  navPillText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  navPillContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  visibilityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.8,
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
  numberBadgeWithUnit: {
    backgroundColor: '#2196F3',
    color: 'white',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
    marginHorizontal: 1,
  },
  medicalTerm: {
    color: '#9C27B0',
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: '#9C27B0',
  },
  classificationBadge: {
    backgroundColor: '#6366f1',
    color: 'white',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 15,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
    marginHorizontal: 1,
  },
  icdCodeBadge: {
    backgroundColor: '#4834d4',
    color: 'white',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 15,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
    marginHorizontal: 1,
  },
  // Important Box Styles
  emergencyBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftWidth: 5,
    borderLeftColor: '#EF4444',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  therapyBox: {
    backgroundColor: 'rgba(245, 124, 0, 0.1)',
    borderLeftWidth: 5,
    borderLeftColor: '#F57C00',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  diagnosticBox: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderLeftWidth: 5,
    borderLeftColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  importantBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emergencyBoxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
    marginLeft: 8,
  },
  therapyBoxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57C00',
    marginLeft: 8,
  },
  diagnosticBoxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginLeft: 8,
  },
  importantBoxText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter-Medium',
  },
  bulletPoints: {
    gap: 4,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 20,
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