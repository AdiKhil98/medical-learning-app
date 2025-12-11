import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import { colors } from '@/constants/colors';

export default function HaftungScreen() {
  const router = useRouter();
  
  const dynamicStyles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: colors.background 
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: 'rgba(255,255,255,0.9)',
    },
    backBtn: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginRight: 16 
    },
    backTxt: {
      marginLeft: 4,
      fontSize: 16,
      color: colors.primary,
      fontFamily: 'Inter-Medium',
    },
    title: {
      flex: 1,
      fontFamily: 'Inter-Bold',
      fontSize: 20,
      color: colors.text,
    },
    content: { 
      flex: 1, 
      padding: 24 
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
      marginBottom: 16,
    },
    warningBox: {
      backgroundColor: `${MEDICAL_COLORS.warning}20`,
      borderLeftWidth: 4,
      borderLeftColor: MEDICAL_COLORS.warning,
      padding: 16,
      marginBottom: 24,
      borderRadius: 8,
    },
    warningText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: MEDICAL_COLORS.textPrimary,
      lineHeight: 20,
    },
  });

  const gradient = ['#f8faff', '#e3f2fd', '#ffffff'];

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient colors={gradient} style={styles.gradientBackground} />

      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backBtn}>
          <ChevronLeft size={24} color={colors.primary} />
          <Text style={dynamicStyles.backTxt}>Zurück</Text>
        </TouchableOpacity>
        <Text style={dynamicStyles.title}>Haftung</Text>
      </View>

      <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Shield size={32} color={MEDICAL_COLORS.warning} />
          <Text style={dynamicStyles.pageTitle}>Haftungsausschluss</Text>
        </View>
        
        <Text style={dynamicStyles.subtitle}>
          Wichtige Informationen zur Haftung und zu den rechtlichen Bestimmungen der KP Med Plattform.
        </Text>

        <View style={dynamicStyles.warningBox}>
          <Text style={dynamicStyles.warningText}>
            ⚠️ Diese Plattform dient ausschließlich Bildungszwecken und stellt keine medizinische Beratung dar.
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>1. Medizinische Inhalte</Text>
          <Text style={dynamicStyles.sectionText}>
            Die auf dieser Plattform bereitgestellten medizinischen Inhalte dienen ausschließlich der Bildung und Prüfungsvorbereitung. Sie stellen keine medizinische, diagnostische oder therapeutische Beratung dar und ersetzen nicht die professionelle medizinische Beurteilung durch qualifizierte Ärzte.
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>2. Keine Behandlungsempfehlungen</Text>
          <Text style={dynamicStyles.sectionText}>
            Die Informationen auf dieser Plattform sollen nicht zur Diagnose oder Behandlung von Krankheiten verwendet werden. Bei gesundheitlichen Problemen wenden Sie sich immer an einen qualifizierten Arzt oder andere medizinische Fachkraft.
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>3. Haftungsausschluss</Text>
          <Text style={dynamicStyles.sectionText}>
            KP Med GmbH übernimmt keine Haftung für:
          </Text>
          <Text style={dynamicStyles.sectionText}>
            • Schäden, die durch die Nutzung der bereitgestellten Informationen entstehen{'\n'}
            • Die Richtigkeit, Vollständigkeit oder Aktualität der Inhalte{'\n'}
            • Entscheidungen, die auf Basis der Plattforminhalte getroffen werden{'\n'}
            • Technische Störungen oder Ausfälle der Plattform
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>4. Eigenverantwortung</Text>
          <Text style={dynamicStyles.sectionText}>
            Die Nutzung dieser Plattform erfolgt auf eigene Verantwortung. Nutzer sind dafür verantwortlich, die Angemessenheit der Inhalte für ihre spezifischen Lernziele zu bewerten.
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>5. Fachliche Qualifikation</Text>
          <Text style={dynamicStyles.sectionText}>
            Diese Plattform richtet sich ausschließlich an:
          </Text>
          <Text style={dynamicStyles.sectionText}>
            • Approbierte Ärzte und Zahnärzte{'\n'}
            • Studierende der Human- und Zahnmedizin{'\n'}
            • Andere medizinische Fachkräfte mit entsprechender Ausbildung
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>6. Aktualität der Informationen</Text>
          <Text style={dynamicStyles.sectionText}>
            Medizinische Erkenntnisse entwickeln sich ständig weiter. Trotz sorgfältiger Erstellung können die Inhalte nicht immer dem neuesten Stand entsprechen. Prüfen Sie wichtige Informationen stets anhand aktueller medizinischer Fachliteratur.
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>7. Rechtliche Hinweise</Text>
          <Text style={dynamicStyles.sectionText}>
            Sollten einzelne Bestimmungen dieses Haftungsausschlusses unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Es gilt österreichisches Recht.
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