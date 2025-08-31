import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

// Conditionally import chart for native only
let LineChart: any = null;
if (Platform.OS !== 'web') {
  try {
    const ChartKit = require('react-native-chart-kit');
    LineChart = ChartKit.LineChart;
  } catch (error) {
    console.log('Chart kit not available');
  }
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// Medical-grade color scheme
const MEDICAL_COLORS = {
  primary: '#66BB6A',
  background: '#FFFFFF',
  lightBackground: '#E8F5E9',
  textPrimary: '#424242',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#66BB6A',
  danger: '#F44336',
  lightGray: '#F5F5F5'
};

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
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [activeTab, setActiveTab] = useState<'KP' | 'FSP'>('KP');
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    fetchEvaluations();
  }, []);

  useEffect(() => {
    prepareChartData();
  }, [evaluations]);

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

  const prepareChartData = () => {
    if (!evaluations || evaluations.length === 0) {
      setChartData(null);
      return;
    }

    // Sort by date and take last 10 points for chart
    const sortedEvaluations = [...evaluations]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-10);

    const labels = sortedEvaluations.map(evaluation => 
      format(new Date(evaluation.created_at), 'dd.MM')
    );
    const data = sortedEvaluations.map(evaluation => evaluation.score);

    setChartData({
      labels,
      datasets: [{
        data,
        color: (opacity = 1) => MEDICAL_COLORS.primary,
        strokeWidth: 2
      }]
    });
  };

  const getFilteredEvaluations = () => {
    return evaluations
      .filter(evaluation => evaluation.exam_type === activeTab)
      .slice(0, 7);
  };

  const renderChart = () => {
    if (!chartData) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>
            Noch keine Bewertungen vorhanden
          </Text>
        </View>
      );
    }

    // Web fallback - simple visual representation
    if (!LineChart || Platform.OS === 'web') {
      return (
        <View style={styles.webChart}>
          <Text style={styles.webChartTitle}>Fortschritt Übersicht</Text>
          <View style={styles.webChartData}>
            {chartData.datasets[0].data.map((score: number, index: number) => (
              <View key={index} style={styles.webChartBar}>
                <View 
                  style={[
                    styles.webChartBarFill, 
                    { 
                      height: `${score}%`,
                      backgroundColor: score >= 60 ? MEDICAL_COLORS.success : MEDICAL_COLORS.danger
                    }
                  ]} 
                />
                <Text style={styles.webChartLabel}>
                  {chartData.labels[index]}
                </Text>
                <Text style={styles.webChartScore}>
                  {score}
                </Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    return (
      <LineChart
        data={chartData}
        width={SCREEN_WIDTH - 32}
        height={220}
        chartConfig={{
          backgroundColor: MEDICAL_COLORS.background,
          backgroundGradientFrom: MEDICAL_COLORS.background,
          backgroundGradientTo: MEDICAL_COLORS.background,
          decimalPlaces: 0,
          color: (opacity = 1) => MEDICAL_COLORS.primary,
          labelColor: (opacity = 1) => MEDICAL_COLORS.textSecondary,
          style: {
            borderRadius: 8,
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: MEDICAL_COLORS.primary
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: MEDICAL_COLORS.border,
            strokeWidth: 1
          }
        }}
        bezier
        style={styles.chart}
      />
    );
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'KP' && styles.activeTab]}
        onPress={() => setActiveTab('KP')}
      >
        <Text style={[styles.tabText, activeTab === 'KP' && styles.activeTabText]}>
          KP
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'FSP' && styles.activeTab]}
        onPress={() => setActiveTab('FSP')}
      >
        <Text style={[styles.tabText, activeTab === 'FSP' && styles.activeTabText]}>
          FSP
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEvaluationCard = (evaluation: Evaluation) => {
    const scoreColor = evaluation.score >= 60 ? MEDICAL_COLORS.success : MEDICAL_COLORS.danger;
    const passStatus = evaluation.score >= 60 ? 'Bestanden' : 'Nicht bestanden';

    return (
      <View key={evaluation.id} style={styles.evaluationCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardDate}>
            {format(new Date(evaluation.created_at), 'dd.MM.yyyy')}
          </Text>
          <View style={styles.cardScore}>
            <Text style={[styles.scoreText, { color: scoreColor }]}>
              {evaluation.score}/100
            </Text>
            <Text style={[styles.passText, { color: scoreColor }]}>
              {passStatus}
            </Text>
          </View>
        </View>
        <Text style={styles.cardType}>
          {evaluation.conversation_type === 'patient' ? 'Patientengespräch' : 'Prüfergespräch'}
        </Text>
      </View>
    );
  };

  const filteredEvaluations = getFilteredEvaluations();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Fortschritt</Text>
        
        {/* Chart Section */}
        <View style={styles.chartContainer}>
          {renderChart()}
        </View>

        {/* Tabs Section */}
        {renderTabs()}

        {/* Evaluation Cards */}
        <View style={styles.cardsContainer}>
          {filteredEvaluations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Noch keine {activeTab}-Bewertungen vorhanden
              </Text>
            </View>
          ) : (
            filteredEvaluations.map(renderEvaluationCard)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MEDICAL_COLORS.background,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: MEDICAL_COLORS.textPrimary,
    textAlign: 'center',
    marginVertical: 20,
  },
  chartContainer: {
    backgroundColor: MEDICAL_COLORS.background,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: MEDICAL_COLORS.border,
    padding: 16,
  },
  emptyChart: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MEDICAL_COLORS.border,
    borderStyle: 'dashed',
  },
  emptyChartText: {
    fontSize: 16,
    color: MEDICAL_COLORS.textSecondary,
  },
  chart: {
    borderRadius: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 8,
    backgroundColor: MEDICAL_COLORS.lightGray,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: MEDICAL_COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: MEDICAL_COLORS.textSecondary,
  },
  activeTabText: {
    color: MEDICAL_COLORS.background,
  },
  cardsContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  evaluationCard: {
    backgroundColor: MEDICAL_COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MEDICAL_COLORS.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 14,
    color: MEDICAL_COLORS.textSecondary,
  },
  cardScore: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  passText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardType: {
    fontSize: 14,
    color: MEDICAL_COLORS.textPrimary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: MEDICAL_COLORS.textSecondary,
    textAlign: 'center',
  },
  // Web chart fallback styles
  webChart: {
    height: 220,
    padding: 16,
  },
  webChartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: MEDICAL_COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  webChartData: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
  },
  webChartBar: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  webChartBarFill: {
    width: '80%',
    minHeight: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  webChartLabel: {
    fontSize: 10,
    color: MEDICAL_COLORS.textSecondary,
    marginBottom: 4,
  },
  webChartScore: {
    fontSize: 12,
    fontWeight: 'bold',
    color: MEDICAL_COLORS.textPrimary,
  },
});