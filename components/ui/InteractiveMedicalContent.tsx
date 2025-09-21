import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  TextInput,
} from 'react-native';
import {
  ChevronDown,
  BookOpen,
  AlertCircle,
  Search,
  Stethoscope,
  Activity,
  AlertTriangle,
  FileText,
  Lightbulb,
  Target,
  Bookmark,
  Eye,
  Heart
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import TableOfContents from './TableOfContents';

interface SupabaseRow {
  idx: number;
  slug: string;
  title: string;
  parent_slug: string | null;
  description?: string;
  icon: string;
  color: string;
  content_improved?: string;
  content_html?: string;
  category: string;
  last_updated?: string;
}

interface InteractiveMedicalContentProps {
  supabaseRow: SupabaseRow;
}

const InteractiveMedicalContent: React.FC<InteractiveMedicalContentProps> = ({ supabaseRow }) => {
  const { colors, isDarkMode } = useTheme();
  const { triggerActivity } = useSessionTimeout();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ '0': true });
  const [searchTerm, setSearchTerm] = useState('');
  const [studyMode, setStudyMode] = useState(false);
  const [highlightedText, setHighlightedText] = useState<Set<string>>(new Set());
  const [bookmarkedSections, setBookmarkedSections] = useState<Set<number>>(new Set());
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [readingProgress, setReadingProgress] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<{ [key: number]: View | null }>({});

  // Parse content sections
  const parsedSections = React.useMemo(() => {
    console.log('📄 Parsing content for:', supabaseRow?.title);

    // Try content_improved first, then content_html as fallback
    const contentSource = supabaseRow?.content_improved || supabaseRow?.content_html;
    
    if (!contentSource) {
      console.log('❌ No content found in content_improved or content_html');
      return [];
    }

    try {
      // Ensure contentSource is a string before checking startsWith
      const contentString = typeof contentSource === 'string' ? contentSource : String(contentSource || '');
      
      console.log('📊 Content type:', typeof contentSource, 'Content length:', contentString.length);
      
      // If it's JSON, parse it
      if (contentString.startsWith('[') || contentString.startsWith('{')) {
        let sections: any[] = [];
        
        if (typeof contentSource === 'string') {
          sections = JSON.parse(contentSource);
        } else if (Array.isArray(contentSource)) {
          sections = contentSource;
        } else {
          return [];
        }

        return sections.map((section, index) => ({
          title: section?.title || `Section ${index + 1}`,
          content: (section?.content || '').replace(/\\n/g, '\n').replace(/\\"/g, '"').trim(),
        })).filter(section => section.content.length > 0);
      } else {
        // If it's plain text or HTML, create a single section
        return [{
          title: supabaseRow?.title || 'Medizinischer Inhalt',
          content: contentString.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim(),
        }];
      }

    } catch (error) {
      console.error('Error parsing content:', error);
      // Fallback to treating as plain text
      const contentString = typeof contentSource === 'string' ? contentSource : String(contentSource || '');
      return [{
        title: supabaseRow?.title || 'Medizinischer Inhalt',
        content: contentString.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim(),
      }];
    }
  }, [supabaseRow?.content_improved, supabaseRow?.content_html, supabaseRow?.title]);

  // Function to detect content type and assign styling
  const getContentTypeStyle = (title: string, content: string) => {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    // Definition sections
    if (titleLower.includes('definition') || titleLower.includes('klassifikation') ||
        contentLower.includes('wird definiert') || contentLower.includes('ist eine')) {
      return {
        borderColor: '#3B82F6',
        backgroundColor: '#FAFBFF',
        icon: FileText,
        iconColor: '#3B82F6',
        type: 'definition'
      };
    }

    // Clinical procedures
    if (titleLower.includes('therapie') || titleLower.includes('behandlung') ||
        titleLower.includes('intervention') || titleLower.includes('management')) {
      return {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4',
        icon: Activity,
        iconColor: '#10B981',
        type: 'clinical'
      };
    }

    // Diagnostics
    if (titleLower.includes('diagnostik') || titleLower.includes('untersuchung') ||
        titleLower.includes('befund') || titleLower.includes('symptom')) {
      return {
        borderColor: '#F59E0B',
        backgroundColor: '#FFFBEB',
        icon: Stethoscope,
        iconColor: '#F59E0B',
        type: 'diagnostic'
      };
    }

    // Critical/Emergency
    if (titleLower.includes('notfall') || titleLower.includes('kritisch') ||
        titleLower.includes('komplikation') || contentLower.includes('lebensbedrohlich')) {
      return {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
        icon: AlertTriangle,
        iconColor: '#EF4444',
        type: 'emergency'
      };
    }

    // Default
    return {
      borderColor: '#B87E70',
      backgroundColor: '#F9F6F2',
      icon: BookOpen,
      iconColor: '#B87E70',
      type: 'general'
    };
  };

  // Initialize animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Simple search handler
  const handleSearch = (text: string) => {
    setSearchTerm(text);
    triggerActivity(); // Trigger activity when user searches
  };

  // Simple date formatter
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unbekannt';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    } catch {
      return 'Unbekannt';
    }
  };

  // Filter sections based on search
  const filteredSections = React.useMemo(() => {
    if (!searchTerm.trim()) return parsedSections;
    
    const searchLower = searchTerm.toLowerCase();
    return parsedSections.filter(section => 
      section.title.toLowerCase().includes(searchLower) ||
      section.content.toLowerCase().includes(searchLower)
    );
  }, [parsedSections, searchTerm]);

  // Create table of contents items
  const tableOfContentsItems = React.useMemo(() => {
    return filteredSections.map((section, index) => ({
      id: `section-${index}`,
      title: section.title,
      index: index,
    }));
  }, [filteredSections]);

  // Enhanced function to auto-bold medical terminology
  const enhanceMedicalText = (text: string) => {
    const medicalTerms = [
      'Bradykardie', 'Tachykardie', 'Hypertonie', 'Hypotonie', 'Myokardinfarkt',
      'Angina pectoris', 'Herzinsuffizienz', 'Vorhofflimmern', 'Kammerflimmern',
      'AV-Block', 'Schrittmacher', 'Defibrillation', 'Reanimation', 'CPR',
      'EKG', 'Echokardiographie', 'Koronarangiographie', 'Stent', 'Bypass',
      'Pneumonie', 'Asthma', 'COPD', 'Pneumothorax', 'Pleuraerguss',
      'Intubation', 'Beatmung', 'Sauerstoff', 'CO2', 'pH-Wert',
      'Diabetes', 'Insulin', 'Glukose', 'HbA1c', 'Ketoacidose',
      'Sepsis', 'Antibiotika', 'Infektion', 'Fieber', 'Leukozytose'
    ];

    let enhancedText = text;

    // Auto-bold medical terms
    medicalTerms.forEach(term => {
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      enhancedText = enhancedText.replace(regex, '**$1**');
    });

    return enhancedText;
  };

  // Function to render numerical values with colored badges
  const renderNumericalValue = (value: string, type: 'normal' | 'pathological' | 'range') => {
    const badgeStyle = {
      normal: { backgroundColor: '#DCFCE7', color: '#166534', borderColor: '#10B981' },
      pathological: { backgroundColor: '#FEE2E2', color: '#991B1B', borderColor: '#EF4444' },
      range: { backgroundColor: '#DBEAFE', color: '#1E40AF', borderColor: '#3B82F6' }
    };

    return (
      <View style={[styles.numericalBadge, { borderColor: badgeStyle[type].borderColor, backgroundColor: badgeStyle[type].backgroundColor }]}>
        <Text style={[styles.numericalText, { color: badgeStyle[type].color }]}>{value}</Text>
      </View>
    );
  };

  // Enhanced text parsing with medical terminology and numerical values
  const parseEnhancedMedicalText = (text: string, baseStyle: any) => {
    // First enhance with medical terminology
    const enhancedText = enhanceMedicalText(text);

    // Parse for numerical values
    const numericalPattern = /(\d+(?:[.,]\d+)?)\s*(mmHg|bpm|\/min|mg\/dl|%)/gi;
    const rangePattern = /(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*(mmHg|bpm|\/min|mg\/dl)/gi;

    // Split text and identify numerical values
    const parts = [];
    let lastIndex = 0;
    let match;

    // First handle ranges
    const rangeMatches = [...enhancedText.matchAll(rangePattern)];
    rangeMatches.forEach(rangeMatch => {
      if (rangeMatch.index !== undefined) {
        // Add text before range
        if (rangeMatch.index > lastIndex) {
          parts.push({
            type: 'text',
            content: enhancedText.slice(lastIndex, rangeMatch.index)
          });
        }

        // Add range badge
        parts.push({
          type: 'numerical',
          content: `${rangeMatch[1]}-${rangeMatch[2]} ${rangeMatch[3]}`,
          valueType: 'range'
        });

        lastIndex = rangeMatch.index + rangeMatch[0].length;
      }
    });

    // Add remaining text
    if (lastIndex < enhancedText.length) {
      parts.push({
        type: 'text',
        content: enhancedText.slice(lastIndex)
      });
    }

    return parts;
  };

  // Helper function to parse and render formatted text (bold, italic, etc.)
  const parseFormattedText = (text: string, baseStyle: any) => {
    // Handle bold text: **text** or __text__
    const boldRegex = /(\*\*(.+?)\*\*|__(.+?)__)/g;
    // Handle italic text: *text* or _text_
    const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)/g;
    
    let parts = [{ text, isBold: false, isItalic: false }];
    
    // Parse bold text
    parts = parts.flatMap(part => {
      if (part.isBold || part.isItalic) return [part];
      
      const matches = [...part.text.matchAll(boldRegex)];
      if (matches.length === 0) return [part];
      
      const newParts = [];
      let lastIndex = 0;
      
      matches.forEach(match => {
        // Add text before match
        if (match.index! > lastIndex) {
          newParts.push({ 
            text: part.text.slice(lastIndex, match.index), 
            isBold: false, 
            isItalic: false 
          });
        }
        
        // Add bold text
        newParts.push({ 
          text: match[2] || match[3], 
          isBold: true, 
          isItalic: false 
        });
        
        lastIndex = match.index! + match[0].length;
      });
      
      // Add remaining text
      if (lastIndex < part.text.length) {
        newParts.push({ 
          text: part.text.slice(lastIndex), 
          isBold: false, 
          isItalic: false 
        });
      }
      
      return newParts;
    });
    
    // Parse italic text
    parts = parts.flatMap(part => {
      if (part.isBold || part.isItalic) return [part];
      
      const matches = [...part.text.matchAll(italicRegex)];
      if (matches.length === 0) return [part];
      
      const newParts = [];
      let lastIndex = 0;
      
      matches.forEach(match => {
        // Add text before match
        if (match.index! > lastIndex) {
          newParts.push({ 
            text: part.text.slice(lastIndex, match.index), 
            isBold: false, 
            isItalic: false 
          });
        }
        
        // Add italic text
        newParts.push({ 
          text: match[1] || match[2], 
          isBold: false, 
          isItalic: true 
        });
        
        lastIndex = match.index! + match[0].length;
      });
      
      // Add remaining text
      if (lastIndex < part.text.length) {
        newParts.push({ 
          text: part.text.slice(lastIndex), 
          isBold: false, 
          isItalic: false 
        });
      }
      
      return newParts;
    });
    
    return (
      <Text style={baseStyle}>
        {parts.map((part, index) => {
          let style = {};
          if (part.isBold) style = { ...style, ...styles.boldText };
          if (part.isItalic) style = { ...style, ...styles.italicText };
          
          return (
            <Text key={index} style={style}>
              {part.text}
            </Text>
          );
        })}
      </Text>
    );
  };

  // Helper function to highlight search terms in text
  const highlightSearchTerm = (text: string, searchTerm: string, baseStyle: any) => {
    if (!searchTerm.trim()) {
      return parseFormattedText(text, baseStyle);
    }

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <Text style={baseStyle}>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <Text key={index} style={styles.highlightedText}>
              {parseFormattedText(part, {})}
            </Text>
          ) : (
            parseFormattedText(part, {})
          )
        )}
      </Text>
    );
  };

  // Render formatted content with proper paragraph spacing and list support
  const renderFormattedContent = (content: string) => {
    // Split content into paragraphs by double line breaks or single line breaks
    const paragraphs = content
      .split(/\n\s*\n|\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (paragraphs.length === 0) {
      return <Text style={styles.contentText}>{content}</Text>;
    }

    return (
      <View style={styles.contentContainer}>
        {paragraphs.map((paragraph, index) => {
          // Check if this is a bullet point
          if (paragraph.match(/^[•\-\*]\s+/)) {
            const listText = paragraph.replace(/^[•\-\*]\s+/, '');
            return (
              <View key={index} style={styles.listItemContainer}>
                <Text style={styles.bulletPoint}>•</Text>
                <View style={{ flex: 1 }}>
                  {highlightSearchTerm(listText, searchTerm, styles.listItemText)}
                </View>
              </View>
            );
          }
          
          // Check if this is a numbered list item
          if (paragraph.match(/^\d+\.\s+/)) {
            const match = paragraph.match(/^(\d+)\.\s+(.*)$/);
            if (match) {
              return (
                <View key={index} style={styles.listItemContainer}>
                  <Text style={styles.numberPoint}>{match[1]}.</Text>
                  <View style={{ flex: 1 }}>
                    {highlightSearchTerm(match[2], searchTerm, styles.listItemText)}
                  </View>
                </View>
              );
            }
          }
          
          // Regular paragraph
          return (
            <View key={index} style={styles.paragraphContainer}>
              {highlightSearchTerm(paragraph, searchTerm, styles.contentText)}
            </View>
          );
        })}
      </View>
    );
  };

  // Navigation handler for table of contents
  const handleNavigateToSection = (sectionIndex: number) => {
    // First expand the section if it's collapsed
    setExpandedSections(prev => ({
      ...prev,
      [sectionIndex]: true
    }));
    triggerActivity(); // Trigger activity when user navigates to section

    // Then scroll to the section after a brief delay to allow expansion
    setTimeout(() => {
      const sectionRef = sectionRefs.current[sectionIndex];
      if (sectionRef && scrollViewRef.current) {
        sectionRef.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, y - 20), // Offset for better visibility
              animated: true
            });
          },
          () => {
            // Fallback: scroll to approximate position
            scrollViewRef.current?.scrollTo({
              y: sectionIndex * 200, // Approximate section height
              animated: true
            });
          }
        );
      }
    }, 150);
  };

  // Error handling
  if (!supabaseRow) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.errorContainer, { backgroundColor: colors.card }]}>
          <AlertCircle size={48} color={colors.textSecondary} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Keine Daten verfügbar
          </Text>
        </View>
      </View>
    );
  }

  if (parsedSections.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.errorContainer, { backgroundColor: colors.card }]}>
          <AlertCircle size={48} color={colors.textSecondary} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Keine medizinischen Inhalte gefunden
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            content_improved und content_html sind leer oder ungültig formatiert
          </Text>
          <View style={styles.debugContainer}>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Title: {supabaseRow?.title || 'N/A'}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Content Improved Type: {typeof supabaseRow?.content_improved}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Content HTML Type: {typeof supabaseRow?.content_html}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.appContainer, { opacity: fadeAnim, backgroundColor: '#FFFFFF' }]}>
      {/* Clean White Background */}
      <View style={styles.whiteBackground} />
      
      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: 'transparent', borderBottomColor: 'rgba(184, 126, 112, 0.2)' }]}>
        <View style={styles.titleContainer}>
          <Text style={[styles.mainTitle, { color: '#B15740' }]}>  {/* Brown Rust for coral branding */}
            {supabaseRow?.title || 'Medizinischer Inhalt'}
          </Text>
          <TableOfContents
            sections={tableOfContentsItems}
            onNavigateToSection={handleNavigateToSection}
            iconSize={18}
          />
        </View>

        <View style={styles.metaInfo}>
          <View style={[styles.metaBadge, { backgroundColor: 'rgba(248, 243, 232, 0.8)' }]}>  {/* Light beige background */}
            <Text style={[styles.metaItem, { color: '#B15740' }]}>  {/* Brown Rust text */}
              📚 {supabaseRow?.parent_slug?.replace(/-/g, ' ') || 'Medizin'}
            </Text>
          </View>
          <View style={[styles.metaBadge, { backgroundColor: 'rgba(248, 243, 232, 0.8)' }]}>
            <Text style={[styles.metaItem, { color: '#B15740' }]}>
              ⏱️ {formatDate(supabaseRow?.last_updated)}
            </Text>
          </View>
          <View style={[styles.metaBadge, { backgroundColor: 'rgba(248, 243, 232, 0.8)' }]}>
            <Text style={[styles.metaItem, { color: '#B15740' }]}>
              📖 {filteredSections.length} Abschnitte
            </Text>
          </View>
        </View>

        {/* Enhanced Search Bar */}
        <View style={[styles.enhancedSearchContainer, {
          borderColor: 'rgba(184, 126, 112, 0.3)',
          backgroundColor: '#FFFFFF',
          shadowColor: 'rgba(181, 87, 64, 0.1)',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 8,
          elevation: 4,
        }]}>
          <Search size={20} color="#B87E70" style={styles.searchIcon} />
          <TextInput
            style={[styles.enhancedSearchBox, {
              color: '#333333',
              backgroundColor: 'transparent',
              fontSize: 16,
            }]}
            placeholder="Durchsuche medizinische Inhalte..."
            placeholderTextColor="#6B7280"
            value={searchTerm}
            onChangeText={handleSearch}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => {
              handleSearch('');
              triggerActivity();
            }} style={styles.clearSearch}>
              <Text style={[styles.clearSearchText, { color: '#B87E70' }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Study Controls */}
        <View style={styles.studyControls}>
          <TouchableOpacity
            style={[styles.studyToggle, studyMode && styles.studyToggleActive]}
            onPress={() => setStudyMode(!studyMode)}
          >
            <Eye size={16} color={studyMode ? '#FFFFFF' : '#B87E70'} />
            <Text style={[styles.studyToggleText, studyMode && styles.studyToggleTextActive]}>
              Study Mode
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fontSizeToggle, fontSize === 'large' && styles.fontSizeToggleActive]}
            onPress={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')}
          >
            <Text style={[styles.fontSizeText, fontSize === 'large' && styles.fontSizeTextActive]}>
              Aa
            </Text>
          </TouchableOpacity>
        </View>
      </View>


      {/* Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        onScroll={() => {
          // Trigger activity on scroll to prevent timeout during reading
          triggerActivity();
        }}
        scrollEventThrottle={2000} // Only trigger every 2 seconds to avoid excessive calls
      >
        
        {searchTerm.length > 0 && (
          <Text style={[styles.searchResults, { color: '#6B7280' }]}>  {/* Medium gray for white background */}
            🔍 Suche nach: "{searchTerm}" ({filteredSections.length} von {parsedSections.length} Abschnitten)
          </Text>
        )}
        
        {/* Enhanced Sections */}
        {filteredSections.map((section, index) => {
          const contentStyle = getContentTypeStyle(section.title, section.content);
          const IconComponent = contentStyle.icon;

          return (
            <View
              key={index}
              ref={(ref) => { sectionRefs.current[index] = ref; }}
              style={[styles.enhancedContentSection, {
                backgroundColor: contentStyle.backgroundColor,
                borderLeftWidth: 4,
                borderLeftColor: contentStyle.borderColor,
                borderColor: 'rgba(184, 126, 112, 0.2)',
                shadowColor: 'rgba(181, 87, 64, 0.1)',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 12,
                elevation: 8,
              }]}
            >
              {/* Enhanced Section Header */}
              <TouchableOpacity
                style={styles.enhancedSectionHeader}
                onPress={() => {
                  setExpandedSections(prev => ({ ...prev, [index]: !prev[index] }));
                  triggerActivity();
                }}
                accessibilityLabel={`${expandedSections[index] ? 'Collapse' : 'Expand'} ${section.title}`}
                accessibilityRole="button"
              >
                <View style={styles.sectionHeaderLeft}>
                  <IconComponent size={20} color={contentStyle.iconColor} />
                  <Text style={[styles.enhancedSectionTitle, { fontSize: fontSize === 'large' ? 20 : 18 }]}>
                    {section.title}
                  </Text>
                </View>

                <View style={styles.sectionHeaderRight}>
                  <TouchableOpacity
                    style={styles.bookmarkButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      const newBookmarks = new Set(bookmarkedSections);
                      if (newBookmarks.has(index)) {
                        newBookmarks.delete(index);
                      } else {
                        newBookmarks.add(index);
                      }
                      setBookmarkedSections(newBookmarks);
                    }}
                  >
                    <Bookmark
                      size={16}
                      color={bookmarkedSections.has(index) ? '#F59E0B' : '#9CA3AF'}
                      fill={bookmarkedSections.has(index) ? '#F59E0B' : 'none'}
                    />
                  </TouchableOpacity>

                  <ChevronDown
                    size={20}
                    color="#6B7280"
                    style={[
                      styles.chevronIcon,
                      expandedSections[index] && { transform: [{ rotate: '180deg' }] }
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {/* Key Points Box (when study mode is active) */}
              {studyMode && expandedSections[index] && (
                <View style={[styles.keyPointsBox, { borderColor: contentStyle.borderColor }]}>
                  <View style={styles.keyPointsHeader}>
                    <Lightbulb size={16} color={contentStyle.iconColor} />
                    <Text style={[styles.keyPointsTitle, { color: contentStyle.iconColor }]}>
                      Wichtige Punkte
                    </Text>
                  </View>
                  <Text style={styles.keyPointsText}>
                    • Automatisch erkannte Schlüsselkonzepte werden hervorgehoben
                  </Text>
                </View>
              )}

              {/* Section Content */}
              {expandedSections[index] && (
                <View style={styles.enhancedSectionContent}>
                  {renderFormattedContent(section.content)}
                </View>
              )}
            </View>
          );
        })}
        
        <View style={styles.bottomPadding} />
      </ScrollView>

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appContainer: {
    flex: 1,
  },
  whiteBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: -1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  debugContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    marginBottom: 4,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    fontFamily: 'Inter-Bold',
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  metaBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 4,
  },
  metaItem: {
    fontSize: 13,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  enhancedSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  enhancedSearchBox: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    fontWeight: '500',
  },
  studyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  studyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B87E70',
    backgroundColor: 'transparent',
    gap: 6,
  },
  studyToggleActive: {
    backgroundColor: '#B87E70',
  },
  studyToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#B87E70',
  },
  studyToggleTextActive: {
    color: '#FFFFFF',
  },
  fontSizeToggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B87E70',
    backgroundColor: 'transparent',
  },
  fontSizeToggleActive: {
    backgroundColor: '#B87E70',
  },
  fontSizeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B87E70',
  },
  fontSizeTextActive: {
    color: '#FFFFFF',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBox: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearSearch: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  searchResults: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  contentSection: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  enhancedContentSection: {
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',  // Transparent to show card background
  },
  enhancedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'transparent',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    color: '#B15740',  // Brown Rust for coral branding
  },
  enhancedSectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    color: '#1F2937',
    lineHeight: 24,
  },
  bookmarkButton: {
    padding: 4,
    borderRadius: 4,
  },
  sectionContent: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(184, 126, 112, 0.2)',  // Old Rose border
    padding: 20,
  },
  enhancedSectionContent: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    padding: 20,
    lineHeight: 28,
  },
  keyPointsBox: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 16,
  },
  keyPointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  keyPointsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  keyPointsText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  contentContainer: {
    // Container for formatted content
  },
  paragraphContainer: {
    marginBottom: 14, // Space between paragraphs
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 28,
    fontFamily: 'Inter-Medium',
    color: '#B87E70', // Old Rose for bullets
    marginRight: 12,
    width: 20,
  },
  numberPoint: {
    fontSize: 16,
    lineHeight: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#B87E70', // Old Rose for numbers
    marginRight: 12,
    minWidth: 24,
  },
  listItemText: {
    fontSize: 16,
    lineHeight: 28,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    flex: 1,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 28, // Increased line height for better readability
    fontFamily: 'Inter-Regular',
    color: '#374151',
    textAlign: 'left',
  },
  numericalBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginHorizontal: 2,
    alignSelf: 'flex-start',
  },
  numericalText: {
    fontSize: 14,
    fontWeight: '600',
  },
  highlightedText: {
    backgroundColor: '#fef3c7', // Light yellow background
    color: '#92400e', // Darker text for contrast
    fontWeight: '600',
    paddingHorizontal: 2,
    borderRadius: 2,
  },
  boldText: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#1f2937', // Slightly darker for emphasis
  },
  italicText: {
    fontFamily: 'Inter-Italic',
    fontStyle: 'italic',
    color: '#4b5563', // Subtle gray for italic
  },
  chevronIcon: {
    transition: 'transform 0.2s ease',
  },
  bottomPadding: {
    height: 40,
  },
});

export default InteractiveMedicalContent;