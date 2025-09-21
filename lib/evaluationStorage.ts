import { supabase } from './supabase';
  import { SecureLogger } from './security';

  // Evaluation data interface
  export interface EvaluationData {
    user_id: string;
    session_id: string;
    exam_type: 'KP' | 'FSP';
    conversation_type: 'patient' | 'examiner';
    score: number;
    evaluation: string;
    evaluation_timestamp: string; // Changed from timestamp to match DB schema
    id?: string; // UUID from Supabase
    created_at?: string;
    updated_at?: string;
    webhook_source?: string;
    raw_data?: any;
  }

  // Session summary interface
  export interface SessionSummary {
    id?: string;
    session_id: string;
    user_id: string;
    exam_type: 'KP' | 'FSP';
    patient_score?: number;
    examiner_score?: number;
    average_score?: number;
    patient_evaluation?: string;
    examiner_evaluation?: string;
    is_complete?: boolean;
    total_evaluations: number;
    first_evaluation_at?: string;
    last_evaluation_at?: string;
    created_at: string;
    updated_at: string;
  }

  class EvaluationStorageService {

    /**
     * Store evaluation data
     */
    async storeEvaluation(evaluation: EvaluationData): Promise<string> {
      try {
        const { data, error } = await supabase
          .from('evaluation_scores')
          .insert({
            user_id: evaluation.user_id,
            session_id: evaluation.session_id,
            exam_type: evaluation.exam_type,
            conversation_type: evaluation.conversation_type,
            score: evaluation.score,
            evaluation: evaluation.evaluation,
            evaluation_timestamp: evaluation.evaluation_timestamp,
            webhook_source: evaluation.webhook_source || 'app',
            raw_data: evaluation.raw_data
          })
          .select()
          .single();

        if (error) {
          SecureLogger.log('Supabase error storing evaluation:', error);
          throw error;
        }

        SecureLogger.log(`Stored evaluation ${data.id} for session ${evaluation.session_id}`);
        return data.id;

      } catch (error) {
        SecureLogger.log('Error storing evaluation:', error);
        throw error;
      }
    }

    /**
     * Get all evaluations
     */
    async getAllEvaluations(): Promise<EvaluationData[]> {
      try {
        const { data, error } = await supabase
          .from('evaluation_scores')
          .select('*')
          .order('evaluation_timestamp', { ascending: false });

        if (error) {
          SecureLogger.log('Supabase error getting evaluations:', error);
          throw error;
        }

        return data || [];
      } catch (error) {
        SecureLogger.log('Error getting evaluations:', error);
        return [];
      }
    }

    /**
     * Get evaluations by session ID
     */
    async getEvaluationsBySession(sessionId: string): Promise<EvaluationData[]> {
      try {
        const { data, error } = await supabase
          .from('evaluation_scores')
          .select('*')
          .eq('session_id', sessionId)
          .order('evaluation_timestamp', { ascending: false });

        if (error) {
          SecureLogger.log('Supabase error getting evaluations by session:', error);
          throw error;
        }

        return data || [];
      } catch (error) {
        SecureLogger.log('Error getting evaluations by session:', error);
        return [];
      }
    }

    /**
     * Get evaluations by user ID
     */
    async getEvaluationsByUser(userId: string): Promise<EvaluationData[]> {
      try {
        const { data, error } = await supabase
          .from('evaluation_scores')
          .select('*')
          .eq('user_id', userId)
          .order('evaluation_timestamp', { ascending: false });

        if (error) {
          SecureLogger.log('Supabase error getting evaluations by user:', error);
          throw error;
        }

        return data || [];
      } catch (error) {
        SecureLogger.log('Error getting evaluations by user:', error);
        return [];
      }
    }

    /**
     * Update session summary with new evaluation (now handled by database triggers)
     */
    async updateSessionSummary(evaluation: EvaluationData): Promise<void> {
      // This is now handled automatically by database triggers
      // The triggers in our migration automatically update evaluation_sessions
      // when new records are inserted into evaluation_scores
      SecureLogger.log(`Session summary will be updated automatically by database triggers for session ${evaluation.session_id}`);
    }

    /**
     * Get all session summaries
     */
    async getAllSessionSummaries(): Promise<SessionSummary[]> {
      try {
        const { data, error } = await supabase
          .from('evaluation_sessions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          SecureLogger.log('Supabase error getting session summaries:', error);
          throw error;
        }

        return data || [];
      } catch (error) {
        SecureLogger.log('Error getting session summaries:', error);
        return [];
      }
    }

    /**
     * Get session summary by session ID
     */
    async getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
      try {
        const { data, error } = await supabase
          .from('evaluation_sessions')
          .select('*')
          .eq('session_id', sessionId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No rows found
            return null;
          }
          SecureLogger.log('Supabase error getting session summary:', error);
          throw error;
        }

        return data || null;
      } catch (error) {
        SecureLogger.log('Error getting session summary:', error);
        return null;
      }
    }

    /**
     * Get session summaries by user ID
     */
    async getSessionSummariesByUser(userId: string): Promise<SessionSummary[]> {
      try {
        const { data, error } = await supabase
          .from('evaluation_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          SecureLogger.log('Supabase error getting session summaries by user:', error);
          throw error;
        }

        return data || [];
      } catch (error) {
        SecureLogger.log('Error getting session summaries by user:', error);
        return [];
      }
    }

    /**
     * Clear all evaluation data (for testing/debugging)
     */
    async clearAllData(): Promise<void> {
      try {
        // Clear evaluation scores first (due to foreign key constraints)
        await supabase.from('evaluation_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Clear evaluation sessions
        await supabase.from('evaluation_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        SecureLogger.log('Cleared all evaluation data');
      } catch (error) {
        SecureLogger.log('Error clearing evaluation data:', error);
        throw error;
      }
    }

    /**
     * Get storage statistics
     */
    async getStorageStats(): Promise<{
      totalEvaluations: number;
      totalSessions: number;
      completeSessions: number;
      averageScore: number;
    }> {
      try {
        // Get evaluation count
        const { count: evaluationCount, error: evalError } = await supabase
          .from('evaluation_scores')
          .select('*', { count: 'exact', head: true });

        if (evalError) {
          SecureLogger.log('Error getting evaluation count:', evalError);
        }

        // Get session count and complete sessions
        const { count: sessionCount, error: sessionError } = await supabase
          .from('evaluation_sessions')
          .select('*', { count: 'exact', head: true });

        if (sessionError) {
          SecureLogger.log('Error getting session count:', sessionError);
        }

        const { count: completeCount, error: completeError } = await supabase
          .from('evaluation_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('is_complete', true);

        if (completeError) {
          SecureLogger.log('Error getting complete session count:', completeError);
        }

        // Get average score from completed sessions
        const { data: avgData, error: avgError } = await supabase
          .from('evaluation_sessions')
          .select('average_score')
          .not('average_score', 'is', null);

        let averageScore = 0;
        if (!avgError && avgData && avgData.length > 0) {
          const sum = avgData.reduce((acc, session) => acc + (session.average_score || 0), 0);
          averageScore = Math.round((sum / avgData.length) * 100) / 100;
        }

        return {
          totalEvaluations: evaluationCount || 0,
          totalSessions: sessionCount || 0,
          completeSessions: completeCount || 0,
          averageScore
        };
      } catch (error) {
        SecureLogger.log('Error getting storage stats:', error);
        return {
          totalEvaluations: 0,
          totalSessions: 0,
          completeSessions: 0,
          averageScore: 0
        };
      }
    }
  }

  // Export singleton instance
  export const evaluationStorageService = new EvaluationStorageService();
  export default evaluationStorageService;
