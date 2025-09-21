import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity } from 'react-native';
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
  TrendingUp,
  Eye } from 'lucide-react-native';

interface MedicalSection {
  id: string;
  title: string;
  content: string;
  type: 'definition' | 'epidemiology' | 'etiology' | 'symptoms' | 'diagnosis' | 'therapy' | 'prognosis' | 'emergency';
}

interface MedicalContentRendererProps {
  htmlContent?: string;
  jsonContent?: any;
  plainTextContent?: string;
  title: string;
  category?: string;
  lastUpdated?: string;
  completionStatus?: string;
}

const MedicalContentRenderer: React.FC<MedicalContentRendererProps> = ({
  htmlContent,
  jsonContent,
  plainTextContent,
  title,
  category = "Medizin",
  lastUpdated = "Juni 2025",
  completionStatus = "Vollständiger Leitfaden" }) => {
  const { colors } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Icon mapping for different section types
  const getIconComponent = useCallback((type: string) => {
    switch (type) {
      case 'definition': return BookOpen;
      case 'epidemiology': return TrendingUp;
      case 'etiology': return Target;
      case 'symptoms': return Eye;
      case 'diagnosis': return Stethoscope;
      case 'therapy': return Heart;
      case 'prognosis': return Activity;
      case 'emergency': return AlertTriangle;
      default: return BookOpen;
    }
  }, []);

  // Color mapping for medical section types
  const getSectionColor = useCallback((type: string) => {
    switch (type) {
      case 'definition': return '#E2827F';
      case 'epidemiology': return '#10B981';
      case 'etiology': return '#F59E0B';
      case 'symptoms': return '#EF4444';
      case 'diagnosis': return '#E2827F';
      case 'therapy': return '#06B6D4';
      case 'prognosis': return '#84CC16';
      case 'emergency': return '#DC2626';
      default: return '#6B7280';
    }
  }, []);

  // Parse content into structured sections with enhanced parsing
  const parsedSections = React.useMemo(() => {
    console.log('🔍 MedicalContentRenderer parsing content for:', title);
    console.log('- jsonContent:', jsonContent, typeof jsonContent);
    console.log('- htmlContent exists:', !!htmlContent, 'Length:', htmlContent?.length);
    console.log('- htmlContent preview:', htmlContent?.substring(0, 500));
    console.log('- plainTextContent exists:', !!plainTextContent, plainTextContent?.substring(0, 200));
    
    // Check if htmlContent is actually a full HTML document
    if (htmlContent?.includes('<!DOCTYPE html>')) {
      console.log('⚠️ WARNING: htmlContent contains full HTML document instead of content fragment');
    }
    
    // Priority 1: Check for structured JSON content first (content_improved)
    if (jsonContent && Array.isArray(jsonContent) && jsonContent.length > 0) {
      console.log('✅ Using JSON array content, sections:', jsonContent.length);
      console.log('📊 JSON sections preview:', jsonContent.slice(0, 2));
      return jsonContent as MedicalSection[];
    }
    
    // Priority 2: Check for JSON object with sections
    if (jsonContent && typeof jsonContent === 'object' && !Array.isArray(jsonContent)) {
      console.log('📋 JSON is object, trying to extract sections');
      // Try to extract sections from object
      if (jsonContent.sections && Array.isArray(jsonContent.sections) && jsonContent.sections.length > 0) {
        return jsonContent.sections as MedicalSection[];
      }
    }
    
    // Priority 3: HTML parsing for actual database structure (content_html)
    if (htmlContent || plainTextContent) {
      console.log('📄 Using HTML content - splitting by H2/H3 headers');
      const sections: MedicalSection[] = [];
      const htmlToUse = htmlContent || plainTextContent || '';
      
      // Split content by H2 and H3 headers (the actual structure in our DB)
      const headerRegex = /<h[23]>([^<]+)<\/h[23]>/gi;
      const parts = htmlToUse.split(headerRegex);
      
      console.log('📄 Split into parts:', parts.length);
      
      if (parts.length > 1) {
        // Process parts: [content_before_first_header, header1, content1, header2, content2, ...]
        for (let i = 1; i < parts.length; i += 2) {
          const headerText = parts[i]?.trim();
          const sectionContent = parts[i + 1]?.trim() || '';
          
          if (headerText && sectionContent) {
            // Determine section type and clean title
            let sectionType: MedicalSection['type'] = 'definition';
            let cleanTitle = headerText;
            
            const headerLower = headerText.toLowerCase();
            if (headerLower.includes('definition')) {
              sectionType = 'definition';
              cleanTitle = 'Definition und Klassifikation';
            } else if (headerLower.includes('epidemiologie')) {
              sectionType = 'epidemiology';
              cleanTitle = 'Epidemiologie';
            } else if (headerLower.includes('klassifikation')) {
              sectionType = 'definition';
              cleanTitle = 'Klassifikation';
            } else if (headerLower.includes('therapie') || headerLower.includes('behandlung')) {
              sectionType = 'therapy';
              cleanTitle = 'Therapie';
            } else if (headerLower.includes('symptom') || headerLower.includes('klinik')) {
              sectionType = 'symptoms';
              cleanTitle = 'Klinische Symptomatik';
            } else if (headerLower.includes('diagnos')) {
              sectionType = 'diagnosis';
              cleanTitle = 'Diagnostik';
            } else if (headerLower.includes('pathophysiologie') || headerLower.includes('ätiologie')) {
              sectionType = 'etiology';
              cleanTitle = 'Pathophysiologie';
            } else if (headerLower.includes('prognose')) {
              sectionType = 'prognosis';
              cleanTitle = 'Prognose';
            }
            
            // Clean content: preserve structure but remove HTML tags
            const cleanContent = sectionContent
              .replace(/<\/p>/gi, '\n\n')
              .replace(/<\/li>/gi, '\n')
              .replace(/<li>/gi, '• ')
              .replace(/<strong>/gi, '**')
              .replace(/<\/strong>/gi, '**')
              .replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/\n\s*\n/g, '\n\n')
              .trim();
            
            if (cleanContent.length > 20) {
              sections.push({
                id: sectionType + '_' + i,
                title: cleanTitle,
                content: cleanContent,
                type: sectionType
              });
            }
          }
        }
      }
      
      // If no sections found, create single section with all content
      if (sections.length === 0) {
        const allContent = htmlToUse
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<\/li>/gi, '\n')
          .replace(/<li>/gi, '• ')
          .replace(/<strong>/gi, '**')
          .replace(/<\/strong>/gi, '**')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\n\s*\n/g, '\n\n')
          .trim();
          
        if (allContent.length > 0) {
          sections.push({
            id: 'content',
            title: 'Medizinischer Inhalt',
            content: allContent,
            type: 'definition'
          });
        }
      }
      
      console.log('📄 Created sections:', sections.length, sections.map(s => s.title));
      return sections;
    }
    
    console.log('❌ No content found');
    return [];
  }, [jsonContent, htmlContent, plainTextContent]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const isCurrentlyExpanded = prev[sectionId];
      if (isCurrentlyExpanded) {
        // If currently expanded, collapse it
        return {};
      } else {
        // If not expanded, expand only this section (close all others)
        return { [sectionId]: true };
      }
    });
  }, []);

  // Enhanced content renderer with statistics highlighting and formatting
  const renderEnhancedContent = useCallback((content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    
    lines.forEach((line, index) => {
      if (!line.trim()) return;
      
      // Check for percentage/statistics and numbers (enhanced pattern)
      const statisticsRegex = /(\d+(?:[,\.]\d+)?(?:-\d+(?:[,\.]\d+)?)?%?(?:\s*(?:mg|kg|ml|l|min|h|Jahre?|Tage?|Stunden?|Minuten?))?)/g;
      const hasStatistics = statisticsRegex.test(line);
      
      if (hasStatistics) {
        // Split line and highlight statistics
        const parts = line.split(statisticsRegex);
        const lineElements: React.ReactNode[] = [];
        
        parts.forEach((part, partIndex) => {
          if (statisticsRegex.test(part)) {
            lineElements.push(
              <Text key={`${index}-${partIndex}`} style={[styles.highlightedStat, { backgroundColor: colors.primary || '#E2827F', color: 'white' }]}>
                {part}
              </Text>
            );
          } else if (part.trim()) {
            lineElements.push(
              <Text key={`${index}-${partIndex}`} style={[styles.contentText, { color: colors.text }]}>
                {part}
              </Text>
            );
          }
        });
        
        elements.push(
          <View key={index} style={styles.statisticsLine}>
            {lineElements}
          </View>
        );
      } else if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('✓')) {
        // Bullet points or checkmarks
        elements.push(
          <View key={index} style={styles.bulletPoint}>
            <Text style={[styles.bulletIcon, { color: colors.primary }]}>✓</Text>
            <Text style={[styles.bulletText, { color: colors.text }]}>
              {line.replace(/^[•\-✓]\s*/, '').trim()}
            </Text>
          </View>
        );
      } else if (line.trim().includes(':') && line.length < 100) {
        // Likely a header or important point
        elements.push(
          <Text key={index} style={[styles.contentHeader, { color: colors.text }]}>
            {line.trim()}
          </Text>
        );
      } else {
        // Regular content
        elements.push(
          <Text key={index} style={[styles.contentText, { color: colors.text }]}>
            {line.trim()}
          </Text>
        );
      }
    });
    
    return <View>{elements}</View>;
  }, [colors]);

  // Quick navigation pills - enhanced design
  const renderQuickNavigation = useCallback(() => {
    if (parsedSections.length <= 1) return null;
    
    return (
      <View style={styles.quickNavContainer}>
        <Text style={[styles.quickNavTitle, { color: colors.textSecondary }]}>SCHNELLNAVIGATION</Text>
        <View style={styles.quickNavPills}>
          {parsedSections.map((section) => {
            const isExpanded = !!expandedSections[section.id];
            const sectionColor = getSectionColor(section.type);
            return (
              <TouchableOpacity
                key={section.id}
                style={[
                  styles.quickNavPill,
                  { 
                    backgroundColor: isExpanded ? sectionColor + '20' : colors.card,
                    borderColor: isExpanded ? sectionColor : colors.border,
                    borderWidth: isExpanded ? 2 : 1
                  }
                ]}
                onPress={() => toggleSection(section.id)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.quickNavPillText,
                  { color: isExpanded ? sectionColor : colors.text }
                ]}>
                  {section.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }, [parsedSections, colors, toggleSection, expandedSections, getSectionColor]);

  const renderSection = useCallback((section: MedicalSection, index: number) => {
    const isExpanded = !!expandedSections[section.id]; // Ensure boolean
    const IconComponent = getIconComponent(section.type || 'content');
    const sectionColor = getSectionColor(section.type || 'content');

    return (
      <View key={section.id} style={[styles.sectionCard, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.sectionHeader,
            isExpanded && { backgroundColor: colors.primary + '08' }
          ]}
          onPress={() => toggleSection(section.id)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.iconContainer, { backgroundColor: sectionColor + '20' }]}>
              <IconComponent size={20} color={sectionColor} />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {section.title}
              </Text>
              <Text style={[styles.sectionType, { color: sectionColor }]}>
                {(section.type || 'content').toUpperCase()}
              </Text>
            </View>
          </View>
          <ChevronDown
            size={24}
            color={isExpanded ? colors.primary : colors.textSecondary}
            style={[
              styles.chevron,
              isExpanded && styles.chevronExpanded
            ]}
          />
        </TouchableOpacity>

        {/* Only render content when explicitly expanded */}
        {isExpanded === true && (
          <View style={[styles.sectionContent, { borderTopColor: colors.border }]}>
            {renderEnhancedContent(section.content)}
          </View>
        )}
      </View>
    );
  }, [colors, expandedSections, getIconComponent, getSectionColor, toggleSection, renderEnhancedContent]);

  return (
    <View style={styles.container}>
      {/* Medical content header */}
      <LinearGradient
        colors={[colors.primary + '10', colors.primary + '05']}
        style={styles.header}
      >
        <Text style={[styles.mainTitle, { color: colors.text }]}>{title}</Text>
        <View style={styles.headerMeta}>
          <Text style={[styles.category, { color: colors.primary }]}>{category}</Text>
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
            Aktualisiert: {lastUpdated}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.statusText}>{completionStatus}</Text>
        </View>
      </LinearGradient>

      {/* Quick Navigation */}
      {renderQuickNavigation()}

      {/* Medical content sections */}
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {parsedSections.length > 0 ? (
          parsedSections.map((section, index) => renderSection(section, index))
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <BookOpen size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              Medizinische Inhalte für "{title}" sind derzeit nicht verfügbar.
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
              Überprüfen Sie die Datenstruktur oder kontaktieren Sie den Support.
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
    flex: 1 },
  header: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16 },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Inter-Bold' },
  headerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12 },
  category: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold' },
  lastUpdated: {
    fontSize: 14,
    fontFamily: 'Inter-Regular' },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20 },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold' },
  contentContainer: {
    flex: 1 },
  sectionCard: {
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    minHeight: 70 },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1 },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14 },
  sectionTitleContainer: {
    flex: 1 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4 },
  sectionType: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    opacity: 0.8 },
  chevron: {
    marginLeft: 8 },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }] },
  sectionContent: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20 },
    contentHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    lineHeight: 24 },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter-Regular' },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center' },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center' },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    opacity: 0.7 },
  bottomPadding: {
    height: 40 },
  
  // Quick Navigation Styles
  quickNavContainer: {
    marginBottom: 16,
    paddingHorizontal: 16 },
  quickNavTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 1 },
  quickNavPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8 },
  quickNavPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1 },
  quickNavPillText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium' },
  
  // Enhanced Content Styles
  highlightedStat: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginHorizontal: 2 },
  statisticsLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginVertical: 4 },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
    paddingLeft: 8 },
  bulletIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2 },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter-Regular' } });

export default MedicalContentRenderer;