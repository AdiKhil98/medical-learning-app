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
import { X, Globe, Users, BookOpen, Target, Lightbulb, Award } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AboutUsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AboutUsModal({ visible, onClose }: AboutUsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft} />
            <Text style={styles.title}>Über Lernkapital</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Mission Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.iconContainer}
              >
                <Target size={24} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>Unsere Mission</Text>
            </View>
            <Text style={styles.sectionText}>
              Lernkapital ist Ihre moderne Plattform für effektives und nachhaltiges Lernen. 
              Wir kombinieren bewährte Lernmethoden mit modernster Technologie, um Ihnen 
              das bestmögliche Lernerlebnis zu bieten.
            </Text>
          </View>

          {/* Features Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#4facfe', '#00f2fe']}
                style={styles.iconContainer}
              >
                <Lightbulb size={24} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>Was wir bieten</Text>
            </View>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <BookOpen size={18} color="#667eea" />
                <Text style={styles.featureText}>
                  Interaktive Lerninhalte und Simulationen
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Users size={18} color="#667eea" />
                <Text style={styles.featureText}>
                  Personalisierte Lernpfade für jeden Lerntyp
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Award size={18} color="#667eea" />
                <Text style={styles.featureText}>
                  Detaillierte Fortschrittsverfolgung und Analytics
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Globe size={18} color="#667eea" />
                <Text style={styles.featureText}>
                  Zugriff von überall und auf jedem Gerät
                </Text>
              </View>
            </View>
          </View>

          {/* How to Use Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#f093fb', '#f5576c']}
                style={styles.iconContainer}
              >
                <BookOpen size={24} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>So nutzen Sie die Website</Text>
            </View>
            <View style={styles.stepsList}>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Navigation</Text>
                  <Text style={styles.stepDescription}>
                    Nutzen Sie die Tabs unten, um zwischen Dashboard, Bibliothek, 
                    Simulationen und Fortschritt zu wechseln.
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Lernen</Text>
                  <Text style={styles.stepDescription}>
                    Besuchen Sie die Bibliothek für Lerninhalte oder starten Sie 
                    eine Simulation für praktische Übungen.
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Fortschritt verfolgen</Text>
                  <Text style={styles.stepDescription}>
                    Sehen Sie Ihren Lernfortschritt im Fortschritt-Tab und 
                    nutzen Sie die täglichen Tipps und Fragen.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Contact Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#ff9a56', '#ffad56']}
                style={styles.iconContainer}
              >
                <Users size={24} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>Kontakt & Support</Text>
            </View>
            <Text style={styles.sectionText}>
              Bei Fragen oder technischen Problemen stehen wir Ihnen gerne zur Verfügung. 
              Nutzen Sie das Menü in der oberen linken Ecke für weitere Optionen und 
              Einstellungen.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Vielen Dank, dass Sie Lernkapital für Ihre Weiterbildung nutzen!
            </Text>
          </View>
        </ScrollView>
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    width: 24,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
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
    marginVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
  },
  sectionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#4b5563',
    lineHeight: 24,
    marginLeft: 52,
  },
  featuresList: {
    marginLeft: 52,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#4b5563',
    flex: 1,
    lineHeight: 22,
  },
  stepsList: {
    marginLeft: 52,
    gap: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
  },
});