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

        console.log(`✅ Cleaned section: "${section.title}" (${cleanContent.length} chars)`);

        return {
          title: section.title || `Section ${index + 1}`,
          content: cleanContent
        };
      });

      return cleanedSections.filter(section => section.content.length > 0);

    } catch (error) {
      console.error('❌ Error parsing content_json:', error);
      return [];
    }
  }, [supabaseRow.content_json]);

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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {supabaseRow.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {supabaseRow.category} • {processedSections.length} Abschnitte
        </Text>
        {supabaseRow.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {supabaseRow.description}
          </Text>
        )}
      </View>

      {/* Content Sections */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.stepIndicator, { color: colors.primary }]}>
          ✅ STEP 1: Parse and Clean Data Complete
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
                  <Text style={[styles.contentText, { color: colors.text }]}>
                    {section.content}
                  </Text>
                  
                  {/* Debug info for this section */}
                  <View style={[styles.sectionDebug, { backgroundColor: colors.background }]}>
                    <Text style={[styles.debugSmall, { color: colors.textSecondary }]}>
                      Raw length: {section.content.length} chars
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
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
    padding: 16,
    borderRadius: 12,
  },
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
});

export default InteractiveMedicalContent;