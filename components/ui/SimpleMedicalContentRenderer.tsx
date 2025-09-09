import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ChevronDown, BookOpen } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SimpleMedicalContentRendererProps {
  htmlContent?: string;
  jsonContent?: any;
  plainTextContent?: string;
  title: string;
  category?: string;
  lastUpdated?: string;
}

const SimpleMedicalContentRenderer: React.FC<SimpleMedicalContentRendererProps> = ({
  htmlContent,
  jsonContent,
  plainTextContent,
  title,
  category = "Medizin",
  lastUpdated = "Juni 2025",
}) => {
  const { colors } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Debug: Log what we receive
  console.log('🔍 SimpleMedicalContentRenderer received:');
  console.log('- title:', title);
  console.log('- htmlContent length:', htmlContent?.length || 0);
  console.log('- jsonContent type:', typeof jsonContent, Array.isArray(jsonContent) ? `array[${jsonContent.length}]` : jsonContent);
  console.log('- plainTextContent length:', plainTextContent?.length || 0);

  // Simple content processing - just split HTML by h2/h3 headers
  const processContent = () => {
    // If we have JSON array, use it directly
    if (jsonContent && Array.isArray(jsonContent) && jsonContent.length > 0) {
      console.log('✅ Using JSON array directly');
      return jsonContent.map((section: any, index: number) => ({
        id: `section-${index}`,
        title: section.title || `Section ${index + 1}`,
        content: section.content || section.description || 'No content available',
        type: section.type || 'content'
      }));
    }

    // If we have HTML content, split it simply
    if (htmlContent && htmlContent.length > 0) {
      console.log('✅ Processing HTML content');
      
      // Skip if it's a full HTML document
      if (htmlContent.includes('<!DOCTYPE html>')) {
        console.log('⚠️ Skipping full HTML document');
        return [{
          id: 'content',
          title: 'Inhalt',
          content: 'HTML-Dokument erkannt - Inhaltsverarbeitung wird übersprungen',
          type: 'content'
        }];
      }

      // Simple split by H2/H3 headers
      const sections: any[] = [];
      const parts = htmlContent.split(/<h[23]>([^<]+)<\/h[23]>/gi);
      
      for (let i = 1; i < parts.length; i += 2) {
        const title = parts[i]?.trim();
        const content = parts[i + 1]?.trim() || '';
        
        if (title && content) {
          sections.push({
            id: `section-${i}`,
            title: title,
            content: content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim(),
            type: 'content'
          });
        }
      }
      
      console.log(`✅ Created ${sections.length} sections from HTML`);
      return sections;
    }

    // Fallback to plain text
    if (plainTextContent && plainTextContent.length > 0) {
      console.log('✅ Using plain text content');
      return [{
        id: 'content',
        title: 'Inhalt',
        content: plainTextContent,
        type: 'content'
      }];
    }

    console.log('❌ No content found');
    return [];
  };

  const sections = processContent();

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  return (
    <View style={styles.container}>
      {/* Simple Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {category} • {lastUpdated} • {sections.length} Abschnitte
        </Text>
      </View>

      {/* Content Sections */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sections.length > 0 ? (
          sections.map((section) => {
            const isExpanded = expandedSections[section.id];
            
            return (
              <View key={section.id} style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => toggleSection(section.id)}
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
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <BookOpen size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Keine medizinischen Inhalte verfügbar
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Überprüfen Sie die Datenstruktur in der Datenbank
            </Text>
          </View>
        )}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  sectionCard: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
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
  emptyState: {
    padding: 32,
    borderRadius: 12,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
});

export default SimpleMedicalContentRenderer;