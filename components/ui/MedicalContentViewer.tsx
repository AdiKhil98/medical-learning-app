import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  Eye,
  Code,
  FileText,
  BookOpen,
  List,
  Lightbulb,
  Info,
  AlertCircle,
  ChevronDown,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Card from './Card';
import { MedicalSection, ContentSection, medicalContentService } from '@/lib/medicalContentService';

interface MedicalContentViewerProps {
  section: MedicalSection;
  onError?: (error: string) => void;
}

type ViewMode = 'html' | 'improved' | 'json' | 'details';

// Memoized content section component for structured JSON content
const StructuredContentSection = memo(({ 
  contentSection, 
  index, 
  isExpanded, 
  onToggle, 
  colors
}: {
  contentSection: ContentSection;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  colors: any;
}) => {
  const getIconForContentType = useCallback((type: string) => {
    switch (type) {
      case 'overview':
      case 'summary':
        return <BookOpen size={20} color={colors.primary} />;
      case 'definition':
        return <Info size={20} color={colors.primary} />;
      case 'list':
      case 'symptoms':
      case 'causes':
        return <List size={20} color={colors.primary} />;
      case 'clinical_pearl':
      case 'clinical_relevance':
      case 'important':
        return <Lightbulb size={20} color="#F59E0B" />;
      case 'warning':
      case 'contraindication':
        return <AlertCircle size={20} color="#EF4444" />;
      default:
        return <FileText size={20} color={colors.primary} />;
    }
  }, [colors.primary]);

  const cardStyles = useMemo(() => ({
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 16,
  }), [colors.card]);

  const chevronStyle = useMemo(() => [
    { transform: [{ rotate: '0deg' }] },
    isExpanded && { transform: [{ rotate: '180deg' }] }
  ], [isExpanded]);

  const getSectionTitle = () => {
    if (contentSection.title) return contentSection.title;
    if (contentSection.type === 'definition' && contentSection.term) return contentSection.term;
    return `Abschnitt ${index + 1}`;
  };

  return (
    <Card style={cardStyles}>
      <TouchableOpacity
        style={styles.contentHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.contentHeaderLeft}>
          {getIconForContentType(contentSection.type)}
          <Text style={[styles.contentTitle, { color: colors.text }]}>
            {getSectionTitle()}
          </Text>
        </View>
        <ChevronDown
          size={20}
          color={colors.textSecondary}
          style={chevronStyle}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.contentBody}>
          {/* Definition Display */}
          {contentSection.type === 'definition' && contentSection.definition && (
            <View style={styles.definitionContainer}>
              {contentSection.term && (
                <Text style={[styles.definitionTerm, { color: colors.primary }]}>
                  {contentSection.term}
                </Text>
              )}
              <Text style={[styles.definitionText, { color: colors.text }]}>
                {contentSection.definition}
              </Text>
            </View>
          )}
          
          {/* Regular Content */}
          {contentSection.content && (
            <Text style={[styles.contentText, { color: colors.text }]}>
              {contentSection.content}
            </Text>
          )}
          
          {/* List Items */}
          {contentSection.type === 'list' && contentSection.items && (
            <View style={styles.listContainer}>
              {contentSection.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.listItem}>
                  <View style={[styles.listBullet, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.listItemText, { color: colors.text }]}>{item}</Text>
                </View>
              ))}
            </View>
          )}
          
          {/* Clinical Pearl */}
          {(contentSection.type === 'clinical_pearl' || contentSection.clinical_pearl) && (
            <View style={styles.clinicalPearlContainer}>
              <View style={styles.clinicalPearlHeader}>
                <Lightbulb size={16} color="#F59E0B" />
                <Text style={styles.clinicalPearlTitle}>Klinischer Tipp</Text>
              </View>
              <Text style={styles.clinicalPearlText}>
                {contentSection.clinical_pearl || contentSection.content}
              </Text>
            </View>
          )}
          
          {/* Clinical Relevance */}
          {contentSection.clinical_relevance && (
            <View style={[styles.clinicalPearlContainer, { borderLeftColor: '#10B981' }]}>
              <View style={styles.clinicalPearlHeader}>
                <Info size={16} color="#10B981" />
                <Text style={[styles.clinicalPearlTitle, { color: '#059669' }]}>
                  Klinische Relevanz
                </Text>
              </View>
              <Text style={[styles.clinicalPearlText, { color: '#059669' }]}>
                {contentSection.clinical_relevance}
              </Text>
            </View>
          )}
        </View>
      )}
    </Card>
  );
});

// Main component
export default function MedicalContentViewer({ section, onError }: MedicalContentViewerProps) {
  const { colors, isDarkMode } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>(() => 
    medicalContentService.getBestContentFormat(section) || 'improved'
  );
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [webViewError, setWebViewError] = useState<string | null>(null);

  // Available view modes based on section content
  const availableViewModes = useMemo(() => {
    const modes: { key: ViewMode; label: string; icon: React.ComponentType<any> }[] = [];
    
    if (section.content_html) {
      modes.push({ key: 'html', label: 'HTML Ansicht', icon: Eye });
    }
    if (Array.isArray(section.content_improved) && section.content_improved.length > 0) {
      modes.push({ key: 'improved', label: 'Strukturiert', icon: BookOpen });
    }
    if (Array.isArray(section.content_json) && section.content_json.length > 0) {
      modes.push({ key: 'json', label: 'JSON Daten', icon: Code });
    }
    if (section.content_details) {
      modes.push({ key: 'details', label: 'Details', icon: FileText });
    }
    
    return modes;
  }, [section]);

  // Auto-expand first section if content_improved exists
  useMemo(() => {
    if (Array.isArray(section.content_improved) && section.content_improved.length > 0) {
      setExpandedSections({ '0': true });
    }
  }, [section.content_improved]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setWebViewError(null);
  }, []);

  const toggleSection = useCallback((index: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  }, []);

  const handleWebViewError = useCallback(() => {
    setWebViewError('Fehler beim Laden des HTML-Inhalts');
    onError?.('HTML content could not be loaded');
  }, [onError]);

  const renderHTML = () => {
    if (!section.content_html) return null;

    if (webViewError) {
      return (
        <Card style={[styles.errorCard, { backgroundColor: colors.card }]}>
          <AlertCircle size={24} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {webViewError}
          </Text>
          <TouchableOpacity onPress={() => setWebViewError(null)}>
            <Text style={[styles.retryText, { color: colors.primary }]}>
              Erneut versuchen
            </Text>
          </TouchableOpacity>
        </Card>
      );
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              margin: 16px;
              background-color: ${colors.background};
              color: ${colors.text};
              line-height: 1.6;
            }
            h1, h2, h3, h4, h5, h6 {
              color: ${colors.text};
              margin: 1.2em 0 0.6em 0;
            }
            p {
              margin: 0.8em 0;
            }
            .clinical-pearl {
              background-color: ${colors.surface || '#FFFBEB'};
              border-left: 4px solid #F59E0B;
              padding: 16px;
              border-radius: 8px;
              margin: 16px 0;
            }
            .definition {
              background-color: ${colors.card};
              border-radius: 8px;
              padding: 16px;
              margin: 16px 0;
              border-left: 4px solid ${colors.primary};
            }
            ul, ol {
              padding-left: 24px;
            }
            li {
              margin: 0.4em 0;
            }
          </style>
        </head>
        <body>
          ${section.content_html}
        </body>
      </html>
    `;

    return (
      <View style={styles.webViewContainer}>
        <WebView
          source={{ html: htmlContent }}
          style={styles.webView}
          onError={handleWebViewError}
          onHttpError={handleWebViewError}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        />
      </View>
    );
  };

  const renderStructuredContent = (content: ContentSection[]) => {
    if (!Array.isArray(content) || content.length === 0) return null;

    return (
      <ScrollView style={styles.structuredContent} showsVerticalScrollIndicator={false}>
        {content.map((section, index) => (
          <StructuredContentSection
            key={`${index}-${section.title || section.type}`}
            contentSection={section}
            index={index}
            isExpanded={!!expandedSections[index.toString()]}
            onToggle={() => toggleSection(index.toString())}
            colors={colors}
          />
        ))}
      </ScrollView>
    );
  };

  const renderJSONContent = () => {
    if (!section.content_json) return null;

    return (
      <ScrollView style={styles.jsonContent} showsVerticalScrollIndicator={false}>
        <Card style={[styles.jsonCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.jsonText, { color: colors.text }]}>
            {JSON.stringify(section.content_json, null, 2)}
          </Text>
        </Card>
      </ScrollView>
    );
  };

  const renderDetailsContent = () => {
    if (!section.content_details) return null;

    return (
      <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
        <Card style={[styles.detailsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.detailsText, { color: colors.text }]}>
            {section.content_details}
          </Text>
        </Card>
      </ScrollView>
    );
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'html':
        return renderHTML();
      case 'improved':
        return renderStructuredContent(section.content_improved || []);
      case 'json':
        return renderJSONContent();
      case 'details':
        return renderDetailsContent();
      default:
        return null;
    }
  };

  if (availableViewModes.length === 0) {
    return (
      <View style={[styles.noContent, { backgroundColor: colors.background }]}>
        <FileText size={48} color={colors.textSecondary} />
        <Text style={[styles.noContentText, { color: colors.textSecondary }]}>
          Für diesen Abschnitt sind keine Inhalte verfügbar.
        </Text>
      </View>
    );
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    viewModeSelector: {
      flexDirection: 'row',
      padding: 16,
      paddingBottom: 8,
      gap: 8,
    },
    viewModeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface || colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    viewModeButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    viewModeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    viewModeTextActive: {
      color: colors.background,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      {/* View Mode Selector - only show if multiple modes available */}
      {availableViewModes.length > 1 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={dynamicStyles.viewModeSelector}
          contentContainerStyle={{ gap: 8 }}
        >
          {availableViewModes.map(mode => {
            const IconComponent = mode.icon;
            const isActive = viewMode === mode.key;
            
            return (
              <TouchableOpacity
                key={mode.key}
                style={[
                  dynamicStyles.viewModeButton,
                  isActive && dynamicStyles.viewModeButtonActive
                ]}
                onPress={() => handleViewModeChange(mode.key)}
                activeOpacity={0.7}
              >
                <IconComponent 
                  size={16} 
                  color={isActive ? colors.background : colors.textSecondary} 
                />
                <Text style={[
                  dynamicStyles.viewModeText,
                  isActive && dynamicStyles.viewModeTextActive
                ]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      
      {/* Content Display */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  structuredContent: {
    flex: 1,
    padding: 16,
  },
  jsonContent: {
    flex: 1,
    padding: 16,
  },
  jsonCard: {
    padding: 16,
    borderRadius: 12,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  detailsContent: {
    flex: 1,
    padding: 16,
  },
  detailsCard: {
    padding: 20,
    borderRadius: 12,
  },
  detailsText: {
    fontSize: 16,
    lineHeight: 24,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  contentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  contentBody: {
    padding: 20,
    paddingTop: 0,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
  },
  definitionContainer: {
    marginTop: 16,
  },
  definitionTerm: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  definitionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  listContainer: {
    marginTop: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  listBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 12,
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  clinicalPearlContainer: {
    marginTop: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  clinicalPearlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clinicalPearlTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginLeft: 8,
  },
  clinicalPearlText: {
    fontSize: 15,
    color: '#92400E',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  errorCard: {
    padding: 20,
    alignItems: 'center',
    margin: 16,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noContentText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
});