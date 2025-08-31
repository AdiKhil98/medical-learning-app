import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
// Platform-specific Victory imports
let VictoryChart: any, VictoryArea: any, VictoryAxis: any, VictoryTheme: any, VictoryScatter: any;

if (Platform.OS === 'web') {
  try {
    const Victory = require('victory');
    VictoryChart = Victory.VictoryChart;
    VictoryArea = Victory.VictoryArea;
    VictoryAxis = Victory.VictoryAxis;
    VictoryTheme = Victory.VictoryTheme;
    VictoryScatter = Victory.VictoryScatter;
  } catch (error) {
    console.log('Victory not available on web');
  }
} else {
  try {
    const VictoryNative = require('victory-native');
    VictoryChart = VictoryNative.VictoryChart;
    VictoryArea = VictoryNative.VictoryArea;
    VictoryAxis = VictoryNative.VictoryAxis;
    VictoryTheme = VictoryNative.VictoryTheme;
    VictoryScatter = VictoryNative.VictoryScatter;
  } catch (error) {
    console.log('Victory Native not available');
  }
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// Updated color scheme matching design requirements
const MEDICAL_COLORS = {
  primary: '#2196F3', // Blue for chart
  chartGradient: '#E3F2FD', // Light blue for chart fill
  background: '#FFFFFF',
  lightBackground: '#E8F5E9',
  textPrimary: '#424242',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#66BB6A', // Green for scores >= 60
  danger: '#ef4444', // Red for scores < 60
  lightGray: '#F5F5F5',
  gridColor: '#f0f0f0'
};

interface Evaluation {
  id: string;
  session_id: string;
  exam_type: string;
  conversation_type: string;
  score: number;
  evaluation: string;
  patient_evaluation: string;
  examiner_evaluation: string;
  evaluation_timestamp: string;
  created_at: string;
}

export default function ProgressScreen() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [activeTab, setActiveTab] = useState<'KP' | 'FSP'>('KP');
  const [chartData, setChartData] = useState<any>(null);
  const [expandedEvaluation, setExpandedEvaluation] = useState<string | null>(null);
  
  console.log('ProgressScreen: Rendering, evaluations count:', evaluations.length);
  console.log('ProgressScreen: chartData:', chartData);
  console.log('ProgressScreen: activeTab:', activeTab);

  useEffect(() => {
    fetchEvaluations();
  }, []);

  useEffect(() => {
    prepareChartData();
  }, [evaluations]);

  const fetchEvaluations = async () => {
    console.log('fetchEvaluations: Starting...');
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    console.log('fetchEvaluations: userId:', userId);
    if (!userId) return;

    const { data: evaluationsData, error } = await supabase
      .from('evaluation_scores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    console.log('fetchEvaluations: evaluationsData:', evaluationsData);
    console.log('fetchEvaluations: error:', error);

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

    // Prepare data for Victory chart
    const chartPoints = sortedEvaluations.map((evaluation, index) => ({
      x: index + 1,
      y: evaluation.score,
      date: format(new Date(evaluation.created_at), 'dd.MM')
    }));

    setChartData(chartPoints);
  };

  const getFilteredEvaluations = () => {
    return evaluations
      .filter(evaluation => evaluation.exam_type === activeTab)
      .slice(0, 7);
  };


  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>
            Noch keine Bewertungen vorhanden
          </Text>
        </View>
      );
    }

    // Check if Victory components are available
    if (!VictoryChart || !VictoryArea || !VictoryAxis || !VictoryScatter) {
      // Fallback simple chart visualization
      return (
        <View style={styles.simpleChart}>
          <Text style={styles.chartTitle}>Fortschritt Übersicht</Text>
          <View style={styles.chartBars}>
            {chartData.map((point, index) => (
              <View key={index} style={styles.chartBarContainer}>
                <View 
                  style={[
                    styles.chartBar,
                    { 
                      height: `${point.y}%`,
                      backgroundColor: point.y >= 60 ? MEDICAL_COLORS.success : MEDICAL_COLORS.danger
                    }
                  ]}
                />
                <Text style={styles.chartLabel}>{point.date}</Text>
                <Text style={styles.chartValue}>{point.y}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.chartWrapper}>
        <VictoryChart
          height={300}
          width={SCREEN_WIDTH - 32}
          padding={{ left: 60, top: 20, right: 30, bottom: 60 }}
          domainPadding={{ x: 20, y: 10 }}
        >
          {/* Y-Axis with score labels */}
          <VictoryAxis
            dependentAxis
            tickCount={5}
            domain={[0, 100]}
            style={{
              grid: { 
                stroke: '#f0f0f0', 
                strokeWidth: 1,
                strokeDasharray: 'none'
              },
              axis: { stroke: 'transparent' },
              ticks: { stroke: 'transparent' },
              tickLabels: { 
                fontSize: 12, 
                fill: '#999', 
                fontFamily: 'system-ui'
              }
            }}
          />
          
          {/* X-Axis with date labels */}
          <VictoryAxis
            tickFormat={(x, i) => chartData[i] ? chartData[i].date : ''}
            style={{
              grid: { stroke: 'transparent' },
              axis: { stroke: 'transparent' },
              ticks: { stroke: 'transparent' },
              tickLabels: { 
                fontSize: 11, 
                fill: '#999', 
                angle: 0,
                fontFamily: 'system-ui'
              }
            }}
          />
          
          {/* Area chart with gradient fill */}
          <VictoryArea
            data={chartData}
            style={{
              data: {
                fill: 'rgba(33, 150, 243, 0.2)', // Light blue gradient
                fillOpacity: 1,
                stroke: MEDICAL_COLORS.primary, // Blue line
                strokeWidth: 2.5
              }
            }}
            animate={{
              duration: 1200,
              onLoad: { duration: 600 }
            }}
            interpolation="cardinal"
          />
          
          {/* Data point circles */}
          <VictoryScatter
            data={chartData}
            size={4}
            style={{
              data: { 
                fill: MEDICAL_COLORS.primary,
                stroke: '#fff',
                strokeWidth: 2
              }
            }}
          />
        </VictoryChart>
      </View>
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
    const isExpanded = expandedEvaluation === evaluation.id;

    const toggleExpansion = () => {
      setExpandedEvaluation(isExpanded ? null : evaluation.id);
    };

    return (
      <TouchableOpacity 
        key={evaluation.id} 
        style={styles.evaluationCard}
        onPress={toggleExpansion}
        activeOpacity={0.7}
      >
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
        
        <View style={styles.cardContent}>
          <Text style={styles.cardType}>
            {evaluation.conversation_type === 'patient' ? 'Patientengespräch' : 'Prüfergespräch'}
          </Text>
          
          {/* Expansion indicator */}
          <Text style={styles.expandIndicator}>
            {isExpanded ? '▼ Details ausblenden' : '▶ Details anzeigen'}
          </Text>
        </View>

        {/* Expanded evaluation details */}
        {isExpanded && (
          <View style={styles.evaluationDetails}>
            {/* Score header */}
            <View style={styles.scoreHeader}>
              <Text style={[styles.finalScore, { color: scoreColor }]}>
                ENDPUNKTZAHL: {evaluation.score}/100
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: scoreColor }]}>
                <Text style={styles.statusText}>
                  {evaluation.score >= 66 ? 'BESTANDEN ✓' : 'MEHR ÜBUNG NÖTIG ✗'}
                </Text>
              </View>
            </View>

            {/* Evaluation content sections */}
            {evaluation.patient_evaluation && (
              <View style={styles.evaluationSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>📋 DETAILLIERTE BEWERTUNG</Text>
                </View>
                <ScrollView style={styles.evaluationScrollView} nestedScrollEnabled>
                  <Text style={styles.evaluationContent}>{evaluation.patient_evaluation}</Text>
                </ScrollView>
              </View>
            )}
            
            {evaluation.examiner_evaluation && (
              <View style={styles.evaluationSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>👨‍⚕️ PRÜFER-FEEDBACK</Text>
                </View>
                <ScrollView style={styles.evaluationScrollView} nestedScrollEnabled>
                  <Text style={styles.evaluationContent}>{evaluation.examiner_evaluation}</Text>
                </ScrollView>
              </View>
            )}
            
            {evaluation.evaluation && (
              <View style={styles.evaluationSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>📊 ZUSAMMENFASSUNG</Text>
                </View>
                <ScrollView style={styles.evaluationScrollView} nestedScrollEnabled>
                  <Text style={styles.evaluationContent}>{evaluation.evaluation}</Text>
                </ScrollView>
              </View>
            )}

          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filteredEvaluations = getFilteredEvaluations();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Fortschritt</Text>
        <Text style={styles.subtitle}>Fortschritt Übersicht</Text>
        
        {/* Chart Section */}
        <View style={styles.chartContainer}>
          {renderChart()}
        </View>

        {/* Tabs Section */}
        {renderTabs()}

        {/* Evaluation List */}
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
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: MEDICAL_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  chartContainer: {
    backgroundColor: MEDICAL_COLORS.background,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: MEDICAL_COLORS.border,
  },
  chartWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
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
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardType: {
    fontSize: 14,
    color: MEDICAL_COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  expandIndicator: {
    fontSize: 12,
    color: MEDICAL_COLORS.primary,
    fontWeight: '600',
  },
  evaluationDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: MEDICAL_COLORS.border,
  },
  scoreHeader: {
    backgroundColor: MEDICAL_COLORS.lightBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  finalScore: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  evaluationSection: {
    marginBottom: 20,
    backgroundColor: MEDICAL_COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MEDICAL_COLORS.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    backgroundColor: MEDICAL_COLORS.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MEDICAL_COLORS.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: MEDICAL_COLORS.textPrimary,
  },
  evaluationScrollView: {
    maxHeight: 200,
    padding: 16,
  },
  evaluationContent: {
    fontSize: 13,
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
  // Fallback chart styles
  simpleChart: {
    height: 250,
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: MEDICAL_COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    paddingHorizontal: 10,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  chartBar: {
    width: '80%',
    minHeight: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 10,
    color: MEDICAL_COLORS.textSecondary,
    marginBottom: 4,
  },
  chartValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: MEDICAL_COLORS.textPrimary,
  },
});