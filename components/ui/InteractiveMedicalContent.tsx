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
import { ChevronDown, BookOpen, AlertCircle, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

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
      // If it's JSON, parse it
      if (contentSource.startsWith('[') || contentSource.startsWith('{')) {
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
          content: contentSource.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim(),
        }];
      }

    } catch (error) {
      console.error('Error parsing content:', error);
      // Fallback to treating as plain text
      return [{
        title: supabaseRow?.title || 'Medizinischer Inhalt',
        content: contentSource.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim(),
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
    <Animated.View style={[styles.appContainer, { backgroundColor: colors.background, opacity: fadeAnim }]}>
      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? 'rgba(42, 42, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)' }]}>
        <View style={styles.headerTop}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {supabaseRow?.category || 'Medizin'}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>📱 Mobile App</Text>
          </View>
        </View>

        <Text style={[styles.mainTitle, { color: colors.text }]}>
          {supabaseRow?.icon || '🏥'} {supabaseRow?.title || 'Medizinischer Inhalt'}
        </Text>

        <View style={styles.metaInfo}>
          <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
            📚 {supabaseRow?.parent_slug?.replace(/-/g, ' ') || 'Medizin'}
          </Text>
          <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
            ⏱️ {formatDate(supabaseRow?.last_updated)}
          </Text>
          <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
            📖 {filteredSections.length} Abschnitte
          </Text>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchBox, { 
              color: colors.text,
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }]}
            placeholder="Suche im Inhalt..."
            placeholderTextColor={colors.textSecondary}
            value={searchTerm}
            onChangeText={handleSearch}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearSearch}>
              <Text style={[styles.clearSearchText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Navigation */}
      {filteredSections.length > 0 && (
        <View style={[styles.sectionNav, { backgroundColor: colors.card }]}>
          <Text style={[styles.navTitle, { color: colors.text }]}>
            Schnellnavigation ({filteredSections.length} Abschnitte)
          </Text>
        </View>
      )}

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.stepIndicator, { color: colors.primary }]}>
          📱 Simplified Medical Content Viewer
        </Text>
        
        {searchTerm.length > 0 && (
          <Text style={[styles.searchResults, { color: colors.textSecondary }]}>
            🔍 Suche nach: "{searchTerm}" ({filteredSections.length} von {parsedSections.length} Abschnitten)
          </Text>
        )}
        
        {/* Sections */}
        {filteredSections.map((section, index) => (
          <View key={index} style={[styles.contentSection, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setExpandedSections(prev => ({ ...prev, [index]: !prev[index] }))}
            >
              <BookOpen size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {section.title}
              </Text>
              <ChevronDown
                size={20}
                color={colors.textSecondary}
                style={expandedSections[index] && { transform: [{ rotate: '180deg' }] }}
              />
            </TouchableOpacity>
            
            {expandedSections[index] && (
              <View style={[styles.sectionContent, { borderTopColor: colors.border }]}>
                <Text style={[styles.contentText, { color: colors.text }]}>
                  {section.content}
                </Text>
              </View>
            )}
          </View>
        ))}
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.navButton, { backgroundColor: colors.background }]}>
          <Text style={[styles.navButtonText, { color: colors.textSecondary }]}>← Zurück</Text>
        </TouchableOpacity>
        
        <Text style={[styles.pageInfo, { color: colors.textSecondary }]}>
          Seite 1 von {filteredSections.length}
        </Text>
        
        <TouchableOpacity style={[styles.navButton, { backgroundColor: colors.primary }]}>
          <Text style={[styles.navButtonText, { color: 'white' }]}>Weiter →</Text>
        </TouchableOpacity>
      </View>
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
  headerTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  metaItem: {
    fontSize: 14,
    marginRight: 16,
    marginBottom: 4,
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
  sectionNav: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  stepIndicator: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchResults: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  contentSection: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  sectionContent: {
    borderTopWidth: 1,
    padding: 16,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  bottomPadding: {
    height: 40,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: 14,
  },
});

export default InteractiveMedicalContent;