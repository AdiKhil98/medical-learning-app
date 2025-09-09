import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ChevronDown, BookOpen, AlertCircle } from 'lucide-react-native';
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
  const { colors } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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

  // STEP 2: Pattern Recognition Functions
  const applyPatternRecognition = (content: string): string => {
    let processedContent = content;

    // Statistics/Numbers Pattern Recognition
    console.log('📊 Applying statistics patterns...');
    
    // Pattern 1: Range percentages (e.g., "10-20%", "50-70 Prozent")
    processedContent = processedContent.replace(
      /(\d{1,3})[-–](\d{1,3})\s?(%|Prozent|percent)/gi,
      '<STAT_NUMBER>$1-$2$3</STAT_NUMBER>'
    );

    // Pattern 2: Numbers with units (e.g., ">60 Jahre", "500 mg")
    processedContent = processedContent.replace(
      />?\s?(\d{1,3})\s?(Jahre|years|mg|ml|mmol|kg|cm|mm)/gi,
      '<STAT_NUMBER>>$1 $2</STAT_NUMBER>'
    );

    // Pattern 3: Single percentages (e.g., "75%", "80 Prozent")
    processedContent = processedContent.replace(
      /(\d{1,3})(,\d{1,3})?\s?(%|Prozent|percent)/gi,
      '<STAT_NUMBER>$1$2$3</STAT_NUMBER>'
    );

    console.log('🏥 Applying medical terms patterns...');
    
    // Medical Terms Pattern Recognition
    // Pattern 4: Terms with hyphens (e.g., "Acetylcholin-Defizienz")
    processedContent = processedContent.replace(
      /\b([A-ZÄÖÜ][a-zäöüß]*-[A-ZÄÖÜ][a-zäöüß]*(?:-[A-ZÄÖÜ][a-zäöüß]*)*)\b/g,
      '<MEDICAL_TERM>$1</MEDICAL_TERM>'
    );

    // Pattern 5: Latin medical terms (ending in -itis, -ose, -om, -ie)
    processedContent = processedContent.replace(
      /\b([A-ZÄÖÜ][a-zäöüß]*(?:itis|ose|om|ie))\b/g,
      '<MEDICAL_TERM>$1</MEDICAL_TERM>'
    );

    // Pattern 6: Medical abbreviations in caps (CAM, ICU, DSM-5, ICD-11)
    processedContent = processedContent.replace(
      /\b([A-Z]{2,}(?:-\d+)?)\b/g,
      '<MEDICAL_TERM>$1</MEDICAL_TERM>'
    );

    console.log('✨ Pattern recognition complete');
    return processedContent;
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

  // STEP 2: Render Processed Content with Pattern Recognition
  const renderProcessedContent = (content: string) => {
    console.log('🎨 Rendering processed content with patterns...');
    
    // Split content by HTML-like tags to create text segments
    const segments = content.split(/(<(?:STAT_NUMBER|MEDICAL_TERM)>.*?<\/(?:STAT_NUMBER|MEDICAL_TERM)>)/);
    
    return (
      <Text style={[styles.contentText, { color: colors.text }]}>
        {segments.map((segment, index) => {
          // Check if segment is a tagged element
          if (segment.startsWith('<STAT_NUMBER>')) {
            const text = segment.replace(/<\/?STAT_NUMBER>/g, '');
            return (
              <Text key={index} style={[styles.statNumber, { color: colors.primary, backgroundColor: colors.primary + '15' }]}>
                {text}
              </Text>
            );
          } else if (segment.startsWith('<MEDICAL_TERM>')) {
            const text = segment.replace(/<\/?MEDICAL_TERM>/g, '');
            return (
              <Text key={index} style={[styles.medicalTerm, { color: colors.secondary || colors.primary, backgroundColor: colors.secondary + '15' || colors.primary + '10' }]}>
                {text}
              </Text>
            );
          } else {
            // Regular text
            return <Text key={index}>{segment}</Text>;
          }
        })}
      </Text>
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Step 3: HTML Template Structure Implementation */}
      
      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        {/* Header Top - Badges */}
        <View style={styles.headerTop}>
          <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              {supabaseRow.category || 'Medizin'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: supabaseRow.color + '20' || colors.secondary + '20' }]}>
            <Text style={[styles.badgeText, { color: supabaseRow.color || colors.secondary }]}>
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
          ✅ STEP 3: HTML Template Structure Complete
        </Text>
        
        {processedSections.map((section, index) => {
          const isExpanded = expandedSections[index];
          
          return (
            <View key={index} style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(index)}
                activeOpacity={0.7}
              >
                <View style={styles.sectionHeaderLeft}>
                  <BookOpen size={20} color={colors.primary} style={styles.icon} />
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

              {isExpanded && (
                <View style={[styles.sectionContent, { borderTopColor: colors.border }]}>
                  {/* Render processed content with pattern recognition */}
                  {renderProcessedContent(section.processedContent || section.content)}
                  
                  {/* Render subtypes if found */}
                  {section.subtypes && section.subtypes.length > 0 && (
                    <View style={styles.subtypesContainer}>
                      <Text style={[styles.subtypesTitle, { color: colors.text }]}>
                        Klassifikationen:
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
                      Raw: {section.content.length} chars • Processed: {(section.processedContent || '').length} chars • Subtypes: {section.subtypes?.length || 0}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
        
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
    </View>
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
});

export default InteractiveMedicalContent;