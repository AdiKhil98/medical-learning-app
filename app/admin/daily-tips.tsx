import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Lightbulb, Calendar, RefreshCw, CheckCircle } from 'lucide-react-native';
import Card from '@/components/ui/Card';

interface DailyTip {
  id?: string;
  date: string;
  title?: string;
  content?: string;
  tip_content?: string;
  tip?: string;
  category?: string;
}

interface DailyQuestion {
  id?: string;
  date: string;
  question: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  correct_answer?: string;
  correct_choice?: string;
  explanation?: string;
  category?: string;
}

export default function DailyTipsManager() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState<DailyTip[]>([]);
  const [questions, setQuestions] = useState<DailyQuestion[]>([]);

  useEffect(() => {
    loadDailyContent();
  }, []);

  const loadDailyContent = async () => {
    setLoading(true);
    try {
      // Load tips for the next 7 days
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [tipsResponse, questionsResponse] = await Promise.all([
        supabase
          .from('daily_tips')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true }),
        supabase
          .from('daily_questions')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true })
      ]);

      if (tipsResponse.error) throw tipsResponse.error;
      if (questionsResponse.error) throw questionsResponse.error;

      setTips(tipsResponse.data || []);
      setQuestions(questionsResponse.data || []);
    } catch (error: any) {
      logger.error('Error loading daily content:', error);
      Alert.alert('Fehler', 'Tägliche Inhalte konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('de-DE', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isToday = (dateString: string) => {
    return dateString === new Date().toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Lade tägliche Inhalte...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerContent}>
          <Lightbulb size={28} color={colors.primary} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>Daily Tips Manager</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Tägliche Tipps & Fragen verwalten
            </Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.primary + '20' }]}
            onPress={loadDailyContent}
          >
            <RefreshCw size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            💡 Tägliche Tipps ({tips.length})
          </Text>
          
          {tips.length === 0 ? (
            <Card style={[styles.emptyCard, { backgroundColor: colors.card }] as any}>
              <Lightbulb size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Keine täglichen Tipps für die nächsten 7 Tage gefunden.
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Verwenden Sie die Datenbank, um Tipps manuell hinzuzufügen.
              </Text>
            </Card>
          ) : (
            tips.map((tip) => (
              <Card key={tip.date} style={[styles.tipCard, { backgroundColor: colors.card }] as any}>
                <View style={styles.tipHeader}>
                  <View style={styles.tipDateContainer}>
                    <Calendar size={16} color={isToday(tip.date) ? '#EF4444' : colors.primary} />
                    <Text style={[
                      styles.tipDate, 
                      { color: isToday(tip.date) ? '#EF4444' : colors.primary }
                    ]}>
                      {formatDate(tip.date)}
                      {isToday(tip.date) && ' (Heute)'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.tipTitle, { color: colors.text }]}>{tip.title || 'Daily Tip'}</Text>
                <Text style={[styles.tipContent, { color: colors.textSecondary }]}>
                  {tip.tip || tip.tip_content || tip.content || 'No content available'}
                </Text>
              </Card>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ❓ Tägliche Fragen ({questions.length})
          </Text>
          
          {questions.length === 0 ? (
            <Card style={[styles.emptyCard, { backgroundColor: colors.card }] as any}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Keine täglichen Fragen für die nächsten 7 Tage gefunden.
              </Text>
            </Card>
          ) : (
            questions.map((question) => (
              <Card key={question.date} style={[styles.tipCard, { backgroundColor: colors.card }] as any}>
                <View style={styles.tipHeader}>
                  <View style={styles.tipDateContainer}>
                    <Calendar size={16} color={isToday(question.date) ? '#EF4444' : colors.primary} />
                    <Text style={[
                      styles.tipDate, 
                      { color: isToday(question.date) ? '#EF4444' : colors.primary }
                    ]}>
                      {formatDate(question.date)}
                      {isToday(question.date) && ' (Heute)'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.tipTitle, { color: colors.text }]}>{question.question}</Text>
                <View style={styles.answerPreview}>
                  <Text style={[styles.answerText, { color: colors.textSecondary }]}>
                    Antwort {question.correct_choice || question.correct_answer}: {
                      (question.correct_choice || question.correct_answer)?.toLowerCase() === 'a' ? 
                        (question.choice_a || question.option_a) :
                      (question.correct_choice || question.correct_answer)?.toLowerCase() === 'b' ? 
                        (question.choice_b || question.option_b) :
                      (question.choice_c || question.option_c)
                    }
                  </Text>
                  <CheckCircle size={16} color="#22C55E" />
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16 },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: { flex: 1, marginLeft: 12 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 4 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  tipCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipDate: { fontSize: 12, fontWeight: '500' },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tipContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  answerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  answerText: {
    flex: 1,
    fontSize: 14,
    fontStyle: 'italic',
  },
});