import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, X, CheckCircle } from 'lucide-react-native';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

interface SimulationDisclaimerModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  simulationType: 'FSP' | 'KP';
}

export default function SimulationDisclaimerModal({
  visible,
  onAccept,
  onDecline,
  simulationType
}: SimulationDisclaimerModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modal}>
            {/* Header */}
            <LinearGradient
              colors={[MEDICAL_COLORS.primaryGradient[0], MEDICAL_COLORS.primaryGradient[1]]}
              style={styles.header}
            >
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onDecline}
              >
                <X size={20} color={MEDICAL_COLORS.white} />
              </TouchableOpacity>
              
              <View style={styles.headerContent}>
                <AlertTriangle size={32} color={MEDICAL_COLORS.white} />
                <Text style={styles.headerTitle}>Wichtiger Hinweis</Text>
                <Text style={styles.headerSubtitle}>{simulationType}-Simulation</Text>
              </View>
            </LinearGradient>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.disclaimerSection}>
                <Text style={styles.sectionTitle}>⚕️ Medizinischer Haftungsausschluss</Text>
                <Text style={styles.disclaimerText}>
                  Diese Plattform stellt Lehrmaterialien ausschließlich für approbierte medizinische Fachkräfte zur Verfügung. 
                  Die Inhalte dienen der Prüfungsvorbereitung und stellen keine medizinische Beratung dar.
                </Text>
              </View>

              <View style={styles.disclaimerSection}>
                <Text style={styles.sectionTitle}>🎓 Bildungszweck</Text>
                <Text style={styles.disclaimerText}>
                  Diese Simulation dient ausschließlich der Prüfungsvorbereitung und dem Lernen. 
                  Sie ersetzt keine echte klinische Erfahrung oder medizinische Ausbildung.
                </Text>
              </View>

              <View style={styles.disclaimerSection}>
                <Text style={styles.sectionTitle}>👨‍⚕️ Zielgruppe</Text>
                <Text style={styles.disclaimerText}>
                  Diese Inhalte sind nur für lizenzierte medizinische Fachkräfte und Medizinstudenten bestimmt.
                </Text>
              </View>

              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Durch das Starten der Simulation bestätigen Sie, dass Sie die oben genannten Bedingungen verstehen und akzeptieren.
                </Text>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={onDecline}
              >
                <Text style={styles.declineButtonText}>Abbrechen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptButton}
                onPress={onAccept}
              >
                <LinearGradient
                  colors={[MEDICAL_COLORS.primaryGradient[0], MEDICAL_COLORS.primaryGradient[1]]}
                  style={styles.acceptButtonGradient}
                >
                  <CheckCircle size={18} color={MEDICAL_COLORS.white} />
                  <Text style={styles.acceptButtonText}>Verstanden & Starten</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modal: {
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.white,
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.white,
    opacity: 0.9,
  },
  content: {
    maxHeight: 400,
    padding: 20,
  },
  disclaimerSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: `${MEDICAL_COLORS.warning}15`,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: MEDICAL_COLORS.warning,
    marginTop: 10,
  },
  warningText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.textPrimary,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: MEDICAL_COLORS.lightGray,
    backgroundColor: MEDICAL_COLORS.offWhite,
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.gray,
  },
  acceptButton: {
    flex: 2,
    borderRadius: 25,
  },
  acceptButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.white,
  },
});