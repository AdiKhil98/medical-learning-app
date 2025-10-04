// app/(tabs)/konto/datenschutz-agb.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronDown, Shield, FileText, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Card from '@/components/ui/Card';
import { LinearGradient } from 'expo-linear-gradient';

export default function DatenschutzAGBScreen() {
  const { colors, isDarkMode, fontScale } = useTheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});

  const toggle = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const gradient = isDarkMode
    ? ['#1F2937', '#111827', '#0F172A']
    : ['#F8F3E8', '#FBEEEC', '#FFFFFF']; // White Linen to light coral to white

  const stylesD = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingTop: 60,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: isDarkMode ? 'rgba(31,41,55,0.9)' : 'rgba(255,255,255,0.9)',
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
      fontSize: fontScale(16),
      color: '#B87E70',
      fontFamily: 'Inter-Medium',
      fontWeight: '600',
    },
    content: { flex: 1, padding: 24 },
    pageTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(24),
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(16),
      color: colors.textSecondary,
      marginBottom: 24,
      lineHeight: fontScale(24),
    },
    card: {
      marginBottom: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.05,
      shadowRadius: 8,
      elevation: 3,
      overflow: 'hidden',
    },
    headerSection: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    sectionTitle: {
      flex: 1,
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(18),
      color: colors.text,
    },
    chevron: {},
    chevronOpen: { transform: [{ rotate: '180deg' }] },
    sectionContent: { padding: 20, paddingTop: 0 },
    text: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(15),
      color: colors.text,
      lineHeight: fontScale(22),
      marginBottom: 12,
    },
    heading: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(16),
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    list: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(15),
      color: colors.text,
      lineHeight: fontScale(22),
      marginBottom: 8,
      paddingLeft: 16,
    },
  });

  const datenschutz = (
    <>
      <Text style={stylesD.heading}>1. Verantwortlicher</Text>
      <Text style={stylesD.text}>
        <Text style={{ fontFamily: 'Inter-Bold' }}>KP Med GmbH</Text>{'\n'}
        Sitz in Österreich{'\n'}
        E-Mail: datenschutz@kpmed.de
      </Text>

      <Text style={stylesD.heading}>2. Verarbeitete Daten</Text>
      <Text style={stylesD.text}>
        • Bestandsdaten (z. B. Name, Adresse){'\n'}
        • Kontaktdaten (z. B. E-Mail){'\n'}
        • Inhaltsdaten (z. B. Texteingaben){'\n'}
        • Nutzungsdaten (z. B. besuchte Seiten){'\n'}
        • Meta-/Kommunikationsdaten (z. B. IP-Adresse)
      </Text>

      <Text style={stylesD.heading}>3. Zweck der Verarbeitung</Text>
      <Text style={stylesD.text}>
        Bereitstellung und Verbesserung der Plattform, Kommunikation, Sicherheit, Reichweiten-Analyse.
      </Text>

      <Text style={stylesD.heading}>4. Rechtsgrundlagen</Text>
      <Text style={stylesD.list}>• Einwilligung (Art. 6 (1) a DSGVO){'\n'}</Text>
      <Text style={stylesD.list}>• Vertragserfüllung (Art. 6 (1) b DSGVO){'\n'}</Text>
      <Text style={stylesD.list}>• Rechtliche Verpflichtung (Art. 6 (1) c DSGVO){'\n'}</Text>
      <Text style={stylesD.list}>• Berechtigte Interessen (Art. 6 (1) f DSGVO)</Text>

      <Text style={stylesD.heading}>5. Datenweitergabe</Text>
      <Text style={stylesD.text}>
        Nur, wenn nötig für Vertragserfüllung, mit Ihrer Einwilligung oder rechtlich vorgeschrieben.
      </Text>

      <Text style={stylesD.heading}>6. Datenübermittlung</Text>
      <Text style={stylesD.text}>
        In Drittländer nur auf Basis von Vertragsnotwendigkeit, Einwilligung oder berechtigtem Interesse.
      </Text>

      <Text style={stylesD.heading}>7. Ihre Rechte</Text>
      <Text style={stylesD.text}>
        Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch, Beschwerde.
      </Text>

      <Text style={stylesD.heading}>8. Speicherdauer</Text>
      <Text style={stylesD.text}>
        Löschung nach gesetzlichen Vorgaben oder Vertragsende.
      </Text>

      <Text style={stylesD.heading}>9. Änderungen</Text>
      <Text style={stylesD.text}>
        Diese Erklärung kann jederzeit aktualisiert werden.
      </Text>
    </>
  );

  const agb = (
    <>
      <Text style={stylesD.heading}>§ 1 Geltungsbereich</Text>
      <Text style={stylesD.text}>
        Diese AGB gelten für alle Verträge zwischen KP Med GmbH und Nutzer:innen der Plattform.
      </Text>

      <Text style={stylesD.heading}>§ 2 Vertragsgegenstand</Text>
      <Text style={stylesD.text}>
        Digitale Lernplattform mit Materialien, Übungsfragen und Simulationen.
      </Text>

      <Text style={stylesD.heading}>§ 3 Vertragsschluss</Text>
      <Text style={stylesD.text}>
        Registrierung stellt Angebot dar, Annahme erfolgt durch Bestätigung.
      </Text>

      <Text style={stylesD.heading}>§ 4 Nutzungsrechte</Text>
      <Text style={stylesD.text}>
        Einfaches, nicht übertragbares Recht zur privaten Prüfungsvorbereitung.
      </Text>

      <Text style={stylesD.heading}>§ 5 Pflichten</Text>
      <Text style={stylesD.text}>
        Wahrheitsgemäße Angaben und Geheimhaltung der Zugangsdaten.
      </Text>

      <Text style={stylesD.heading}>§ 6 Verfügbarkeit</Text>
      <Text style={stylesD.text}>
        Hohe Verfügbarkeit angestrebt, Wartung kann Einschränkungen bringen.
      </Text>

      <Text style={stylesD.heading}>§ 7 Haftung</Text>
      <Text style={stylesD.text}>
        Haftung nur bei Vorsatz und grober Fahrlässigkeit.
      </Text>

      <Text style={stylesD.heading}>§ 8 Kündigung</Text>
      <Text style={stylesD.text}>
        Beide Seiten können mit 30 Tagen Frist kündigen.
      </Text>

      <Text style={stylesD.heading}>§ 9 Anwendbares Recht</Text>
      <Text style={stylesD.text}>
        Österreichisches Recht, Gerichtsstand Wien.
      </Text>
    </>
  );

  const medicalDisclaimer = (
    <>
      <Text style={stylesD.heading}>Medizinischer Haftungsausschluss</Text>
      <Text style={stylesD.text}>
        Diese Plattform richtet sich ausschließlich an approbierte medizinische Fachkräfte und Studierende der Medizin. Die bereitgestellten Inhalte dienen der Prüfungsvorbereitung und Fortbildung.
      </Text>

      <Text style={stylesD.heading}>Keine medizinische Beratung</Text>
      <Text style={stylesD.text}>
        Die Inhalte dieser Plattform stellen keine medizinische, rechtliche oder sonstige professionelle Beratung dar. Sie ersetzen nicht die persönliche Beratung, Untersuchung oder Behandlung durch qualifizierte medizinische Fachkräfte.
      </Text>

      <Text style={stylesD.heading}>Verwendung der Inhalte</Text>
      <Text style={stylesD.text}>
        • Die Materialien sind für Lehr- und Lernzwecke bestimmt{'\n'}
        • Keine Anwendung am Patienten ohne zusätzliche Verifikation{'\n'}
        • Klinische Entscheidungen bedürfen immer professioneller Bewertung{'\n'}
        • Bei Unsicherheiten konsultieren Sie erfahrene Kollegen oder Fachliteratur
      </Text>

      <Text style={stylesD.heading}>Zielgruppe</Text>
      <Text style={stylesD.text}>
        Diese Plattform ist ausschließlich für:{'\n'}
        • Approbierte Ärzte und Zahnärzte{'\n'}
        • Studierende der Human- und Zahnmedizin{'\n'}
        • Andere medizinische Fachkräfte mit entsprechender Ausbildung
      </Text>

      <Text style={stylesD.heading}>Haftungsausschluss</Text>
      <Text style={stylesD.text}>
        KP Med GmbH übernimmt keine Haftung für Schäden, die durch die Verwendung der bereitgestellten Informationen entstehen. Die Nutzung erfolgt auf eigene Verantwortung.
      </Text>

      <Text style={stylesD.heading}>Aktualität der Inhalte</Text>
      <Text style={stylesD.text}>
        Medizinische Erkenntnisse entwickeln sich ständig weiter. Trotz sorgfältiger Erstellung können die Inhalte nicht immer dem neuesten Stand entsprechen. Prüfen Sie wichtige Informationen stets anhand aktueller Fachliteratur.
      </Text>
    </>
  );

  return (
    <SafeAreaView style={stylesD.container}>
      <LinearGradient colors={gradient} style={styles.gradientBackground} />

      <View style={stylesD.header}>
        <TouchableOpacity onPress={() => router.back()} style={stylesD.backBtn}>
          <ChevronLeft size={24} color={colors.primary} />
          <Text style={stylesD.backTxt}>Zurück</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={stylesD.content} showsVerticalScrollIndicator={false}>
        <Text style={stylesD.pageTitle}>Datenschutz & AGB</Text>
        <Text style={stylesD.subtitle}>
          Lesen Sie unsere Datenschutzerklärung und Allgemeine Geschäftsbedingungen.
        </Text>

        <Card style={stylesD.card}>
          <TouchableOpacity
            style={stylesD.headerSection}
            onPress={() => toggle('privacy')}
            activeOpacity={0.7}
          >
            <View style={[stylesD.iconWrap, { backgroundColor: '#22C55E20' }]}>
              <Shield size={20} color="#22C55E" />
            </View>
            <Text style={stylesD.sectionTitle}>Datenschutzerklärung</Text>
            <ChevronDown
              size={20}
              color={colors.textSecondary}
              style={expanded['privacy'] ? stylesD.chevronOpen : stylesD.chevron}
            />
          </TouchableOpacity>
          {expanded['privacy'] && (
            <View style={stylesD.sectionContent}>{datenschutz}</View>
          )}
        </Card>

        <Card style={stylesD.card}>
          <TouchableOpacity
            style={stylesD.headerSection}
            onPress={() => toggle('terms')}
            activeOpacity={0.7}
          >
            <View style={[stylesD.iconWrap, { backgroundColor: '#E2827F20' }]}>
              <FileText size={20} color="#E2827F" />
            </View>
            <Text style={stylesD.sectionTitle}>Allgemeine Geschäftsbedingungen</Text>
            <ChevronDown
              size={20}
              color={colors.textSecondary}
              style={expanded['terms'] ? stylesD.chevronOpen : stylesD.chevron}
            />
          </TouchableOpacity>
          {expanded['terms'] && (
            <View style={stylesD.sectionContent}>{agb}</View>
          )}
        </Card>

        <Card style={stylesD.card}>
          <TouchableOpacity
            style={stylesD.headerSection}
            onPress={() => toggle('medical')}
            activeOpacity={0.7}
          >
            <View style={[stylesD.iconWrap, { backgroundColor: '#EF444420' }]}>
              <AlertTriangle size={20} color="#EF4444" />
            </View>
            <Text style={stylesD.sectionTitle}>Medizinischer Haftungsausschluss</Text>
            <ChevronDown
              size={20}
              color={colors.textSecondary}
              style={expanded['medical'] ? stylesD.chevronOpen : stylesD.chevron}
            />
          </TouchableOpacity>
          {expanded['medical'] && (
            <View style={stylesD.sectionContent}>{medicalDisclaimer}</View>
          )}
        </Card>
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
});
