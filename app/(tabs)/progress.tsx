import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { BookOpen, Award, Target, Plus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../../components/ui/Card';
import { supabase } from '../../lib/supabase';
import { subDays, isSameDay } from 'date-fns';
import { Picker } from '@react-native-picker/picker';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Evaluation {
  id: string;
  session_id: string;
  exam_type: string;
  conversation_type: string;
  score: number;
  evaluation: string;
  evaluation_timestamp: string;
  created_at: string;
}

export default function ProgressScreen() {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const [caseCount, setCaseCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState('');
  const [selectedScore, setSelectedScore] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchProgressCounts();
    insertLoginActivity();
    fetchLoginStreak();
    fetchEvaluations();
  }, []);

  const insertLoginActivity = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const today = new Date().toISOString().split("T")[0];

    await supabase
      .from('login_activity')
      .upsert([{ user_id: userId, logged_at: today }], {
        onConflict: ['user_id', 'logged_at'],
      });
  };

  const fetchProgressCounts = async () => {
    const userResp = await supabase.auth.getUser();
    const userId = userResp.data?.user?.id;
    if (!userId) return;

    const { count: caseTotal } = await supabase
      .from('case_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    setCaseCount(caseTotal || 0);
  };

  const fetchLoginStreak = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const { data: rows } = await supabase
      .from('login_activity')
      .select('logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false });

    if (!rows || rows.length === 0) return setStreak(0);

    let streakCount = 0;
    for (let i = 0; i < 30; i++) {
      const targetDate = subDays(new Date(), i);
      const found = rows.find(row => isSameDay(new Date(row.logged_at), targetDate));
      if (found) streakCount++;
      else break;
    }

    setStreak(streakCount);
  };

  const fetchEvaluations = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const { data: evaluationsData, error } = await supabase
      .from('evaluation_scores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching evaluations:', error);
      return;
    }

    setEvaluations(evaluationsData || []);
  };

  const handleAddEvaluation = async () => {
    if (!selectedEvaluation || !selectedScore) {
      Alert.alert('Fehler', 'Bitte wählen Sie eine Bewertung und eine Punktzahl aus.');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const { error } = await supabase
      .from('evaluation_scores')
      .insert([
        {
          user_id: userId,
          session_id: `manual_${Date.now()}`,
          exam_type: selectedEvaluation.includes('FSP') ? 'FSP' : 'KP',
          conversation_type: 'patient',
          score: parseInt(selectedScore),
          evaluation: `Manual evaluation: ${selectedEvaluation}`,
          evaluation_timestamp: new Date().toISOString(),
          webhook_source: 'manual'
        }
      ]);

    if (error) {
      console.error('Error adding evaluation:', error);
      Alert.alert('Fehler', 'Bewertung konnte nicht hinzugefügt werden.');
      return;
    }

    setSelectedEvaluation('');
    setSelectedScore('');
    setShowAddForm(false);
    fetchEvaluations();
    Alert.alert('Erfolg', 'Bewertung wurde hinzugefügt.');
  };

  const gradientColors = isDarkMode 
    ? ['#1F2937', '#111827', '#0F172A']
    : ['#e0f2fe', '#f0f9ff', '#ffffff'];

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    streakCard: {
      marginBottom: 16,
      backgroundColor: colors.card,
    },
    streakContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    streakIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#FFFBEB',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    streakNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    streakLabel: {
      color: colors.textSecondary,
    },
    caseCard: {
      flex: 1,
      backgroundColor: colors.card,
    },
    caseContainer: {
      alignItems: 'center',
      padding: 8,
    },
    caseNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      marginVertical: 8,
      color: colors.text,
    },
    caseLabel: {
      color: colors.textSecondary,
      textAlign: 'center',
    },
    evaluationCard: {
      backgroundColor: colors.card,
      marginBottom: 16,
    },
    evaluationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    evaluationTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      flex: 1,
    },
    addButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      flexDirection: 'row',
      alignItems: 'center',
    },
    addButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      marginLeft: 4,
    },
    formContainer: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
    },
    formTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.card,
      marginBottom: 12,
    },
    picker: {
      color: colors.text,
      backgroundColor: colors.card,
    },
    formActions: {
      flexDirection: 'row',
      gap: 8,
    },
    saveButton: {
      flex: 1,
      backgroundColor: colors.success,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.textSecondary,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    evaluationItem: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    evaluationIcon: {
      marginRight: 12,
    },
    evaluationInfo: {
      flex: 1,
    },
    evaluationName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
    },
    evaluationScore: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    evaluationDate: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyState: {
      alignItems: 'center',
      padding: 16,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
      />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={dynamicStyles.title}>Fortschritt</Text>

          <Card style={dynamicStyles.streakCard}>
            <View style={dynamicStyles.streakContainer}>
              <View style={dynamicStyles.streakIconContainer}>
                <Award size={32} color="#F59E0B" />
              </View>
              <View>
                <Text style={dynamicStyles.streakNumber}>{streak} Tage</Text>
                <Text style={dynamicStyles.streakLabel}>Aktuelle Lernserie</Text>
              </View>
            </View>
          </Card>

          <View style={styles.row}>
            <Card style={dynamicStyles.caseCard}>
              <View style={dynamicStyles.caseContainer}>
                <BookOpen size={24} color={colors.primary} />
                <Text style={dynamicStyles.caseNumber}>{caseCount}</Text>
                <Text style={dynamicStyles.caseLabel}>Fälle bearbeitet</Text>
              </View>
            </Card>
          </View>

          {/* Evaluations Section */}
          <Card style={dynamicStyles.evaluationCard}>
            <View style={dynamicStyles.evaluationHeader}>
              <Text style={dynamicStyles.evaluationTitle}>Bewertungen</Text>
              {user?.role === 'admin' && (
                <TouchableOpacity
                  style={dynamicStyles.addButton}
                  onPress={() => setShowAddForm(!showAddForm)}
                >
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={dynamicStyles.addButtonText}>Hinzufügen</Text>
                </TouchableOpacity>
              )}
            </View>

            {showAddForm && (
              <View style={dynamicStyles.formContainer}>
                <Text style={dynamicStyles.formTitle}>Neue Bewertung</Text>
                
                <View style={dynamicStyles.pickerContainer}>
                  <Picker
                    selectedValue={selectedEvaluation}
                    onValueChange={(value) => setSelectedEvaluation(value)}
                    style={dynamicStyles.picker}
                  >
                    <Picker.Item label="Bewertung auswählen..." value="" />
                    <Picker.Item label="Kardiologie Test" value="Kardiologie Test" />
                    <Picker.Item label="Anatomie Prüfung" value="Anatomie Prüfung" />
                    <Picker.Item label="Radiologie Evaluation" value="Radiologie Evaluation" />
                    <Picker.Item label="Sonographie Test" value="Sonographie Test" />
                    <Picker.Item label="Allgemeine Medizin" value="Allgemeine Medizin" />
                  </Picker>
                </View>

                <View style={dynamicStyles.pickerContainer}>
                  <Picker
                    selectedValue={selectedScore}
                    onValueChange={(value) => setSelectedScore(value)}
                    style={dynamicStyles.picker}
                  >
                    <Picker.Item label="Punktzahl auswählen..." value="" />
                    <Picker.Item label="Sehr gut (90-100%)" value="Sehr gut (90-100%)" />
                    <Picker.Item label="Gut (80-89%)" value="Gut (80-89%)" />
                    <Picker.Item label="Befriedigend (70-79%)" value="Befriedigend (70-79%)" />
                    <Picker.Item label="Ausreichend (60-69%)" value="Ausreichend (60-69%)" />
                    <Picker.Item label="Mangelhaft (50-59%)" value="Mangelhaft (50-59%)" />
                    <Picker.Item label="Ungenügend (0-49%)" value="Ungenügend (0-49%)" />
                  </Picker>
                </View>

                <View style={dynamicStyles.formActions}>
                  <TouchableOpacity
                    style={dynamicStyles.cancelButton}
                    onPress={() => {
                      setShowAddForm(false);
                      setSelectedEvaluation('');
                      setSelectedScore('');
                    }}
                  >
                    <Text style={dynamicStyles.buttonText}>Abbrechen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={dynamicStyles.saveButton}
                    onPress={handleAddEvaluation}
                  >
                    <Text style={dynamicStyles.buttonText}>Speichern</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Evaluations List */}
            {evaluations.length === 0 ? (
              <View style={dynamicStyles.emptyState}>
                <Target size={32} color={colors.textSecondary} />
                <Text style={dynamicStyles.emptyText}>
                  Noch keine Bewertungen vorhanden.{'\n'}
                  Bewertungen werden automatisch nach Abschluss von Simulationen hinzugefügt.
                </Text>
              </View>
            ) : (
              evaluations.map((evaluation) => (
                <View key={evaluation.id} style={dynamicStyles.evaluationItem}>
                  <View style={dynamicStyles.evaluationIcon}>
                    <Target size={20} color={colors.primary} />
                  </View>
                  <View style={dynamicStyles.evaluationInfo}>
                    <Text style={dynamicStyles.evaluationName}>
                      {evaluation.exam_type} - {evaluation.conversation_type}
                    </Text>
                    <Text style={dynamicStyles.evaluationScore}>
                      Punktzahl: {evaluation.score}/100
                    </Text>
                    <Text style={dynamicStyles.evaluationDate}>
                      {new Date(evaluation.created_at).toLocaleDateString('de-DE')}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  content: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
  },
});