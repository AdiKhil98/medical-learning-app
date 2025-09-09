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

interface AmboxMedicalContentRendererProps {
  htmlContent?: string;
  jsonContent?: any;
  plainTextContent?: string;
  title: string;
  category?: string;
  lastUpdated?: string;
  completionStatus?: string;
}

const MedicalContentRenderer: React.FC<AmboxMedicalContentRendererProps> = ({
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
      case 'definition': return '#3B82F6';
      case 'epidemiology': return '#10B981';
      case 'etiology': return '#F59E0B';
      case 'symptoms': return '#EF4444';
      case 'diagnosis': return '#8B5CF6';
      case 'therapy': return '#06B6D4';
      case 'prognosis': return '#84CC16';
      case 'emergency': return '#DC2626';
      default: return '#6B7280';
    }
  }, []);

  // Parse content into structured sections with enhanced parsing
  const parsedSections = React.useMemo(() => {
    console.log('🔍 MedicalContentRenderer parsing content:');
    console.log('- jsonContent:', jsonContent, typeof jsonContent);
    console.log('- htmlContent exists:', !!htmlContent);
    console.log('- plainTextContent exists:', !!plainTextContent);
    
    // Priority 1: Check for structured JSON content first (content_improved)
    if (jsonContent && Array.isArray(jsonContent) && jsonContent.length > 0) {
      console.log('✅ Using JSON array content, sections:', jsonContent.length);
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
    
    // Priority 3: Enhanced HTML parsing (content_html) combined with fallbacks
    if (htmlContent || plainTextContent) {
      console.log('📄 Using HTML or plain text content with enhanced parsing');
      const sections: MedicalSection[] = [];
      const htmlToUse = htmlContent || plainTextContent || '';
      
      // Clean and split by headers to create sections
      const cleanedHtml = htmlToUse
        .replace(/&nbsp;/g, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n');
      
      // Try to split by common medical section headers
      const sectionHeaders = [
        { pattern: /(?:^|\n)(?:<h[2-4][^>]*>)?\s*Definition\s*(?:und\s*)?(?:Klassifikation|Konzept)?\s*(?:<\/h[2-4]>)?/gi, type: 'definition', title: 'Definition und Klassifikation' },
        { pattern: /(?:^|\n)(?:<h[2-4][^>]*>)?\s*Epidemiologie\s*(?:<\/h[2-4]>)?/gi, type: 'epidemiology', title: 'Epidemiologie' },
        { pattern: /(?:^|\n)(?:<h[2-4][^>]*>)?\s*(?:Pathophysiologie|Ätiologie)\s*(?:<\/h[2-4]>)?/gi, type: 'etiology', title: 'Pathophysiologie' },
        { pattern: /(?:^|\n)(?:<h[2-4][^>]*>)?\s*(?:Klinische?\s*)?(?:Symptomatik|Manifestation)\s*(?:<\/h[2-4]>)?/gi, type: 'symptoms', title: 'Klinische Symptomatik' },
        { pattern: /(?:^|\n)(?:<h[2-4][^>]*>)?\s*Diagnostik?\s*(?:<\/h[2-4]>)?/gi, type: 'diagnosis', title: 'Diagnostik' },
        { pattern: /(?:^|\n)(?:<h[2-4][^>]*>)?\s*(?:Therapie|Behandlung)\s*(?:<\/h[2-4]>)?/gi, type: 'therapy', title: 'Therapie' },
        { pattern: /(?:^|\n)(?:<h[2-4][^>]*>)?\s*Prognose\s*(?:<\/h[2-4]>)?/gi, type: 'prognosis', title: 'Prognose' }
      ];
      
      let remainingContent = cleanedHtml;
      let foundSections = false;
      
      sectionHeaders.forEach((headerDef) => {
        const matches = [...remainingContent.matchAll(headerDef.pattern)];
        if (matches.length > 0) {
          foundSections = true;
          matches.forEach((match) => {
            const startIndex = match.index || 0;
            const headerLength = match[0].length;
            
            // Find the next section or end of content
            let endIndex = remainingContent.length;
            for (const nextHeader of sectionHeaders) {
              const nextMatches = [...remainingContent.matchAll(nextHeader.pattern)];
              for (const nextMatch of nextMatches) {
                const nextStartIndex = nextMatch.index || 0;
                if (nextStartIndex > startIndex + headerLength && nextStartIndex < endIndex) {
                  endIndex = nextStartIndex;
                }
              }
            }
            
            const sectionContent = remainingContent
              .substring(startIndex + headerLength, endIndex)
              .replace(/<[^>]*>/g, '')
              .trim();
            
            if (sectionContent.length > 0) {
              sections.push({
                id: headerDef.type,
                title: headerDef.title,
                content: sectionContent,
                type: headerDef.type as MedicalSection['type']
              });
            }
          });
        }
      });
      
      // If no structured sections found, create a single content section
      if (!foundSections) {
        const cleanContent = htmlToUse.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        if (cleanContent.length > 0) {
          sections.push({
            id: 'content',
            title: 'Medizinischer Inhalt',
            content: cleanContent,
            type: 'definition'
          });
        }
      }
      
      return sections.filter(section => section.content.length > 20); // Filter out very short sections
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
      
      // Check for percentage/statistics (xx-yy% pattern)
      const percentageRegex = /(\d+(?:-\d+)?%)/g;
      const hasPercentages = percentageRegex.test(line);
      
      if (hasPercentages) {
        // Split line and highlight percentages
        const parts = line.split(percentageRegex);
        const lineElements: React.ReactNode[] = [];
        
        parts.forEach((part, partIndex) => {
          if (percentageRegex.test(part)) {
            lineElements.push(
              <Text key={`${index}-${partIndex}`} style={[styles.highlightedStat, { backgroundColor: '#3B82F6', color: 'white' }]}>
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
          <Text key={index} style={[styles.contentText, { color: colors.text }]}>
            {lineElements}
          </Text>
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
        <Text style={[styles.quickNavTitle, { color: colors.text }]}>SCHNELLNAVIGATION</Text>
        <View style={styles.quickNavPills}>
          {parsedSections.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={[
                styles.quickNavPill,
                { 
                  backgroundColor: colors.card,
                  borderColor: colors.border
                }
              ]}
              onPress={() => toggleSection(section.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.quickNavPillText,
                { color: colors.text }
              ]}>
                {section.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }, [parsedSections, colors, toggleSection]);

  const renderSection = useCallback((section: MedicalSection, index: number) => {
    const isExpanded = !!expandedSections[section.id]; // Ensure boolean
    const IconComponent = getIconComponent(section.type || 'content');
    const sectionColor = getSectionColor(section.type || 'content');

    return (
      <View key={section.id} style={[styles.sectionCard, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.sectionHeader}
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
            size={20}
            color={colors.textSecondary}
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
    padding: 16 },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 },
  sectionTitleContainer: {
    flex: 1 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2 },
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold' },
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