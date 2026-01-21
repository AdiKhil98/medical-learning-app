import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioSubscription } from '@/hooks/useAudioSubscription';
import { AudioPlayer } from '@/components/audio/AudioPlayer';
import { AudioPaywallModal } from '@/components/audio/AudioPaywallModal';
import type { AudioTopic } from '@/types/audio';

export default function FSPAudioPlayerScreen() {
  const { slug, source } = useLocalSearchParams<{ slug: string; source?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { hasAccess, loading: subscriptionLoading } = useAudioSubscription(session?.user?.id, 'fsp_audio');

  const [topic, setTopic] = useState<AudioTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    const fetchTopic = async () => {
      if (!slug) {
        setError('Kein Thema angegeben');
        setLoading(false);
        return;
      }

      try {
        // Determine which table to query
        const sourceTable = source || 'fsp_bibliothek';

        const { data, error: fetchError } = await supabase
          .from(sourceTable)
          .select('id, slug, title_de, fachgebiet, bereich, priority, audio_url')
          .eq('slug', slug)
          .single();

        if (fetchError) {
          // Try other tables if source wasn't specified
          if (!source) {
            const tables = ['fsp_anamnese', 'fsp_fachbegriffe'];
            for (const table of tables) {
              const { data: altData, error: altError } = await supabase
                .from(table)
                .select('id, slug, title_de, fachgebiet, bereich, priority, audio_url')
                .eq('slug', slug)
                .single();

              if (!altError && altData) {
                setTopic({ ...altData, source_table: table as any });
                setLoading(false);
                return;
              }
            }
          }

          setError('Thema nicht gefunden');
          setLoading(false);
          return;
        }

        setTopic({ ...data, source_table: sourceTable as any });
      } catch (err) {
        console.error('Error fetching topic:', err);
        setError('Fehler beim Laden des Themas');
      } finally {
        setLoading(false);
      }
    };

    fetchTopic();
  }, [slug, source]);

  useEffect(() => {
    // Show paywall if user doesn't have access
    if (!subscriptionLoading && !hasAccess && topic) {
      setPaywallOpen(true);
    }
  }, [subscriptionLoading, hasAccess, topic]);

  const goBack = () => {
    router.back();
  };

  if (loading || subscriptionLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Lade Audio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !topic) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Fehler</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{error || 'Thema nicht gefunden'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={goBack}>
            <Text style={styles.retryButtonText}>Zurück</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {topic.title_de}
            </Text>
          </View>
        </View>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={64} color="#94a3b8" />
          <Text style={styles.lockedTitle}>Audio gesperrt</Text>
          <Text style={styles.lockedText}>Abonnieren Sie FSP Audio, um diesen Inhalt anzuhören.</Text>
        </View>
        <AudioPaywallModal
          isOpen={paywallOpen}
          onClose={() => {
            setPaywallOpen(false);
            goBack();
          }}
          libraryType="fsp_audio"
          topicTitle={topic.title_de}
        />
      </SafeAreaView>
    );
  }

  if (!topic.audio_url) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {topic.title_de}
            </Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="musical-notes-outline" size={64} color="#94a3b8" />
          <Text style={styles.errorText}>Audio nicht verfügbar</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            FSP Audio
          </Text>
        </View>
      </View>

      {/* Audio Player */}
      <AudioPlayer audioUrl={topic.audio_url} title={topic.title_de} subtitle={topic.fachgebiet} />
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
  },
  lockedText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 280,
  },
});
