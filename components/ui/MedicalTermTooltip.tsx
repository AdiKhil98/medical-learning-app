import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import {
  X,
  BookOpen,
  ExternalLink,
  Star,
  Copy,
} from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MedicalTermDefinition {
  term: string;
  definition: string;
  category: string;
  synonyms?: string[];
  relatedTerms?: string[];
  clinicalRelevance?: string;
  examples?: string[];
}

interface MedicalTermTooltipProps {
  term: string;
  children: React.ReactNode;
  onTermPress?: (term: string) => void;
}

const MedicalTermTooltip: React.FC<MedicalTermTooltipProps> = ({
  term,
  children,
  onTermPress,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  // Medical term definitions database
  const getTermDefinition = useCallback((termName: string): MedicalTermDefinition | null => {
    const definitions: Record<string, MedicalTermDefinition> = {
      'Rheumatoide Arthritis': {
        term: 'Rheumatoide Arthritis',
        definition: 'Eine chronisch-entzündliche Autoimmunerkrankung, die primär die Synovialmembran der Gelenke betrifft und zu fortschreitender Gelenkzerstörung führen kann.',
        category: 'Rheumatologie',
        synonyms: ['RA', 'Polyarthritis chronica progressiva'],
        relatedTerms: ['Autoimmunerkrankung', 'Synovitis', 'Rheumafaktor'],
        clinicalRelevance: 'Führende Ursache für Gelenkdeformitäten und Behinderung bei Erwachsenen.',
        examples: ['Morgensteifigkeit', 'Symmetrische Polyarthritis', 'Rheumaknoten']
      },
      'Autoimmunerkrankung': {
        term: 'Autoimmunerkrankung',
        definition: 'Eine Erkrankung, bei der das Immunsystem körpereigene Strukturen als fremd erkennt und angreift.',
        category: 'Immunologie',
        synonyms: ['Autoimmunität'],
        relatedTerms: ['Antikörper', 'T-Zellen', 'Inflammation'],
        clinicalRelevance: 'Grundlage für viele chronische Erkrankungen wie RA, MS, Diabetes Typ 1.',
      },
      'Synovialmembran': {
        term: 'Synovialmembran',
        definition: 'Die innere Schicht der Gelenkkapsel, die Synovialflüssigkeit produziert und für die Gelenkschmierung verantwortlich ist.',
        category: 'Anatomie',
        synonyms: ['Synovialis', 'Gelenkinnenhaut'],
        relatedTerms: ['Synovialflüssigkeit', 'Gelenkkapsel', 'Knorpel'],
        clinicalRelevance: 'Hauptangriffspunkt bei rheumatoider Arthritis.',
      },
      'ICD-10': {
        term: 'ICD-10',
        definition: 'International Statistical Classification of Diseases and Related Health Problems, 10. Revision - weltweites Klassifikationssystem für Krankheiten.',
        category: 'Medizinische Kodierung',
        synonyms: ['International Classification of Diseases'],
        relatedTerms: ['Diagnose', 'Kodierung', 'WHO'],
        clinicalRelevance: 'Standard für medizinische Diagnosecodierung weltweit.',
      },
      'ACR/EULAR': {
        term: 'ACR/EULAR',
        definition: 'American College of Rheumatology / European League Against Rheumatism - gemeinsame Klassifikationskriterien für rheumatoide Arthritis.',
        category: 'Klassifikation',
        relatedTerms: ['Klassifikation', 'Diagnose', 'Rheumatologie'],
        clinicalRelevance: 'Goldstandard für RA-Diagnose seit 2010.',
      },
      'Delir': {
        term: 'Delir',
        definition: 'Akute, meist reversible Störung der Aufmerksamkeit, des Bewusstseins und der kognitiven Funktionen.',
        category: 'Neuropsychiatrie',
        synonyms: ['Akutes Verwirrtheitssyndrom', 'Durchgangssyndrom'],
        relatedTerms: ['Demenz', 'Bewusstseinsstörung', 'Kognition'],
        clinicalRelevance: 'Häufige Komplikation bei hospitalisierten älteren Patienten.',
        examples: ['Hyperaktives Delir', 'Hypoaktives Delir', 'Gemischtes Delir']
      },
      'CAM': {
        term: 'CAM',
        definition: 'Confusion Assessment Method - validiertes Instrument zur Delir-Diagnostik.',
        category: 'Diagnostik',
        synonyms: ['Confusion Assessment Method'],
        relatedTerms: ['CAM-ICU', '4AT', 'Delir-Screening'],
        clinicalRelevance: 'Goldstandard für Delir-Diagnostik in der Klinik.',
      }
    };

    return definitions[termName] || null;
  }, []);

  const showTooltip = useCallback(() => {
    setIsVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const hideTooltip = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => setIsVisible(false));
  }, [fadeAnim, scaleAnim]);

  const handleTermPress = useCallback(() => {
    showTooltip();
    onTermPress?.(term);
  }, [term, onTermPress, showTooltip]);

  const termDefinition = getTermDefinition(term);

  if (!termDefinition) {
    return <>{children}</>;
  }

  const renderTooltipContent = () => (
    <View style={styles.tooltipContainer}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.tooltipHeader}
      >
        <View style={styles.headerContent}>
          <View style={styles.termInfo}>
            <Text style={styles.termTitle}>{termDefinition.term}</Text>
            <Text style={styles.termCategory}>{termDefinition.category}</Text>
          </View>
          <TouchableOpacity onPress={hideTooltip} style={styles.closeButton}>
            <X size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.tooltipBody} showsVerticalScrollIndicator={false}>
        <View style={styles.definitionSection}>
          <View style={styles.sectionHeader}>
            <BookOpen size={18} color="#667eea" />
            <Text style={styles.sectionTitle}>Definition</Text>
          </View>
          <Text style={styles.definitionText}>{termDefinition.definition}</Text>
        </View>

        {termDefinition.synonyms && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Synonyme:</Text>
            <View style={styles.tagContainer}>
              {termDefinition.synonyms.map((synonym, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{synonym}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {termDefinition.clinicalRelevance && (
          <View style={styles.clinicalRelevanceSection}>
            <View style={styles.sectionHeader}>
              <Star size={18} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Klinische Relevanz</Text>
            </View>
            <Text style={styles.clinicalText}>{termDefinition.clinicalRelevance}</Text>
          </View>
        )}

        {termDefinition.examples && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Beispiele:</Text>
            {termDefinition.examples.map((example, index) => (
              <Text key={index} style={styles.exampleItem}>• {example}</Text>
            ))}
          </View>
        )}

        {termDefinition.relatedTerms && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Verwandte Begriffe:</Text>
            <View style={styles.relatedTermsContainer}>
              {termDefinition.relatedTerms.map((relatedTerm, index) => (
                <TouchableOpacity key={index} style={styles.relatedTerm}>
                  <Text style={styles.relatedTermText}>{relatedTerm}</Text>
                  <ExternalLink size={14} color="#667eea" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton}>
            <Copy size={16} color="#667eea" />
            <Text style={styles.actionText}>Kopieren</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Star size={16} color="#f59e0b" />
            <Text style={styles.actionText}>Merken</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <>
      <TouchableOpacity onPress={handleTermPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        onRequestClose={hideTooltip}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={hideTooltip}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              {renderTooltipContent()}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: Math.min(screenWidth - 40, 400),
    maxHeight: screenHeight * 0.7,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  tooltipContainer: {
    flex: 1,
  },
  tooltipHeader: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  termInfo: {
    flex: 1,
  },
  termTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  termCategory: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  tooltipBody: {
    flex: 1,
    padding: 20,
  },
  definitionSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  definitionText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4a4a4a',
    textAlign: 'justify',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f3f0ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  tagText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '500',
  },
  clinicalRelevanceSection: {
    backgroundColor: '#fffbeb',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    marginBottom: 16,
  },
  clinicalText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#92400e',
    fontWeight: '500',
  },
  exampleItem: {
    fontSize: 14,
    color: '#4a4a4a',
    marginBottom: 4,
    paddingLeft: 8,
  },
  relatedTermsContainer: {
    gap: 8,
  },
  relatedTerm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  relatedTermText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionText: {
    fontSize: 14,
    color: '#4a4a4a',
    fontWeight: '500',
    marginLeft: 6,
  },
});

export default MedicalTermTooltip;