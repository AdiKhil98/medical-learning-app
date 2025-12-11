import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  TextInput,
  Modal,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView,
  PanResponder,
  BackHandler,
} from 'react-native';
import {
  X,
  ChevronDown,
  BookOpen,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  List,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { supabase } from '@/lib/supabase';
import TableOfContents from './TableOfContents';
import { colors } from '@/constants/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

interface SectionItem {
  id: string;
  slug: string;
  title: string;
  type: 'main-category' | 'sub-category' | 'section' | 'subsection' | 'content';
}

interface MedicalContentModalProps {
  visible: boolean;
  onClose: () => void;
  initialSlug?: string;
  availableSections?: SectionItem[];
  onSectionChange?: (slug: string) => void;
}

interface ContentSection {
  title: string;
  content: string;
}

const MedicalContentModal: React.FC<MedicalContentModalProps> = ({
  visible,
  onClose,
  initialSlug,
  availableSections = [],
  onSectionChange,
}) => {
    const { triggerActivity } = useSessionTimeout();

  // State management
  const [currentSlug, setCurrentSlug] = useState<string | null>(initialSlug || null);
  const [currentSection, setCurrentSection] = useState<SupabaseRow | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTableOfContents, setShowTableOfContents] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<{ [key: number]: View | null }>({});

  // Content cache for performance
  const contentCache = useRef(new Map<string, { data: SupabaseRow, timestamp: number }>());
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // Parse content sections
  const parsedSections: ContentSection[] = React.useMemo(() => {
    if (!currentSection) return [];

    const contentSource = currentSection.content_improved || currentSection.content_html;
    if (!contentSource) return [];

    try {
      const contentString = typeof contentSource === 'string' ? contentSource : String(contentSource || '');

      if (contentString.startsWith('[') || contentString.startsWith('{')) {
        let sections: any[] = [];

        if (typeof contentSource === 'string') {
          sections = JSON.parse(contentSource);
        } else if (Array.isArray(contentSource)) {
          sections = contentSource;
        }

        return sections.map((section, index) => ({
          title: section?.title || `Section ${index + 1}`,
          content: (section?.content || '').replace(/\\n/g, '\n').replace(/\\"/g, '"').trim(),
        })).filter(section => section.content.length > 0);
      } else {
        return [{
          title: currentSection.title || 'Medizinischer Inhalt',
          content: contentString.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim(),
        }];
      }
    } catch (error) {
      const contentString = typeof contentSource === 'string' ? contentSource : String(contentSource || '');
      return [{
        title: currentSection.title || 'Medizinischer Inhalt',
        content: contentString.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim(),
      }];
    }
  }, [currentSection]);

  // Filter sections based on search
  const filteredSections = React.useMemo(() => {
    if (!searchTerm.trim()) return parsedSections;

    const searchLower = searchTerm.toLowerCase();
    return parsedSections.filter(section =>
      section.title.toLowerCase().includes(searchLower) ||
      section.content.toLowerCase().includes(searchLower)
    );
  }, [parsedSections, searchTerm]);

  // Table of contents items
  const tableOfContentsItems = React.useMemo(() => {
    return filteredSections.map((section, index) => ({
      id: `section-${index}`,
      title: section.title,
      index: index,
    }));
  }, [filteredSections]);

  // Fetch section content
  const fetchSection = useCallback(async (slug: string) => {
    if (!slug) return;

    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = contentCache.current.get(slug);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        setCurrentSection(cached.data);
        setExpandedSections({});
        setLoading(false);
        return;
      }

      // Fetch from database
      const { data: sectionData, error } = await supabase
        .from('sections')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      if (!sectionData) throw new Error('Abschnitt nicht gefunden');

      setCurrentSection(sectionData);
      contentCache.current.set(slug, { data: sectionData, timestamp: now });

      // Start with all sections collapsed for better overview
      setExpandedSections({});
    } catch (e: any) {
      logger.error('Error fetching section:', e);
      setError(e.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Navigation between sections
  const navigateToSection = useCallback((slug: string) => {
    setCurrentSlug(slug);
    fetchSection(slug);
    onSectionChange?.(slug);
    triggerActivity();
  }, [fetchSection, onSectionChange, triggerActivity]);

  const getCurrentSectionIndex = useCallback(() => {
    return availableSections.findIndex(section => section.slug === currentSlug);
  }, [availableSections, currentSlug]);

  const navigateToNextSection = useCallback(() => {
    const currentIndex = getCurrentSectionIndex();
    if (currentIndex < availableSections.length - 1) {
      const nextSection = availableSections[currentIndex + 1];
      navigateToSection(nextSection.slug);
    }
  }, [availableSections, getCurrentSectionIndex, navigateToSection]);

  const navigateToPreviousSection = useCallback(() => {
    const currentIndex = getCurrentSectionIndex();
    if (currentIndex > 0) {
      const prevSection = availableSections[currentIndex - 1];
      navigateToSection(prevSection.slug);
    }
  }, [availableSections, getCurrentSectionIndex, navigateToSection]);

  // Modal animations
  const showModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, slideAnim]);

  const hideModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      setCurrentSection(null);
      setCurrentSlug(null);
      setSearchTerm('');
      setExpandedSections({});
      setError(null);
      setIsFullscreen(false);
      setShowTableOfContents(false);
    });
  }, [fadeAnim, scaleAnim, slideAnim, onClose]);

  // Effects
  useEffect(() => {
    if (visible) {
      showModal();
      if (initialSlug) {
        setCurrentSlug(initialSlug);
        fetchSection(initialSlug);
      }
    } else {
      hideModal();
    }
  }, [visible, initialSlug, showModal, hideModal, fetchSection]);

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (visible) {
          hideModal();
          return true;
        }
        return false;
      });

      return () => backHandler.remove();
    }
  }, [visible, hideModal]);

  // Keyboard shortcuts (web)
  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          hideModal();
        } else if (event.key === 'ArrowLeft' && event.ctrlKey) {
          navigateToPreviousSection();
        } else if (event.key === 'ArrowRight' && event.ctrlKey) {
          navigateToNextSection();
        } else if (event.key === 'f' && event.ctrlKey) {
          event.preventDefault();
          setIsFullscreen(!isFullscreen);
        }
      };

      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [visible, hideModal, navigateToNextSection, navigateToPreviousSection, isFullscreen]);

  // Search handler
  const handleSearch = useCallback((text: string) => {
    setSearchTerm(text);
    triggerActivity();
  }, [triggerActivity]);

  // Section toggle
  const toggleSection = useCallback((index: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
    triggerActivity();
  }, [triggerActivity]);

  // Navigate to section from table of contents
  const handleNavigateToSection = useCallback((sectionIndex: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionIndex]: true
    }));
    triggerActivity();

    setTimeout(() => {
      const sectionRef = sectionRefs.current[sectionIndex];
      if (sectionRef && scrollViewRef.current) {
        sectionRef.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, y - 20),
              animated: true
            });
          },
          () => {
            scrollViewRef.current?.scrollTo({
              y: sectionIndex * 200,
              animated: true
            });
          }
        );
      }
    }, 150);
  }, [triggerActivity]);

  // Render formatted text with highlighting
  const highlightSearchTerm = (text: string, searchTerm: string, baseStyle: any) => {
    if (!searchTerm.trim()) {
      return <Text style={baseStyle}>{text}</Text>;
    }

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <Text style={baseStyle}>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <Text key={index} style={[baseStyle, styles.highlightedText]}>
              {part}
            </Text>
          ) : (
            <Text key={index}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  // Render formatted content
  const renderFormattedContent = (content: string) => {
    const paragraphs = content
      .split(/\n\s*\n|\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (paragraphs.length === 0) {
      return <Text style={[styles.contentText, { color: colors.text }]}>{content}</Text>;
    }

    return (
      <View>
        {paragraphs.map((paragraph, index) => {
          // Bullet points
          if (paragraph.match(/^[•\-\*]\s+/)) {
            const listText = paragraph.replace(/^[•\-\*]\s+/, '');
            return (
              <View key={index} style={styles.listItemContainer}>
                <Text style={[styles.bulletPoint, { color: colors.primary }]}>•</Text>
                <View style={{ flex: 1 }}>
                  {highlightSearchTerm(listText, searchTerm, [styles.listItemText, { color: colors.text }])}
                </View>
              </View>
            );
          }

          // Numbered lists
          if (paragraph.match(/^\d+\.\s+/)) {
            const match = paragraph.match(/^(\d+)\.\s+(.*)$/);
            if (match) {
              return (
                <View key={index} style={styles.listItemContainer}>
                  <Text style={[styles.numberPoint, { color: colors.primary }]}>{match[1]}.</Text>
                  <View style={{ flex: 1 }}>
                    {highlightSearchTerm(match[2], searchTerm, [styles.listItemText, { color: colors.text }])}
                  </View>
                </View>
              );
            }
          }

          // Regular paragraphs
          return (
            <View key={index} style={styles.paragraphContainer}>
              {highlightSearchTerm(paragraph, searchTerm, [styles.contentText, { color: colors.text }])}
            </View>
          );
        })}
      </View>
    );
  };

  // Format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unbekannt';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    } catch {
      return 'Unbekannt';
    }
  };

  if (!visible) return null;

  const modalStyle = isFullscreen
    ? [styles.fullscreenModal, { backgroundColor: colors.background }]
    : [styles.centeredModal, { backgroundColor: colors.background }];

  const currentIndex = getCurrentSectionIndex();
  const canNavigatePrevious = currentIndex > 0;
  const canNavigateNext = currentIndex < availableSections.length - 1;

  return (
    <Modal
      visible={visible}
      transparent={!isFullscreen}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={hideModal}
    >
      <StatusBar
        backgroundColor={isFullscreen ? colors.background : 'rgba(0,0,0,0.5)'}
        barStyle={'dark-content'}
      />

      {!isFullscreen && (
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: fadeAnim }
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={hideModal}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      <Animated.View
        style={[
          modalStyle,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: isFullscreen ? 0 : slideAnim }
            ]
          }
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={hideModal}
                style={[styles.headerButton, { backgroundColor: colors.card }]}
                accessibilityLabel="Modal schließen"
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsFullscreen(!isFullscreen)}
                style={[styles.headerButton, { backgroundColor: colors.card }]}
                accessibilityLabel={isFullscreen ? "Vollbild verlassen" : "Vollbild"}
              >
                {isFullscreen ?
                  <Minimize2 size={20} color={colors.text} /> :
                  <Maximize2 size={20} color={colors.text} />
                }
              </TouchableOpacity>
            </View>

            <View style={styles.headerCenter}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {currentSection?.title || 'Medizinischer Inhalt'}
              </Text>
              {availableSections.length > 1 && (
                <Text style={[styles.sectionCounter, { color: colors.textSecondary }]}>
                  {currentIndex + 1} von {availableSections.length}
                </Text>
              )}
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => setShowTableOfContents(!showTableOfContents)}
                style={[styles.headerButton, { backgroundColor: colors.card }]}
                accessibilityLabel="Inhaltsverzeichnis"
              >
                <List size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Navigation */}
          {availableSections.length > 1 && (
            <View style={[styles.navigationBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <TouchableOpacity
                onPress={navigateToPreviousSection}
                disabled={!canNavigatePrevious}
                style={[
                  styles.navButton,
                  !canNavigatePrevious && styles.navButtonDisabled
                ]}
              >
                <ChevronLeft
                  size={20}
                  color={canNavigatePrevious ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.navButtonText,
                    { color: canNavigatePrevious ? colors.primary : colors.textSecondary }
                  ]}
                >
                  Vorherige
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={navigateToNextSection}
                disabled={!canNavigateNext}
                style={[
                  styles.navButton,
                  !canNavigateNext && styles.navButtonDisabled
                ]}
              >
                <Text
                  style={[
                    styles.navButtonText,
                    { color: canNavigateNext ? colors.primary : colors.textSecondary }
                  ]}
                >
                  Nächste
                </Text>
                <ChevronRight
                  size={20}
                  color={canNavigateNext ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Content */}
          {loading ? (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Lade medizinische Inhalte...
              </Text>
            </View>
          ) : error ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
              <AlertCircle size={48} color={colors.textSecondary} />
              <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
            </View>
          ) : currentSection ? (
            <View style={styles.contentWrapper}>
              {/* Gradient Background */}
              <LinearGradient
                colors={['#6366f1', '#8b5cf6', '#a855f7']
                }
                style={styles.gradientBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />

              {/* Header Section */}
              <View style={styles.contentHeader}>
                <View style={styles.metaInfo}>
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaItem}>
                      📚 {currentSection.parent_slug?.replace(/-/g, ' ') || 'Medizin'}
                    </Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaItem}>
                      ⏱️ {formatDate(currentSection.last_updated)}
                    </Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaItem}>
                      📖 {filteredSections.length} Abschnitte
                    </Text>
                  </View>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                  <Search size={18} color="rgba(255, 255, 255, 0.7)" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchBox}
                    placeholder="Suche im Inhalt..."
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={searchTerm}
                    onChangeText={handleSearch}
                  />
                  {searchTerm.length > 0 && (
                    <TouchableOpacity
                      onPress={() => handleSearch('')}
                      style={styles.clearSearch}
                    >
                      <Text style={styles.clearSearchText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Table of Contents */}
                {showTableOfContents && (
                  <View style={styles.tocContainer}>
                    <TableOfContents
                      sections={tableOfContentsItems}
                      onNavigateToSection={handleNavigateToSection}
                      iconSize={18}
                    />
                  </View>
                )}
              </View>

              {/* Scrollable Content */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContentContainer}
                onScroll={() => triggerActivity()}
                scrollEventThrottle={2000}
              >
                {searchTerm.length > 0 && (
                  <Text style={styles.searchResults}>
                    🔍 Suche nach: "{searchTerm}" ({filteredSections.length} von {parsedSections.length} Abschnitten)
                  </Text>
                )}

                {/* Content Sections */}
                {filteredSections.map((section, index) => (
                  <View
                    key={index}
                    ref={(ref) => { sectionRefs.current[index] = ref; }}
                    style={[styles.contentSection, { backgroundColor: colors.card }]}
                  >
                    <TouchableOpacity
                      style={[styles.sectionHeader, { backgroundColor: colors.surface }]}
                      onPress={() => toggleSection(index.toString())}
                      accessibilityLabel={`${expandedSections[index] ? 'Ausklappen' : 'Einklappen'} Abschnitt ${section.title}`}
                    >
                      <BookOpen size={22} color={colors.primary} />
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        {section.title}
                      </Text>
                      <ChevronDown
                        size={20}
                        color={colors.textSecondary}
                        style={[
                          styles.chevronIcon,
                          expandedSections[index] && { transform: [{ rotate: '180deg' }] }
                        ]}
                      />
                    </TouchableOpacity>

                    {expandedSections[index] && (
                      <View style={[styles.sectionContent, { borderTopColor: colors.border }]}>
                        {renderFormattedContent(section.content)}
                      </View>
                    )}
                  </View>
                ))}

                <View style={styles.bottomPadding} />
              </ScrollView>
            </View>
          ) : null}
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  centeredModal: {
    position: 'absolute',
    top: '5%',
    left: Platform.OS === 'web' ? '10%' : 20,
    right: Platform.OS === 'web' ? '10%' : 20,
    bottom: '5%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  fullscreenModal: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionCounter: {
    fontSize: 12,
    marginTop: 2,
  },
  navigationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: -1,
  },
  contentHeader: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  metaItem: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: 'white',
    padding: 0,
  },
  clearSearch: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tocContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  searchResults: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  contentSection: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  sectionContent: {
    borderTopWidth: 1,
    padding: 20,
  },
  paragraphContainer: {
    marginBottom: 14,
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
    fontWeight: '500',
    marginRight: 12,
    width: 20,
  },
  numberPoint: {
    fontSize: 16,
    lineHeight: 28,
    fontWeight: '600',
    marginRight: 12,
    minWidth: 24,
  },
  listItemText: {
    fontSize: 16,
    lineHeight: 28,
    flex: 1,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 28,
    textAlign: 'left',
  },
  highlightedText: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontWeight: '600',
    paddingHorizontal: 2,
    borderRadius: 2,
  },
  chevronIcon: {
    transition: 'transform 0.2s ease',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
  bottomPadding: {
    height: 40,
  },
});

export default MedicalContentModal;