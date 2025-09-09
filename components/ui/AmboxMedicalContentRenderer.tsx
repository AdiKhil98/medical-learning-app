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

const AmboxMedicalContentRenderer: React.FC<AmboxMedicalContentRendererProps> = ({
  htmlContent,
  jsonContent,
  plainTextContent,
  title,
  category = "Medizin",
  lastUpdated = "Juni 2025",
  completionStatus = "Vollständiger Leitfaden" }) => {
  const { colors } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ 'content': true });

  // Icon mapping for different section types (AMBOSS-style)
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

  // Parse content into structured sections with enhanced AMBOSS-style parsing
  const parsedSections = React.useMemo(() => {
    console.log('🔍 AmboxMedicalContentRenderer parsing content:');
    console.log('- jsonContent:', jsonContent, typeof jsonContent);
    console.log('- htmlContent exists:', !!htmlContent);
    console.log('- plainTextContent exists:', !!plainTextContent);
    
    // Check for non-empty JSON array first
    if (jsonContent && Array.isArray(jsonContent) && jsonContent.length > 0) {
      console.log('✅ Using JSON array content, sections:', jsonContent.length);
      return jsonContent as MedicalSection[];
    }
    
    // Check for JSON object with content
    if (jsonContent && typeof jsonContent === 'object' && !Array.isArray(jsonContent)) {
      console.log('📋 JSON is object, trying to extract sections');
      // Try to extract sections from object
      if (jsonContent.sections && Array.isArray(jsonContent.sections) && jsonContent.sections.length > 0) {
        return jsonContent.sections as MedicalSection[];
      }
      // Convert single object to array if it has meaningful content
      const objectString = JSON.stringify(jsonContent, null, 2);
      if (objectString !== '{}' && objectString !== '[]') {
        return [{ 
          id: 'content', 
          title: 'Strukturierter Inhalt', 
          content: objectString, 
          type: 'definition' as const 
        }];
      }
    }
    
    // Enhanced HTML parsing for AMBOSS-style structured sections
    if (htmlContent || plainTextContent) {
      console.log('📄 Using HTML or plain text content with enhanced parsing');
      const sections: MedicalSection[] = [];
      const htmlToUse = htmlContent || plainTextContent || '';
      
      // Split by headers to create sections
      const htmlParts = htmlToUse.split(/<h[23]>/i);
      
      if (htmlParts.length > 1) {
        // We have headers, create structured sections
        htmlParts.forEach((part, index) => {
          if (index === 0 && part.trim()) {
            // First part (before first header) becomes definition
            sections.push({
              id: 'definition',
              title: 'Definition und Klassifikation',
              content: part.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim(),
              type: 'definition'
            });
          } else if (part.trim()) {
            // Extract header text and content
            const headerMatch = part.match(/^([^<]*?)(?:<\/h[23]>)?(.*)/is);
            if (headerMatch) {
              const headerText = headerMatch[1].trim();
              const sectionContent = headerMatch[2].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
              
              // Determine section type based on header text
              let sectionType: MedicalSection['type'] = 'definition';
              let sectionTitle = headerText;
              
              if (headerText.toLowerCase().includes('epidemiologie')) {
                sectionType = 'epidemiology';
                sectionTitle = 'Epidemiologie';
              } else if (headerText.toLowerCase().includes('pathophysiologie')) {
                sectionType = 'etiology';
                sectionTitle = 'Pathophysiologie';
              } else if (headerText.toLowerCase().includes('symptom') || headerText.toLowerCase().includes('klinisch')) {
                sectionType = 'symptoms';
                sectionTitle = 'Klinische Symptomatik';
              } else if (headerText.toLowerCase().includes('diagnos')) {
                sectionType = 'diagnosis';
                sectionTitle = 'Diagnostik';
              } else if (headerText.toLowerCase().includes('therap') || headerText.toLowerCase().includes('behandlung')) {
                sectionType = 'therapy';
                sectionTitle = 'Therapie';
              } else if (headerText.toLowerCase().includes('prognose')) {
                sectionType = 'prognosis';
                sectionTitle = 'Prognose';
              }
              
              sections.push({
                id: sectionType + '_' + index,
                title: sectionTitle,
                content: sectionContent,
                type: sectionType
              });
            }
          }
        });
      } else {
        // No headers found, create a single content section
        sections.push({
          id: 'content',
          title: 'Medizinischer Inhalt',
          content: htmlToUse.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim(),
          type: 'definition'
        });
      }
      
      return sections.filter(section => section.content.length > 0);
    }
    
    console.log('❌ No content found');
    return [];
  }, [jsonContent, htmlContent, plainTextContent]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
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

  // Quick navigation pills
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
                  backgroundColor: getSectionColor(section.type) + '15',
                  borderColor: getSectionColor(section.type) + '30'
                }
              ]}
              onPress={() => toggleSection(section.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.quickNavPillText,
                { color: getSectionColor(section.type) }
              ]}>
                {section.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }, [parsedSections, colors, getSectionColor, toggleSection]);

  const renderSection = useCallback((section: MedicalSection, index: number) => {
    const isExpanded = expandedSections[section.id];
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

        {isExpanded && (
          <View style={[styles.sectionContent, { borderTopColor: colors.border }]}>
            {renderEnhancedContent(section.content)}
          </View>
        )}
      </View>
    );
  }, [colors, expandedSections, getIconComponent, getSectionColor, toggleSection, renderEnhancedContent]);

  return (
    <View style={styles.container}>
      {/* AMBOSS-style header */}
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
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2 },
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

export default AmboxMedicalContentRenderer;