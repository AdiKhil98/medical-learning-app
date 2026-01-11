import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

interface Phrase {
  deutsch: string;
  kontext: string;
  varianten?: string[];
}

interface DialogLine {
  rolle: string;
  text: string;
}

interface TopicContent {
  einleitung?: string;
  phrasen?: Phrase[];
  tipps?: string[];
  haeufige_fehler?: string[];
  beispieldialog?: {
    titel?: string;
    dialog?: DialogLine[];
  };
}

interface Topic {
  id: string;
  slug: string;
  title_de: string;
  gruppe: string;
  sort_order: number;
  content: TopicContent;
}

const gruppeColors: { [key: string]: [string, string] } = {
  Gesprächsführung: ['#6366f1', '#4f46e5'],
  'Aktuelle Anamnese': ['#ef4444', '#dc2626'],
  Eigenanamnese: ['#f59e0b', '#d97706'],
  'Familien- & Sozialanamnese': ['#10b981', '#059669'],
  Systemanamnese: ['#8b5cf6', '#7c3aed'],
  'Reaktionen auf Patientenaussagen': ['#ec4899', '#db2777'],
  Abschluss: ['#14b8a6', '#0d9488'],
};

export default function AnamneseDetail() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPhrases, setExpandedPhrases] = useState<Set<number>>(new Set());

  const fetchTopic = useCallback(async () => {
    if (!slug) return;

    try {
      const { data, error } = await supabase.from('fsp_anamnese').select('*').eq('slug', slug).single();

      if (error) throw error;

      // Parse content if it's a JSON string
      if (data && typeof data.content === 'string') {
        try {
          data.content = JSON.parse(data.content);
        } catch (parseError) {
          console.error('Error parsing content JSON:', parseError);
          data.content = {};
        }
      }

      setTopic(data);
    } catch (error) {
      console.error('Error fetching topic:', error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchTopic();
  }, [fetchTopic]);

  const togglePhrase = (index: number) => {
    setExpandedPhrases((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Lade...</Text>
      </View>
    );
  }

  if (!topic) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Thema nicht gefunden</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Zurück</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const colors = gruppeColors[topic.gruppe] || ['#6366f1', '#4f46e5'];
  const content = topic.content || {};

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.breadcrumb}>{topic.gruppe}</Text>
          <Text style={styles.headerTitle}>{topic.title_de}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Einleitung */}
        {content.einleitung && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={22} color="#6366f1" />
              <Text style={styles.sectionTitle}>Einleitung</Text>
            </View>
            <Text style={styles.einleitungText}>{content.einleitung}</Text>
          </View>
        )}

        {/* Phrasen */}
        {content.phrasen && content.phrasen.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble-ellipses" size={22} color="#10b981" />
              <Text style={styles.sectionTitle}>Phrasen</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{content.phrasen.length}</Text>
              </View>
            </View>

            {content.phrasen.map((phrase, index) => (
              <TouchableOpacity
                key={index}
                style={styles.phraseCard}
                onPress={() => togglePhrase(index)}
                activeOpacity={0.8}
              >
                <View style={styles.phraseHeader}>
                  <View style={[styles.phraseNumber, { backgroundColor: colors[0] }]}>
                    <Text style={styles.phraseNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.phraseText}>{phrase.deutsch}</Text>
                  <Ionicons
                    name={expandedPhrases.has(index) ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#94a3b8"
                  />
                </View>

                {expandedPhrases.has(index) && (
                  <View style={styles.phraseDetails}>
                    <View style={styles.kontextBox}>
                      <Text style={styles.kontextLabel}>Kontext:</Text>
                      <Text style={styles.kontextText}>{phrase.kontext}</Text>
                    </View>

                    {phrase.varianten && phrase.varianten.length > 0 && (
                      <View style={styles.variantenBox}>
                        <Text style={styles.variantenLabel}>Varianten:</Text>
                        {phrase.varianten.map((v, vIndex) => (
                          <View key={vIndex} style={styles.variantItem}>
                            <Text style={styles.variantBullet}>•</Text>
                            <Text style={styles.variantText}>{v}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tipps */}
        {content.tipps && content.tipps.length > 0 && (
          <View style={styles.tippSection}>
            <View style={styles.tippHeader}>
              <Ionicons name="bulb" size={20} color="#f59e0b" />
              <Text style={styles.tippTitle}>Tipps für die FSP</Text>
            </View>
            {content.tipps.map((tipp, index) => (
              <View key={index} style={styles.tippItem}>
                <Text style={styles.tippBullet}>💡</Text>
                <Text style={styles.tippText}>{tipp}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Häufige Fehler */}
        {content.haeufige_fehler && content.haeufige_fehler.length > 0 && (
          <View style={styles.fehlerSection}>
            <View style={styles.fehlerHeader}>
              <Ionicons name="warning" size={20} color="#ef4444" />
              <Text style={styles.fehlerTitle}>Häufige Fehler</Text>
            </View>
            {content.haeufige_fehler.map((fehler, index) => (
              <View key={index} style={styles.fehlerItem}>
                <Text style={styles.fehlerBullet}>⚠️</Text>
                <Text style={styles.fehlerText}>{fehler}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Beispieldialog */}
        {content.beispieldialog?.dialog && content.beispieldialog.dialog.length > 0 && (
          <View style={styles.dialogSection}>
            <View style={styles.dialogHeader}>
              <Ionicons name="people" size={22} color="#8b5cf6" />
              <Text style={styles.dialogTitle}>{content.beispieldialog.titel || 'Beispieldialog'}</Text>
            </View>

            {content.beispieldialog.dialog.map((line, index) => (
              <View
                key={index}
                style={[styles.dialogLine, line.rolle === 'Arzt' ? styles.dialogLineArzt : styles.dialogLinePatient]}
              >
                <View
                  style={[styles.dialogRolleBadge, { backgroundColor: line.rolle === 'Arzt' ? '#6366f1' : '#10b981' }]}
                >
                  <Ionicons name={line.rolle === 'Arzt' ? 'medkit' : 'person'} size={14} color="#fff" />
                  <Text style={styles.dialogRolleText}>{line.rolle}</Text>
                </View>
                <Text style={styles.dialogText}>{line.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 18,
    color: '#ef4444',
    fontWeight: '600',
  },
  errorButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6366f1',
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    marginTop: 16,
  },
  breadcrumb: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 10,
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  einleitungText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  phraseCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  phraseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  phraseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  phraseNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  phraseText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    lineHeight: 22,
  },
  phraseDetails: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  kontextBox: {
    marginBottom: 12,
  },
  kontextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  kontextText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  variantenBox: {},
  variantenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  variantItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  variantBullet: {
    color: '#94a3b8',
    marginRight: 8,
  },
  variantText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
  },
  tippSection: {
    backgroundColor: '#fef9c3',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  tippHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tippTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
    marginLeft: 8,
  },
  tippItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tippBullet: {
    marginRight: 8,
  },
  tippText: {
    flex: 1,
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  fehlerSection: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  fehlerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fehlerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#991b1b',
    marginLeft: 8,
  },
  fehlerItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  fehlerBullet: {
    marginRight: 8,
  },
  fehlerText: {
    flex: 1,
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
  },
  dialogSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 10,
  },
  dialogLine: {
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 3,
  },
  dialogLineArzt: {
    borderLeftColor: '#6366f1',
  },
  dialogLinePatient: {
    borderLeftColor: '#10b981',
  },
  dialogRolleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
    gap: 4,
  },
  dialogRolleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  dialogText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
});
