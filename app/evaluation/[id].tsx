import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import EvaluationDetailScreen from '@/components/evaluation/EvaluationDetailScreen';
import ExaminerEvaluationScreen from '@/components/examiner-evaluation/ExaminerEvaluationScreen';
import { parseEvaluation } from '@/utils/parseEvaluation';
import { supabase } from '@/lib/supabase';
import { Evaluation } from '@/types/evaluation';

export default function EvaluationPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [conversationType, setConversationType] = useState<string>('patient');
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

      // Fetch from Supabase evaluation_scores table (existing webhook system)
      const { data, error: fetchError } = await supabase
        .from('evaluation_scores')
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

      // Parse the evaluation field (contains AI-generated evaluation text)
      const parsedEvaluation = parseEvaluation(
        data.evaluation || '',
        data.id,
        data.evaluation_timestamp || data.created_at
      );

      // Override with database values if available
      if (data.score !== null && data.score !== undefined) {
        parsedEvaluation.score.total = data.score;
        parsedEvaluation.score.percentage = Math.round(data.score);
      }

      // Set exam type from database
      if (data.exam_type) {
        parsedEvaluation.type = data.exam_type;
        parsedEvaluation.evaluationType = `${data.exam_type} ${data.conversation_type === 'patient' ? 'PATIENTENGESPRÄCH' : 'PRÜFERGESPRÄCH'}`;
      }

      // Store conversation type to determine which screen to show
      setConversationType(data.conversation_type || 'patient');

      console.log('Parsed evaluation:', parsedEvaluation);
      console.log('Conversation type:', data.conversation_type);

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

  // Success - Show Evaluation (use ExaminerEvaluationScreen for examiner, EvaluationDetailScreen for patient)
  if (conversationType === 'examiner') {
    return <ExaminerEvaluationScreen evaluation={evaluation} onClose={handleClose} />;
  }

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
