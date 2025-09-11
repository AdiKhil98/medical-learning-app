import React from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  SafeAreaView 
} from 'react-native';
import { X, Mic, Volume2, Clock, AlertCircle } from 'lucide-react-native';

interface SimulationInstructionsModalProps {
  visible: boolean;
  onClose: () => void;
  simulationType: 'KP' | 'FSP';
}

export default function SimulationInstructionsModal({ 
  visible, 
  onClose, 
  simulationType 
}: SimulationInstructionsModalProps) {
  const isKP = simulationType === 'KP';
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <Text style={styles.title}>
            {isKP ? 'KP-Simulation' : 'FSP-Simulation'} - Anleitung
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Mic size={20} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Sprachsteuerung</Text>
            </View>
            <Text style={styles.sectionText}>
              Diese Simulation verwendet Spracherkennung für eine natürliche Interaktion:
            </Text>
            <View style={styles.stepList}>
              <Text style={styles.step}>• Tippen Sie auf das Mikrofon, um die Simulation zu starten</Text>
              <Text style={styles.step}>• Sprechen Sie klar und deutlich auf Deutsch</Text>
              <Text style={styles.step}>• Tippen und halten Sie das Mikrofon während der Aufnahme</Text>
              <Text style={styles.step}>• Der AI-Assistent antwortet automatisch per Sprache</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Volume2 size={20} color="#22c55e" />
              <Text style={styles.sectionTitle}>Mikrofon-Status</Text>
            </View>
            <View style={styles.statusList}>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.statusText}>Orange: Bereit zum Initialisieren</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
                <Text style={styles.statusText}>Grün: Bereit zum Sprechen</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.statusText}>Rot: Aufnahme läuft</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#3b82f6' }]} />
                <Text style={styles.statusText}>Blau: Verarbeitung läuft</Text>
              </View>
            </View>
          </View>

          {isKP ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AlertCircle size={20} color="#f59e0b" />
                <Text style={styles.sectionTitle}>KP-Simulation Ablauf</Text>
              </View>
              <Text style={styles.sectionText}>
                Die Kommunikationsprüfung (KP) simuliert ein Gespräch zwischen Arzt und Patient:
              </Text>
              <View style={styles.stepList}>
                <Text style={styles.step}>• Sie übernehmen die Rolle des Arztes</Text>
                <Text style={styles.step}>• Der AI-Patient präsentiert medizinische Symptome</Text>
                <Text style={styles.step}>• Führen Sie eine strukturierte Anamnese durch</Text>
                <Text style={styles.step}>• Stellen Sie gezielte Fragen zur Symptomatik</Text>
                <Text style={styles.step}>• Erklären Sie Ihre Diagnose und das weitere Vorgehen</Text>
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AlertCircle size={20} color="#f59e0b" />
                <Text style={styles.sectionTitle}>FSP-Simulation Ablauf</Text>
              </View>
              <Text style={styles.sectionText}>
                Die Fachsprachenprüfung (FSP) testet Ihre medizinische Fachsprache:
              </Text>
              <View style={styles.stepList}>
                <Text style={styles.step}>• Arzt-Arzt Gespräch mit einem Kollegen</Text>
                <Text style={styles.step}>• Präsentation von Patientenfällen</Text>
                <Text style={styles.step}>• Diskussion von Diagnosen und Therapien</Text>
                <Text style={styles.step}>• Verwendung präziser medizinischer Terminologie</Text>
                <Text style={styles.step}>• Strukturierte Fallvorstellung</Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color="#6366f1" />
              <Text style={styles.sectionTitle}>Wichtige Hinweise</Text>
            </View>
            <View style={styles.stepList}>
              <Text style={styles.step}>• Die Simulation ist zeitlich begrenzt</Text>
              <Text style={styles.step}>• Sprechen Sie deutlich für bessere Erkennung</Text>
              <Text style={styles.step}>• Bei technischen Problemen starten Sie neu</Text>
              <Text style={styles.step}>• Nutzen Sie medizinische Fachbegriffe korrekt</Text>
              <Text style={styles.step}>• Die Conversation wird automatisch beendet</Text>
            </View>
          </View>

          <View style={styles.tipBox}>
            <View style={styles.tipHeader}>
              <Text style={styles.tipTitle}>💡 Tipp</Text>
            </View>
            <Text style={styles.tipText}>
              Für die beste Erfahrung verwenden Sie ein ruhiges Umfeld und sprechen Sie klar und in angemessenem Tempo.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} style={styles.startButton}>
            <Text style={styles.startButtonText}>Simulation starten</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    width: 24,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginLeft: 8,
  },
  sectionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  stepList: {
    marginLeft: 8,
  },
  step: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 4,
  },
  statusList: {
    marginLeft: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4b5563',
  },
  tipBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  tipHeader: {
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#92400e',
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400e',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  startButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
});