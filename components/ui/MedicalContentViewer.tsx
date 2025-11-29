import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Eye, Code, FileText, BookOpen, List, Lightbulb, Info, AlertCircle, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Card from './Card';
import { MedicalSection, ContentSection, medicalContentService } from '@/lib/medicalContentService';

interface MedicalContentViewerProps {
  section: MedicalSection;
  onError?: (error: string) => void;
}

type ViewMode = 'integrated' | 'json' | 'details';

interface IntegratedContentSection {
  structuredContent: ContentSection;
  htmlContent?: string;
  index: number;
}

// Memoized integrated content section component that combines structured and HTML content
const IntegratedContentSection = memo(
  ({
    integratedSection,
    isExpanded,
    onToggle,
    colors,
    isDarkMode,
    renderCompactHTML,
  }: {
    integratedSection: IntegratedContentSection;
    isExpanded: boolean;
    onToggle: () => void;
    colors: any;
    isDarkMode: boolean;
    renderCompactHTML: (html: string) => React.ReactNode;
  }) => {
    const { structuredContent: contentSection, htmlContent, index } = integratedSection;
    const getIconForContentType = useCallback(
      (type: string) => {
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
      },
      [colors.primary]
    );

    const cardStyles = useMemo(
      () => ({
        backgroundColor: colors.card,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
        marginBottom: 16,
      }),
      [colors.card]
    );

    const chevronStyle = useMemo(
      () => [{ transform: [{ rotate: '0deg' }] }, isExpanded && { transform: [{ rotate: '180deg' }] }],
      [isExpanded]
    );

    const clinicalPearlStyles = useMemo(
      () => ({
        container: {
          ...styles.clinicalPearlContainer,
          backgroundColor: isDarkMode ? colors.surface : '#FFFBEB',
        },
      }),
      [isDarkMode, colors.surface]
    );

    const getSectionTitle = () => {
      if (contentSection.title) return contentSection.title;
      if (contentSection.type === 'definition' && contentSection.term) return contentSection.term;
      return `Abschnitt ${index + 1}`;
    };

    return (
      <Card style={cardStyles}>
        <TouchableOpacity style={styles.contentHeader} onPress={onToggle} activeOpacity={0.7}>
          <View style={styles.contentHeaderLeft}>
            {getIconForContentType(contentSection.type)}
            <Text style={[styles.contentTitle, { color: colors.text }]}>{getSectionTitle()}</Text>
            {/* Indicator for integrated content */}
            {htmlContent && (
              <View style={styles.integratedIndicator}>
                <Eye size={14} color={colors.primary} />
                <Text style={[styles.integratedText, { color: colors.primary }]}>+HTML</Text>
              </View>
            )}
          </View>
          <ChevronDown size={20} color={colors.textSecondary} style={chevronStyle} />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.contentBody}>
            {/* Definition Display */}
            {contentSection.type === 'definition' && contentSection.definition && (
              <View style={styles.definitionContainer}>
                {contentSection.term && (
                  <Text style={[styles.definitionTerm, { color: colors.primary }]}>{contentSection.term}</Text>
                )}
                <Text style={[styles.definitionText, { color: colors.text }]}>{contentSection.definition}</Text>
              </View>
            )}

            {/* Regular Content */}
            {contentSection.content && (
              <Text style={[styles.contentText, { color: colors.text }]}>{contentSection.content}</Text>
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
              <View style={clinicalPearlStyles.container}>
                <View style={styles.clinicalPearlHeader}>
                  <Lightbulb size={16} color="#F59E0B" />
                  <Text style={styles.clinicalPearlTitle}>Klinischer Tipp</Text>
                </View>
                <Text style={styles.clinicalPearlText}>{contentSection.clinical_pearl || contentSection.content}</Text>
              </View>
            )}

            {/* Clinical Relevance */}
            {contentSection.clinical_relevance && (
              <View style={[clinicalPearlStyles.container, { borderLeftColor: '#10B981' }]}>
                <View style={styles.clinicalPearlHeader}>
                  <Info size={16} color="#10B981" />
                  <Text style={[styles.clinicalPearlTitle, { color: '#059669' }]}>Klinische Relevanz</Text>
                </View>
                <Text style={[styles.clinicalPearlText, { color: '#059669' }]}>
                  {contentSection.clinical_relevance}
                </Text>
              </View>
            )}

            {/* Additional HTML Content */}
            {htmlContent && (
              <View style={styles.htmlContentSection}>
                <View style={styles.htmlContentHeader}>
                  <Eye size={16} color={colors.primary} />
                  <Text style={[styles.htmlContentTitle, { color: colors.primary }]}>
                    Zusätzliche medizinische Informationen
                  </Text>
                </View>
                <View style={styles.htmlContentContainer}>{renderCompactHTML(htmlContent)}</View>
              </View>
            )}
          </View>
        )}
      </Card>
    );
  }
);

// Legacy StructuredContentSection for backward compatibility (if needed)
const StructuredContentSection = memo(
  ({
    contentSection,
    index,
    isExpanded,
    onToggle,
    colors,
    isDarkMode,
  }: {
    contentSection: ContentSection;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
    colors: any;
    isDarkMode: boolean;
  }) => {
    const integratedSection: IntegratedContentSection = {
      structuredContent: contentSection,
      htmlContent: undefined,
      index,
    };

    return (
      <IntegratedContentSection
        integratedSection={integratedSection}
        isExpanded={isExpanded}
        onToggle={onToggle}
        colors={colors}
        isDarkMode={isDarkMode}
        renderCompactHTML={() => null}
      />
    );
  }
);

// Main component
export default function MedicalContentViewer({ section, onError }: MedicalContentViewerProps) {
  const { colors, isDarkMode } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('integrated');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [webViewError, setWebViewError] = useState<string | null>(null);

  // Available view modes based on section content
  const availableViewModes = useMemo(() => {
    const modes: { key: ViewMode; label: string; icon: React.ComponentType<any> }[] = [];

    // Always show integrated view if we have structured or HTML content
    if ((Array.isArray(section.content_improved) && section.content_improved.length > 0) || section.content_html) {
      modes.push({ key: 'integrated', label: 'Inhalt', icon: BookOpen });
    }
    if (Array.isArray(section.content_json) && section.content_json.length > 0) {
      modes.push({ key: 'json', label: 'Technische Daten', icon: Code });
    }
    if (section.content_details) {
      modes.push({ key: 'details', label: 'Zusätzliche Details', icon: FileText });
    }

    return modes;
  }, [section]);

  // Auto-expand first few sections for integrated content
  useMemo(() => {
    if ((Array.isArray(section.content_improved) && section.content_improved.length > 0) || section.content_html) {
      const initialExpanded: Record<string, boolean> = {};
      // Auto-expand first 2 sections for better UX
      if (section.content_improved && section.content_improved.length > 0) {
        initialExpanded['0'] = true;
        if (section.content_improved.length > 1) {
          initialExpanded['1'] = true;
        }
      }
      setExpandedSections(initialExpanded);
    }
  }, [section.content_improved, section.content_html]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setWebViewError(null);
  }, []);

  const toggleSection = useCallback((index: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  const handleWebViewError = useCallback(() => {
    setWebViewError('Fehler beim Laden des HTML-Inhalts');
    onError?.('HTML content could not be loaded');
  }, [onError]);

  // Helper function to extract relevant HTML content for a structured section
  const extractHtmlForSection = useCallback(
    (structuredSection: ContentSection, htmlContent?: string): string | null => {
      if (!htmlContent) return null;

      const sectionTitle = structuredSection.title || structuredSection.term || '';
      if (!sectionTitle) return null;

      // Try to find relevant HTML content based on section title/term
      const htmlLower = htmlContent.toLowerCase();
      const titleLower = sectionTitle.toLowerCase();

      // Look for headings or sections that match the structured content title
      const headingRegex = new RegExp(`<h[1-6][^>]*>.*${titleLower}.*</h[1-6]>`, 'gi');
      const match = htmlContent.match(headingRegex);

      if (match && match.length > 0) {
        // Extract the content following this heading
        const headingIndex = htmlLower.indexOf(match[0].toLowerCase());
        if (headingIndex !== -1) {
          const afterHeading = htmlContent.substring(headingIndex + match[0].length);
          // Extract content until next heading or end
          const nextHeadingMatch = afterHeading.match(/<h[1-6][^>]*>/i);
          const relevantContent = nextHeadingMatch
            ? afterHeading.substring(0, nextHeadingMatch.index)
            : afterHeading.substring(0, 500); // Limit to 500 chars

          return relevantContent.trim();
        }
      }

      return null;
    },
    []
  );

  // Helper function to prepare integrated content sections
  const prepareIntegratedContent = useCallback((): IntegratedContentSection[] => {
    const structuredContent = section.content_improved || [];
    const htmlContent = section.content_html;

    return structuredContent.map((structuredSection, index) => ({
      structuredContent: structuredSection,
      htmlContent: extractHtmlForSection(structuredSection, htmlContent),
      index,
    }));
  }, [section.content_improved, section.content_html, extractHtmlForSection]);

  // Render HTML content in a compact way for integration
  const renderCompactHTML = (htmlContent: string) => {
    if (webViewError) {
      return (
        <View style={[styles.htmlError, { backgroundColor: colors.surface }]}>
          <Text style={[styles.htmlErrorText, { color: colors.error }]}>HTML-Inhalt konnte nicht geladen werden</Text>
        </View>
      );
    }

    const compactHtmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 12px;
                background-color: ${colors.surface || colors.card};
                color: ${colors.text};
                line-height: 1.5;
                font-size: 14px;
              }
              h1, h2, h3, h4, h5, h6 {
                color: ${colors.primary};
                margin: 0.8em 0 0.4em 0;
                font-size: 16px;
              }
              p {
                margin: 0.4em 0;
              }
              .clinical-pearl {
                background-color: #FFFBEB;
                border-left: 3px solid #F59E0B;
                padding: 8px;
                border-radius: 6px;
                margin: 8px 0;
                font-style: italic;
              }
              .definition {
                background-color: ${colors.card};
                border-radius: 6px;
                padding: 8px;
                margin: 8px 0;
                border-left: 3px solid ${colors.primary};
              }
              ul, ol {
                padding-left: 20px;
                margin: 0.4em 0;
              }
              li {
                margin: 0.2em 0;
              }
              strong, b {
                color: ${colors.primary};
              }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `;

    return (
      <View style={styles.compactHtmlContainer}>
        <WebView
          source={{ html: compactHtmlContent }}
          style={styles.compactWebView}
          onError={handleWebViewError}
          onHttpError={handleWebViewError}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      </View>
    );
  };

  // Render integrated content that combines structured and HTML content
  const renderIntegratedContent = () => {
    const integratedSections = prepareIntegratedContent();
    const hasHtmlOverview = section.content_html && !section.content_improved?.length;

    return (
      <ScrollView style={styles.integratedContent} showsVerticalScrollIndicator={false}>
        {/* HTML Overview Section - if no structured content exists */}
        {hasHtmlOverview && (
          <Card style={[styles.overviewCard, { backgroundColor: colors.card }]}>
            <View style={styles.overviewHeader}>
              <BookOpen size={20} color={colors.primary} />
            </View>
            <View style={styles.htmlOverviewContainer}>{renderCompactHTML(section.content_html!)}</View>
          </Card>
        )}

        {/* Integrated Structured + HTML Sections */}
        {integratedSections.map((integratedSection) => (
          <IntegratedContentSection
            key={`integrated-${integratedSection.index}`}
            integratedSection={integratedSection}
            isExpanded={!!expandedSections[integratedSection.index.toString()]}
            onToggle={() => toggleSection(integratedSection.index.toString())}
            colors={colors}
            isDarkMode={isDarkMode}
            renderCompactHTML={renderCompactHTML}
          />
        ))}

        {/* Fallback message if no content available */}
        {integratedSections.length === 0 && !hasHtmlOverview && (
          <Card style={[styles.noContentCard, { backgroundColor: colors.card }]}>
            <FileText size={48} color={colors.textSecondary} />
            <Text style={[styles.noContentText, { color: colors.textSecondary }]}>
              Für diesen Abschnitt sind keine medizinischen Inhalte verfügbar.
            </Text>
          </Card>
        )}
      </ScrollView>
    );
  };

  const renderJSONContent = () => {
    if (!section.content_json) return null;

    return (
      <ScrollView style={styles.jsonContent} showsVerticalScrollIndicator={false}>
        <Card style={[styles.jsonCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.jsonText, { color: colors.text }]}>{JSON.stringify(section.content_json, null, 2)}</Text>
        </Card>
      </ScrollView>
    );
  };

  const renderDetailsContent = () => {
    if (!section.content_details) return null;

    return (
      <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
        <Card style={[styles.detailsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.detailsText, { color: colors.text }]}>{section.content_details}</Text>
        </Card>
      </ScrollView>
    );
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'integrated':
        return renderIntegratedContent();
      case 'json':
        return renderJSONContent();
      case 'details':
        return renderDetailsContent();
      default:
        return renderIntegratedContent(); // Default to integrated view
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
          {availableViewModes.map((mode) => {
            const IconComponent = mode.icon;
            const isActive = viewMode === mode.key;

            return (
              <TouchableOpacity
                key={mode.key}
                style={[dynamicStyles.viewModeButton, isActive && dynamicStyles.viewModeButtonActive]}
                onPress={() => handleViewModeChange(mode.key)}
                activeOpacity={0.7}
              >
                <IconComponent size={16} color={isActive ? colors.background : colors.textSecondary} />
                <Text style={[dynamicStyles.viewModeText, isActive && dynamicStyles.viewModeTextActive]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Content Display */}
      <View style={styles.contentContainer}>{renderContent()}</View>
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
  integratedContent: {
    flex: 1,
    padding: 16,
  },
  compactHtmlContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  compactWebView: {
    height: 120,
    backgroundColor: 'transparent',
  },
  htmlError: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  htmlErrorText: {
    fontSize: 12,
    fontStyle: 'italic',
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
  htmlContentSection: {
    marginTop: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  htmlContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  htmlContentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  htmlContentContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
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
  integratedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    gap: 4,
  },
  integratedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  overviewCard: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  htmlOverviewContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  noContentCard: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 16,
  },
});
