import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { ChevronDown, BookOpen, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface MedicalSection {
  title: string;
  content: string;
  processedContent?: string;
  subtypes?: SubtypeCard[];
}

interface SubtypeCard {
  title: string;
  percentage: string;
  description?: string;
}

interface SupabaseRow {
  idx: number;
  slug: string;
  title: string;
  parent_slug: string | null;
  description?: string;
  icon: string;
  color: string;
  content_json?: string;
  category: string;
  last_updated?: string;
}

interface InteractiveMedicalContentProps {
  supabaseRow: SupabaseRow;
}

const InteractiveMedicalContent: React.FC<InteractiveMedicalContentProps> = ({ supabaseRow }) => {
  const { colors, isDarkMode } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // STEP 5: CSS Styles Definition - Animation Implementation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Fade in animation on component mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // STEP 1: Parse and Clean Data
  // STEP 2: Pattern Recognition Rules  
  const processedSections = useMemo(() => {
    console.log('🔍 STEP 1: Parse and Clean Data');
    console.log('Raw supabaseRow:', supabaseRow);
    console.log('content_json:', supabaseRow.content_json);

    // Check if we have content_json
    if (!supabaseRow.content_json) {
      console.log('❌ No content_json found');
      return [];
    }

    try {
      // Parse the content_json string
      let sections: MedicalSection[] = [];
      
      // Handle different possible JSON structures
      if (typeof supabaseRow.content_json === 'string') {
        sections = JSON.parse(supabaseRow.content_json);
      } else if (Array.isArray(supabaseRow.content_json)) {
        sections = supabaseRow.content_json;
      } else {
        console.log('⚠️ Unexpected content_json type:', typeof supabaseRow.content_json);
        return [];
      }

      console.log('📄 Parsed sections:', sections.length);

      // Clean each section's content  
      const cleanedSections = sections.map((section, index) => {
        if (!section || typeof section !== 'object') {
          console.log(`⚠️ Invalid section at index ${index}:`, section);
          return {
            title: `Section ${index + 1}`,
            content: 'Invalid section data'
          };
        }

        const cleanContent = (section.content || '')
          .replace(/\\n\\n/g, '</p><p>')  // Convert double line breaks to paragraphs
          .replace(/\\n/g, ' ')            // Single line breaks to spaces  
          .replace(/\\\\/g, '')            // Remove double escape characters
          .replace(/\\"/g, '"')            // Fix escaped quotes
          .replace(/\\'/g, "'")            // Fix escaped single quotes
          .trim();

        console.log(`✅ STEP 1 - Cleaned section: "${section.title}" (${cleanContent.length} chars)`);

        // STEP 2: Apply Pattern Recognition Rules
        console.log('🎯 STEP 2: Applying Pattern Recognition Rules');
        
        const processedContent = applyPatternRecognition(cleanContent);
        const subtypes = extractSubtypes(cleanContent);
        
        console.log(`✅ STEP 2 - Processed section: "${section.title}" (patterns applied)`);

        return {
          title: section.title || `Section ${index + 1}`,
          content: cleanContent,
          processedContent: processedContent,
          subtypes: subtypes
        };
      });

      return cleanedSections.filter(section => section.content.length > 0);

    } catch (error) {
      console.error('❌ Error parsing content_json:', error);
      return [];
    }
  }, [supabaseRow.content_json]);

  // STEP 4: Enhanced Section Generation Function - Process Content
  const processContent = (content: string): string => {
    let processed = content;
    
    console.log('🔄 STEP 4: Processing content with enhanced patterns...');

    // Step 4.1: Wrap percentages in stat-number spans (enhanced from Step 2)
    processed = processed.replace(/(\d{1,3}[-–]\d{1,3}\s?(%|Prozent))/gi, 
      '<STAT_NUMBER>$1</STAT_NUMBER>');
    
    // Step 4.2: Wrap medical terms (enhanced pattern)
    processed = processed.replace(/([A-ZÄÖÜ][a-zäöüß]+[-][A-ZÄÖÜ][a-zäöüß]+[-]?[A-Za-zäöüß]*)/g,
      '<MEDICAL_TERM>$1</MEDICAL_TERM>');
    
    // Step 4.3: Create highlight boxes for lists starting with bullet points
    processed = processed.replace(/•\s(.+?)(?=•|\.|\n|$)/g,
      '<CRITERIA_ITEM>✓ $1</CRITERIA_ITEM>');
    
    // Step 4.4: Detect subtypes and create cards (enhanced detection)
    processed = processed.replace(/(Hyperaktives|Hypoaktives|Gemischtes)\s+\w+\s+\((\d+\s?%?)\)/g,
      '<SUBTYPE_CARD>$1|$2</SUBTYPE_CARD>');

    // Step 4.5: Additional medical pattern recognition
    // Numbers with units (e.g., ">60 Jahre", "500 mg")
    processed = processed.replace(
      />?\s?(\d{1,3})\s?(Jahre|years|mg|ml|mmol|kg|cm|mm)/gi,
      '<STAT_NUMBER>>$1 $2</STAT_NUMBER>'
    );

    // Single percentages (e.g., "75%", "80 Prozent")
    processed = processed.replace(
      /(\d{1,3})(,\d{1,3})?\s?(%|Prozent|percent)/gi,
      '<STAT_NUMBER>$1$2$3</STAT_NUMBER>'
    );

    // Latin medical terms (ending in -itis, -ose, -om, -ie)
    processed = processed.replace(
      /\b([A-ZÄÖÜ][a-zäöüß]*(?:itis|ose|om|ie))\b/g,
      '<MEDICAL_TERM>$1</MEDICAL_TERM>'
    );

    // Medical abbreviations in caps (CAM, ICU, DSM-5, ICD-11)
    processed = processed.replace(
      /\b([A-Z]{2,}(?:-\d+)?)\b/g,
      '<MEDICAL_TERM>$1</MEDICAL_TERM>'
    );

    console.log('✅ STEP 4: Content processing complete');
    return processed;
  };

  // Legacy function for backwards compatibility 
  const applyPatternRecognition = (content: string): string => {
    return processContent(content);
  };

  const extractSubtypes = (content: string): SubtypeCard[] => {
    console.log('🏷️ Extracting subtypes/classifications...');
    
    const subtypes: SubtypeCard[] = [];
    
    // Subtypes/Classifications Pattern (e.g., "Hyperaktives Delir (25%)")
    const subtypeMatches = content.matchAll(/^([\w\s]+)\s?\((\d{1,3}\s?(?:%|Prozent))\)/gm);
    
    for (const match of subtypeMatches) {
      const title = match[1].trim();
      const percentage = match[2].trim();
      
      subtypes.push({
        title: title,
        percentage: percentage
      });
      
      console.log(`📋 Found subtype: "${title}" (${percentage})`);
    }

    return subtypes;
  };

  // STEP 3: Helper Functions
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unbekannt';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Unbekannt';
    }
  };

  const getIcon = (title: string): string => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('definition') || lowerTitle.includes('begriff')) return '📋';
    if (lowerTitle.includes('symptom') || lowerTitle.includes('anzeichen')) return '🔍';
    if (lowerTitle.includes('diagnose') || lowerTitle.includes('diagnostic')) return '🩺';
    if (lowerTitle.includes('behandlung') || lowerTitle.includes('therapie')) return '💊';
    if (lowerTitle.includes('epidemiologie') || lowerTitle.includes('häufigkeit')) return '📊';
    if (lowerTitle.includes('pathophysiologie') || lowerTitle.includes('mechanismus')) return '⚙️';
    if (lowerTitle.includes('prognose') || lowerTitle.includes('verlauf')) return '📈';
    if (lowerTitle.includes('komplikation') || lowerTitle.includes('risik')) return '⚠️';
    
    return '📝';
  };

  // STEP 4: Section Generation Function - Enhanced Content Renderer
  const renderProcessedContent = (content: string) => {
    console.log('🎨 STEP 4: Rendering processed content with enhanced patterns...');
    
    // Split content by all possible HTML-like tags
    const segments = content.split(/(<(?:STAT_NUMBER|MEDICAL_TERM|CRITERIA_ITEM|SUBTYPE_CARD)>.*?<\/(?:STAT_NUMBER|MEDICAL_TERM|CRITERIA_ITEM|SUBTYPE_CARD)>)/);
    
    const renderedElements: React.ReactElement[] = [];
    let criteriaItems: string[] = [];
    let subtypeCards: { title: string, percentage: string }[] = [];
    
    segments.forEach((segment, index) => {
      if (segment.startsWith('<STAT_NUMBER>')) {
        const text = segment.replace(/<\/?STAT_NUMBER>/g, '');
        renderedElements.push(
          <Text key={index} style={styles.statNumberCss}>
            {text}
          </Text>
        );
      } else if (segment.startsWith('<MEDICAL_TERM>')) {
        const text = segment.replace(/<\/?MEDICAL_TERM>/g, '');
        renderedElements.push(
          <Text key={index} style={styles.medicalTermCss}>
            {text}
          </Text>
        );
      } else if (segment.startsWith('<CRITERIA_ITEM>')) {
        const text = segment.replace(/<\/?CRITERIA_ITEM>/g, '');
        criteriaItems.push(text);
      } else if (segment.startsWith('<SUBTYPE_CARD>')) {
        const text = segment.replace(/<\/?SUBTYPE_CARD>/g, '');
        const [title, percentage] = text.split('|');
        if (title && percentage) {
          subtypeCards.push({ title: title.trim(), percentage: percentage.trim() });
        }
      } else if (segment.trim()) {
        // Regular text
        renderedElements.push(
          <Text key={index}>{segment}</Text>
        );
      }
    });

    return (
      <View>
        {/* Main content text */}
        <Text style={[styles.contentText, { color: colors.text }]}>
          {renderedElements}
        </Text>
        
        {/* STEP 5: CSS Styles - Criteria items as highlighted list */}
        {criteriaItems.length > 0 && (
          <View style={[styles.highlightBox, { borderLeftColor: '#667eea' }]}>
            <LinearGradient
              colors={['rgba(102, 126, 234, 0.08)', 'rgba(118, 75, 162, 0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.highlightBoxGradient}
            >
              <Text style={[styles.criteriaTitle, { color: colors.text }]}>
                📋 Wichtige Kriterien
              </Text>
              {criteriaItems.map((item, index) => (
                <View key={index} style={[styles.criteriaItemCss, { 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
                  borderLeftColor: '#667eea'
                }]}>
                  <Text style={[styles.criteriaText, { color: colors.text }]}>
                    {item}
                  </Text>
                </View>
              ))}
            </LinearGradient>
          </View>
        )}
        
        {/* STEP 5: CSS Styles - Subtype cards */}
        {subtypeCards.length > 0 && (
          <View style={styles.subtypeCardsContainer}>
            <Text style={[styles.subtypeCardsTitle, { color: colors.text }]}>
              🏷️ Subtypen
            </Text>
            <View style={styles.subtypeCardsGrid}>
              {subtypeCards.map((card, index) => (
                <View key={index} style={[styles.subtypeCardCss, { 
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#f8f9fa',
                  borderLeftColor: '#2563EB'
                }]}>
                  <Text style={[styles.subtypeCardTitle, { color: colors.text }]}>
                    {card.title}
                  </Text>
                  <Text style={[styles.subtypeCardPercentage, { color: '#2563EB' }]}>
                    {card.percentage}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // STEP 4: Section Generation Function (React Native Implementation)
  const generateSection = (section: MedicalSection, index: number) => {
    const processedContent = processContent(section.content);
    const icon = getIcon(section.title);
    const isExpanded = expandedSections[index];
    
    console.log(`🏗️ STEP 4: Generating section "${section.title}" with icon "${icon}"`);
    
    return (
      <View key={index} style={[styles.contentSection, { backgroundColor: colors.card }]}>
        {/* Section Header with Icon */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(index)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            {/* Section Icon */}
            <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Text style={styles.sectionIconText}>{icon}</Text>
            </View>
            {/* Section Title */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
          </View>
          <ChevronDown
            size={20}
            color={colors.textSecondary}
            style={[
              styles.chevron,
              isExpanded && styles.chevronExpanded
            ]}
          />
        </TouchableOpacity>

        {/* Section Content */}
        {isExpanded && (
          <View style={[styles.sectionContent, { borderTopColor: colors.border }]}>
            {/* Content Text with Enhanced Processing */}
            <View style={styles.contentText}>
              {renderProcessedContent(processedContent)}
            </View>
            
            {/* Legacy subtypes support (from Step 2) */}
            {section.subtypes && section.subtypes.length > 0 && (
              <View style={styles.subtypesContainer}>
                <Text style={[styles.subtypesTitle, { color: colors.text }]}>
                  📊 Klassifikationen (Legacy):
                </Text>
                <View style={styles.subtypesGrid}>
                  {section.subtypes.map((subtype, subtypeIndex) => (
                    <View key={subtypeIndex} style={[styles.subtypeCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.subtypeTitle, { color: colors.text }]}>
                        {subtype.title}
                      </Text>
                      <Text style={[styles.subtypePercentage, { color: colors.primary }]}>
                        {subtype.percentage}
                      </Text>
                      {subtype.description && (
                        <Text style={[styles.subtypeDescription, { color: colors.textSecondary }]}>
                          {subtype.description}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Debug info for this section */}
            <View style={[styles.sectionDebug, { backgroundColor: colors.background }]}>
              <Text style={[styles.debugSmall, { color: colors.textSecondary }]}>
                STEP 4: Raw: {section.content.length} chars • Processed: {processedContent.length} chars • Icon: {icon}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const toggleSection = (index: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (processedSections.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.errorContainer, { backgroundColor: colors.card }]}>
          <AlertCircle size={48} color={colors.textSecondary} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Keine medizinischen Inhalte gefunden
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            content_json ist leer oder ungültig formatiert
          </Text>
          
          {/* Debug Information */}
          <View style={styles.debugContainer}>
            <Text style={[styles.debugTitle, { color: colors.textSecondary }]}>Debug Info:</Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Title: {supabaseRow.title}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Slug: {supabaseRow.slug}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Content JSON Type: {typeof supabaseRow.content_json}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Content JSON Length: {supabaseRow.content_json?.length || 0}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.appContainer, { 
      backgroundColor: colors.background,
      opacity: fadeAnim 
    }]}>
      {/* STEP 5: CSS Styles Definition Implementation */}
      
      {/* Header Section with CSS Styling */}
      <View style={[styles.headerCss, { 
        backgroundColor: isDarkMode ? 'rgba(42, 42, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)'
      }]}>
        {/* Header Top - CSS Badges */}
        <View style={styles.headerTop}>
          <View style={styles.badgeCss}>
            <Text style={styles.badgeTextCss}>
              {supabaseRow.category || 'Medizin'}
            </Text>
          </View>
          <View style={styles.badgeCss}>
            <Text style={styles.badgeTextCss}>
              📱 Mobile App
            </Text>
          </View>
        </View>

        {/* Main Title */}
        <Text style={[styles.mainTitle, { color: colors.text }]}>
          {supabaseRow.icon || '🏥'} {supabaseRow.title}
        </Text>

        {/* Meta Information */}
        <View style={styles.metaInfo}>
          <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
            📚 {supabaseRow.parent_slug?.replace(/-/g, ' ') || 'Medizin'}
          </Text>
          <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
            ⏱️ {formatDate(supabaseRow.last_updated)}
          </Text>
          <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
            📖 {processedSections.length} Abschnitte
          </Text>
        </View>
      </View>

      {/* Navigation Pills */}
      <View style={[styles.sectionNav, { backgroundColor: colors.card }]}>
        <Text style={[styles.navTitle, { color: colors.text }]}>
          Schnellnavigation
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navGrid}
        >
          {processedSections.map((section, index) => (
            <TouchableOpacity 
              key={index}
              style={[styles.navItem, { 
                backgroundColor: expandedSections[index] ? colors.primary + '20' : colors.background,
                borderColor: colors.border 
              }]}
              onPress={() => toggleSection(index)}
            >
              <Text style={[styles.navItemText, { 
                color: expandedSections[index] ? colors.primary : colors.textSecondary 
              }]}>
                {getIcon(section.title)} {section.title.substring(0, 20)}...
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { 
          backgroundColor: colors.primary,
          width: `${(Object.keys(expandedSections).length / processedSections.length) * 100}%`
        }]} />
      </View>

      {/* Content Sections */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.stepIndicator, { color: colors.primary }]}>
          ✅ STEP 1: Parse and Clean Data Complete{'\n'}
          ✅ STEP 2: Pattern Recognition Rules Complete{'\n'}
          ✅ STEP 3: HTML Template Structure Complete{'\n'}
          ✅ STEP 4: Section Generation Function Complete{'\n'}
          ✅ STEP 5: CSS Styles Definition Complete
        </Text>
        
        {processedSections.map((section, index) => generateSection(section, index))}
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.navButton, { backgroundColor: colors.background }]}>
          <Text style={[styles.navButtonText, { color: colors.textSecondary }]}>
            ← Zurück
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.pageInfo, { color: colors.textSecondary }]}>
          Seite 1 von {processedSections.length}
        </Text>
        
        <TouchableOpacity style={[styles.navButton, { backgroundColor: colors.primary }]}>
          <Text style={[styles.navButtonText, { color: 'white' }]}>
            Weiter →
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  debugContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    alignSelf: 'stretch',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 11,
    marginBottom: 2,
  },
  header: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 34,
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Legacy styles for backwards compatibility
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  sectionContent: {
    borderTopWidth: 1,
    padding: 16,
    paddingTop: 12,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 22,
  },
  sectionDebug: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
  },
  debugSmall: {
    fontSize: 10,
  },
  bottomPadding: {
    height: 40,
  },
  // Step 2: Pattern Recognition Styles
  statNumber: {
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  medicalTerm: {
    fontWeight: '600',
    fontStyle: 'italic',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  subtypesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  subtypesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subtypeCard: {
    minWidth: '30%',
    maxWidth: '48%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  subtypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtypePercentage: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtypeDescription: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  // Step 3: HTML Template Structure Styles
  sectionNav: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  navGrid: {
    paddingVertical: 4,
  },
  navItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 120,
    alignItems: 'center',
  },
  navItemText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 8,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Step 4: Section Generation Function Styles
  contentSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionIconText: {
    fontSize: 16,
  },
  criteriaContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  criteriaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  criteriaItem: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  criteriaText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  subtypeCardsContainer: {
    marginTop: 16,
  },
  subtypeCardsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtypeCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subtypeCardItem: {
    minWidth: '30%',
    maxWidth: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 8,
  },
  subtypeCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtypeCardPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // STEP 5: CSS Styles Definition - React Native Implementation
  appContainer: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
    flex: 1,
  },
  headerCss: {
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 60,
    elevation: 15,
  },
  badgeCss: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeTextCss: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statNumberCss: {
    backgroundColor: '#2563EB',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 15,
    fontWeight: '600',
    fontSize: 14,
    overflow: 'hidden',
  },
  medicalTermCss: {
    color: '#764ba2',
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: '#764ba2',
  },
  highlightBox: {
    borderLeftWidth: 4,
    borderRadius: 10,
    margin: 20,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  highlightBoxGradient: {
    padding: 20,
    paddingLeft: 20,
  },
  subtypeCardCss: {
    borderRadius: 12,
    padding: 20,
    marginVertical: 15,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  criteriaItemCss: {
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});

export default InteractiveMedicalContent;