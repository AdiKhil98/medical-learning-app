import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface FSPSection {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  gradient: [string, string];
  available: boolean;
  count?: string;
}

const fspSections: FSPSection[] = [
  {
    id: 'bibliothek',
    title: 'FSP Bibliothek',
    description: 'Medizinische Themen für das Prüfergespräch',
    icon: 'book',
    route: '/bibliothek/fsp/bibliothek',
    gradient: ['#6366f1', '#4f46e5'],
    available: true,
    count: '57 Themen',
  },
  {
    id: 'anamnese',
    title: 'Anamnese',
    description: 'Gesprächsführung und Phrasen für die Patientenanamnese',
    icon: 'chatbubbles',
    route: '/bibliothek/fsp/anamnese',
    gradient: ['#f59e0b', '#d97706'],
    available: true,
    count: '29 Themen',
  },
  {
    id: 'arztbrief',
    title: 'Arztbrief',
    description: 'Struktur, Formulierungen und Beispiele',
    icon: 'document-text',
    route: '/bibliothek/fsp/arztbrief',
    gradient: ['#ec4899', '#db2777'],
    available: true,
    count: '24 Themen',
  },
  {
    id: 'fachbegriffe',
    title: 'Fachbegriffe',
    description: 'Medizinische Terminologie: Fachsprache ↔ Laiensprache',
    icon: 'text',
    route: '/bibliothek/fsp/fachbegriffe',
    gradient: ['#14b8a6', '#0d9488'],
    available: false,
    count: 'Demnächst',
  },
];

export default function FSPIndex() {
  const router = useRouter();

  const handleSectionPress = (section: FSPSection) => {
    if (section.available) {
      router.push(section.route as Href);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>FSP Bereich</Text>
          <Text style={styles.headerSubtitle}>Vorbereitung auf die Fachsprachprüfung</Text>
        </View>
      </View>

      {/* Section Cards */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {fspSections.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={[styles.card, !section.available && styles.cardDisabled]}
              onPress={() => handleSectionPress(section)}
              activeOpacity={section.available ? 0.8 : 1}
            >
              <LinearGradient
                colors={section.available ? section.gradient : ['#94a3b8', '#64748b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name={section.icon} size={32} color="#fff" />
                </View>
                <Text style={styles.cardTitle}>{section.title}</Text>
                <Text style={styles.cardDescription}>{section.description}</Text>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>{section.count}</Text>
                </View>
                {!section.available && (
                  <View style={styles.comingSoonOverlay}>
                    <Ionicons name="lock-closed" size={20} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  cardDisabled: {
    opacity: 0.7,
  },
  cardGradient: {
    padding: 16,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 16,
    marginBottom: 12,
  },
  cardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  comingSoonOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
});
