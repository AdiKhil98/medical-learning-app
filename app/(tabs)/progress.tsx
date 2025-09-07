import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Award, Calendar, Target, BarChart3, Users, Clock, Trophy, ChevronRight } from 'lucide-react-native';
// Platform-specific Victory imports
let VictoryChart: any, VictoryArea: any, VictoryAxis: any, VictoryTheme: any, VictoryScatter: any, VictoryLine: any;

if (Platform.OS === 'web') {
  try {
    const Victory = require('victory');
    VictoryChart = Victory.VictoryChart;
    VictoryArea = Victory.VictoryArea;
    VictoryAxis = Victory.VictoryAxis;
    VictoryTheme = Victory.VictoryTheme;
    VictoryScatter = Victory.VictoryScatter;
    VictoryLine = Victory.VictoryLine;
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
    VictoryLine = VictoryNative.VictoryLine;
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

    // Separate KP and FSP evaluations
    const kpEvaluations = evaluations
      .filter(e => e.exam_type === 'KP')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-10);
    
    const fspEvaluations = evaluations
      .filter(e => e.exam_type === 'FSP')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-10);

    // Prepare separate chart data for KP and FSP
    const kpChartPoints = kpEvaluations.map((evaluation, index) => ({
      x: index + 1,
      y: evaluation.score,
      date: format(new Date(evaluation.created_at), 'dd.MM')
    }));

    const fspChartPoints = fspEvaluations.map((evaluation, index) => ({
      x: index + 1,
      y: evaluation.score,
      date: format(new Date(evaluation.created_at), 'dd.MM')
    }));

    setChartData({
      KP: kpChartPoints,
      FSP: fspChartPoints
    });
  };

  const getFilteredEvaluations = () => {
    return evaluations
      .filter(evaluation => evaluation.exam_type === activeTab)
      .slice(0, 7);
  };


  const renderChart = () => {
    if (!chartData || !chartData[activeTab] || chartData[activeTab].length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>
            Noch keine {activeTab}-Bewertungen vorhanden
          </Text>
        </View>
      );
    }

    const currentChartData = chartData[activeTab];

    // Check if Victory components are available
    if (!VictoryChart || !VictoryArea || !VictoryAxis || !VictoryScatter || !VictoryLine) {
      // Fallback simple chart visualization
      return (
        <View style={styles.simpleChart}>
          <Text style={styles.chartTitle}>{activeTab} Fortschritt</Text>
          <View style={styles.chartBars}>
            {currentChartData.map((point, index) => (
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
            tickFormat={(x, i) => currentChartData[i] ? currentChartData[i].date : ''}
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
          
          {/* Area chart with gradient fill - different colors for KP and FSP */}
          <VictoryArea
            data={currentChartData}
            style={{
              data: {
                fill: activeTab === 'KP' ? 'rgba(33, 150, 243, 0.2)' : 'rgba(156, 39, 176, 0.2)', 
                fillOpacity: 1,
                stroke: activeTab === 'KP' ? MEDICAL_COLORS.primary : '#9c27b0',
                strokeWidth: 2.5
              }
            }}
            animate={{
              duration: 1200,
              onLoad: { duration: 600 }
            }}
            interpolation="cardinal"
          />
          
          {/* Goal lines at 60% and 80% thresholds */}
          <VictoryLine
            data={[{x: 1, y: 60}, {x: currentChartData.length, y: 60}]}
            style={{
              data: {
                stroke: '#FFA726', // Orange color for 60% threshold
                strokeWidth: 2,
                strokeDasharray: '5,5'
              }
            }}
          />
          <VictoryLine
            data={[{x: 1, y: 80}, {x: currentChartData.length, y: 80}]}
            style={{
              data: {
                stroke: '#66BB6A', // Green color for 80% threshold
                strokeWidth: 2,
                strokeDasharray: '5,5'
              }
            }}
          />
          
          {/* Data point circles */}
          <VictoryScatter
            data={currentChartData}
            size={4}
            style={{
              data: { 
                fill: activeTab === 'KP' ? MEDICAL_COLORS.primary : '#9c27b0',
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

  const renderModernEvaluationCard = (evaluation: Evaluation) => {
    const scoreColor = evaluation.score >= 60 ? '#10b981' : '#ef4444';
    const scoreBgColor = evaluation.score >= 60 ? '#dcfce7' : '#fee2e2';
    const passStatus = evaluation.score >= 60 ? 'Bestanden' : 'Nicht bestanden';
    const isExpanded = expandedEvaluation === evaluation.id;

    const toggleExpansion = () => {
      setExpandedEvaluation(isExpanded ? null : evaluation.id);
    };

    return (
      <View 
        key={evaluation.id} 
        style={styles.modernEvaluationCard}
      >
        <LinearGradient
          colors={['#ffffff', '#fafbfc']}
          style={styles.modernCardGradient}
        >
          <View style={styles.modernCardHeader}>
            <View style={styles.modernCardLeft}>
              <View style={styles.modernDateContainer}>
                <Calendar size={16} color="#6b7280" />
                <Text style={styles.modernCardDate}>
                  {format(new Date(evaluation.created_at), 'dd.MM.yyyy')}
                </Text>
              </View>
              <Text style={styles.modernCardType}>
                {evaluation.conversation_type === 'patient' ? 'Patientengespräch' : 'Prüfergespräch'}
              </Text>
            </View>
            
            <View style={styles.modernCardRight}>
              <View style={[styles.modernScoreContainer, { backgroundColor: scoreBgColor }]}>
                <Text style={[styles.modernScoreText, { color: scoreColor }]}>
                  {evaluation.score}
                </Text>
                <Text style={styles.modernScoreMax}>/100</Text>
              </View>
              <Text style={[styles.modernPassStatus, { color: scoreColor }]}>
                {passStatus}
              </Text>
            </View>
          </View>
          
          <View style={styles.modernCardFooter}>
            <View style={styles.modernCardProgress}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${evaluation.score}%`,
                      backgroundColor: scoreColor
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{evaluation.score}% erreicht</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.modernExpandButton}
              onPress={toggleExpansion}
            >
              <Text style={styles.modernExpandText}>
                {isExpanded ? 'Weniger' : 'Details'}
              </Text>
              <ChevronRight 
                size={16} 
                color="#6366f1" 
                style={[styles.chevron, isExpanded && styles.chevronRotated]} 
              />
            </TouchableOpacity>
          </View>

          {/* Expanded details with modern styling */}
          {isExpanded && (
            <View style={styles.modernEvaluationDetails}>
              <LinearGradient
                colors={['#f8fafc', '#f1f5f9']}
                style={styles.detailsGradient}
              >
                <View style={styles.modernScoreSection}>
                  <View style={[styles.modernScoreBadge, { backgroundColor: scoreColor }]}>
                    <Award size={18} color="white" />
                    <Text style={styles.modernScoreBadgeText}>
                      {evaluation.score >= 60 ? 'BESTANDEN ✓' : 'NICHT BESTANDEN ✗'}
                    </Text>
                  </View>
                </View>

                {evaluation.patient_evaluation && (
                  <View style={styles.modernEvaluationSection}>
                    <Text style={styles.modernSectionTitle}>📋 Detaillierte Bewertung</Text>
                    <ScrollView style={styles.modernEvaluationScrollView} nestedScrollEnabled>
                      <Text style={styles.modernEvaluationText}>
                        {evaluation.patient_evaluation}
                      </Text>
                    </ScrollView>
                  </View>
                )}
                
                {evaluation.examiner_evaluation && (
                  <View style={styles.modernEvaluationSection}>
                    <Text style={styles.modernSectionTitle}>👨‍⚕️ Prüfer-Feedback</Text>
                    <ScrollView style={styles.modernEvaluationScrollView} nestedScrollEnabled>
                      <Text style={styles.modernEvaluationText}>
                        {evaluation.examiner_evaluation}
                      </Text>
                    </ScrollView>
                  </View>
                )}

                {evaluation.evaluation && (
                  <View style={styles.modernEvaluationSection}>
                    <Text style={styles.modernSectionTitle}>📊 Zusammenfassung</Text>
                    <ScrollView style={styles.modernEvaluationScrollView} nestedScrollEnabled>
                      <Text style={styles.modernEvaluationText}>
                        {evaluation.evaluation}
                      </Text>
                    </ScrollView>
                  </View>
                )}
              </LinearGradient>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  const filteredEvaluations = getFilteredEvaluations();

  const averageScore = filteredEvaluations.length > 0 
    ? Math.round(filteredEvaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / filteredEvaluations.length)
    : 0;
    
  const passedCount = filteredEvaluations.filter(evaluation => evaluation.score >= 60).length;
  const totalAttempts = filteredEvaluations.length;

  return (
    <SafeAreaView style={styles.modernContainer}>
      <LinearGradient
        colors={['#f8fafc', '#e2e8f0', '#ffffff']}
        style={styles.gradientBackground}
      />
      
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Modern Header */}
        <View style={styles.modernHeader}>
          <Text style={styles.modernTitle}>Lernfortschritt</Text>
          <Text style={styles.modernSubtitle}>
            Verfolgen Sie Ihre Entwicklung in der medizinischen Ausbildung
          </Text>
        </View>

        {/* Stats Overview Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.statIconContainer}
            >
              <Trophy size={20} color="white" />
            </LinearGradient>
            <Text style={styles.statValue}>{averageScore}%</Text>
            <Text style={styles.statLabel}>Durchschnitt</Text>
          </View>
          
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#f093fb', '#f5576c']}
              style={styles.statIconContainer}
            >
              <Target size={20} color="white" />
            </LinearGradient>
            <Text style={styles.statValue}>{passedCount}/{totalAttempts}</Text>
            <Text style={styles.statLabel}>Bestanden</Text>
          </View>
          
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#4facfe', '#00f2fe']}
              style={styles.statIconContainer}
            >
              <TrendingUp size={20} color="white" />
            </LinearGradient>
            <Text style={styles.statValue}>
              {chartData ? (chartData.KP?.length || 0) + (chartData.FSP?.length || 0) : 0}
            </Text>
            <Text style={styles.statLabel}>Versuche</Text>
          </View>
        </View>

        {/* Modern Chart Section */}
        <View style={styles.modernChartContainer}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <BarChart3 size={24} color="#4338ca" />
              <Text style={styles.chartTitle}>{activeTab} Performance Verlauf</Text>
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[
                  styles.legendDot, 
                  { backgroundColor: activeTab === 'KP' ? '#667eea' : '#9c27b0' }
                ]} />
                <Text style={styles.legendText}>{activeTab} Score</Text>
              </View>
            </View>
          </View>
          {renderChart()}
        </View>

        {/* Enhanced Tabs Section */}
        <View style={styles.modernTabsContainer}>
          <Text style={styles.sectionTitle}>Bewertungen nach Typ</Text>
          {renderTabs()}
        </View>

        {/* Modern Evaluation Cards */}
        <View style={styles.modernCardsContainer}>
          {filteredEvaluations.length === 0 ? (
            <View style={styles.modernEmptyState}>
              <LinearGradient
                colors={['#e3f2fd', '#f3e5f5']}
                style={styles.emptyStateGradient}
              >
                <Calendar size={48} color="#9c27b0" />
                <Text style={styles.emptyStateTitle}>Noch keine Daten</Text>
                <Text style={styles.emptyStateText}>
                  Starten Sie eine {activeTab}-Simulation, um Ihren Fortschritt zu verfolgen
                </Text>
              </LinearGradient>
            </View>
          ) : (
            filteredEvaluations.map(renderModernEvaluationCard)
          )}
        </View>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modernContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  
  // Modern Header
  modernHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  modernTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modernSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    lineHeight: 24,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
    textAlign: 'center',
  },

  // Modern Chart
  modernChartContainer: {
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: 'white',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },

  // Enhanced Chart Styles
  chartWrapper: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
  },
  emptyChartText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
  },

  // Modern Tabs
  modernTabsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6b7280',
  },
  activeTabText: {
    color: 'white',
  },

  // Modern Cards
  modernCardsContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  modernEvaluationCard: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  modernCardGradient: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  modernCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modernCardLeft: {
    flex: 1,
  },
  modernDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  modernCardDate: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },
  modernCardType: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
  },
  modernCardRight: {
    alignItems: 'flex-end',
  },
  modernScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
  },
  modernScoreText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  modernScoreMax: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
  },
  modernPassStatus: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Progress and Footer
  modernCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernCardProgress: {
    flex: 1,
    marginRight: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },
  modernExpandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f0f4ff',
    gap: 4,
  },
  modernExpandText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6366f1',
  },
  chevron: {
    transform: [{ rotate: '90deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '-90deg' }],
  },

  // Expanded Details
  modernEvaluationDetails: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailsGradient: {
    padding: 16,
  },
  modernScoreSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modernScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  modernScoreBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modernEvaluationSection: {
    marginBottom: 16,
  },
  modernSectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#374151',
    marginBottom: 8,
  },
  modernEvaluationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    lineHeight: 20,
  },
  modernEvaluationScrollView: {
    maxHeight: 200,
    marginTop: 4,
  },

  // Empty State
  modernEmptyState: {
    marginTop: 20,
  },
  emptyStateGradient: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(156, 39, 176, 0.1)',
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#9c27b0',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 32,
  },

  // Legacy styles for fallback chart
  simpleChart: {
    height: 250,
    padding: 16,
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
    color: '#6b7280',
    marginBottom: 4,
  },
  chartValue: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
  },
});