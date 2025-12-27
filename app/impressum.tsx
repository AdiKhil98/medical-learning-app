import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Building2, Mail, Phone, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import { colors } from '@/constants/colors';

export default function ImpressumScreen() {
  const router = useRouter();

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingTop: 60,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: 'rgba(255,255,255,0.9)',
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: 'rgba(249, 246, 242, 0.95)',
      shadowColor: 'rgba(181,87,64,0.3)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    backTxt: {
      marginLeft: 8,
      fontSize: 16,
      color: '#B87E70',
      fontFamily: 'Inter-Medium',
      fontWeight: '600',
    },
    content: {
      flex: 1,
      padding: 24,
    },
    pageTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 28,
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 32,
      lineHeight: 24,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 18,
      color: colors.text,
      marginBottom: 12,
    },
    sectionText: {
      fontFamily: 'Inter-Regular',
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
      marginBottom: 8,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    contactText: {
      fontFamily: 'Inter-Regular',
      fontSize: 15,
      color: colors.text,
      marginLeft: 12,
      lineHeight: 22,
    },
    companyCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
  });

  const gradient = ['#f8faff', '#e3f2fd', '#ffffff'] as const;

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient colors={gradient} style={styles.gradientBackground} />

      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backBtn}>
          <ChevronLeft size={24} color={colors.primary} />
          <Text style={dynamicStyles.backTxt}>Zurück</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Building2 size={32} color={MEDICAL_COLORS.primary} />
          <Text style={dynamicStyles.pageTitle}>Impressum</Text>
        </View>

        <Text style={dynamicStyles.subtitle}>
          Angaben gemäß § 5 TMG und rechtliche Informationen zur KP Med Plattform.
        </Text>

        <View style={dynamicStyles.companyCard}>
          <Text style={dynamicStyles.sectionTitle}>Anbieter</Text>

          <View style={dynamicStyles.contactItem}>
            <Building2 size={20} color={MEDICAL_COLORS.primary} />
            <Text style={dynamicStyles.contactText}>KP Med GmbH</Text>
          </View>

          <View style={dynamicStyles.contactItem}>
            <MapPin size={20} color={MEDICAL_COLORS.primary} />
            <Text style={dynamicStyles.contactText}>
              Sitz: Österreich{'\n'}
              (Vollständige Adresse bei Bedarf verfügbar)
            </Text>
          </View>

          <View style={dynamicStyles.contactItem}>
            <Mail size={20} color={MEDICAL_COLORS.primary} />
            <Text style={dynamicStyles.contactText}>info@kpmed.de</Text>
          </View>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Geschäftsführung</Text>
          <Text style={dynamicStyles.sectionText}>Geschäftsführer der KP Med GmbH</Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Registereintrag</Text>
          <Text style={dynamicStyles.sectionText}>
            Eintragung im Handelsregister{'\n'}
            Registergericht: [Zuständiges Gericht]{'\n'}
            Registernummer: [HRB-Nummer]
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Umsatzsteuer-ID</Text>
          <Text style={dynamicStyles.sectionText}>
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:{'\n'}
            [USt-IdNr. wird bei Bedarf bereitgestellt]
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Aufsichtsbehörde</Text>
          <Text style={dynamicStyles.sectionText}>[Zuständige Aufsichtsbehörde je nach Geschäftszweig]</Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</Text>
          <Text style={dynamicStyles.sectionText}>
            KP Med GmbH{'\n'}
            Geschäftsführung{'\n'}
            [Adresse wie oben]
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Streitschlichtung</Text>
          <Text style={dynamicStyles.sectionText}>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
            https://ec.europa.eu/consumers/odr/{'\n\n'}
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Haftung für Inhalte</Text>
          <Text style={dynamicStyles.sectionText}>
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen
            Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht unter der
            Verpflichtung, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu
            forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Urheberrecht</Text>
          <Text style={dynamicStyles.sectionText}>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
            Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
            Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>App Version</Text>
          <Text style={dynamicStyles.sectionText}>
            Version 1.0.0{'\n'}
            Letzte Aktualisierung: Dezember 2024{'\n\n'}© 2024 KP Med GmbH. Alle Rechte vorbehalten.
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  bottomPadding: {
    height: 32,
  },
});
