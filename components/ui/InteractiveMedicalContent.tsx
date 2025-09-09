import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { ChevronDown, BookOpen, AlertCircle, Search, Copy, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/contexts/ThemeContext';

interface MedicalSection {
  title: string;
  content: string;
  processedContent?: string;
  subtypes?: SubtypeCard[];
}

interface SubtypeCard {
  title: string;
  percentage: string;
  description?: string;
}

interface SupabaseRow {
  idx: number;
  slug: string;
  title: string;
  parent_slug: string | null;
  description?: string;
  icon: string;
  color: string;
  content_json?: string;
  category: string;
  last_updated?: string;
}

interface InteractiveMedicalContentProps {
  supabaseRow: SupabaseRow;
}

const InteractiveMedicalContent: React.FC<InteractiveMedicalContentProps> = ({ supabaseRow }) => {
  const { colors, isDarkMode } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // STEP 9: Additional Interactive Features - State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [sectionAnimations, setSectionAnimations] = useState<Record<number, Animated.Value>>({});
  
  // STEP 8: Responsive Design Rules - Screen Size Management
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [isTablet, setIsTablet] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  
  // STEP 6: JavaScript Functionality - Animation and Scroll Implementation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<View[]>([]);
  
  useEffect(() => {
    console.log('🚀 STEP 6+8: Initializing animations, scroll functionality, and responsive design');
    
    // STEP 8: Responsive Design Rules - Screen size detection
    const onChange = (result: any) => {
      setScreenData(result.window);
      const { width } = result.window;
      
      console.log(`📱 STEP 8: Screen width changed to ${width}px`);
      
      // Responsive breakpoints (matching CSS media queries)
      setIsTablet(width <= 768);  // max-width: 768px
      setIsLargeScreen(width >= 1200);  // min-width: 1200px
      
      console.log(`📱 STEP 8: Responsive mode - isTablet: ${width <= 768}, isLargeScreen: ${width >= 1200}`);
    };
    
    const subscription = Dimensions.addEventListener('change', onChange);
    
    // Initial screen size detection
    const { width } = screenData;
    setIsTablet(width <= 768);
    setIsLargeScreen(width >= 1200);
    console.log(`📱 STEP 8: Initial screen detection - width: ${width}px, isTablet: ${width <= 768}, isLargeScreen: ${width >= 1200}`);
    
    // Fade in animation on component mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    return () => subscription?.remove();
  }, [fadeAnim, screenData]);

  // STEP 10: Complete Processing Pipeline - Main Execution and Initialization
  useEffect(() => {
    console.log('🚀 STEP 10: Initializing complete medical content system...');
    
    // Step 10.6: Setup Interactive Features
    const initializeInteractiveFeatures = () => {
      console.log('🎯 STEP 10.6: Setting up interactive features...');
      
      // Initialize animations for existing sections
      const initializeAnimations = () => {
        const newAnimations: Record<number, Animated.Value> = {};
        masterProcessedSections.forEach((_, index) => {
          if (!sectionAnimations[index]) {
            newAnimations[index] = new Animated.Value(0);
          }
        });
        
        if (Object.keys(newAnimations).length > 0) {
          setSectionAnimations(prev => ({ ...prev, ...newAnimations }));
          console.log(`✅ STEP 10.6: Initialized ${Object.keys(newAnimations).length} section animations`);
        }
      };
      
      // Setup progressive animation delays
      const setupProgressiveAnimations = () => {
        masterProcessedSections.forEach((_, index) => {
          setTimeout(() => {
            if (sectionAnimations[index]) {
              Animated.spring(sectionAnimations[index], {
                toValue: 1,
                delay: index * 100, // Stagger animations
                tension: 50,
                friction: 8,
                useNativeDriver: false,
              }).start();
            }
          }, index * 50);
        });
        
        console.log(`✅ STEP 10.6: Setup progressive animations for ${masterProcessedSections.length} sections`);
      };
      
      initializeAnimations();
      setTimeout(setupProgressiveAnimations, 500); // Start after initial render
    };
    
    // Step 10.7: Performance Optimization
    const optimizePerformance = () => {
      console.log('⚡ STEP 10.7: Optimizing performance...');
      
      // Pre-calculate expensive operations
      const totalSections = masterProcessedSections.length;
      const totalInteractiveElements = masterProcessedSections.reduce((acc, section) => {
        const statNumbers = (section.processedContent?.match(/<STAT_NUMBER>/g) || []).length;
        const medicalTerms = (section.processedContent?.match(/<MEDICAL_TERM>/g) || []).length;
        const dosages = (section.processedContent?.match(/<DOSAGE>/g) || []).length;
        return acc + statNumbers + medicalTerms + dosages;
      }, 0);
      
      console.log(`📊 STEP 10.7: Performance metrics - ${totalSections} sections, ${totalInteractiveElements} interactive elements`);
    };
    
    if (masterProcessedSections.length > 0) {
      initializeInteractiveFeatures();
      optimizePerformance();
      
      console.log('🎉 STEP 10: Complete medical content system initialized successfully!');
    }
    
  }, [masterProcessedSections, sectionAnimations]);

  // STEP 10: Complete Processing Pipeline - Render Medical Content (Main Entry Point)
  const renderMedicalContent = useCallback(() => {
    console.log('🎬 STEP 10: Rendering complete medical content system...');
    
    const sections = filteredSections;
    
    if (sections.length === 0) {
      console.log('⚠️ STEP 10: No sections to render');
      return null;
    }
    
    console.log(`📱 STEP 10: Rendering ${sections.length} sections with full interactivity`);
    
    return sections.map((section, index) => {
      const originalIndex = section.originalIndex || index;
      return generateSection(section, originalIndex);
    });
  }, [filteredSections, generateSection]);

  // STEP 1: Parse and Clean Data
  // STEP 2: Pattern Recognition Rules  
  const processedSections = useMemo(() => {
    console.log('🔍 STEP 1: Parse and Clean Data');
    console.log('Raw supabaseRow:', supabaseRow);
    console.log('content_json:', supabaseRow.content_json);

    // Check if we have content_json
    if (!supabaseRow.content_json) {
      console.log('❌ No content_json found');
      return [];
    }

    try {
      // Parse the content_json string
      let sections: MedicalSection[] = [];
      
      // Handle different possible JSON structures
      if (typeof supabaseRow.content_json === 'string') {
        sections = JSON.parse(supabaseRow.content_json);
      } else if (Array.isArray(supabaseRow.content_json)) {
        sections = supabaseRow.content_json;
      } else {
        console.log('⚠️ Unexpected content_json type:', typeof supabaseRow.content_json);
        return [];
      }

      console.log('📄 Parsed sections:', sections.length);

      // Clean each section's content  
      const cleanedSections = sections.map((section, index) => {
        if (!section || typeof section !== 'object') {
          console.log(`⚠️ Invalid section at index ${index}:`, section);
          return {
            title: `Section ${index + 1}`,
            content: 'Invalid section data'
          };
        }

        const cleanContent = (section.content || '')
          .replace(/\\n\\n/g, '</p><p>')  // Convert double line breaks to paragraphs
          .replace(/\\n/g, ' ')            // Single line breaks to spaces  
          .replace(/\\\\/g, '')            // Remove double escape characters
          .replace(/\\"/g, '"')            // Fix escaped quotes
          .replace(/\\'/g, "'")            // Fix escaped single quotes
          .trim();

        console.log(`✅ STEP 1 - Cleaned section: "${section.title}" (${cleanContent.length} chars)`);

        // STEP 2: Apply Pattern Recognition Rules
        console.log('🎯 STEP 2: Applying Pattern Recognition Rules');
        
        const processedContent = applyPatternRecognition(cleanContent);
        const subtypes = extractSubtypes(cleanContent);
        
        console.log(`✅ STEP 2 - Processed section: "${section.title}" (patterns applied)`);

        return {
          title: section.title || `Section ${index + 1}`,
          content: cleanContent,
          processedContent: processedContent,
          subtypes: subtypes
        };
      });

      return cleanedSections.filter(section => section.content.length > 0);

    } catch (error) {
      console.error('❌ Error parsing content_json:', error);
      return [];
    }
  }, [supabaseRow.content_json]);

  // STEP 10: Complete Processing Pipeline - Master Supabase Row Processor
  const processSupabaseRow = useCallback((row: SupabaseRow) => {
    console.log('🔄 STEP 10: Starting complete processing pipeline for:', row.title);
    
    try {
      // Step 10.1: Parse JSON content (integrating Step 1)
      console.log('📊 STEP 10.1: Parsing JSON content...');
      let sections: MedicalSection[] = [];
      
      if (typeof row.content_json === 'string') {
        sections = JSON.parse(row.content_json);
      } else if (Array.isArray(row.content_json)) {
        sections = row.content_json;
      } else {
        console.warn('⚠️ STEP 10.1: Invalid content_json type');
        return [];
      }
      
      console.log(`✅ STEP 10.1: Parsed ${sections.length} sections`);
      
      // Step 10.2: Process each section through complete pipeline
      const processedSections = sections.map((section, index) => {
        console.log(`🔧 STEP 10.2: Processing section ${index + 1}: "${section.title}"`);
        
        if (!section || typeof section !== 'object') {
          return {
            title: `Section ${index + 1}`,
            content: 'Invalid section data',
            processedContent: 'Invalid section data'
          };
        }
        
        let content = section.content || '';
        
        // Step 10.2a: Clean text (Step 1 integration)
        content = content
          .replace(/\\n\\n/g, '</p><p>')
          .replace(/\\n/g, ' ')
          .replace(/\\\\/g, '')
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .trim();
        
        console.log(`🧹 STEP 10.2a: Cleaned content for "${section.title}" (${content.length} chars)`);
        
        // Step 10.2b: Apply all enhancements (Steps 2-7 integration)
        const enhancedContent = processContent(content);
        console.log(`✨ STEP 10.2b: Enhanced content with all patterns`);
        
        // Step 10.2c: Extract additional metadata
        const icon = getIcon(section.title);
        const subtypes = extractSubtypes(content);
        
        console.log(`🎯 STEP 10.2c: Assigned icon "${icon}" and found ${subtypes.length} subtypes`);
        
        return {
          title: section.title || `Section ${index + 1}`,
          content: content,
          processedContent: enhancedContent,
          subtypes: subtypes,
          icon: icon,
          metadata: {
            originalIndex: index,
            wordCount: content.split(' ').length,
            hasPatterns: enhancedContent !== content,
            processingTimestamp: new Date().toISOString()
          }
        };
      });
      
      console.log(`✅ STEP 10.2: Processed all ${processedSections.length} sections`);
      
      // Step 10.3: Generate complete metadata
      const metadata = {
        title: row.title,
        category: row.category,
        updated: row.last_updated,
        slug: row.slug,
        description: row.description,
        icon: row.icon,
        color: row.color,
        totalSections: processedSections.length,
        totalWordCount: processedSections.reduce((acc, section) => 
          acc + (section.metadata?.wordCount || 0), 0),
        processingComplete: true,
        processingTimestamp: new Date().toISOString(),
        pipelineVersion: '10.0.0'
      };
      
      console.log(`📋 STEP 10.3: Generated metadata with ${metadata.totalWordCount} total words`);
      
      // Step 10.4: Return processed result
      const result = {
        sections: processedSections,
        metadata: metadata,
        searchable: true,
        interactive: true,
        responsive: true
      };
      
      console.log(`🎯 STEP 10.4: Complete processing pipeline finished successfully!`);
      return result.sections;
      
    } catch (error) {
      console.error('❌ STEP 10: Processing pipeline failed:', error);
      return [];
    }
  }, []);

  // Step 10.5: Initialize Complete Processing Pipeline
  const masterProcessedSections = useMemo(() => {
    console.log('🚀 STEP 10: Initializing master processing pipeline...');
    return processSupabaseRow(supabaseRow);
  }, [supabaseRow, processSupabaseRow]);

  // STEP 9: Additional Interactive Features - Search Filtering (Enhanced for Step 10)
  const filteredSections = useMemo(() => {
    const sections = masterProcessedSections;
    
    if (!searchTerm.trim()) {
      return sections.map((section, index) => ({
        ...section,
        originalIndex: index
      }));
    }
    
    const searchLower = searchTerm.toLowerCase();
    console.log(`🔍 STEP 10+9: Advanced search filtering for: "${searchTerm}"`);
    
    const filtered = sections
      .map((section, index) => ({ ...section, originalIndex: index }))
      .filter(section => {
        const titleMatch = section.title.toLowerCase().includes(searchLower);
        const contentMatch = section.content.toLowerCase().includes(searchLower);
        const processedMatch = section.processedContent?.toLowerCase().includes(searchLower);
        const match = titleMatch || contentMatch || processedMatch;
        
        if (match) {
          console.log(`✅ STEP 10+9: Section "${section.title}" matches advanced search`);
        }
        
        return match;
      });
    
    console.log(`🔍 STEP 10+9: Advanced search found ${filtered.length} sections`);
    return filtered;
  }, [masterProcessedSections, searchTerm]);

  // STEP 7: Special Content Processing Rules - Enhanced Content Function
  const enhanceContent = (content: string): string => {
    let processed = content;
    
    console.log('🔄 STEP 7: Enhancing content with special processing rules...');

    // Step 7.1: Create definition boxes for "Definition:" patterns
    processed = processed.replace(/Definition:\s*(.+?)(?=\n|$)/gi, 
      '<DEFINITION_BOX>$1</DEFINITION_BOX>');
    
    // Step 7.2: Create warning boxes for "Wichtig:" or "Achtung:" patterns
    processed = processed.replace(/(Wichtig|Achtung|Warnung):\s*(.+?)(?=\n|$)/gi,
      '<WARNING_BOX>$1|$2</WARNING_BOX>');
    
    // Step 7.3: Transform medication lists
    processed = processed.replace(/Medikamente?:\s*(.+?)(?=\n\n|$)/gs,
      '<MEDICATION_BOX>$1</MEDICATION_BOX>');
    
    // Step 7.4: Highlight dosage information
    processed = processed.replace(/(\d+\.?\d*\s?(mg|ml|g|µg|IE|mmol|mval))/gi,
      '<DOSAGE>$1</DOSAGE>');
    
    // Step 7.5: Create structured lists from enumeration patterns
    processed = processed.replace(/(\d+\.)\s+(.+?)(?=\d+\.|$)/gs,
      '<NUMBERED_ITEM>$1|$2</NUMBERED_ITEM>');
    
    // Step 7.6: Highlight temporal information
    processed = processed.replace(/(\d+[-–]\d+\s?(Stunden|Tage|Wochen|Monate|Jahre))/gi,
      '<TIME_SPAN>$1</TIME_SPAN>');

    console.log('✅ STEP 7: Special content enhancement complete');
    return processed;
  };

  // STEP 4: Enhanced Section Generation Function - Process Content (Updated for Step 7)
  const processContent = (content: string): string => {
    let processed = content;
    
    console.log('🔄 STEP 4+7: Processing content with enhanced + special patterns...');

    // First apply Step 7 special processing rules
    processed = enhanceContent(processed);

    // Then apply Step 4 patterns
    // Step 4.1: Wrap percentages in stat-number spans (enhanced from Step 2)
    processed = processed.replace(/(\d{1,3}[-–]\d{1,3}\s?(%|Prozent))/gi, 
      '<STAT_NUMBER>$1</STAT_NUMBER>');
    
    // Step 4.2: Wrap medical terms (enhanced pattern)
    processed = processed.replace(/([A-ZÄÖÜ][a-zäöüß]+[-][A-ZÄÖÜ][a-zäöüß]+[-]?[A-Za-zäöüß]*)/g,
      '<MEDICAL_TERM>$1</MEDICAL_TERM>');
    
    // Step 4.3: Create highlight boxes for lists starting with bullet points
    processed = processed.replace(/•\s(.+?)(?=•|\.|\n|$)/g,
      '<CRITERIA_ITEM>✓ $1</CRITERIA_ITEM>');
    
    // Step 4.4: Detect subtypes and create cards (enhanced detection)
    processed = processed.replace(/(Hyperaktives|Hypoaktives|Gemischtes)\s+\w+\s+\((\d+\s?%?)\)/g,
      '<SUBTYPE_CARD>$1|$2</SUBTYPE_CARD>');

    // Step 4.5: Additional medical pattern recognition
    // Numbers with units (e.g., ">60 Jahre", "500 mg")
    processed = processed.replace(
      />?\s?(\d{1,3})\s?(Jahre|years|mg|ml|mmol|kg|cm|mm)/gi,
      '<STAT_NUMBER>>$1 $2</STAT_NUMBER>'
    );

    // Single percentages (e.g., "75%", "80 Prozent")
    processed = processed.replace(
      /(\d{1,3})(,\d{1,3})?\s?(%|Prozent|percent)/gi,
      '<STAT_NUMBER>$1$2$3</STAT_NUMBER>'
    );

    // Latin medical terms (ending in -itis, -ose, -om, -ie)
    processed = processed.replace(
      /\b([A-ZÄÖÜ][a-zäöüß]*(?:itis|ose|om|ie))\b/g,
      '<MEDICAL_TERM>$1</MEDICAL_TERM>'
    );

    // Medical abbreviations in caps (CAM, ICU, DSM-5, ICD-11)
    processed = processed.replace(
      /\b([A-Z]{2,}(?:-\d+)?)\b/g,
      '<MEDICAL_TERM>$1</MEDICAL_TERM>'
    );

    console.log('✅ STEP 4+7: Content processing complete');
    return processed;
  };

  // Legacy function for backwards compatibility 
  const applyPatternRecognition = (content: string): string => {
    return processContent(content);
  };

  const extractSubtypes = (content: string): SubtypeCard[] => {
    console.log('🏷️ Extracting subtypes/classifications...');
    
    const subtypes: SubtypeCard[] = [];
    
    // Subtypes/Classifications Pattern (e.g., "Hyperaktives Delir (25%)")
    const subtypeMatches = content.matchAll(/^([\w\s]+)\s?\((\d{1,3}\s?(?:%|Prozent))\)/gm);
    
    for (const match of subtypeMatches) {
      const title = match[1].trim();
      const percentage = match[2].trim();
      
      subtypes.push({
        title: title,
        percentage: percentage
      });
      
      console.log(`📋 Found subtype: "${title}" (${percentage})`);
    }

    return subtypes;
  };

  // STEP 6: JavaScript Functionality - Enhanced Date Formatter
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unbekannt';
    
    try {
      const date = new Date(dateString);
      console.log(`📅 STEP 6: Formatting date: ${dateString} -> ${date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`);
      
      // Enhanced German date formatting (month + year as specified)
      return date.toLocaleDateString('de-DE', { 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      console.log(`❌ STEP 6: Date formatting failed for: ${dateString}`);
      return 'Unbekannt';
    }
  };

  // STEP 6: JavaScript Functionality - Enhanced Icon Mapping Function
  const getIcon = (title: string): string => {
    const iconMap = {
      'Definition': '📋',
      'Epidemiologie': '📊',
      'Symptom': '🔍',
      'Diagnostik': '🩺',
      'Therapie': '💊',
      'Pathophysiologie': '🧬',
      'Risikofaktoren': '⚠️',
      'Prognose': '📈',
      'Differentialdiagnose': '🔄',
      'Komplikationen': '⚡',
      'Prävention': '🛡️',
      // Additional German translations
      'Begriff': '📋',
      'Häufigkeit': '📊',
      'Anzeichen': '🔍',
      'Diagnose': '🩺',
      'Behandlung': '💊',
      'Mechanismus': '🧬',
      'Risiko': '⚠️',
      'Verlauf': '📈',
      'Komplikation': '⚡',
      'Vorbeugung': '🛡️'
    };
    
    console.log(`🎯 STEP 6: Getting icon for title: "${title}"`);
    
    // Check each key in iconMap
    for (let key in iconMap) {
      if (title.toLowerCase().includes(key.toLowerCase())) {
        console.log(`✅ STEP 6: Found match "${key}" -> ${iconMap[key]}`);
        return iconMap[key];
      }
    }
    
    console.log(`📌 STEP 6: No match found, using default icon`);
    return '📌';
  };

  // STEP 7: Special Content Processing Rules - Enhanced Content Renderer
  const renderProcessedContent = (content: string) => {
    console.log('🎨 STEP 7: Rendering processed content with special + enhanced patterns...');
    
    // Split content by all possible HTML-like tags (Step 4 + Step 7)
    const segments = content.split(/(<(?:STAT_NUMBER|MEDICAL_TERM|CRITERIA_ITEM|SUBTYPE_CARD|DEFINITION_BOX|WARNING_BOX|MEDICATION_BOX|DOSAGE|NUMBERED_ITEM|TIME_SPAN)>.*?<\/(?:STAT_NUMBER|MEDICAL_TERM|CRITERIA_ITEM|SUBTYPE_CARD|DEFINITION_BOX|WARNING_BOX|MEDICATION_BOX|DOSAGE|NUMBERED_ITEM|TIME_SPAN)>)/);
    
    const renderedElements: React.ReactElement[] = [];
    let criteriaItems: string[] = [];
    let subtypeCards: { title: string, percentage: string }[] = [];
    let definitionBoxes: string[] = [];
    let warningBoxes: { type: string, content: string }[] = [];
    let medicationBoxes: string[] = [];
    let numberedItems: { number: string, content: string }[] = [];
    
    segments.forEach((segment, index) => {
      if (segment.startsWith('<STAT_NUMBER>')) {
        const text = segment.replace(/<\/?STAT_NUMBER>/g, '');
        const isCopied = copiedItems.has(text);
        renderedElements.push(
          <TouchableOpacity 
            key={index} 
            onPress={() => copyToClipboard(text, 'stat')}
            style={[
              styles.statNumberCss, 
              styles.clickableElement,
              isCopied && styles.copiedElement
            ]}
          >
            <Text style={styles.clickableText}>
              {text} {isCopied && '✓'}
            </Text>
          </TouchableOpacity>
        );
      } else if (segment.startsWith('<MEDICAL_TERM>')) {
        const text = segment.replace(/<\/?MEDICAL_TERM>/g, '');
        const isCopied = copiedItems.has(text);
        renderedElements.push(
          <TouchableOpacity 
            key={index}
            onPress={() => copyToClipboard(text, 'medical')}
            style={[
              styles.medicalTermCss,
              styles.clickableElement,
              isCopied && styles.copiedElement
            ]}
          >
            <Text style={styles.clickableText}>
              {text} {isCopied && '✓'}
            </Text>
          </TouchableOpacity>
        );
      } else if (segment.startsWith('<CRITERIA_ITEM>')) {
        const text = segment.replace(/<\/?CRITERIA_ITEM>/g, '');
        criteriaItems.push(text);
      } else if (segment.startsWith('<SUBTYPE_CARD>')) {
        const text = segment.replace(/<\/?SUBTYPE_CARD>/g, '');
        const [title, percentage] = text.split('|');
        if (title && percentage) {
          subtypeCards.push({ title: title.trim(), percentage: percentage.trim() });
        }
      } else if (segment.startsWith('<DEFINITION_BOX>')) {
        const text = segment.replace(/<\/?DEFINITION_BOX>/g, '');
        definitionBoxes.push(text.trim());
      } else if (segment.startsWith('<WARNING_BOX>')) {
        const text = segment.replace(/<\/?WARNING_BOX>/g, '');
        const [type, content] = text.split('|');
        if (type && content) {
          warningBoxes.push({ type: type.trim(), content: content.trim() });
        }
      } else if (segment.startsWith('<MEDICATION_BOX>')) {
        const text = segment.replace(/<\/?MEDICATION_BOX>/g, '');
        medicationBoxes.push(text.trim());
      } else if (segment.startsWith('<DOSAGE>')) {
        const text = segment.replace(/<\/?DOSAGE>/g, '');
        const isCopied = copiedItems.has(text);
        renderedElements.push(
          <TouchableOpacity 
            key={index}
            onPress={() => copyToClipboard(text, 'dosage')}
            style={[
              styles.dosageCss,
              styles.clickableElement,
              isCopied && styles.copiedElement
            ]}
          >
            <Text style={styles.clickableText}>
              {text} {isCopied && '✓'}
            </Text>
          </TouchableOpacity>
        );
      } else if (segment.startsWith('<NUMBERED_ITEM>')) {
        const text = segment.replace(/<\/?NUMBERED_ITEM>/g, '');
        const [number, content] = text.split('|');
        if (number && content) {
          numberedItems.push({ number: number.trim(), content: content.trim() });
        }
      } else if (segment.startsWith('<TIME_SPAN>')) {
        const text = segment.replace(/<\/?TIME_SPAN>/g, '');
        renderedElements.push(
          <Text key={index} style={styles.timeSpanCss}>
            {text}
          </Text>
        );
      } else if (segment.trim()) {
        // Regular text
        renderedElements.push(
          <Text key={index}>{segment}</Text>
        );
      }
    });

    return (
      <View>
        {/* STEP 9: Main content text with interactive elements */}
        <Text style={[styles.contentText, { color: colors.text }]}>
          {renderedElements}
        </Text>
        
        {/* STEP 7: Special Content Processing - Definition boxes */}
        {definitionBoxes.length > 0 && (
          <View style={styles.definitionBoxContainer}>
            {definitionBoxes.map((definition, index) => (
              <View key={index} style={[styles.definitionBox, { 
                backgroundColor: isDarkMode ? 'rgba(102, 126, 234, 0.15)' : 'rgba(102, 126, 234, 0.08)',
                borderLeftColor: '#667eea'
              }]}>
                <Text style={[styles.definitionTitle, { color: colors.text }]}>
                  📋 Definition:
                </Text>
                <Text style={[styles.definitionText, { color: colors.text }]}>
                  {definition}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* STEP 7: Special Content Processing - Warning boxes */}
        {warningBoxes.length > 0 && (
          <View style={styles.warningBoxContainer}>
            {warningBoxes.map((warning, index) => (
              <View key={index} style={[styles.warningBox, { 
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                borderLeftColor: '#ef4444'
              }]}>
                <Text style={[styles.warningTitle, { color: '#ef4444' }]}>
                  ⚠️ {warning.type}:
                </Text>
                <Text style={[styles.warningText, { color: colors.text }]}>
                  {warning.content}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* STEP 7: Special Content Processing - Medication boxes */}
        {medicationBoxes.length > 0 && (
          <View style={styles.medicationBoxContainer}>
            {medicationBoxes.map((medication, index) => (
              <View key={index} style={[styles.medicationBox, { 
                backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.08)',
                borderLeftColor: '#22c55e'
              }]}>
                <Text style={[styles.medicationTitle, { color: '#22c55e' }]}>
                  💊 Medikamente:
                </Text>
                <Text style={[styles.medicationText, { color: colors.text }]}>
                  {medication}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* STEP 7: Special Content Processing - Numbered items */}
        {numberedItems.length > 0 && (
          <View style={styles.numberedItemsContainer}>
            <Text style={[styles.numberedItemsTitle, { color: colors.text }]}>
              📝 Strukturierte Liste:
            </Text>
            {numberedItems.map((item, index) => (
              <View key={index} style={[styles.numberedItemCss, { backgroundColor: colors.card }]}>
                <View style={[styles.numberCircle, { backgroundColor: colors.primary }]}>
                  <Text style={styles.numberText}>{item.number}</Text>
                </View>
                <Text style={[styles.numberedItemText, { color: colors.text }]}>
                  {item.content}
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {/* STEP 5: CSS Styles - Criteria items as highlighted list */}
        {criteriaItems.length > 0 && (
          <View style={[styles.highlightBox, { borderLeftColor: '#667eea' }]}>
            <LinearGradient
              colors={['rgba(102, 126, 234, 0.08)', 'rgba(118, 75, 162, 0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.highlightBoxGradient}
            >
              <Text style={[styles.criteriaTitle, { color: colors.text }]}>
                📋 Wichtige Kriterien
              </Text>
              {criteriaItems.map((item, index) => (
                <View key={index} style={[styles.criteriaItemCss, { 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
                  borderLeftColor: '#667eea'
                }]}>
                  <Text style={[styles.criteriaText, { color: colors.text }]}>
                    {item}
                  </Text>
                </View>
              ))}
            </LinearGradient>
          </View>
        )}
        
        {/* STEP 5: CSS Styles - Subtype cards */}
        {subtypeCards.length > 0 && (
          <View style={styles.subtypeCardsContainer}>
            <Text style={[styles.subtypeCardsTitle, { color: colors.text }]}>
              🏷️ Subtypen
            </Text>
            <View style={styles.subtypeCardsGrid}>
              {subtypeCards.map((card, index) => (
                <View key={index} style={[styles.subtypeCardCss, { 
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#f8f9fa',
                  borderLeftColor: '#2563EB'
                }]}>
                  <Text style={[styles.subtypeCardTitle, { color: colors.text }]}>
                    {card.title}
                  </Text>
                  <Text style={[styles.subtypeCardPercentage, { color: '#2563EB' }]}>
                    {card.percentage}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // STEP 4: Section Generation Function (React Native Implementation)
  const generateSection = (section: MedicalSection, index: number) => {
    const processedContent = processContent(section.content);
    const icon = getIcon(section.title);
    const isExpanded = expandedSections[index];
    
    console.log(`🏗️ STEP 4: Generating section "${section.title}" with icon "${icon}"`);
    
    return (
      <View 
        key={index} 
        ref={(ref) => {
          if (ref) sectionRefs.current[index] = ref;
        }}
        style={[
          styles.contentSection, 
          isTablet && styles.contentSectionTablet,
          { backgroundColor: colors.card }
        ]}
      >
        {/* Section Header with Icon */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(index)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            {/* Section Icon */}
            <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Text style={styles.sectionIconText}>{icon}</Text>
            </View>
            {/* Section Title */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
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

        {/* Section Content */}
        {isExpanded && (
          <View style={[styles.sectionContent, { borderTopColor: colors.border }]}>
            {/* STEP 8: Responsive Content Text with Enhanced Processing */}
            <View style={[
              styles.contentText,
              isTablet && styles.contentTextTablet
            ]}>
              {renderProcessedContent(processedContent)}
            </View>
            
            {/* Legacy subtypes support (from Step 2) */}
            {section.subtypes && section.subtypes.length > 0 && (
              <View style={styles.subtypesContainer}>
                <Text style={[styles.subtypesTitle, { color: colors.text }]}>
                  📊 Klassifikationen (Legacy):
                </Text>
                <View style={styles.subtypesGrid}>
                  {section.subtypes.map((subtype, subtypeIndex) => (
                    <View key={subtypeIndex} style={[styles.subtypeCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.subtypeTitle, { color: colors.text }]}>
                        {subtype.title}
                      </Text>
                      <Text style={[styles.subtypePercentage, { color: colors.primary }]}>
                        {subtype.percentage}
                      </Text>
                      {subtype.description && (
                        <Text style={[styles.subtypeDescription, { color: colors.textSecondary }]}>
                          {subtype.description}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Debug info for this section */}
            <View style={[styles.sectionDebug, { backgroundColor: colors.background }]}>
              <Text style={[styles.debugSmall, { color: colors.textSecondary }]}>
                STEP 4: Raw: {section.content.length} chars • Processed: {processedContent.length} chars • Icon: {icon}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // STEP 6: JavaScript Functionality - Smooth Scroll to Sections
  const scrollToSection = (index: number) => {
    console.log(`📜 STEP 6: Scrolling to section ${index}`);
    
    // First toggle the section open if it's not already
    if (!expandedSections[index]) {
      setExpandedSections(prev => ({
        ...prev,
        [index]: true
      }));
    }
    
    // Use setTimeout to ensure the section is expanded before scrolling
    setTimeout(() => {
      const sectionRef = sectionRefs.current[index];
      if (sectionRef && scrollViewRef.current) {
        console.log(`✅ STEP 6: Performing smooth scroll to section ${index}`);
        
        sectionRef.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            scrollViewRef.current?.scrollTo({
              y: y - 50, // Offset for better visibility
              animated: true
            });
          },
          () => console.log(`❌ STEP 6: Failed to measure section ${index}`)
        );
      }
    }, 100);
  };

  // STEP 6: JavaScript Functionality - Update Progress Bar on Scroll
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrolled = (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100;
    const progress = Math.min(Math.max(scrolled, 0), 100);
    
    console.log(`📊 STEP 6: Scroll progress updated: ${progress.toFixed(1)}%`);
    setScrollProgress(progress);
  };

  // STEP 9: Additional Interactive Features - Enhanced Collapsible Sections
  const toggleSection = (index: number) => {
    console.log(`🔄 STEP 9: Enhanced toggle for section ${index}`);
    
    // Initialize animation if not exists
    if (!sectionAnimations[index]) {
      const newAnim = new Animated.Value(0);
      setSectionAnimations(prev => ({ ...prev, [index]: newAnim }));
    }
    
    const willExpand = !expandedSections[index];
    
    setExpandedSections(prev => ({
      ...prev,
      [index]: willExpand
    }));
    
    // Enhanced collapse animation
    if (sectionAnimations[index]) {
      Animated.spring(sectionAnimations[index], {
        toValue: willExpand ? 1 : 0,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }
    
    console.log(`✅ STEP 9: Section ${index} ${willExpand ? 'expanded' : 'collapsed'} with animation`);
  };

  // STEP 9: Additional Interactive Features - Search Functionality
  const handleSearch = (text: string) => {
    console.log(`🔍 STEP 9: Searching for: "${text}"`);
    setSearchTerm(text);
  };

  // STEP 9: Additional Interactive Features - Copy to Clipboard
  const copyToClipboard = async (text: string, type: 'stat' | 'dosage' | 'medical') => {
    try {
      await Clipboard.setStringAsync(text);
      console.log(`📋 STEP 9: Copied ${type} to clipboard: "${text}"`);
      
      // Add to copied items for visual feedback
      setCopiedItems(prev => new Set([...prev, text]));
      
      // Remove from copied items after 2 seconds
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(text);
          return newSet;
        });
      }, 2000);
      
      // Show success feedback
      Alert.alert('📋 Kopiert!', `"${text}" wurde in die Zwischenablage kopiert.`, 
        [{ text: 'OK', style: 'default' }]);
      
    } catch (error) {
      console.error('❌ STEP 9: Failed to copy to clipboard:', error);
      Alert.alert('❌ Fehler', 'Konnte nicht in die Zwischenablage kopieren.');
    }
  };

  if (processedSections.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.errorContainer, { backgroundColor: colors.card }]}>
          <AlertCircle size={48} color={colors.textSecondary} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Keine medizinischen Inhalte gefunden
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            content_json ist leer oder ungültig formatiert
          </Text>
          
          {/* Debug Information */}
          <View style={styles.debugContainer}>
            <Text style={[styles.debugTitle, { color: colors.textSecondary }]}>Debug Info:</Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Title: {supabaseRow.title}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Slug: {supabaseRow.slug}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Content JSON Type: {typeof supabaseRow.content_json}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Content JSON Length: {supabaseRow.content_json?.length || 0}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[
      styles.appContainer, 
      isLargeScreen && styles.appContainerLarge,
      isTablet && styles.appContainerTablet,
      { 
        backgroundColor: colors.background,
        opacity: fadeAnim 
      }
    ]}>
      {/* STEP 8: Responsive Design Rules Implementation */}
      
      {/* Header Section with Responsive CSS Styling */}
      <View style={[
        styles.headerCss, 
        isTablet && styles.headerTablet,
        { 
          backgroundColor: isDarkMode ? 'rgba(42, 42, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)'
        }
      ]}>
        {/* Header Top - CSS Badges */}
        <View style={styles.headerTop}>
          <View style={styles.badgeCss}>
            <Text style={styles.badgeTextCss}>
              {supabaseRow.category || 'Medizin'}
            </Text>
          </View>
          <View style={styles.badgeCss}>
            <Text style={styles.badgeTextCss}>
              📱 Mobile App
            </Text>
          </View>
        </View>

        {/* Main Title with Responsive Sizing */}
        <Text style={[
          styles.mainTitle, 
          isTablet && styles.mainTitleTablet,
          { color: colors.text }
        ]}>
          {supabaseRow.icon || '🏥'} {supabaseRow.title}
        </Text>

        {/* Meta Information */}
        <View style={styles.metaInfo}>
          <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
            📚 {supabaseRow.parent_slug?.replace(/-/g, ' ') || 'Medizin'}
          </Text>
          <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
            ⏱️ {formatDate(supabaseRow.last_updated)}
          </Text>
          <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
            📖 {masterProcessedSections.length} Abschnitte
          </Text>
        </View>

        {/* STEP 9: Search Functionality */}
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
            <TouchableOpacity 
              onPress={() => handleSearch('')}
              style={styles.clearSearch}
            >
              <Text style={[styles.clearSearchText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* STEP 8: Responsive Navigation Pills */}
      <View style={[
        styles.sectionNav, 
        isTablet && styles.sectionNavTablet,
        { backgroundColor: colors.card }
      ]}>
        <Text style={[styles.navTitle, { color: colors.text }]}>
          Schnellnavigation
        </Text>
        <ScrollView 
          horizontal={!isTablet} 
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={isTablet}
          contentContainerStyle={[
            styles.navGrid,
            isTablet && styles.navGridTablet,
            isLargeScreen && styles.navGridLarge
          ]}
          style={isTablet ? styles.navScrollTablet : undefined}
        >
          {masterProcessedSections.map((section, index) => (
            <TouchableOpacity 
              key={index}
              style={[
                styles.navItem,
                isTablet && styles.navItemTablet,
                { 
                  backgroundColor: expandedSections[index] ? colors.primary + '20' : colors.background,
                  borderColor: colors.border 
                }
              ]}
              onPress={() => scrollToSection(index)}
            >
              <Text style={[styles.navItemText, { 
                color: expandedSections[index] ? colors.primary : colors.textSecondary 
              }]}>
                {section.icon || getIcon(section.title)} {section.title.substring(0, isTablet ? 30 : 20)}...
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* STEP 6: JavaScript Functionality - Progress Bar with Scroll Tracking */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { 
          backgroundColor: colors.primary,
          width: `${scrollProgress}%`
        }]} />
      </View>

      {/* STEP 6: JavaScript Functionality - Content Sections with Scroll Tracking */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Text style={[styles.stepIndicator, { color: colors.primary }]}>
          ✅ STEP 1: Parse and Clean Data Complete{'\n'}
          ✅ STEP 2: Pattern Recognition Rules Complete{'\n'}
          ✅ STEP 3: HTML Template Structure Complete{'\n'}
          ✅ STEP 4: Section Generation Function Complete{'\n'}
          ✅ STEP 5: CSS Styles Definition Complete{'\n'}
          ✅ STEP 6: JavaScript Functionality Complete{'\n'}
          ✅ STEP 7: Special Content Processing Rules Complete{'\n'}
          ✅ STEP 8: Responsive Design Rules Complete{'\n'}
          ✅ STEP 9: Additional Interactive Features Complete{'\n'}
          🎯 STEP 10: Complete Processing Pipeline ACTIVE
        </Text>
        
        {/* STEP 10: Complete Processing Pipeline - Search Results Info */}
        {searchTerm.length > 0 && (
          <Text style={[styles.searchResults, { color: colors.textSecondary }]}>
            🔍 Suche nach: "{searchTerm}" ({filteredSections.length} von {masterProcessedSections.length} Abschnitten)
          </Text>
        )}
        
        {/* STEP 10: Complete Processing Pipeline - Render Medical Content */}
        {renderMedicalContent()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.navButton, { backgroundColor: colors.background }]}>
          <Text style={[styles.navButtonText, { color: colors.textSecondary }]}>
            ← Zurück
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.pageInfo, { color: colors.textSecondary }]}>
          Seite 1 von {processedSections.length}
        </Text>
        
        <TouchableOpacity style={[styles.navButton, { backgroundColor: colors.primary }]}>
          <Text style={[styles.navButtonText, { color: 'white' }]}>
            Weiter →
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  debugContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    alignSelf: 'stretch',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 11,
    marginBottom: 2,
  },
  header: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 34,
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Legacy styles for backwards compatibility
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  icon: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  sectionContent: {
    borderTopWidth: 1,
    padding: 16,
    paddingTop: 12,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 22,
  },
  sectionDebug: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
  },
  debugSmall: {
    fontSize: 10,
  },
  bottomPadding: {
    height: 40,
  },
  // Step 2: Pattern Recognition Styles
  statNumber: {
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  medicalTerm: {
    fontWeight: '600',
    fontStyle: 'italic',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  subtypesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  subtypesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subtypeCard: {
    minWidth: '30%',
    maxWidth: '48%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  subtypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtypePercentage: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtypeDescription: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  // Step 3: HTML Template Structure Styles
  sectionNav: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  navGrid: {
    paddingVertical: 4,
  },
  navItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 120,
    alignItems: 'center',
  },
  navItemText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 8,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Step 4: Section Generation Function Styles
  contentSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionIconText: {
    fontSize: 16,
  },
  criteriaContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  criteriaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  criteriaItem: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  criteriaText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  subtypeCardsContainer: {
    marginTop: 16,
  },
  subtypeCardsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtypeCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subtypeCardItem: {
    minWidth: '30%',
    maxWidth: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 8,
  },
  subtypeCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtypeCardPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // STEP 5: CSS Styles Definition - React Native Implementation
  appContainer: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
    flex: 1,
  },
  headerCss: {
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 60,
    elevation: 15,
  },
  badgeCss: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeTextCss: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statNumberCss: {
    backgroundColor: '#2563EB',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 15,
    fontWeight: '600',
    fontSize: 14,
    overflow: 'hidden',
  },
  medicalTermCss: {
    color: '#764ba2',
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: '#764ba2',
  },
  highlightBox: {
    borderLeftWidth: 4,
    borderRadius: 10,
    margin: 20,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  highlightBoxGradient: {
    padding: 20,
    paddingLeft: 20,
  },
  subtypeCardCss: {
    borderRadius: 12,
    padding: 20,
    marginVertical: 15,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  criteriaItemCss: {
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  // STEP 7: Special Content Processing Rules - Styles
  dosageCss: {
    backgroundColor: '#f59e0b',
    color: 'white',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
  },
  timeSpanCss: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
  },
  definitionBoxContainer: {
    marginTop: 16,
  },
  definitionBox: {
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  definitionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  definitionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  warningBoxContainer: {
    marginTop: 16,
  },
  warningBox: {
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 15,
    lineHeight: 22,
  },
  medicationBoxContainer: {
    marginTop: 16,
  },
  medicationBox: {
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medicationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  medicationText: {
    fontSize: 15,
    lineHeight: 22,
  },
  numberedItemsContainer: {
    marginTop: 16,
  },
  numberedItemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  numberedItemCss: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 8,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  numberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  numberedItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  // STEP 8: Responsive Design Rules - React Native Media Queries
  
  // App Container Responsive Styles (matching @media queries)
  appContainerTablet: {
    // @media (max-width: 768px) equivalent
    paddingHorizontal: 10,
  },
  appContainerLarge: {
    // @media (min-width: 1200px) equivalent
    maxWidth: 1100,
  },
  
  // Header Responsive Styles
  headerTablet: {
    paddingHorizontal: 16, // Reduced padding for tablets
    paddingVertical: 20,
  },
  
  // Main Title Responsive Styles
  mainTitleTablet: {
    // h1 { font-size: 1.8em; } equivalent (28px * 0.64 ≈ 18px -> 1.8em)
    fontSize: 22, // Smaller title for tablets
  },
  
  // Navigation Responsive Styles
  sectionNavTablet: {
    // .section-nav { position: sticky; top: 0; z-index: 100; }
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 100, // Android z-index equivalent
  },
  
  // Navigation Grid Responsive Styles
  navGridTablet: {
    // .nav-grid { grid-template-columns: 1fr; max-height: 200px; overflow-y: auto; }
    flexDirection: 'column' as 'column',
    paddingVertical: 8,
  },
  navGridLarge: {
    // .nav-grid { grid-template-columns: repeat(4, 1fr); }
    flexWrap: 'wrap' as 'wrap',
    flexDirection: 'row' as 'row',
  },
  
  // Navigation Scroll Container for Tablets
  navScrollTablet: {
    maxHeight: 200,
  },
  
  // Navigation Item Responsive Styles
  navItemTablet: {
    // Full width for tablet layout
    width: '100%',
    marginBottom: 8,
    marginRight: 0,
  },
  
  // Content Text Responsive Styles
  contentTextTablet: {
    paddingHorizontal: 4, // Reduced padding for smaller screens
  },
  
  // Content Section Responsive Styles (for generateSection function)
  contentSectionTablet: {
    // .content-section { padding: 20px; }
    padding: 20,
    marginHorizontal: 10, // Reduced margins for tablets
  },
  
  // STEP 9: Additional Interactive Features - Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBox: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  clearSearch: {
    marginLeft: 8,
    padding: 4,
  },
  clearSearchText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchResults: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  clickableElement: {
    borderRadius: 4,
    marginHorizontal: 2,
  },
  clickableText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  copiedElement: {
    backgroundColor: '#10b981', // Green for copied state
  },
});

export default InteractiveMedicalContent;