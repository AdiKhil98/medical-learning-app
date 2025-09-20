import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Card from '@/components/ui/Card';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const sections = [
  {
    id: 'overview',
    title: '🫀 Übersicht',
    content: 'Das Herz ist ein faustgroßes, muskuläres Hohlorgan, das im Mediastinum zwischen den beiden Lungenflügeln liegt. Es wiegt beim Erwachsenen etwa 300 g und hat ungefähr die Größe der geballten Faust des Individuums. Seine primäre Funktion ist es, Blut durch das Gefäßsystem zu pumpen und damit die Gewebe mit Sauerstoff und Nährstoffen zu versorgen.',
  },
  {
    id: 'anatomy',
    title: '📏 Anatomie',
    content: 'Das Herz besteht aus vier Kammern: rechter und linker Vorhof (Atrium) sowie rechter und linker Hauptkammer (Ventrikel). Die rechte Herzseite pumpt sauerstoffarmes Blut in den Lungenkreislauf, während die linke Herzseite sauerstoffreiches Blut in den Körperkreislauf pumpt. Das Herz wird vom Perikard (Herzbeutel) umgeben und besteht aus drei Schichten: Epikard (äußere Schicht), Myokard (Muskelschicht) und Endokard (innere Schicht).',
  },
  {
    id: 'chambers',
    title: '🔄 Herzkammern',
    content: 'Die vier Herzkammern haben unterschiedliche Funktionen und Eigenschaften:\n\n• Rechter Vorhof: Empfängt sauerstoffarmes Blut aus dem Körper über die Vena cava superior und inferior.\n\n• Rechter Ventrikel: Pumpt sauerstoffarmes Blut in die Lungenarterien.\n\n• Linker Vorhof: Empfängt sauerstoffreiches Blut aus der Lunge über die Pulmonalvenen.\n\n• Linker Ventrikel: Pumpt sauerstoffreiches Blut in die Aorta und den Körperkreislauf. Hat die dickste Muskelwand, da er gegen den hohen systemischen Widerstand arbeiten muss.',
  },
  {
    id: 'valves',
    title: '🚪 Herzklappen',
    content: 'Die vier Herzklappen sorgen für einen gerichteten Blutfluss innerhalb des Herzens:\n\n• Trikuspidalklappe: Zwischen rechtem Vorhof und rechter Kammer.\n\n• Pulmonalklappe: Zwischen rechter Kammer und Lungenarterie.\n\n• Mitralklappe: Zwischen linkem Vorhof und linker Kammer.\n\n• Aortenklappe: Zwischen linker Kammer und Aorta.\n\nDie Segelklappen (Trikuspidal- und Mitralklappe) werden durch Sehnenfäden (Chordae tendineae) und Papillarmuskeln gesichert, um ein Zurückschlagen in die Vorhöfe zu verhindern.',
  },
  {
    id: 'blood-supply',
    title: '🩸 Blutversorgung',
    content: 'Die Koronararterien (Herzkranzgefäße) versorgen das Herzmuskelgewebe mit Sauerstoff und Nährstoffen:\n\n• Linke Koronararterie (LCA): Teilt sich in den Ramus interventricularis anterior (RIVA/LAD) und den Ramus circumflexus (RCX/LCX).\n   - RIVA versorgt die Vorderwand des linken Ventrikels und Teile des Septums.\n   - RCX versorgt die Seitenwand des linken Ventrikels.\n\n• Rechte Koronararterie (RCA): Versorgt den rechten Ventrikel, den Sinusknoten (in 60% der Fälle) und den AV-Knoten (in 90% der Fälle).\n\nDer venöse Abfluss erfolgt hauptsächlich über den Sinus coronarius in den rechten Vorhof.',
  },
  {
    id: 'conduction',
    title: '⚡ Reizleitungssystem',
    content: 'Das Erregungsleitungssystem des Herzens steuert die koordinierte Kontraktion der Herzkammern:\n\n• Sinusknoten: Primärer Schrittmacher im rechten Vorhof, generiert ca. 60-80 Impulse pro Minute.\n\n• Atrioventrikularknoten (AV-Knoten): Leitet die Erregung vom Vorhof auf die Kammern weiter, verzögert die Weiterleitung um ca. 0,1 Sekunden.\n\n• His-Bündel: Leitet die Erregung durch das Septum.\n\n• Tawara-Schenkel: Rechter und linker Schenkel leiten die Erregung in die entsprechenden Ventrikel.\n\n• Purkinje-Fasern: Feinste Verzweigungen, die die Erregung auf das Arbeitsmyokard übertragen.',
  },
  {
    id: 'clinical-relevance',
    title: '🏥 Klinische Relevanz',
    content: 'Das Verständnis der Herzanatomie ist für viele klinische Szenarien relevant:\n\n• Interpretation von EKG-Veränderungen bei Myokardischämie oder -infarkt basierend auf der Lokalisation.\n\n• Beurteilung von Klappenfehlern in der Echokardiographie.\n\n• Planung und Durchführung kardiochirurgischer Eingriffe.\n\n• Verstehen der Pathophysiologie von Herzinsuffizienz und Arrhythmien.\n\n• Diagnostik von angeborenen Herzfehlern.',
  },
];

export default function AnatomieHerzScreen() {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<string | null>(sections[0].id);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#F8F3E8', '#FBEEEC', '#FFFFFF']} // White Linen to light coral to white
        style={styles.gradientBackground}
      />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#E2827F" />
          <Text style={styles.backText}>Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Anatomie des Herzens</Text>
        <Text style={styles.subtitle}>
          Grundlegende Strukturen und Funktionen des menschlichen Herzens
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Image 
          source={{ uri: 'https://images.pexels.com/photos/3970330/pexels-photo-3970330.jpeg' }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        
        {sections.map((section) => (
          <Card key={section.id} style={styles.sectionCard}>
            <TouchableOpacity
              onPress={() => toggleSection(section.id)}
              style={styles.sectionHeader}
            >
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </TouchableOpacity>

            {expandedSection === section.id && (
              <View style={styles.sectionContent}>
                <Text style={styles.contentText}>{section.content}</Text>
              </View>
            )}
          </Card>
        ))}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F3E8', // White Linen background
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  header: {
    padding: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#E2827F',
    marginLeft: 4,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  content: {
    paddingHorizontal: 16,
  },
  heroImage: {
    width: width - 32,
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    padding: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1F2937',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
    paddingTop: 12,
  },
  contentText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  bottomPadding: {
    height: 60,
  }
});