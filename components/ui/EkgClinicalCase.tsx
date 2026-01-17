// ============================================
// EKG CLINICAL CASE COMPONENT
// Displays clinical cases with patient scenarios, vital signs, EKG images, and KP-level questions
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================

interface Vitalzeichen {
  blutdruck: string;
  herzfrequenz: string;
  atemfrequenz: string;
  spo2: string;
  temperatur?: string;
  bewusstsein?: string;
}

interface Frage {
  nummer: number;
  frage: string;
  antwort: string;
}

export interface KlinischerFall {
  titel: string;
  szenario: string;
  vitalzeichen: Vitalzeichen;
  koerperliche_untersuchung: string;
  ekg_bild_url: string;
  fragen: Frage[];
}

interface EkgClinicalCaseProps {
  klinischerFall: KlinischerFall | null;
}

// ============================================
// MAIN COMPONENT
// ============================================

export const EkgClinicalCase: React.FC<EkgClinicalCaseProps> = ({ klinischerFall }) => {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [showAnswers, setShowAnswers] = useState<Set<number>>(new Set());
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  if (!klinischerFall) return null;

  const toggleQuestion = (nummer: number) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nummer)) {
        newSet.delete(nummer);
      } else {
        newSet.add(nummer);
      }
      return newSet;
    });
  };

  const toggleAnswer = (nummer: number) => {
    setShowAnswers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nummer)) {
        newSet.delete(nummer);
      } else {
        newSet.add(nummer);
      }
      return newSet;
    });
  };

  const showAllAnswers = () => {
    const allNumbers = new Set(klinischerFall.fragen.map((f) => f.nummer));
    setExpandedQuestions(allNumbers);
    setShowAnswers(allNumbers);
  };

  const hideAllAnswers = () => {
    setShowAnswers(new Set());
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="medical" size={20} color="#fff" />
          </View>
          <Text style={styles.sectionTitle}>Klinischer Fall</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.badgeText}>KP-Niveau</Text>
        </View>
      </View>

      {/* Case Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.caseTitle}>{klinischerFall.titel}</Text>
      </View>

      {/* Patient Scenario */}
      <View style={styles.scenarioCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="person" size={18} color="#3b82f6" />
          <Text style={styles.cardTitle}>Fallvorstellung</Text>
        </View>
        <Text style={styles.scenarioText}>{klinischerFall.szenario}</Text>
      </View>

      {/* Vital Signs */}
      <View style={styles.vitalsCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="pulse" size={18} color="#ef4444" />
          <Text style={styles.cardTitle}>Vitalzeichen</Text>
        </View>
        <View style={styles.vitalsGrid}>
          <VitalItem icon="heart" label="Blutdruck" value={klinischerFall.vitalzeichen.blutdruck} />
          <VitalItem icon="pulse" label="Herzfrequenz" value={klinischerFall.vitalzeichen.herzfrequenz} />
          <VitalItem icon="fitness" label="Atemfrequenz" value={klinischerFall.vitalzeichen.atemfrequenz} />
          <VitalItem icon="water" label="SpO₂" value={klinischerFall.vitalzeichen.spo2} />
          {klinischerFall.vitalzeichen.temperatur && (
            <VitalItem icon="thermometer" label="Temperatur" value={klinischerFall.vitalzeichen.temperatur} />
          )}
          {klinischerFall.vitalzeichen.bewusstsein && (
            <VitalItem icon="eye" label="Bewusstsein" value={klinischerFall.vitalzeichen.bewusstsein} />
          )}
        </View>
      </View>

      {/* Physical Examination */}
      <View style={styles.examCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="body" size={18} color="#8b5cf6" />
          <Text style={styles.cardTitle}>Körperliche Untersuchung</Text>
        </View>
        <Text style={styles.examText}>{klinischerFall.koerperliche_untersuchung}</Text>
      </View>

      {/* EKG Image */}
      <View style={styles.ekgCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="analytics" size={18} color="#10b981" />
          <Text style={styles.cardTitle}>EKG-Befund</Text>
          <TouchableOpacity style={styles.expandButton} onPress={() => setImageModalVisible(true)}>
            <Ionicons name="expand" size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.ekgImageContainer}
          onPress={() => setImageModalVisible(true)}
          activeOpacity={0.9}
        >
          {imageLoading && (
            <View style={styles.imageLoader}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>EKG wird geladen...</Text>
            </View>
          )}
          <Image
            source={{ uri: klinischerFall.ekg_bild_url }}
            style={styles.ekgImage}
            resizeMode="contain"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
          <View style={styles.tapHint}>
            <Ionicons name="search" size={14} color="#fff" />
            <Text style={styles.tapHintText}>Antippen zum Vergrößern</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Questions Section */}
      <View style={styles.questionsSection}>
        <View style={styles.questionsHeader}>
          <View style={styles.cardHeader}>
            <Ionicons name="help-circle" size={18} color="#f59e0b" />
            <Text style={styles.cardTitle}>Prüfungsfragen</Text>
          </View>
          <View style={styles.answerControls}>
            <TouchableOpacity style={styles.controlButton} onPress={showAllAnswers}>
              <Text style={styles.controlButtonText}>Alle zeigen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={hideAllAnswers}>
              <Text style={styles.controlButtonText}>Alle verbergen</Text>
            </TouchableOpacity>
          </View>
        </View>

        {klinischerFall.fragen.map((frage) => (
          <QuestionCard
            key={frage.nummer}
            frage={frage}
            isExpanded={expandedQuestions.has(frage.nummer)}
            showAnswer={showAnswers.has(frage.nummer)}
            onToggleExpand={() => toggleQuestion(frage.nummer)}
            onToggleAnswer={() => toggleAnswer(frage.nummer)}
          />
        ))}
      </View>

      {/* Full Screen Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setImageModalVisible(false)}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EKG-Befund</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setImageModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image source={{ uri: klinischerFall.ekg_bild_url }} style={styles.modalImage} resizeMode="contain" />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Text style={styles.modalHint}>Pinch to zoom • Tap outside to close</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

interface VitalItemProps {
  icon: string;
  label: string;
  value: string;
}

const VitalItem: React.FC<VitalItemProps> = ({ icon, label, value }) => (
  <View style={styles.vitalItem}>
    <Ionicons name={icon as any} size={16} color="#6b7280" />
    <Text style={styles.vitalLabel}>{label}</Text>
    <Text style={styles.vitalValue}>{value}</Text>
  </View>
);

interface QuestionCardProps {
  frage: Frage;
  isExpanded: boolean;
  showAnswer: boolean;
  onToggleExpand: () => void;
  onToggleAnswer: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  frage,
  isExpanded,
  showAnswer,
  onToggleExpand,
  onToggleAnswer,
}) => (
  <View style={styles.questionCard}>
    <TouchableOpacity style={styles.questionHeader} onPress={onToggleExpand} activeOpacity={0.7}>
      <View style={styles.questionNumber}>
        <Text style={styles.questionNumberText}>{frage.nummer}</Text>
      </View>
      <Text style={styles.questionText}>{frage.frage}</Text>
      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#6b7280" />
    </TouchableOpacity>

    {isExpanded && (
      <View style={styles.answerSection}>
        {!showAnswer ? (
          <TouchableOpacity style={styles.showAnswerButton} onPress={onToggleAnswer}>
            <Ionicons name="eye" size={18} color="#3b82f6" />
            <Text style={styles.showAnswerText}>Antwort anzeigen</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.answerContainer}>
            <View style={styles.answerHeader}>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              <Text style={styles.answerLabel}>Musterantwort</Text>
              <TouchableOpacity onPress={onToggleAnswer}>
                <Ionicons name="eye-off" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.answerText}>{frage.antwort}</Text>
          </View>
        )}
      </View>
    )}
  </View>
);

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 24,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97706',
  },

  // Title
  titleContainer: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  caseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
  },

  // Cards
  scenarioCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  vitalsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ekgCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },

  // Scenario
  scenarioText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4b5563',
  },

  // Vitals
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  vitalItem: {
    width: '50%',
    paddingHorizontal: 4,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vitalLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
    flex: 1,
  },
  vitalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },

  // Exam
  examText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4b5563',
  },

  // EKG Image
  expandButton: {
    padding: 4,
  },
  ekgImageContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 200,
  },
  ekgImage: {
    width: '100%',
    height: 250,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  tapHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tapHintText: {
    fontSize: 11,
    color: '#fff',
    marginLeft: 4,
  },

  // Questions
  questionsSection: {
    marginTop: 4,
  },
  questionsHeader: {
    marginBottom: 12,
  },
  answerControls: {
    flexDirection: 'row',
    marginTop: 8,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    marginRight: 8,
  },
  controlButtonText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },

  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  questionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 20,
  },

  // Answer
  answerSection: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    padding: 14,
  },
  showAnswerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  showAnswerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
    marginLeft: 6,
  },
  answerContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  answerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    marginLeft: 6,
    flex: 1,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#166534',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalCloseArea: {
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalImage: {
    width: SCREEN_WIDTH - 40,
    height: (SCREEN_WIDTH - 40) * 0.75,
  },
  modalFooter: {
    padding: 20,
    alignItems: 'center',
  },
  modalHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
});

export default EkgClinicalCase;
