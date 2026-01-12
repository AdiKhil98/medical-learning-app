import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

interface Beispiel {
  situation: string;
  formulierung: string;
  erklaerung: string;
}

interface Fehler {
  fehler: string;
  korrektur: string;
}

interface TopicContent {
  einleitung?: string;
  inhalt?: string;
  beispiele?: Beispiel[];
  textbausteine?: string[];
  tipps?: string[];
  haeufige_fehler?: Fehler[];
  merke?: string;
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
  Grundlagen: ['#6366f1', '#4f46e5'],
  Briefabschnitte: ['#ec4899', '#db2777'],
  Formulierungshilfen: ['#f59e0b', '#d97706'],
  Musterarztbriefe: ['#10b981', '#059669'],
};

export default function ArztbriefDetail() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTopic = useCallback(async () => {
    if (!slug) return;

    try {
      const { data, error } = await supabase.from('fsp_arztbrief').select('*').eq('slug', slug).single();

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
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
            <Text style={styles.sectionText}>{content.einleitung}</Text>
          </View>
        )}

        {/* Inhalt */}
        {content.inhalt && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={22} color="#8b5cf6" />
              <Text style={styles.sectionTitle}>Inhalt</Text>
            </View>
            <Text style={styles.sectionText}>{content.inhalt}</Text>
          </View>
        )}

        {/* Beispiele */}
        {content.beispiele && content.beispiele.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="code-working" size={22} color="#10b981" />
              <Text style={styles.sectionTitle}>Beispiele</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{content.beispiele.length}</Text>
              </View>
            </View>

            {content.beispiele.map((beispiel, index) => (
              <View key={index} style={styles.beispielCard}>
                <View style={styles.beispielHeader}>
                  <View style={[styles.beispielNumber, { backgroundColor: colors[0] }]}>
                    <Text style={styles.beispielNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.beispielSituation}>{beispiel.situation}</Text>
                </View>
                <View style={styles.formulierungBox}>
                  <Text style={styles.formulierungLabel}>Formulierung:</Text>
                  <Text style={styles.formulierungText}>„{beispiel.formulierung}"</Text>
                </View>
                <View style={styles.erklaerungBox}>
                  <Ionicons name="bulb-outline" size={16} color="#64748b" />
                  <Text style={styles.erklaerungText}>{beispiel.erklaerung}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Textbausteine */}
        {content.textbausteine && content.textbausteine.length > 0 && (
          <View style={styles.textbausteineSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="copy" size={22} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Textbausteine</Text>
            </View>
            {content.textbausteine.map((baustein, index) => (
              <View key={index} style={styles.textbausteinItem}>
                <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
                <Text style={styles.textbausteinText}>{baustein}</Text>
              </View>
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
            {content.haeufige_fehler.map((item, index) => (
              <View key={index} style={styles.fehlerItem}>
                <View style={styles.fehlerRow}>
                  <Ionicons name="close-circle" size={18} color="#ef4444" />
                  <Text style={styles.fehlerText}>{item.fehler}</Text>
                </View>
                <View style={styles.korrekturRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text style={styles.korrekturText}>{item.korrektur}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* MERKE */}
        {content.merke && (
          <View style={styles.merkeBox}>
            <View style={styles.merkeHeader}>
              <View style={styles.merkeIconContainer}>
                <Ionicons name="bookmark" size={18} color="#6366f1" />
              </View>
              <Text style={styles.merkeLabel}>MERKE</Text>
            </View>
            <Text style={styles.merkeText}>{content.merke}</Text>
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
  sectionText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  beispielCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  beispielHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  beispielNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  beispielNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  beispielSituation: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 20,
  },
  formulierungBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  formulierungLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  formulierungText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  erklaerungBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  erklaerungText: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  textbausteineSection: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  textbausteinItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 4,
  },
  textbausteinText: {
    flex: 1,
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
    marginLeft: 8,
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
    marginBottom: 14,
  },
  fehlerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  fehlerText: {
    flex: 1,
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
    marginLeft: 8,
  },
  korrekturRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 26,
  },
  korrekturText: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
    marginLeft: 8,
  },
  merkeBox: {
    backgroundColor: '#e0e7ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  merkeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  merkeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#c7d2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  merkeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3730a3',
    letterSpacing: 0.5,
  },
  merkeText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#3730a3',
    fontWeight: '500',
  },
});
