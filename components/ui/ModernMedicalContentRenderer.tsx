import React, { useState, useCallback, useMemo } from 'react';
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
  const sampleSections = useMemo(() => [
    {
      id: 'definition',
      title: 'Definition und pathophysiologische Grundlagen',
      icon: 'definition',
      content: `Die Rheumatoide Arthritis ist eine chronisch-entzündliche Autoimmunerkrankung, die primär die Synovialmembran der Gelenke betrifft und nach ICD-10 unter M06 klassifiziert wird. Die Diagnose erfolgt anhand der ACR/EULAR-Klassifikationskriterien von 2010, wobei ein Score von mindestens 6 von 10 Punkten für eine definitive RA spricht.`,
      type: 'definition' as const,
    },
    {
      id: 'epidemiology',
      title: 'Epidemiologie',
      icon: 'epidemiology',  
      content: `Die epidemiologische Verteilung zeigt: Die rheumatoide Arthritis betrifft in Deutschland etwa 0,5 bis 1,0 Prozent der Bevölkerung, wobei Frauen mit einem Verhältnis von 3:1 häufiger erkranken als Männer. Der Erkrankungsgipfel liegt zwischen dem 40. und 60. Lebensjahr, wobei auch ein juveniler Beginn vor dem 16. Lebensjahr möglich ist.`,
      type: 'epidemiology' as const,
    },
    {
      id: 'symptoms',
      title: 'Klinische Symptomatik',
      icon: 'symptoms',
      content: `Die klinische Präsentation wird durch vier Kardinalsymptome charakterisiert: Akuter Beginn mit fluktuierendem Verlauf, Aufmerksamkeitsstörung, Denkstörungen und Bewusstseinsveränderung. Hyperaktives Delir (25%): Psychomotorische Unruhe, Agitation, Halluzinationen.`,
      type: 'symptoms' as const,
    },
    {
      id: 'diagnosis',
      title: 'Diagnostik',
      icon: 'diagnosis',
      content: `Die Diagnostik basiert auf klinischen Kriterien, Laborparametern und bildgebenden Verfahren. Wichtige Assessment-Tools: CAM - Confusion Assessment Method, CAM-ICU - für Intensivpatienten, 4AT - benutzerfreundliches Screening.`,
      type: 'diagnosis' as const,
    },
  ], []);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  // Create animated values for sections
  const sectionAnimations = useMemo(() => {
    const animations: Record<string, { scale: Animated.Value; opacity: Animated.Value }> = {};
    sampleSections.forEach(section => {
      animations[section.id] = {
        scale: new Animated.Value(1),
        opacity: new Animated.Value(0.8),
      };
    });
    return animations;
  }, [sampleSections]);

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

  // Quick navigation items
  const navigationItems = [
    { title: 'Definition & Pathophysiologie', icon: '📋', sectionId: 'definition' },
    { title: 'Epidemiologie & Risikofaktoren', icon: '📊', sectionId: 'epidemiology' },
    { title: 'Klinische Manifestationen', icon: '🔍', sectionId: 'symptoms' },
    { title: 'Diagnostik & Assessment', icon: '🩺', sectionId: 'diagnosis' },
    { title: 'Ätiologie & Ursachen', icon: '💊', sectionId: 'etiology' },
    { title: 'Differentialdiagnose', icon: '🔄', sectionId: 'differential' },
  ];

  const scrollToSection = useCallback((sectionId: string) => {
    // Expand the section and scroll to it
    setExpandedSections(prev => ({ ...prev, [sectionId]: true }));
  }, []);

  // Favorites management
  const getFavoriteSections = useCallback(() => {
    return Array.from(bookmarkedSections).map(sectionId => {
      const section = sampleSections.find(s => s.id === sectionId);
      if (!section) return null;
      
      return {
        id: section.id,
        title: section.title,
        category: category,
        addedAt: new Date(), // In real app, this would be stored
        type: section.type,
      };
    }).filter(Boolean) as any[];
  }, [bookmarkedSections, sampleSections, category]);

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
          <View style={[styles.badge, styles.mobileBadge]}>
            <Text style={styles.badgeText}>📱 MOBILE APP</Text>
          </View>
        </View>
        <Text style={styles.mainTitle}>{title}</Text>
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>📚 Medizinischer Leitfaden</Text>
          <Text style={styles.metaText}>⏱️ Letzte Aktualisierung: {lastUpdated}</Text>
          <Text style={styles.metaText}>📖 {completionStatus}</Text>
        </View>
        
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
              searchableContent={sampleSections}
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
        {sampleSections.map(renderContentSection)}
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
        sectionTitle={activeNoteSection ? sampleSections.find(s => s.id === activeNoteSection)?.title || '' : ''}
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
    borderRadius: 20,
  },
  mobileBadge: {
    backgroundColor: '#10B981',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
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
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  navItemText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
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
    backgroundColor: '#2563EB',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 15,
    fontWeight: '600',
    fontSize: 14,
    overflow: 'hidden',
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