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
  Heart,
  ChevronLeft,
  Maximize2,
  CheckCircle,
  Circle,
  Clock,
  ChevronRight,
  StickyNote
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import TableOfContents from './TableOfContents';
import SectionNotesModal from './SectionNotesModal';
import Toast from './Toast';
import { useAuth } from '@/contexts/AuthContext';
import { saveNote, loadNote, deleteNote } from '@/lib/notesService';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '@/constants/tokens';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

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
  onBackPress?: () => void;
  onOpenModal?: () => void;
  currentSection?: any;
}

const InteractiveMedicalContent: React.FC<InteractiveMedicalContentProps> = ({ supabaseRow, onBackPress, onOpenModal, currentSection }) => {
  const { colors, isDarkMode } = useTheme();
  const { triggerActivity } = useSessionTimeout();
  const { user } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ '0': true });
  const [searchTerm, setSearchTerm] = useState('');
  const [studyMode, setStudyMode] = useState(false);
  const [highlightedText, setHighlightedText] = useState<Set<string>>(new Set());
  const [bookmarkedSections, setBookmarkedSections] = useState<Set<number>>(new Set());
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [readingProgress, setReadingProgress] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<{ [key: number]: View | null }>({});

  // Notes state
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [currentNoteSection, setCurrentNoteSection] = useState<{ id: string; title: string } | null>(null);
  const [sectionNotes, setSectionNotes] = useState<Map<string, string>>(new Map());
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
        borderColor: MEDICAL_COLORS.blue,
        backgroundColor: MEDICAL_COLORS.blueBg,
        icon: FileText,
        iconColor: MEDICAL_COLORS.blue,
        type: 'definition'
      };
    }

    // Clinical procedures
    if (titleLower.includes('therapie') || titleLower.includes('behandlung') ||
        titleLower.includes('intervention') || titleLower.includes('management')) {
      return {
        borderColor: MEDICAL_COLORS.success,
        backgroundColor: MEDICAL_COLORS.lightGreen,
        icon: Activity,
        iconColor: MEDICAL_COLORS.success,
        type: 'clinical'
      };
    }

    // Diagnostics
    if (titleLower.includes('diagnostik') || titleLower.includes('untersuchung') ||
        titleLower.includes('befund') || titleLower.includes('symptom')) {
      return {
        borderColor: MEDICAL_COLORS.warmYellow,
        backgroundColor: MEDICAL_COLORS.warmYellowBg,
        icon: Stethoscope,
        iconColor: MEDICAL_COLORS.warmYellow,
        type: 'diagnostic'
      };
    }

    // Critical/Emergency
    if (titleLower.includes('notfall') || titleLower.includes('kritisch') ||
        titleLower.includes('komplikation') || contentLower.includes('lebensbedrohlich')) {
      return {
        borderColor: MEDICAL_COLORS.warmRed,
        backgroundColor: MEDICAL_COLORS.lightCoral,
        icon: AlertTriangle,
        iconColor: MEDICAL_COLORS.warmRed,
        type: 'emergency'
      };
    }

    // Default
    return {
      borderColor: MEDICAL_COLORS.secondary,
      backgroundColor: MEDICAL_COLORS.offWhite,
      icon: BookOpen,
      iconColor: MEDICAL_COLORS.secondary,
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

  // Load notes for all sections when component mounts
  useEffect(() => {
    const loadAllNotes = async () => {
      if (!user?.id || !parsedSections.length) return;

      const notesMap = new Map<string, string>();

      for (let i = 0; i < parsedSections.length; i++) {
        const section = parsedSections[i];
        const sectionId = `${supabaseRow.slug || supabaseRow.title}_section_${i}`;

        const { note } = await loadNote(user.id, sectionId);
        if (note && note.note_content) {
          notesMap.set(sectionId, note.note_content);
        }
      }

      setSectionNotes(notesMap);
    };

    loadAllNotes();
  }, [user?.id, parsedSections.length, supabaseRow.slug, supabaseRow.title]);

  // Handle save note
  const handleSaveNote = async (sectionId: string, noteContent: string) => {
    if (!user?.id) return;

    const sectionTitle = currentNoteSection?.title || '';
    const result = await saveNote(user.id, sectionId, sectionTitle, noteContent);

    if (result.success) {
      // Update local state
      setSectionNotes(prev => {
        const newMap = new Map(prev);
        if (noteContent.trim()) {
          newMap.set(sectionId, noteContent);
        } else {
          newMap.delete(sectionId);
        }
        return newMap;
      });

      // Show success toast
      setToastMessage('Erfolgreich gespeichert! Du kannst sie im Seitenmenü unter \'Gespeicherte Notizen\' überprüfen.');
      setToastVisible(true);
    } else {
      // Show error
      setToastMessage('Fehler beim Speichern der Notiz. Bitte versuche es erneut.');
      setToastVisible(true);
    }
  };

  // Handle delete note
  const handleDeleteNote = async (sectionId: string) => {
    if (!user?.id) return;

    const result = await deleteNote(user.id, sectionId);

    if (result.success) {
      // Update local state
      setSectionNotes(prev => {
        const newMap = new Map(prev);
        newMap.delete(sectionId);
        return newMap;
      });

      // Show success toast
      setToastMessage('Notiz erfolgreich gelöscht.');
      setToastVisible(true);
    } else {
      // Show error
      setToastMessage('Fehler beim Löschen der Notiz. Bitte versuche es erneut.');
      setToastVisible(true);
    }
  };

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

  // Calculate reading time for a section (assuming 200 words per minute)
  const calculateReadingTime = (content: string): number => {
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return Math.max(1, minutes); // Minimum 1 minute
  };

  // Calculate total reading time for all sections
  const totalReadingTime = React.useMemo(() => {
    return parsedSections.reduce((total, section) => {
      return total + calculateReadingTime(section.content);
    }, 0);
  }, [parsedSections]);

  // Calculate completion percentage
  const completionPercentage = React.useMemo(() => {
    if (parsedSections.length === 0) return 0;
    return Math.round((completedSections.size / parsedSections.length) * 100);
  }, [completedSections.size, parsedSections.length]);

  // Calculate remaining reading time
  const remainingReadingTime = React.useMemo(() => {
    return parsedSections.reduce((total, section, index) => {
      if (!completedSections.has(index)) {
        return total + calculateReadingTime(section.content);
      }
      return total;
    }, 0);
  }, [parsedSections, completedSections]);

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
    <Animated.View style={[styles.appContainer, { opacity: fadeAnim }]}>
      {/* Premium Gradient Background */}
      <LinearGradient
        colors={['#FFF5F0', '#FFFFFF', '#FFF8F5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />

      {/* Single ScrollView for entire content including header */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.fullScreenContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.fullContentContainer}
        onScroll={() => {
          // Trigger activity on scroll to prevent timeout during reading
          triggerActivity();
        }}
        scrollEventThrottle={2000} // Only trigger every 2 seconds to avoid excessive calls
      >

        {/* Modern Header Section */}
        <LinearGradient
          colors={['#FB923C', '#F97316', '#EA580C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modernHeader}
        >
          {/* Navigation Bar */}
          <View style={styles.navigationBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBackPress}
              activeOpacity={0.8}
            >
              <View style={styles.backButtonInner}>
                <ChevronLeft size={22} color="#FFFFFF" />
                <Text style={styles.backText}>Zurück</Text>
              </View>
            </TouchableOpacity>

            {onOpenModal && currentSection && (
              <TouchableOpacity
                style={styles.modalButtonModern}
                onPress={onOpenModal}
                activeOpacity={0.8}
              >
                <Maximize2 size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Title Section */}
          <View style={styles.modernTitleContainer}>
            <Text style={styles.modernTitle}>
              {supabaseRow?.title || 'Medizinischer Inhalt'}
            </Text>
            <TableOfContents
              sections={tableOfContentsItems}
              onNavigateToSection={handleNavigateToSection}
              iconSize={20}
            />
          </View>

          {/* Meta Info Badges */}
          <View style={styles.modernMetaInfo}>
            <View style={styles.modernMetaBadge}>
              <Text style={styles.modernMetaText}>
                📚 {supabaseRow?.parent_slug?.replace(/-/g, ' ') || 'Medizin'}
              </Text>
            </View>
            <View style={styles.modernMetaBadge}>
              <Text style={styles.modernMetaText}>
                ⏱️ {totalReadingTime} Min. Lesezeit
              </Text>
            </View>
            <View style={styles.modernMetaBadge}>
              <Text style={styles.modernMetaText}>
                📖 {parsedSections.length} Abschnitte
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Progress Tracking Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              Fortschritt: {completedSections.size}/{parsedSections.length} Abschnitte
            </Text>
            <Text style={styles.progressPercentage}>{completionPercentage}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <LinearGradient
              colors={['#F97316', '#EA580C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${completionPercentage}%` }]}
            />
          </View>
        </View>

        {/* Search and Study Controls Container */}
        <View style={styles.controlsContainer}>

          {/* Modern Search Bar */}
          <View style={styles.modernSearchContainer}>
            <Search size={22} color="#F97316" />
            <TextInput
              style={styles.modernSearchInput}
              placeholder="Inhalte durchsuchen..."
              placeholderTextColor="#9CA3AF"
              value={searchTerm}
              onChangeText={handleSearch}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  handleSearch('');
                  triggerActivity();
                }}
                style={styles.modernClearButton}
              >
                <Text style={styles.modernClearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Modern Study Controls */}
          <View style={styles.modernStudyControls}>
            <TouchableOpacity
              style={[styles.modernStudyButton, studyMode && styles.modernStudyButtonActive]}
              onPress={() => setStudyMode(!studyMode)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={studyMode ? ['#F97316', '#EA580C'] : ['#FFFFFF', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modernStudyButtonGradient}
              >
                <Eye size={20} color={studyMode ? '#FFFFFF' : '#F97316'} />
                <Text style={[styles.modernStudyButtonText, studyMode && styles.modernStudyButtonTextActive]}>
                  Study Mode
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modernFontButton, fontSize === 'large' && styles.modernFontButtonActive]}
              onPress={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={fontSize === 'large' ? ['#F97316', '#EA580C'] : ['#FFFFFF', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modernFontButtonGradient}
              >
                <Text style={[styles.modernFontButtonText, fontSize === 'large' && styles.modernFontButtonTextActive]}>
                  Aa
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {searchTerm.length > 0 && (
          <Text style={[styles.searchResults, { color: '#6B7280', marginHorizontal: 20 }]}>  {/* Medium gray for white background */}
            🔍 Suche nach: "{searchTerm}" ({filteredSections.length} von {parsedSections.length} Abschnitten)
          </Text>
        )}

        {/* Modern E-Learning Section Cards */}
        {filteredSections.map((section, index) => {
          const contentStyle = getContentTypeStyle(section.title, section.content);
          const IconComponent = contentStyle.icon;
          const isCompleted = completedSections.has(index);
          const isExpanded = expandedSections[index];
          const readingTime = calculateReadingTime(section.content);

          return (
            <TouchableOpacity
              key={index}
              ref={(ref) => { sectionRefs.current[index] = ref; }}
              activeOpacity={0.95}
              onPress={() => {
                setExpandedSections(prev => ({ ...prev, [index]: !prev[index] }));
                triggerActivity();
              }}
              style={[
                styles.modernSectionCard,
                isExpanded && styles.modernSectionCardExpanded,
              ]}
            >
              {/* Section Card Header */}
              <View style={styles.modernSectionCardHeader}>
                {/* Left Side: Icon Container */}
                <View style={[
                  styles.modernIconContainer,
                  isCompleted ? styles.modernIconContainerCompleted : styles.modernIconContainerIncomplete
                ]}>
                  <IconComponent
                    size={24}
                    color={isCompleted ? '#10B981' : '#F97316'}
                    strokeWidth={2.5}
                  />
                </View>

                {/* Center: Title and Meta */}
                <View style={styles.modernSectionInfo}>
                  <Text style={[styles.modernSectionCardTitle, { fontSize: fontSize === 'large' ? 20 : 18 }]}>
                    {section.title}
                  </Text>
                  <View style={styles.modernSectionMeta}>
                    <View style={styles.modernMetaItem}>
                      <Clock size={14} color="#6B7280" />
                      <Text style={styles.modernMetaItemText}>{readingTime} Min.</Text>
                    </View>
                  </View>
                </View>

                {/* Right Side: Completion Status and Expand Arrow */}
                <View style={styles.modernSectionActions}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      const newCompleted = new Set(completedSections);
                      if (newCompleted.has(index)) {
                        newCompleted.delete(index);
                      } else {
                        newCompleted.add(index);
                      }
                      setCompletedSections(newCompleted);
                      triggerActivity();
                    }}
                    style={styles.modernCompletionButton}
                  >
                    {isCompleted ? (
                      <CheckCircle size={24} color="#10B981" fill="#10B981" />
                    ) : (
                      <Circle size={24} color="#D1D5DB" strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                  <ChevronDown
                    size={20}
                    color="#9CA3AF"
                    style={[
                      styles.modernChevronIcon,
                      isExpanded && { transform: [{ rotate: '180deg' }] }
                    ]}
                  />
                </View>
              </View>

              {/* Expanded Content */}
              {isExpanded && (
                <View style={styles.modernSectionExpandedContent}>
                  {/* Key Points Box */}
                  {studyMode && (
                    <View style={styles.modernKeyPointsBox}>
                      <View style={styles.modernKeyPointsHeader}>
                        <Lightbulb size={18} color="#3B82F6" />
                        <Text style={styles.modernKeyPointsTitle}>Wichtige Punkte</Text>
                      </View>
                      <Text style={styles.modernKeyPointsText}>
                        • Automatisch erkannte Schlüsselkonzepte werden hervorgehoben
                      </Text>
                    </View>
                  )}

                  {/* Main Content */}
                  <View style={styles.modernContentBody}>
                    {renderFormattedContent(section.content)}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.modernActionButtons}>
                    <TouchableOpacity
                      style={styles.modernPrimaryButton}
                      onPress={() => {
                        // Mark as complete and move to next section
                        const newCompleted = new Set(completedSections);
                        newCompleted.add(index);
                        setCompletedSections(newCompleted);

                        // Expand next section if available
                        if (index < filteredSections.length - 1) {
                          setExpandedSections(prev => ({
                            ...prev,
                            [index]: false,
                            [index + 1]: true
                          }));
                        }
                        triggerActivity();
                      }}
                    >
                      <LinearGradient
                        colors={['#F97316', '#EA580C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.modernButtonGradient}
                      >
                        <Text style={styles.modernPrimaryButtonText}>Weiter</Text>
                        <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modernSecondaryButton}
                      onPress={() => {
                        // Open notes modal for this section
                        const sectionId = `${supabaseRow.slug || supabaseRow.title}_section_${index}`;
                        const sectionTitle = section.title;
                        setCurrentNoteSection({ id: sectionId, title: sectionTitle });
                        setNotesModalVisible(true);
                        triggerActivity();
                      }}
                    >
                      <StickyNote
                        size={18}
                        color={sectionNotes.has(`${supabaseRow.slug || supabaseRow.title}_section_${index}`) ? '#F97316' : '#6B7280'}
                        strokeWidth={2}
                        fill={sectionNotes.has(`${supabaseRow.slug || supabaseRow.title}_section_${index}`) ? '#FED7AA' : 'none'}
                      />
                      <Text style={styles.modernSecondaryButtonText}>
                        {sectionNotes.has(`${supabaseRow.slug || supabaseRow.title}_section_${index}`) ? 'Notiz bearbeiten' : 'Notizen'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Learning Summary Stats */}
        <View style={styles.learningSummaryCard}>
          <Text style={styles.learningSummaryTitle}>Lernzusammenfassung</Text>

          <View style={styles.learningSummaryStats}>
            {/* Completed Sections */}
            <View style={styles.summaryStatItem}>
              <View style={[styles.summaryStatIcon, { backgroundColor: '#DCFCE7' }]}>
                <CheckCircle size={24} color="#10B981" />
              </View>
              <View style={styles.summaryStatContent}>
                <Text style={styles.summaryStatValue}>{completedSections.size}</Text>
                <Text style={styles.summaryStatLabel}>Abgeschlossen</Text>
              </View>
            </View>

            {/* Remaining Sections */}
            <View style={styles.summaryStatItem}>
              <View style={[styles.summaryStatIcon, { backgroundColor: '#FEF3C7' }]}>
                <Circle size={24} color="#F59E0B" strokeWidth={2} />
              </View>
              <View style={styles.summaryStatContent}>
                <Text style={styles.summaryStatValue}>
                  {parsedSections.length - completedSections.size}
                </Text>
                <Text style={styles.summaryStatLabel}>Verbleibend</Text>
              </View>
            </View>

            {/* Total Reading Time */}
            <View style={styles.summaryStatItem}>
              <View style={[styles.summaryStatIcon, { backgroundColor: '#FED7AA' }]}>
                <Clock size={24} color="#F97316" />
              </View>
              <View style={styles.summaryStatContent}>
                <Text style={styles.summaryStatValue}>{remainingReadingTime}</Text>
                <Text style={styles.summaryStatLabel}>Min. übrig</Text>
              </View>
            </View>
          </View>

          {/* Progress Summary Text */}
          <View style={styles.summaryProgressText}>
            <Text style={styles.summaryProgressDescription}>
              {completionPercentage === 100
                ? '🎉 Herzlichen Glückwunsch! Sie haben alle Abschnitte abgeschlossen.'
                : `Du hast ${completedSections.size} von ${parsedSections.length} Abschnitten abgeschlossen. Mach weiter so!`}
            </Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Notes Modal */}
      <SectionNotesModal
        isVisible={notesModalVisible}
        sectionTitle={currentNoteSection?.title || ''}
        sectionId={currentNoteSection?.id || ''}
        currentNote={currentNoteSection ? sectionNotes.get(currentNoteSection.id) || '' : ''}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
        onClose={() => {
          setNotesModalVisible(false);
          setCurrentNoteSection(null);
        }}
      />

      {/* Success Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />
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
  // Modern Header Styles
  modernHeader: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  backButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  backText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '700',
    color: MEDICAL_COLORS.white,
  },
  modalButtonModern: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  modernTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: MEDICAL_COLORS.white,
    flex: 1,
    lineHeight: 34,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  modernMetaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modernMetaBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  modernMetaText: {
    fontSize: 13,
    fontWeight: '700',
    color: MEDICAL_COLORS.white,
  },
  // Controls Container
  controlsContainer: {
    padding: 20,
    paddingBottom: 16,
  },
  // Modern Search
  modernSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: MEDICAL_COLORS.warmOrangeDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: MEDICAL_COLORS.warmOrangeBg,
  },
  modernSearchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: MEDICAL_COLORS.slate900,
    marginLeft: 12,
    padding: 0,
  },
  modernClearButton: {
    width: 28,
    height: 28,
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernClearText: {
    fontSize: 16,
    color: MEDICAL_COLORS.warmOrangeDark,
    fontWeight: '700',
  },
  // Modern Study Controls
  modernStudyControls: {
    flexDirection: 'row',
    gap: 12,
  },
  modernStudyButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: MEDICAL_COLORS.warmOrangeDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modernStudyButtonActive: {
    shadowOpacity: 0.3,
  },
  modernStudyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: MEDICAL_COLORS.warmOrangeBg,
    borderRadius: 14,
  },
  modernStudyButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: MEDICAL_COLORS.warmOrangeDark,
  },
  modernStudyButtonTextActive: {
    color: MEDICAL_COLORS.white,
  },
  modernFontButton: {
    width: 56,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: MEDICAL_COLORS.warmOrangeDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modernFontButtonActive: {
    shadowOpacity: 0.3,
  },
  modernFontButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: MEDICAL_COLORS.warmOrangeBg,
    borderRadius: 14,
  },
  modernFontButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: MEDICAL_COLORS.warmOrangeDark,
  },
  modernFontButtonTextActive: {
    color: MEDICAL_COLORS.white,
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
  scrollableHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184, 126, 112, 0.2)',
  },
  navigationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  backText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtonCompact: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
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
    color: MEDICAL_COLORS.secondary,
  },
  studyToggleTextActive: {
    color: MEDICAL_COLORS.white,
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
    color: MEDICAL_COLORS.secondary,
  },
  fontSizeTextActive: {
    color: MEDICAL_COLORS.white,
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
  fullScreenContent: {
    flex: 1,
  },
  fullContentContainer: {
    paddingTop: 0,
    paddingBottom: 40,
  },
  scrollableContent: {
    flex: 1,
  },
  scrollableContentContainer: {
    padding: 20,
    paddingBottom: 40,
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
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
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
    color: MEDICAL_COLORS.primaryDark,  // Brown Rust for coral branding
  },
  enhancedSectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    color: MEDICAL_COLORS.slate900,
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
    color: MEDICAL_COLORS.slate500,
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
    color: MEDICAL_COLORS.secondary, // Old Rose for bullets
    marginRight: 12,
    width: 20,
  },
  numberPoint: {
    fontSize: 16,
    lineHeight: 28,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.secondary, // Old Rose for numbers
    marginRight: 12,
    minWidth: 24,
  },
  listItemText: {
    fontSize: 16,
    lineHeight: 28,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.slate700,
    flex: 1,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 28, // Increased line height for better readability
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.slate700,
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
    backgroundColor: MEDICAL_COLORS.warmYellowLight, // Light yellow background
    color: MEDICAL_COLORS.dark, // Darker text for contrast
    fontWeight: '600',
    paddingHorizontal: 2,
    borderRadius: 2,
  },
  boldText: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: MEDICAL_COLORS.slate900, // Slightly darker for emphasis
  },
  italicText: {
    fontFamily: 'Inter-Italic',
    fontStyle: 'italic',
    color: MEDICAL_COLORS.slate600, // Subtle gray for italic
  },
  chevronIcon: {
    transition: 'transform 0.2s ease',
  },
  bottomPadding: {
    height: 40,
  },

  // Progress Section Styles
  progressSection: {
    backgroundColor: MEDICAL_COLORS.white,
    marginHorizontal: 20,
    marginTop: -12,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: MEDICAL_COLORS.warmOrangeDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: MEDICAL_COLORS.slate900,
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '900',
    color: MEDICAL_COLORS.warmOrangeDark,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: MEDICAL_COLORS.slate200,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },

  // Modern Section Card Styles
  modernSectionCard: {
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: MEDICAL_COLORS.slate200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  modernSectionCardExpanded: {
    borderColor: '#F97316',
    shadowColor: MEDICAL_COLORS.warmOrangeDark,
    shadowOpacity: 0.15,
  },
  modernSectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  modernIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modernIconContainerCompleted: {
    backgroundColor: '#DCFCE7',
  },
  modernIconContainerIncomplete: {
    backgroundColor: MEDICAL_COLORS.warmOrangeBg,
  },
  modernSectionInfo: {
    flex: 1,
  },
  modernSectionCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: MEDICAL_COLORS.slate900,
    lineHeight: 24,
    marginBottom: 6,
  },
  modernSectionMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  modernMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modernMetaItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: MEDICAL_COLORS.slate500,
  },
  modernSectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modernCompletionButton: {
    padding: 4,
  },
  modernChevronIcon: {
    transition: 'transform 0.3s ease',
  },

  // Modern Expanded Content Styles
  modernSectionExpandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  modernKeyPointsBox: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modernKeyPointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modernKeyPointsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E40AF',
  },
  modernKeyPointsText: {
    fontSize: 14,
    color: MEDICAL_COLORS.slate900,
    lineHeight: 22,
  },
  modernContentBody: {
    marginBottom: 24,
  },
  modernActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modernPrimaryButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: MEDICAL_COLORS.warmOrangeDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  modernButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  modernPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: MEDICAL_COLORS.white,
    letterSpacing: 0.5,
  },
  modernSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: MEDICAL_COLORS.slate200,
    gap: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  modernSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: MEDICAL_COLORS.slate500,
  },

  // Learning Summary Card Styles
  learningSummaryCard: {
    backgroundColor: MEDICAL_COLORS.white,
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: MEDICAL_COLORS.slate200,
    shadowColor: MEDICAL_COLORS.warmOrangeDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  learningSummaryTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: MEDICAL_COLORS.slate900,
    marginBottom: 20,
  },
  learningSummaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryStatContent: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 28,
    fontWeight: '900',
    color: MEDICAL_COLORS.slate900,
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: MEDICAL_COLORS.slate500,
    textAlign: 'center',
  },
  summaryProgressText: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  summaryProgressDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default InteractiveMedicalContent;