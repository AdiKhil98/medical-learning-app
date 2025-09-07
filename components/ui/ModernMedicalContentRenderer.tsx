import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
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
  Clock,
  TrendingUp,
  Info,
  Brain,
  Eye,
  Zap,
  Search,
  Bookmark,
  Edit3,
} from 'lucide-react-native';
import MedicalTermTooltip from './MedicalTermTooltip';
import ContentSearchBar from './ContentSearchBar';
import SectionNotesModal from './SectionNotesModal';
import FavoritesManager from './FavoritesManager';

const { width: screenWidth } = Dimensions.get('window');

interface MedicalSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  type: 'definition' | 'epidemiology' | 'etiology' | 'symptoms' | 'diagnosis' | 'therapy' | 'prognosis' | 'emergency';
}

interface ModernMedicalContentRendererProps {
  htmlContent?: string;
  jsonContent?: any;
  plainTextContent?: string;
  title: string;
  category?: string;
  lastUpdated?: string;
  completionStatus?: string;
}

const ModernMedicalContentRenderer: React.FC<ModernMedicalContentRendererProps> = ({
  htmlContent,
  jsonContent,
  plainTextContent,
  title,
  category = "Medizin",
  lastUpdated = "Juni 2025",
  completionStatus = "Vollständiger Leitfaden",
}) => {
  const { colors, isDarkMode } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [scrollY] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [bookmarkedSections, setBookmarkedSections] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [activeNoteSection, setActiveNoteSection] = useState<string | null>(null);
  const [favoritesVisible, setFavoritesVisible] = useState(false);

  // Refs for scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<Record<string, View | null>>({});

  // Animation effects
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideAnim]);
  
  // Icon mapping for different section types
  const getIconComponent = useCallback((iconName: string) => {
    switch (iconName) {
      case 'definition': return BookOpen;
      case 'epidemiology': return TrendingUp;
      case 'etiology': return Target;
      case 'symptoms': return Eye;
      case 'diagnosis': return Stethoscope;
      case 'therapy': return Heart;
      case 'prognosis': return Activity;
      case 'emergency': return AlertTriangle;
      case 'brain': return Brain;
      default: return Info;
    }
  }, []);

  // Medical term highlighting function
  const highlightMedicalTerms = useCallback((text: string) => {
    const medicalTerms = [
      'ICD-10', 'ACR/EULAR', 'Rheumatoide Arthritis', 'Autoimmunerkrankung', 'Synovialmembran',
      'CAM', 'CAM-ICU', '4AT', 'DRS-R-98', 'RASS', 'Delir', 'neuropsychiatrisches Syndrom',
      'Acetylcholin', 'Neurotransmitter', 'Neuroinflammation', 'IL-1β', 'TNF-α', 'IL-6'
    ];
    
    const percentageRegex = /(\d+(?:[,.-]\d+)*%?)/g;
    const numberRegex = /(\b\d+[,.-]?\d*\b)/g;
    
    let processedText = text;
    
    // Highlight medical terms
    medicalTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      processedText = processedText.replace(regex, `🔬${term}`);
    });
    
    // Highlight numbers and percentages
    processedText = processedText.replace(percentageRegex, '📊$1');
    
    return processedText;
  }, []);

  // Enhanced sample sections with rich content structure
  // Helper function to decode HTML entities and clean text
  const decodeHtmlEntities = (text: string): string => {
    if (!text || typeof text !== 'string') return '';
    
    let cleaned = text;
    
    // First handle literal escape sequences
    cleaned = cleaned
      .replace(/\\n\\n/g, ' ') // Double newlines to space
      .replace(/\\n/g, ' ')    // Single newlines to space
      .replace(/\\r/g, ' ')    // Carriage returns to space
      .replace(/\\t/g, ' ')    // Tabs to space
      .replace(/\n\n/g, ' ')   // Actual double newlines
      .replace(/\n/g, ' ')     // Actual newlines
      .replace(/\r/g, ' ')     // Actual carriage returns
      .replace(/\t/g, ' ');    // Actual tabs
    
    // Handle HTML entities
    const htmlEntities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': "'",
      '&#x2F;': '/',
      '&#39;': "'",
      '&nbsp;': ' ',
      '&auml;': 'ä',
      '&ouml;': 'ö',
      '&uuml;': 'ü',
      '&Auml;': 'Ä',
      '&Ouml;': 'Ö',
      '&Uuml;': 'Ü',
      '&szlig;': 'ß',
    };
    
    Object.entries(htmlEntities).forEach(([entity, char]) => {
      cleaned = cleaned.replace(new RegExp(entity, 'g'), char);
    });
    
    // Normalize multiple spaces and clean up
    cleaned = cleaned
      .replace(/\s+/g, ' ')           // Multiple spaces to single space
      .replace(/\s*\.\s*/g, '. ')     // Clean up periods
      .replace(/\s*,\s*/g, ', ')      // Clean up commas
      .replace(/\s*;\s*/g, '; ')      // Clean up semicolons
      .trim();
    
    return cleaned;
  };

  // Helper function to clean HTML content
  const cleanHtmlContent = (html: string): string => {
    if (!html || typeof html !== 'string') return '';
    
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<br\s*\/?>/gi, ' ') // Replace line breaks with spaces
      .replace(/<\/p>\s*<p[^>]*>/gi, ' ') // Replace paragraph breaks with spaces
      .replace(/<[^>]+>/g, ' ') // Remove all other HTML tags
      .replace(/&[a-zA-Z0-9#]+;/g, ' ') // Remove any remaining HTML entities
      .trim();
  };

  // Parse database content into sections
  const parsedSections = useMemo(() => {
    const sections = [];

    // Helper function to determine section type from title
    const getSectionType = (title: string): MedicalSection['type'] => {
      const titleLower = title.toLowerCase();
      if (titleLower.includes('definition') || titleLower.includes('pathophysiologie')) return 'definition';
      if (titleLower.includes('epidemiologie')) return 'epidemiology';
      if (titleLower.includes('ätiologie') || titleLower.includes('ursache')) return 'etiology';
      if (titleLower.includes('symptom') || titleLower.includes('klinik')) return 'symptoms';
      if (titleLower.includes('diagnos')) return 'diagnosis';
      if (titleLower.includes('therap') || titleLower.includes('behandlung')) return 'therapy';
      if (titleLower.includes('prognos') || titleLower.includes('verlauf')) return 'prognosis';
      if (titleLower.includes('notfall') || titleLower.includes('emergency')) return 'emergency';
      return 'definition';
    };

    // Helper function to get icon from type
    const getIconFromType = (type: MedicalSection['type']): string => {
      switch (type) {
        case 'definition': return 'definition';
        case 'epidemiology': return 'epidemiology';
        case 'etiology': return 'etiology';
        case 'symptoms': return 'symptoms';
        case 'diagnosis': return 'diagnosis';
        case 'therapy': return 'therapy';
        case 'prognosis': return 'prognosis';
        case 'emergency': return 'emergency';
        default: return 'definition';
      }
    };

    // Parse JSON content if available
    if (jsonContent && typeof jsonContent === 'object') {
      if (Array.isArray(jsonContent)) {
        // Handle array of sections
        jsonContent.forEach((item, index) => {
          if (item && typeof item === 'object') {
            const sectionType = getSectionType(item.title || item.heading || `Section ${index + 1}`);
            sections.push({
              id: item.id || `section-${index}`,
              title: decodeHtmlEntities(item.title || item.heading || `Section ${index + 1}`),
              icon: getIconFromType(sectionType),
              content: decodeHtmlEntities(cleanHtmlContent(item.content || item.text || item.description || '')),
              type: sectionType,
            });
          }
        });
      } else if (jsonContent.sections && Array.isArray(jsonContent.sections)) {
        // Handle object with sections array
        jsonContent.sections.forEach((item, index) => {
          const sectionType = getSectionType(item.title || item.heading || `Section ${index + 1}`);
          sections.push({
            id: item.id || `section-${index}`,
            title: decodeHtmlEntities(item.title || item.heading || `Section ${index + 1}`),
            icon: getIconFromType(sectionType),
            content: decodeHtmlEntities(cleanHtmlContent(item.content || item.text || item.description || '')),
            type: sectionType,
          });
        });
      } else {
        // Handle single object - convert to sections based on properties
        Object.entries(jsonContent).forEach(([key, value], index) => {
          if (value && typeof value === 'string' && value.length > 50) {
            const sectionType = getSectionType(key);
            sections.push({
              id: key.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              title: decodeHtmlEntities(key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')),
              icon: getIconFromType(sectionType),
              content: decodeHtmlEntities(cleanHtmlContent(value)),
              type: sectionType,
            });
          }
        });
      }
    }

    // Fallback to HTML content parsing if JSON is empty
    if (sections.length === 0 && htmlContent) {
      // Simple HTML parsing - extract headings and content
      const htmlSections = htmlContent.split(/<h[1-6][^>]*>/i);
      htmlSections.forEach((section, index) => {
        if (section.trim() && index > 0) {
          const titleMatch = section.match(/^([^<]+)/);
          const cleanedContent = cleanHtmlContent(section.replace(/^[^<]*<\/h[1-6]>/i, ''));
          
          if (titleMatch && cleanedContent && cleanedContent.length > 30) {
            const title = decodeHtmlEntities(titleMatch[1].trim());
            const sectionType = getSectionType(title);
            sections.push({
              id: `html-section-${index}`,
              title: title,
              icon: getIconFromType(sectionType),
              content: decodeHtmlEntities(cleanedContent.substring(0, 500) + (cleanedContent.length > 500 ? '...' : '')),
              type: sectionType,
            });
          }
        }
      });
    }

    // Final fallback to plain text content
    if (sections.length === 0 && plainTextContent) {
      const paragraphs = plainTextContent.split('\n\n').filter(p => p.trim().length > 100);
      paragraphs.forEach((paragraph, index) => {
        const lines = paragraph.split('\n');
        const rawTitle = lines[0].length < 100 ? lines[0] : `Abschnitt ${index + 1}`;
        const rawContent = lines.length > 1 ? lines.slice(1).join(' ') : paragraph;
        
        if (rawContent.trim().length > 50) {
          const title = decodeHtmlEntities(rawTitle.replace(/[#*]/g, '').trim());
          const content = decodeHtmlEntities(rawContent.trim());
          const sectionType = getSectionType(title);
          sections.push({
            id: `text-section-${index}`,
            title: title,
            icon: getIconFromType(sectionType),
            content: content,
            type: sectionType,
          });
        }
      });
    }

    // If still no sections, provide a default section
    if (sections.length === 0) {
      sections.push({
        id: 'default-content',
        title: 'Medizinischer Inhalt',
        icon: 'definition',
        content: decodeHtmlEntities(cleanHtmlContent(plainTextContent || htmlContent || 'Inhalt wird geladen...')),
        type: 'definition' as const,
      });
    }

    return sections;
  }, [jsonContent, htmlContent, plainTextContent]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  // Create animated values for sections
  const sectionAnimations = useMemo(() => {
    const animations: Record<string, { scale: Animated.Value; opacity: Animated.Value }> = {};
    parsedSections.forEach(section => {
      animations[section.id] = {
        scale: new Animated.Value(1),
        opacity: new Animated.Value(0.8),
      };
    });
    return animations;
  }, [parsedSections]);

  const animateSection = useCallback((sectionId: string, isPressed: boolean) => {
    const animation = sectionAnimations[sectionId];
    if (!animation) return;

    Animated.parallel([
      Animated.timing(animation.scale, {
        toValue: isPressed ? 0.98 : 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(animation.opacity, {
        toValue: isPressed ? 1 : 0.8,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();
  }, [sectionAnimations]);

  // Dynamic navigation items based on actual parsed sections
  const navigationItems = useMemo(() => {
    return parsedSections.slice(0, 6).map((section) => {
      // Get appropriate icon based on section type
      const getNavIcon = (type: string) => {
        switch (type) {
          case 'definition': return '📋';
          case 'epidemiology': return '📊';
          case 'symptoms': return '🔍';
          case 'diagnosis': return '🩺';
          case 'etiology': return '💊';
          case 'therapy': return '💊';
          case 'prognosis': return '📈';
          default: return '📄';
        }
      };

      return {
        title: section.title,
        icon: getNavIcon(section.type),
        sectionId: section.id,
      };
    });
  }, [parsedSections]);

  const scrollToSection = useCallback((sectionId: string) => {
    // Expand the section first
    setExpandedSections(prev => ({ ...prev, [sectionId]: true }));
    
    // Calculate scroll position based on section index
    const sectionIndex = parsedSections.findIndex(s => s.id === sectionId);
    if (sectionIndex >= 0 && scrollViewRef.current) {
      // Wait for section expansion, then scroll
      setTimeout(() => {
        // Calculate approximate scroll position
        const headerHeight = 400; // Header + navigation height
        const progressBarHeight = 40;
        const sectionHeight = 120; // Average section height when collapsed
        const approximateY = headerHeight + progressBarHeight + (sectionIndex * sectionHeight);
        
        console.log(`Scrolling to section ${sectionId} at index ${sectionIndex}, position ${approximateY}`);
        
        scrollViewRef.current?.scrollTo({
          x: 0,
          y: Math.max(0, approximateY - 80), // Better offset to show section clearly
          animated: true
        });
      }, 300); // Optimized delay
    } else {
      console.log(`Section ${sectionId} not found in parsedSections`);
    }
  }, [parsedSections]);

  // Favorites management
  const getFavoriteSections = useCallback(() => {
    return Array.from(bookmarkedSections).map(sectionId => {
      const section = parsedSections.find(s => s.id === sectionId);
      if (!section) return null;
      
      return {
        id: section.id,
        title: section.title,
        category: category,
        addedAt: new Date(), // In real app, this would be stored
        type: section.type,
      };
    }).filter(Boolean) as any[];
  }, [bookmarkedSections, parsedSections, category]);

  const toggleBookmark = useCallback((sectionId: string) => {
    setBookmarkedSections(prev => {
      const newBookmarks = new Set(prev);
      if (newBookmarks.has(sectionId)) {
        newBookmarks.delete(sectionId);
      } else {
        newBookmarks.add(sectionId);
      }
      return newBookmarks;
    });
  }, []);

  const removeFromFavorites = useCallback((sectionId: string) => {
    setBookmarkedSections(prev => {
      const newBookmarks = new Set(prev);
      newBookmarks.delete(sectionId);
      return newBookmarks;
    });
  }, []);

  const clearAllFavorites = useCallback(() => {
    setBookmarkedSections(new Set());
  }, []);

  // Notes management
  const handleNoteSave = useCallback((sectionId: string, note: string) => {
    setNotes(prev => ({
      ...prev,
      [sectionId]: note
    }));
  }, []);

  const handleNoteDelete = useCallback((sectionId: string) => {
    setNotes(prev => {
      const newNotes = { ...prev };
      delete newNotes[sectionId];
      return newNotes;
    });
  }, []);

  const openNotesModal = useCallback((sectionId: string) => {
    setActiveNoteSection(sectionId);
    setNotesModalVisible(true);
  }, []);

  // Render modern header
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />
      <View style={styles.headerContent}>
        <View style={styles.headerTop}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{category.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.mainTitle}>{title}</Text>
        
        {/* Action buttons */}
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => setIsSearchVisible(!isSearchVisible)}
          >
            <Search size={18} color="#667eea" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => setFavoritesVisible(true)}
          >
            <Bookmark 
              size={18} 
              color={bookmarkedSections.size > 0 ? "#f59e0b" : "#667eea"}
              fill={bookmarkedSections.size > 0 ? "#f59e0b" : "none"}
            />
            {bookmarkedSections.size > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{bookmarkedSections.size}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Render quick navigation
  const renderQuickNavigation = () => (
    <View style={styles.navigationContainer}>
      <Text style={styles.navTitle}>SCHNELLNAVIGATION</Text>
      <View style={styles.navGrid}>
        {navigationItems.map((item, index) => {
          const [navScale] = useState(new Animated.Value(1));
          
          const handleNavPress = () => {
            console.log(`Navigation pill pressed: ${item.title} -> ${item.sectionId}`);
            console.log('Available sections:', parsedSections.map(s => `${s.id}: ${s.title}`));
            
            Animated.sequence([
              Animated.timing(navScale, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(navScale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
              })
            ]).start();
            scrollToSection(item.sectionId);
          };

          return (
            <Animated.View
              key={index}
              style={{ transform: [{ scale: navScale }] }}
            >
              <TouchableOpacity
                style={styles.navItem}
                onPress={handleNavPress}
                activeOpacity={0.7}
              >
                <Text style={styles.navItemText}>{item.icon} {item.title}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );

  // Enhanced text renderer with highlighting and tooltips
  const renderEnhancedText = useCallback((text: string) => {
    const parts = text.split(/(🔬[^🔬📊]+|📊\d+(?:[,.-]\d+)*%?)/);
    
    return (
      <Text style={styles.contentText}>
        {parts.map((part, index) => {
          if (part.startsWith('🔬')) {
            // Medical term with tooltip
            const termText = part.replace('🔬', '');
            return (
              <MedicalTermTooltip key={index} term={termText}>
                <Text style={styles.medicalTerm}>
                  {termText}
                </Text>
              </MedicalTermTooltip>
            );
          } else if (part.startsWith('📊')) {
            // Statistical number
            return (
              <Text key={index} style={styles.statisticalBadge}>
                {part.replace('📊', '')}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  }, []);

  // Render enhanced content section
  const renderContentSection = (section: MedicalSection) => {
    const IconComponent = getIconComponent(section.icon);
    const isExpanded = expandedSections[section.id];
    const processedContent = highlightMedicalTerms(section.content);

    const animation = sectionAnimations[section.id];

    return (
      <Animated.View 
        key={section.id} 
        ref={(ref) => { sectionRefs.current[section.id] = ref; }}
        style={[
          styles.contentSection,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: animation?.scale || 1 }
            ]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(section.id)}
          onPressIn={() => animateSection(section.id, true)}
          onPressOut={() => animateSection(section.id, false)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionIconContainer}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.sectionIcon}
            >
              <IconComponent size={20} color="white" />
            </LinearGradient>
          </View>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionHeaderActions}>
            <TouchableOpacity 
              onPress={() => openNotesModal(section.id)}
              style={styles.notesButton}
            >
              <Edit3 
                size={16} 
                color={notes[section.id] ? "#10b981" : "#9ca3af"}
              />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => toggleBookmark(section.id)}
              style={styles.bookmarkButton}
            >
              <Bookmark 
                size={16} 
                color={bookmarkedSections.has(section.id) ? "#f59e0b" : "#9ca3af"}
                fill={bookmarkedSections.has(section.id) ? "#f59e0b" : "none"}
              />
            </TouchableOpacity>
            <Animated.View
              style={[
                styles.chevronContainer,
                {
                  transform: [{
                    rotate: isExpanded ? '180deg' : '0deg'
                  }]
                }
              ]}
            >
              <ChevronDown size={20} color="#666" />
            </Animated.View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionContent}>
            {renderEnhancedText(processedContent)}
            
            {/* Add highlight boxes for special content */}
            {section.id === 'epidemiology' && (
              <View style={styles.highlightBox}>
                <Text style={styles.highlightTitle}>📊 Epidemiologische Daten</Text>
                <Text style={styles.highlightText}>
                  • Inzidenz: 3-5 pro 100.000 Einwohner{"\n"}
                  • Männer 2:3x häufiger betroffen{"\n"}
                  • Mortalität unbehandelt: 1-2% pro Stunde{"\n"}
                  • 50% Mortalität nach 48 Stunden
                </Text>
              </View>
            )}

            {section.id === 'symptoms' && (
              <View style={styles.subtypeContainer}>
                <View style={styles.subtypeCard}>
                  <Text style={styles.subtypeTitle}>Hyperaktives Delir (25%)</Text>
                  <Text style={styles.subtypeText}>
                    Psychomotorische Unruhe, Agitation, Halluzinationen - am ehesten erkannt aber am wenigsten häufig
                  </Text>
                </View>
                <View style={styles.subtypeCard}>
                  <Text style={styles.subtypeTitle}>Hypoaktives Delir (50%)</Text>
                  <Text style={styles.subtypeText}>
                    Lethargie, Apathie, reduzierte Motorik - wird oft übersehen und hat schlechtere Prognose
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5' }]}
      showsVerticalScrollIndicator={false}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false }
      )}
    >
      {/* Background Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.appContainer}>
        {renderHeader()}
        
        {/* Search Bar */}
        {isSearchVisible && (
          <View style={styles.searchSection}>
            <ContentSearchBar
              searchableContent={parsedSections}
              onSearchResult={(results) => {
                console.log('Search results:', results);
              }}
              onSectionSelect={(sectionId) => {
                setExpandedSections(prev => ({ ...prev, [sectionId]: true }));
                setIsSearchVisible(false);
              }}
            />
          </View>
        )}
        
        {renderQuickNavigation()}
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={[styles.progressFill, { width: '30%' }]}
            />
          </View>
        </View>

        {/* Content Sections */}
        {parsedSections.map(renderContentSection)}
      </View>
      
      {/* Modals */}
      <FavoritesManager
        isVisible={favoritesVisible}
        favorites={getFavoriteSections()}
        onClose={() => setFavoritesVisible(false)}
        onSectionSelect={(sectionId) => {
          setExpandedSections(prev => ({ ...prev, [sectionId]: true }));
          setFavoritesVisible(false);
        }}
        onRemoveFavorite={removeFromFavorites}
        onClearAll={clearAllFavorites}
      />
      
      <SectionNotesModal
        isVisible={notesModalVisible}
        sectionTitle={activeNoteSection ? parsedSections.find(s => s.id === activeNoteSection)?.title || '' : ''}
        sectionId={activeNoteSection || ''}
        currentNote={activeNoteSection ? notes[activeNoteSection] || '' : ''}
        onSave={handleNoteSave}
        onDelete={handleNoteDelete}
        onClose={() => {
          setNotesModalVisible(false);
          setActiveNoteSection(null);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appContainer: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
    padding: 20,
  },
  
  // Header Styles
  headerContainer: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: 25,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  badge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20, // Perfect pill shape
    elevation: 1,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600', // Semi-bold for optimal legibility
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
  },

  // Navigation Styles
  navigationContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  navItem: {
    flex: 1,
    minWidth: 150,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 25, // Perfect pill shape
    borderWidth: 1,
    borderColor: 'rgba(103, 126, 234, 0.15)',
    elevation: 2,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  navItemText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '500', // Medium weight for optimal pill readability
    lineHeight: 18,
  },

  // Progress Styles
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Content Section Styles
  contentSection: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionIconContainer: {
    marginRight: 15,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  chevronContainer: {
    padding: 5,
  },
  sectionContent: {
    padding: 30,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 28,
    color: '#4a4a4a',
    textAlign: 'justify',
  },
  medicalTerm: {
    color: '#764ba2',
    fontWeight: '600',
    backgroundColor: '#f3f0ff',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statisticalBadge: {
    backgroundColor: '#3b82f6',
    color: 'white',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20, // Perfect pill shape
    fontWeight: '600', 
    fontSize: 12,
    overflow: 'hidden',
    textAlign: 'center',
    elevation: 1,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  highlightBox: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  highlightTitle: {
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 10,
    fontSize: 16,
  },
  highlightText: {
    fontSize: 14,
    color: '#4a4a4a',
    lineHeight: 22,
  },
  subtypeContainer: {
    marginTop: 20,
  },
  subtypeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
    borderLeftWidth: 5,
    borderLeftColor: '#2563EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  subtypeTitle: {
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 10,
    fontSize: 16,
  },
  subtypeText: {
    fontSize: 14,
    color: '#4a4a4a',
    lineHeight: 22,
  },

  // Header Actions
  headerActions: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  actionBtn: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },

  // Search Section
  searchSection: {
    marginBottom: 20,
  },

  // Section Header Actions
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bookmarkButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f9fafb',
    marginLeft: 8,
  },
  notesButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f9fafb',
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
});

export default ModernMedicalContentRenderer;