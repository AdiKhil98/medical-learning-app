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
import { ChevronDown, BookOpen, AlertCircle, Search, ArrowRight, List, FileText, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ '0': true });
  const [searchTerm, setSearchTerm] = useState('');
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

  // Navigation handler for table of contents
  const handleNavigateToSection = (sectionIndex: number) => {
    // First expand the section if it's collapsed
    setExpandedSections(prev => ({
      ...prev,
      [sectionIndex]: true
    }));

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
    <Animated.View style={[styles.appContainer, { opacity: fadeAnim }]}>
      {/* Gradient Background */}
      <LinearGradient 
        colors={isDarkMode 
          ? ['#1e1b4b', '#312e81', '#3730a3'] 
          : ['#6366f1', '#8b5cf6', '#a855f7']
        }
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderBottomColor: 'rgba(255, 255, 255, 0.2)' }]}>
        <View style={styles.titleContainer}>
          <Text style={[styles.mainTitle, { color: 'white' }]}>
            {supabaseRow?.title || 'Medizinischer Inhalt'}
          </Text>
          <TableOfContents
            sections={tableOfContentsItems}
            onNavigateToSection={handleNavigateToSection}
            iconSize={18}
          />
        </View>

        <View style={styles.metaInfo}>
          <View style={[styles.metaBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
            <Text style={[styles.metaItem, { color: 'rgba(255, 255, 255, 0.9)' }]}>
              📚 {supabaseRow?.parent_slug?.replace(/-/g, ' ') || 'Medizin'}
            </Text>
          </View>
          <View style={[styles.metaBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
            <Text style={[styles.metaItem, { color: 'rgba(255, 255, 255, 0.9)' }]}>
              ⏱️ {formatDate(supabaseRow?.last_updated)}
            </Text>
          </View>
          <View style={[styles.metaBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
            <Text style={[styles.metaItem, { color: 'rgba(255, 255, 255, 0.9)' }]}>
              📖 {filteredSections.length} Abschnitte
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { 
          borderColor: 'rgba(255, 255, 255, 0.3)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)'
        }]}>
          <Search size={18} color="rgba(255, 255, 255, 0.7)" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchBox, { 
              color: 'white',
              backgroundColor: 'transparent'
            }]}
            placeholder="Suche im Inhalt..."
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={searchTerm}
            onChangeText={handleSearch}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearSearch}>
              <Text style={[styles.clearSearchText, { color: 'rgba(255, 255, 255, 0.7)' }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Navigation Section */}
        <View style={styles.quickNavSection}>
          <View style={styles.quickNavHeader}>
            <Text style={[styles.quickNavTitle, { color: 'rgba(255, 255, 255, 0.9)' }]}>
              ⚡ SCHNELLNAVIGATION
            </Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.quickNavScrollView}
            contentContainerStyle={styles.quickNavContent}
          >
            <TouchableOpacity 
              style={[styles.quickNavCard, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}
              onPress={() => {
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
              }}
            >
              <View style={[styles.quickNavIcon, { backgroundColor: 'rgba(99, 102, 241, 0.8)' }]}>
                <Info size={16} color="white" />
              </View>
              <Text style={[styles.quickNavCardText, { color: 'rgba(255, 255, 255, 0.9)' }]}>
                Übersicht
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickNavCard, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}
              onPress={() => {
                const firstSection = sectionRefs.current[0];
                if (firstSection && scrollViewRef.current) {
                  firstSection.measureLayout(
                    scrollViewRef.current as any,
                    (x, y) => {
                      scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
                    },
                    () => {}
                  );
                }
              }}
            >
              <View style={[styles.quickNavIcon, { backgroundColor: 'rgba(16, 185, 129, 0.8)' }]}>
                <FileText size={16} color="white" />
              </View>
              <Text style={[styles.quickNavCardText, { color: 'rgba(255, 255, 255, 0.9)' }]}>
                Inhalte
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickNavCard, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}
              onPress={() => {
                setExpandedSections(prev => {
                  const allExpanded: Record<string, boolean> = {};
                  filteredSections.forEach((_, index) => {
                    allExpanded[index] = true;
                  });
                  return allExpanded;
                });
              }}
            >
              <View style={[styles.quickNavIcon, { backgroundColor: 'rgba(245, 158, 11, 0.8)' }]}>
                <List size={16} color="white" />
              </View>
              <Text style={[styles.quickNavCardText, { color: 'rgba(255, 255, 255, 0.9)' }]}>
                Alle öffnen
              </Text>
            </TouchableOpacity>

            {filteredSections.slice(0, 4).map((section, index) => (
              <TouchableOpacity 
                key={index}
                style={[styles.quickNavCard, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}
                onPress={() => handleNavigateToSection(index)}
              >
                <View style={[styles.quickNavIcon, { backgroundColor: 'rgba(139, 92, 246, 0.8)' }]}>
                  <ArrowRight size={16} color="white" />
                </View>
                <Text style={[styles.quickNavCardText, { color: 'rgba(255, 255, 255, 0.9)' }]} numberOfLines={2}>
                  {section.title.length > 20 ? section.title.substring(0, 20) + '...' : section.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>


      {/* Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        
        {searchTerm.length > 0 && (
          <Text style={[styles.searchResults, { color: 'rgba(255, 255, 255, 0.8)' }]}>
            🔍 Suche nach: "{searchTerm}" ({filteredSections.length} von {parsedSections.length} Abschnitten)
          </Text>
        )}
        
        {/* Sections */}
        {filteredSections.map((section, index) => (
          <View 
            key={index} 
            ref={(ref) => { sectionRefs.current[index] = ref; }}
            style={[styles.contentSection, { 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              shadowColor: 'rgba(0, 0, 0, 0.1)',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
            }]}
          >
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setExpandedSections(prev => ({ ...prev, [index]: !prev[index] }))}
              accessibilityLabel={`${expandedSections[index] ? 'Ausklappen' : 'Einklappen'} Abschnitt ${section.title}`}
              accessibilityRole="button"
            >
              <BookOpen size={22} color="#6366f1" />
              <Text style={styles.sectionTitle}>
                {section.title}
              </Text>
              <ChevronDown
                size={20}
                color="#6b7280"
                style={[
                  styles.chevronIcon,
                  expandedSections[index] && { transform: [{ rotate: '180deg' }] }
                ]}
              />
            </TouchableOpacity>
            
            {expandedSections[index] && (
              <View style={styles.sectionContent}>
                <Text style={styles.contentText}>
                  {section.content}
                </Text>
              </View>
            )}
          </View>
        ))}
        
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
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    color: '#1e40af',
  },
  sectionContent: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(99, 102, 241, 0.1)',
    padding: 20,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  chevronIcon: {
    transition: 'transform 0.2s ease',
  },
  bottomPadding: {
    height: 40,
  },
  quickNavSection: {
    marginTop: 16,
  },
  quickNavHeader: {
    marginBottom: 12,
  },
  quickNavTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  quickNavScrollView: {
    flexGrow: 0,
  },
  quickNavContent: {
    paddingRight: 16,
    gap: 12,
  },
  quickNavCard: {
    minWidth: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  quickNavIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickNavCardText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default InteractiveMedicalContent;