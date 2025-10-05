import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions
} from 'react-native';
import {
  X,
  AlertCircle,
  Target,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Award,
  Zap
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const isMobile = width < 600;

interface AboutUsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AboutUsModal({ visible, onClose }: AboutUsModalProps) {
  const router = useRouter();

  const handleStartTrial = () => {
    onClose();
    router.push('/subscription');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#B15740', '#A04A35']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft} />
            <Text style={styles.title}>Über KP Med</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>
              Effektive Prüfungsvorbereitung, die wirklich funktioniert
            </Text>
            <Text style={styles.heroText}>
              Wir kennen das Problem: Tausende Euro für Kurse ausgeben, nur um medizinische Informationen zu hören, die Sie auch woanders finden könnten. Oder Sie treten Telegram-Gruppen bei, wo zwei Personen eine Prüfung simulieren – ohne echtes Feedback, ohne Struktur, ohne wirklichen Mehrwert.
            </Text>
          </View>

          {/* Problem Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainerProblem}>
                <AlertCircle size={24} color="#ffffff" />
              </View>
              <Text style={styles.sectionTitle}>
                Das Problem mit traditioneller Prüfungsvorbereitung
              </Text>
            </View>
            <Text style={styles.sectionText}>
              Die meisten Vorbereitungskurse überschütten Sie mit Informationen. Aber nicht alle Informationen sind gleich wichtig. Ihr Gehirn verschwendet wertvolle Kapazität auf irrelevante Details, während prüfungsrelevante Inhalte untergehen. Sie zahlen viel, lernen viel – aber bereiten sich nicht optimal vor.
            </Text>
          </View>

          {/* Solution Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainerSolution}>
                <Target size={24} color="#ffffff" />
              </View>
              <Text style={styles.sectionTitle}>
                Unsere Lösung: Fokussiertes Lernen + Realistische Simulation
              </Text>
            </View>
            <Text style={styles.solutionIntro}>Bei KP Med erhalten Sie genau das, was Sie brauchen:</Text>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <View style={styles.checkIconContainer}>
                  <CheckCircle size={20} color="#10B981" strokeWidth={2.5} />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>Prüfungsrelevante medizinische Inhalte</Text>
                  <Text style={styles.benefitText}>
                    Wir konzentrieren uns auf das, was wirklich in der Prüfung vorkommt. Keine Zeitverschwendung mit überflüssigen Details.
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.checkIconContainer}>
                  <CheckCircle size={20} color="#10B981" strokeWidth={2.5} />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>Professionelle KP & FSP Simulationen</Text>
                  <Text style={styles.benefitText}>
                    Realistische Prüfungssituationen, die Sie optimal vorbereiten.
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.checkIconContainer}>
                  <CheckCircle size={20} color="#10B981" strokeWidth={2.5} />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>Detaillierte, personalisierte Auswertungen</Text>
                  <Text style={styles.benefitText}>
                    Nach jeder Simulation erhalten Sie eine präzise Analyse:
                  </Text>
                  <View style={styles.subList}>
                    <Text style={styles.subListItem}>• Ihre echten Stärken</Text>
                    <Text style={styles.subListItem}>• Ihre Schwachpunkte</Text>
                    <Text style={styles.subListItem}>• Konkrete Empfehlungen, woran Sie arbeiten sollten</Text>
                    <Text style={styles.subListItem}>• Ihr persönlicher Lernplan für maximalen Fortschritt</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Value Proposition Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainerValue}>
                <TrendingUp size={24} color="#ffffff" />
              </View>
              <Text style={styles.sectionTitle}>
                Hochwertige Vorbereitung zu fairen Preisen
              </Text>
            </View>
            <Text style={styles.sectionText}>
              Statt Tausende Euro auszugeben, beginnen unsere Pläne bei nur <Text style={styles.highlight}>1,50€ pro Tag</Text>. Das ist weniger als ein Kaffee – für eine Vorbereitung, die Ihre Prüfungschancen dramatisch verbessert.
            </Text>
            <Text style={styles.sectionText}>
              Wir glauben, dass exzellente medizinische Ausbildung zugänglich sein sollte. Deshalb haben wir KP Med entwickelt: Eine Plattform, die Ihnen die besten Lernressourcen und realistischste Prüfungsvorbereitung bietet – zu einem Bruchteil der Kosten traditioneller Kurse.
            </Text>
          </View>

          {/* Comparison Box */}
          <View style={styles.comparisonBox}>
            <View style={styles.comparisonItem}>
              <DollarSign size={20} color="#EF4444" />
              <Text style={styles.comparisonLabel}>Traditioneller Kurs</Text>
              <Text style={styles.comparisonPrice}>€2.000 - €5.000</Text>
            </View>
            <View style={styles.comparisonDivider} />
            <View style={styles.comparisonItem}>
              <Zap size={20} color="#10B981" />
              <Text style={styles.comparisonLabel}>KP Med</Text>
              <Text style={styles.comparisonPriceGood}>ab €45/Monat</Text>
            </View>
          </View>

          {/* Testimonial */}
          <View style={styles.testimonialBox}>
            <Award size={32} color="#B15740" style={styles.testimonialIcon} />
            <Text style={styles.testimonialQuote}>
              "Ich habe mit KP Med beim ersten Versuch bestanden – die Simulationen waren fast identisch mit der echten Prüfung!"
            </Text>
            <Text style={styles.testimonialAuthor}>— Dr. Sarah M.</Text>
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <Text style={styles.ctaText}>
              Starten Sie heute Ihre kostenlose 14-tägige Testversion und erleben Sie den Unterschied selbst.
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleStartTrial}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#B15740', '#A04A35']}
                style={styles.ctaButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.ctaButtonText}>Kostenlos testen</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.ctaSubtext}>Keine Kreditkarte erforderlich</Text>
          </View>

          <View style={styles.spacer} />
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
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: isMobile ? 20 : 32,
  },
  heroSection: {
    paddingVertical: 32,
    paddingHorizontal: isMobile ? 0 : 20,
  },
  heroTitle: {
    fontSize: isMobile ? 26 : 32,
    fontWeight: '800',
    color: '#1f2937',
    lineHeight: isMobile ? 34 : 40,
    marginBottom: 16,
    textAlign: 'center',
  },
  heroText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 26,
    textAlign: 'center',
  },
  section: {
    marginVertical: 24,
    paddingHorizontal: isMobile ? 0 : 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  iconContainerProblem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 2,
  },
  iconContainerSolution: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 2,
  },
  iconContainerValue: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#B15740',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B15740',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 28,
    flex: 1,
  },
  sectionText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 12,
  },
  highlight: {
    fontWeight: '700',
    color: '#B15740',
  },
  solutionIntro: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: 16,
  },
  benefitsList: {
    gap: 20,
    marginTop: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkIconContainer: {
    marginTop: 2,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  subList: {
    marginTop: 8,
    marginLeft: 8,
    gap: 4,
  },
  subListItem: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  comparisonBox: {
    flexDirection: isMobile ? 'column' : 'row',
    backgroundColor: '#F9F6F2',
    borderRadius: 16,
    padding: 20,
    marginVertical: 24,
    gap: isMobile ? 16 : 0,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  comparisonDivider: {
    width: isMobile ? '100%' : 1,
    height: isMobile ? 1 : 'auto',
    backgroundColor: '#D1D5DB',
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  comparisonPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
  },
  comparisonPriceGood: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  testimonialBox: {
    backgroundColor: '#FEF9E7',
    borderLeftWidth: 4,
    borderLeftColor: '#B15740',
    borderRadius: 12,
    padding: 24,
    marginVertical: 24,
    alignItems: 'center',
  },
  testimonialIcon: {
    marginBottom: 12,
  },
  testimonialQuote: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#1f2937',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  testimonialAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  ctaSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: isMobile ? 0 : 20,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 24,
  },
  ctaButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 300,
    shadowColor: 'rgba(177, 87, 64, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  ctaSubtext: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 12,
    fontWeight: '500',
  },
  spacer: {
    height: 40,
  },
});
