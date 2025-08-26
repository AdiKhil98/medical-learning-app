import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Lightbulb, Plus, Calendar, RefreshCw, CheckCircle } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface DailyTip {
  id: string;
  date: string;
  title: string;
  content: string;
  category: string;
}

interface DailyQuestion {
  id: string;
  date: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  correct_answer: string;
  explanation: string;
  category: string;
}

export default function DailyTipsManager() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState<DailyTip[]>([]);
  const [questions, setQuestions] = useState<DailyQuestion[]>([]);
  const [addingTips, setAddingTips] = useState(false);

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
      console.error('Error loading daily content:', error);
      Alert.alert('Fehler', 'Tägliche Inhalte konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const populateAutomaticTips = async () => {
    setAddingTips(true);
    try {
      // Array of tips that will cycle automatically based on date
      const tipsLibrary = [
        { title: 'EKG-Grundlagen', content: 'Die P-Welle repräsentiert die Vorhofaktivierung und sollte in Ableitung II bei Sinusrhythmus immer positiv sein. Eine fehlende P-Welle kann auf Vorhofflimmern hindeuten.', category: 'Kardiologie' },
        { title: 'Blutdruckmessung', content: 'Für eine korrekte Blutdruckmessung sollte der Patient 5 Minuten ruhig sitzen, die Manschette sollte 80% des Oberarmumfangs bedecken und auf Herzhöhe positioniert sein.', category: 'Innere Medizin' },
        { title: 'Auskultation', content: 'Bei der Herzauskultation sollten Sie systematisch alle vier Klappenpunkte abhören: Aortenklappe (2. ICR rechts), Pulmonalklappe (2. ICR links), Trikuspidalklappe (4. ICR links) und Mitralklappe (5. ICR links).', category: 'Kardiologie' },
        { title: 'Medikamentenwechselwirkungen', content: 'Marcumar (Warfarin) interagiert mit vielen Medikamenten. Besonders Antibiotika können die Wirkung verstärken. Regelmäßige INR-Kontrollen sind essentiell.', category: 'Pharmakologie' },
        { title: 'Diabetes-Management', content: 'Bei Typ-2-Diabetes sollte der HbA1c-Wert idealerweise unter 7% liegen. Metformin ist meist die erste Wahl der medikamentösen Therapie.', category: 'Endokrinologie' },
        { title: 'Notfall: Anaphylaxie', content: 'Bei Anaphylaxie ist Adrenalin das Mittel der ersten Wahl. 0,3-0,5mg i.m. in den Oberschenkel, kann nach 5-15 Minuten wiederholt werden.', category: 'Notfallmedizin' },
        { title: 'Laborwerte', content: 'Erhöhte Troponin-Werte sind hochspezifisch für Myokardschäden. Bereits geringe Erhöhungen können klinisch relevant sein.', category: 'Labormedizin' },
        { title: 'Antibiotika-Therapie', content: 'Bei der Antibiotika-Auswahl sollten lokale Resistenzlisten beachtet werden. Eine Therapiedauer von 7-10 Tagen ist meist ausreichend.', category: 'Infektiologie' },
        { title: 'Schmerztherapie', content: 'Bei akuten Schmerzen sollte eine Schmerzskala (z.B. NRS 0-10) zur Dokumentation verwendet werden. Multimodale Therapieansätze sind oft erfolgreicher.', category: 'Schmerztherapie' },
        { title: 'Neurologie-Basics', content: 'Bei Verdacht auf Schlaganfall ist die FAST-Regel hilfreich: Face (Gesichtlähmung), Arms (Armschwäche), Speech (Sprachstörung), Time (Zeit bis Behandlung).', category: 'Neurologie' },
        { title: 'Wundbehandlung', content: 'Chronische Wunden sollten regelmäßig inspiziert werden. Eine feuchte Wundheilung ist meist günstiger als das Austrocknen der Wunde.', category: 'Chirurgie' },
        { title: 'Impfungen', content: 'Die STIKO-Empfehlungen sollten regelmäßig überprüft werden. Tetanus-Auffrischung wird alle 10 Jahre empfohlen.', category: 'Präventivmedizin' },
        { title: 'Gynäkologie', content: 'Die Krebsvorsorge sollte regelmäßig durchgeführt werden: Mammographie alle 2 Jahre ab 50, PAP-Test jährlich ab 20 Jahren.', category: 'Gynäkologie' },
        { title: 'Pädiatrie', content: 'Bei Kindern sollten Gewicht und Größe regelmäßig in Perzentilenkurven eingetragen werden, um Entwicklungsstörungen frühzeitig zu erkennen.', category: 'Pädiatrie' },
        { title: 'Psychiatrie', content: 'Bei Depression ist eine Kombinationstherapie aus Psychotherapie und Pharmakotherapie oft am erfolgreichsten.', category: 'Psychiatrie' }
      ];

      const questionsLibrary = [
        { question: 'Welche Herzfrequenz gilt als normale Ruheherzfrequenz bei Erwachsenen?', option_a: '40-60 Schläge/min', option_b: '60-100 Schläge/min', option_c: '100-120 Schläge/min', correct_answer: 'B', explanation: 'Die normale Ruheherzfrequenz bei Erwachsenen liegt zwischen 60-100 Schlägen pro Minute. Werte unter 60 werden als Bradykardie, Werte über 100 als Tachykardie bezeichnet.', category: 'Kardiologie' },
        { question: 'Was ist der normale Blutdruckwert für Erwachsene?', option_a: 'Systolisch <120 mmHg, Diastolisch <80 mmHg', option_b: 'Systolisch <140 mmHg, Diastolisch <90 mmHg', option_c: 'Systolisch <160 mmHg, Diastolisch <100 mmHg', correct_answer: 'A', explanation: 'Optimaler Blutdruck liegt bei systolisch <120 mmHg und diastolisch <80 mmHg. Werte ab 140/90 mmHg gelten als Hypertonie.', category: 'Innere Medizin' },
        { question: 'Welches EKG-Zeichen ist typisch für einen Myokardinfarkt?', option_a: 'Verlängerte QT-Zeit', option_b: 'ST-Hebung', option_c: 'Verbreiterte P-Welle', correct_answer: 'B', explanation: 'ST-Hebungen sind ein klassisches Zeichen für einen akuten Myokardinfarkt (STEMI) und erfordern sofortige Reperfusionstherapie.', category: 'Kardiologie' },
        { question: 'Welcher HbA1c-Wert ist das Therapieziel bei Diabetes mellitus Typ 2?', option_a: '<6%', option_b: '<7%', option_c: '<8%', correct_answer: 'B', explanation: 'Das allgemeine Therapieziel für HbA1c bei Typ-2-Diabetes liegt unter 7%. Individuelle Anpassungen sind je nach Patient möglich.', category: 'Endokrinologie' },
        { question: 'Was ist die Erstbehandlung bei Anaphylaxie?', option_a: 'Antihistaminika i.v.', option_b: 'Adrenalin i.m.', option_c: 'Kortison i.v.', correct_answer: 'B', explanation: 'Adrenalin intramuskulär (0,3-0,5mg) ist die Erstbehandlung der Wahl bei Anaphylaxie. Es sollte sofort gegeben werden.', category: 'Notfallmedizin' },
        { question: 'Welcher Laborwert ist spezifisch für Myokardschäden?', option_a: 'CK-MB', option_b: 'Troponin', option_c: 'LDH', correct_answer: 'B', explanation: 'Troponin ist der spezifischste Marker für Myokardschäden und ist auch bei geringen Herzmuskelschäden nachweisbar.', category: 'Labormedizin' },
        { question: 'Welche Medikamentengruppe ist Mittel der ersten Wahl bei Typ-2-Diabetes?', option_a: 'Sulfonylharnstoffe', option_b: 'Metformin', option_c: 'Insulin', correct_answer: 'B', explanation: 'Metformin ist das Medikament der ersten Wahl bei Typ-2-Diabetes, da es effektiv den Blutzucker senkt und ein günstiges Nebenwirkungsprofil hat.', category: 'Endokrinologie' },
        { question: 'Was bedeutet die Abkürzung FAST bei Schlaganfall?', option_a: 'Face-Arms-Speech-Time', option_b: 'Facial-Arterial-Stroke-Treatment', option_c: 'Fast-Action-Stroke-Therapy', correct_answer: 'A', explanation: 'FAST steht für Face (Gesicht), Arms (Arme), Speech (Sprache), Time (Zeit) - ein einfaches Schema zur Schlaganfall-Erkennung.', category: 'Neurologie' },
        { question: 'Wie oft sollte eine Tetanus-Auffrischimpfung erfolgen?', option_a: 'Alle 5 Jahre', option_b: 'Alle 10 Jahre', option_c: 'Alle 15 Jahre', correct_answer: 'B', explanation: 'Die Tetanus-Auffrischimpfung sollte alle 10 Jahre erfolgen. Bei Verletzungen kann eine vorgezogene Auffrischung nötig sein.', category: 'Präventivmedizin' },
        { question: 'Ab welchem Alter wird die Mammographie-Vorsorge empfohlen?', option_a: 'Ab 40 Jahren', option_b: 'Ab 45 Jahren', option_c: 'Ab 50 Jahren', correct_answer: 'C', explanation: 'Die Mammographie-Vorsorge wird ab dem 50. Lebensjahr alle 2 Jahre empfohlen.', category: 'Gynäkologie' }
      ];

      // Generate tips for the next 90 days automatically
      const tips = [];
      const questions = [];
      const today = new Date();
      
      for (let i = 0; i < 90; i++) {
        const currentDate = new Date(today.getTime() + (i * 24 * 60 * 60 * 1000));
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Use modulo to cycle through the arrays
        const tipIndex = i % tipsLibrary.length;
        const questionIndex = i % questionsLibrary.length;
        
        tips.push({
          date: dateStr,
          ...tipsLibrary[tipIndex]
        });
        
        questions.push({
          date: dateStr,
          ...questionsLibrary[questionIndex]
        });
      }

      // Clear existing tips for the next 90 days to avoid duplicates
      const endDate = new Date(today.getTime() + (90 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
      
      await Promise.all([
        supabase.from('daily_tips').delete().gte('date', today.toISOString().split('T')[0]).lte('date', endDate),
        supabase.from('daily_questions').delete().gte('date', today.toISOString().split('T')[0]).lte('date', endDate)
      ]);

      // Insert new tips and questions
      await Promise.all([
        supabase.from('daily_tips').insert(tips),
        supabase.from('daily_questions').insert(questions)
      ]);

      Alert.alert('Erfolg', 'Automatische tägliche Tipps und Fragen für die nächsten 90 Tage wurden erstellt!');
      loadDailyContent();
    } catch (error: any) {
      console.error('Error adding automatic tips:', error);
      Alert.alert('Fehler', 'Fehler beim Erstellen der automatischen Tipps: ' + error.message);
    } finally {
      setAddingTips(false);
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
          <Button
            title="90 Tage automatisch erstellen"
            onPress={populateAutomaticTips}
            loading={addingTips}
            style={styles.addButton}
            leftIcon={<Plus size={16} color="#FFFFFF" />}
          />
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
            <Card style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Lightbulb size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Keine täglichen Tipps für die nächsten 7 Tage gefunden.
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Klicken Sie auf "90 Tage automatisch erstellen" um Tipps zu erstellen.
              </Text>
            </Card>
          ) : (
            tips.map((tip) => (
              <Card key={tip.id} style={[styles.tipCard, { backgroundColor: colors.card }]}>
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
                  <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.categoryText, { color: colors.primary }]}>
                      {tip.category}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.tipTitle, { color: colors.text }]}>{tip.title}</Text>
                <Text style={[styles.tipContent, { color: colors.textSecondary }]}>
                  {tip.content}
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
            <Card style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Keine täglichen Fragen für die nächsten 7 Tage gefunden.
              </Text>
            </Card>
          ) : (
            questions.map((question) => (
              <Card key={question.id} style={[styles.tipCard, { backgroundColor: colors.card }]}>
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
                  <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.categoryText, { color: colors.primary }]}>
                      {question.category}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.tipTitle, { color: colors.text }]}>{question.question}</Text>
                <View style={styles.answerPreview}>
                  <Text style={[styles.answerText, { color: colors.textSecondary }]}>
                    Antwort {question.correct_answer}: {
                      question.correct_answer === 'A' ? question.option_a :
                      question.correct_answer === 'B' ? question.option_b :
                      question.option_c
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
  addButton: { flex: 1 },
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
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: { fontSize: 12, fontWeight: '500' },
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