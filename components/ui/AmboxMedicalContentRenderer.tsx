import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
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
  TrendingUp,
  Eye,
  Brain,
  Zap,
} from 'lucide-react-native';

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
  completionStatus = "Vollständiger Leitfaden",
}) => {
  const { colors, isDarkMode } = useTheme();
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

  // Parse content into structured sections
  const parsedSections = React.useMemo(() => {
    console.log('🔍 AmboxMedicalContentRenderer parsing content:');
    console.log('- jsonContent:', jsonContent, typeof jsonContent);
    console.log('- htmlContent exists:', !!htmlContent);
    console.log('- plainTextContent exists:', !!plainTextContent);
    
    if (jsonContent && Array.isArray(jsonContent)) {
      console.log('✅ Using JSON array content, sections:', jsonContent.length);
      return jsonContent as MedicalSection[];
    }
    
    if (jsonContent && typeof jsonContent === 'object') {
      console.log('📋 JSON is object, trying to extract sections');
      // Try to extract sections from object
      if (jsonContent.sections) {
        return jsonContent.sections as MedicalSection[];
      }
      // Convert single object to array
      return [{ 
        id: 'content', 
        title: 'Inhalt', 
        content: JSON.stringify(jsonContent, null, 2), 
        type: 'definition' as const 
      }];
    }
    
    // If we have HTML or plain text, create a single content section
    if (htmlContent || plainTextContent) {
      console.log('📄 Using HTML or plain text content');
      return [{
        id: 'content',
        title: 'Medizinischer Inhalt',
        content: htmlContent || plainTextContent || '',
        type: 'definition' as const,
      }];
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

  const renderSection = useCallback((section: MedicalSection, index: number) => {
    const isExpanded = expandedSections[section.id];
    const IconComponent = getIconComponent(section.type);
    const sectionColor = getSectionColor(section.type);

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
                {section.type.toUpperCase()}
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
            <Text style={[styles.contentText, { color: colors.text }]}>
              {section.content}
            </Text>
          </View>
        )}
      </View>
    );
  }, [colors, expandedSections, getIconComponent, getSectionColor, toggleSection]);

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
    flex: 1,
  },
  header: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Inter-Bold',
  },
  headerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  lastUpdated: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  contentContainer: {
    flex: 1,
  },
  sectionCard: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  sectionType: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    opacity: 0.8,
  },
  chevron: {
    marginLeft: 8,
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  sectionContent: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    opacity: 0.7,
  },
  bottomPadding: {
    height: 40,
  },
});

export default AmboxMedicalContentRenderer;