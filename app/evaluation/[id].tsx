import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import EvaluationDetailScreen from '@/components/evaluation/EvaluationDetailScreen';
import { parseEvaluation } from '@/utils/parseEvaluation';
import { supabase } from '@/lib/supabase';
import { Evaluation } from '@/types/evaluation';

export default function EvaluationPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchEvaluation();
    }
  }, [id]);

  const fetchEvaluation = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching evaluation with ID:', id);

      // Fetch from Supabase evaluations table
      const { data, error: fetchError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Supabase fetch error:', fetchError);
        throw new Error(fetchError.message);
      }

      if (!data) {
        throw new Error('Evaluation not found');
      }

      console.log('Raw evaluation data from Supabase:', data);

      // Parse the evaluation_text field
      const parsedEvaluation = parseEvaluation(
        data.evaluation_text || data.raw_text || '',
        data.id,
        data.created_at
      );

      // Override with database values if available
      if (data.score !== null) {
        parsedEvaluation.score.total = data.score;
      }

      if (data.passed !== null) {
        parsedEvaluation.score.statusText = data.passed ? 'Bestanden' : 'Nicht bestanden';
        parsedEvaluation.score.status = data.passed ? 'good' : 'critical';
      }

      if (data.phase) {
        parsedEvaluation.evaluationType = data.phase;
      }

      console.log('Parsed evaluation:', parsedEvaluation);

      setEvaluation(parsedEvaluation);
    } catch (err: any) {
      console.error('Error fetching evaluation:', err);
      setError(err.message || 'Failed to load evaluation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  // Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F8FAFC', '#FFFFFF', '#EFF6FF']}
          style={styles.gradient}
        >
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Evaluation wird geladen...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Error State
  if (error || !evaluation) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#FEF2F2', '#FFFFFF', '#FEE2E2']}
          style={styles.gradient}
        >
          <View style={styles.centerContainer}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Fehler beim Laden</Text>
            <Text style={styles.errorMessage}>
              {error || 'Evaluation konnte nicht gefunden werden'}
            </Text>
            <View style={styles.errorDetails}>
              <Ionicons name="information-circle" size={20} color="#64748B" />
              <Text style={styles.errorDetailsText}>
                Evaluation ID: {id}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Success - Show Evaluation
  return <EvaluationDetailScreen evaluation={evaluation} onClose={handleClose} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  errorIcon: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorDetailsText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
});
