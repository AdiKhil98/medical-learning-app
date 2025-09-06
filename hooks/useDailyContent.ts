import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SecureLogger } from '@/lib/security';

export interface DailyTip {
  id?: string;
  date: string;
  title?: string;
  content?: string;
  tip_content?: string;
  tip?: string;
  category?: string;
}

export interface DailyQuestion {
  id?: string;
  date: string;
  question: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  correct_answer?: 'a' | 'b' | 'c' | 'A' | 'B' | 'C';
  correct_choice?: 'a' | 'b' | 'c' | 'A' | 'B' | 'C';
  explanation?: string;
  category?: string;
}

export interface DailyContentState {
  dailyTip: DailyTip | null;
  dailyQuestion: DailyQuestion | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useDailyContent = (): DailyContentState => {
  const [dailyTip, setDailyTip] = useState<DailyTip | null>(null);
  const [dailyQuestion, setDailyQuestion] = useState<DailyQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date().toISOString().split('T')[0];
      SecureLogger.log('Fetching daily content for date:', today);

      // Fetch daily tip
      let { data: tipData, error: tipError } = await supabase
        .from('daily_tips')
        .select('*')
        .eq('date', today)
        .single();

      if (tipError && tipError.code === 'PGRST116') {
        SecureLogger.log('No tip for today, fetching most recent tip');
        const { data: recentTipData, error: recentTipError } = await supabase
          .from('daily_tips')
          .select('*')
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (recentTipError) {
          SecureLogger.error('Error fetching recent tip:', recentTipError);
        } else {
          tipData = recentTipData;
        }
      } else if (tipError) {
        SecureLogger.error('Error fetching today\'s tip:', tipError);
      }

      // Fetch daily question
      let { data: questionData, error: questionError } = await supabase
        .from('daily_questions')
        .select('*')
        .eq('date', today)
        .single();

      if (questionError && questionError.code === 'PGRST116') {
        SecureLogger.log('No question for today, fetching most recent question');
        const { data: recentQuestionData, error: recentQuestionError } = await supabase
          .from('daily_questions')
          .select('*')
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (recentQuestionError) {
          SecureLogger.error('Error fetching recent question:', recentQuestionError);
        } else {
          questionData = recentQuestionData;
        }
      } else if (questionError) {
        SecureLogger.error('Error fetching today\'s question:', questionError);
      }

      setDailyTip(tipData);
      setDailyQuestion(questionData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch daily content';
      SecureLogger.error('Error in fetchDailyContent:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyContent();
  }, []);

  return {
    dailyTip,
    dailyQuestion,
    loading,
    error,
    refetch: fetchDailyContent,
  };
};