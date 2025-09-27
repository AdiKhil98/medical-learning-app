import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, SafeAreaView, TouchableOpacity, Platform, Modal } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Award, Calendar, Target, BarChart3, Users, Clock, Trophy, ChevronRight, X, Maximize2 } from 'lucide-react-native';
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

// Updated color scheme matching coral design requirements
const MEDICAL_COLORS = {
  primary: '#E2827F', // Burning Sand for chart
  chartGradient: '#FDF7F6', // Very light coral for chart fill
  background: '#FFFFFF',
  lightBackground: '#F9F6F2', // Light cream background
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  border: 'rgba(184, 126, 112, 0.2)',
  success: '#66BB6A', // Keep green for scores >= 60
  danger: '#B15740', // Brown Rust for scores < 60
  lightGray: '#F9F6F2',
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
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  
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
            {currentChartData.map((point: any, index: number) => (
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
            tickFormat={(x: any, i: number) => currentChartData[i] ? currentChartData[i].date : ''}
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
                fill: activeTab === 'KP' ? 'rgba(184, 126, 112, 0.2)' : 'rgba(226, 130, 127, 0.2)', 
                fillOpacity: 1,
                stroke: activeTab === 'KP' ? '#B87E70' : '#E2827F',
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
                fill: activeTab === 'KP' ? '#B87E70' : '#E2827F',
                stroke: '#fff',
                strokeWidth: 2
              }
            }}
          />
        </VictoryChart>
      </View>
    );
  };


  const parseEvaluationText = (text: string) => {
    if (!text) return [];
    
    // Split by double asterisks or other common separators
    const sections = text.split(/\*\*([^*]+)\*\*/).filter(Boolean);
    const parsedSections = [];
    
    for (let i = 0; i < sections.length; i += 2) {
      const title = sections[i]?.trim();
      const content = sections[i + 1]?.trim();
      
      if (title && content) {
        parsedSections.push({ title, content });
      } else if (title && title.length > 20) {
        // If it's a long text without a clear title, treat as content
        parsedSections.push({ 
          title: 'Details', 
          content: title 
        });
      }
    }
    
    // If no structured sections found, return the original text
    if (parsedSections.length === 0) {
      return [{ title: 'Bewertung', content: text }];
    }
    
    return parsedSections;
  };

  const enhanceTextReadability = (text: string) => {
    // Improve text formatting for better readability
    return text
      // Break long sentences
      .replace(/([.!?])\s+(?=[A-ZÄÖÜ])/g, '$1\n\n')
      // Add spacing around key phrases
      .replace(/\*\*([^*]+)\*\*/g, '**$1**') // Keep bold markers for now
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      // Improve list formatting
      .replace(/(\d+\.)\s*/g, '\n$1 ')
      .replace(/[-•]\s*/g, '\n• ')
      .trim();
  };

  const renderEnhancedEvaluationText = (text: string) => {
    const enhancedText = enhanceTextReadability(text);
    const parts = enhancedText.split(/(\*\*[^*]+\*\*)/g);

    return (
      <View style={styles.enhancedTextContainer}>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            // Bold text
            const boldText = part.slice(2, -2);
            return (
              <Text key={index} style={styles.enhancedBoldText}>
                {boldText}
              </Text>
            );
          } else if (part.trim()) {
            // Regular text with paragraphs
            const paragraphs = part.split('\n\n').filter(p => p.trim());
            return paragraphs.map((paragraph, pIndex) => {
              if (paragraph.startsWith('•') || paragraph.match(/^\d+\./)) {
                // List item
                return (
                  <View key={`${index}-${pIndex}`} style={styles.enhancedListItem}>
                    <Text style={styles.enhancedListText}>{paragraph.trim()}</Text>
                  </View>
                );
              } else {
                // Regular paragraph
                return (
                  <Text key={`${index}-${pIndex}`} style={styles.enhancedBodyText}>
                    {paragraph.trim()}
                  </Text>
                );
              }
            });
          }
          return null;
        })}
      </View>
    );
  };

  const renderParsedEvaluation = (text: string) => {
    const sections = parseEvaluationText(text);

    return (
      <View>
        {sections.map((section, index) => (
          <View key={index} style={styles.parsedSection}>
            <Text style={styles.parsedSectionTitle}>{section.title}</Text>
            <View style={styles.parsedSectionContentContainer}>
              {renderEnhancedEvaluationText(section.content)}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const openEvaluationModal = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setModalVisible(true);
  };

  const closeEvaluationModal = () => {
    setModalVisible(false);
    setSelectedEvaluation(null);
  };

  const renderEvaluationModal = () => {
    if (!selectedEvaluation) return null;

    const scoreColor = selectedEvaluation.score >= 60 ? '#10b981' : '#ef4444';
    const scoreBgColor = selectedEvaluation.score >= 60 ? '#dcfce7' : '#fee2e2';
    const passStatus = selectedEvaluation.score >= 60 ? 'Bestanden' : 'Nicht bestanden';

    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={closeEvaluationModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <LinearGradient
            colors={['#f8fafc', '#e2e8f0', '#ffffff']}
            style={styles.modalGradient}
          />
          
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Maximize2 size={24} color="#E2827F" />
              <Text style={styles.modalTitle}>Bewertung Details</Text>
            </View>
            <TouchableOpacity 
              onPress={closeEvaluationModal}
              style={styles.modalCloseButton}
            >
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            {/* Score Section */}
            <View style={styles.modalScoreSection}>
              <LinearGradient
                colors={[scoreColor, scoreColor + '90']}
                style={styles.modalScoreGradient}
              >
                <View style={styles.modalScoreContent}>
                  <Award size={32} color="white" />
                  <View style={styles.modalScoreTextContainer}>
                    <Text style={styles.modalScoreText}>{selectedEvaluation.score}/100</Text>
                    <Text style={styles.modalScoreStatus}>{passStatus}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Evaluation Info */}
            <View style={styles.modalInfoCard}>
              <LinearGradient
                colors={['#ffffff', '#fafbfc']}
                style={styles.modalInfoGradient}
              >
                <View style={styles.modalInfoRow}>
                  <Calendar size={20} color="#6b7280" />
                  <Text style={styles.modalInfoText}>
                    {format(new Date(selectedEvaluation.created_at), 'dd.MM.yyyy • HH:mm')}
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Target size={20} color="#6b7280" />
                  <Text style={styles.modalInfoText}>
                    {selectedEvaluation.exam_type} - {selectedEvaluation.conversation_type === 'patient' ? 'Patientengespräch' : 'Prüfergespräch'}
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* Detailed Evaluations */}
            {selectedEvaluation.patient_evaluation && (
              <View style={styles.modalEvaluationSection}>
                <View style={styles.modalSectionHeader}>
                  <View style={styles.modalSectionIconContainer}>
                    <Text style={styles.modalSectionIcon}>📋</Text>
                  </View>
                  <Text style={styles.modalSectionTitle}>Detaillierte Bewertung</Text>
                </View>
                <View style={styles.modalContentCard}>
                  {renderParsedEvaluation(selectedEvaluation.patient_evaluation)}
                </View>
              </View>
            )}

            {selectedEvaluation.examiner_evaluation && (
              <View style={styles.modalEvaluationSection}>
                <View style={styles.modalSectionHeader}>
                  <View style={styles.modalSectionIconContainer}>
                    <Text style={styles.modalSectionIcon}>👨‍⚕️</Text>
                  </View>
                  <Text style={styles.modalSectionTitle}>Prüfer-Feedback</Text>
                </View>
                <View style={styles.modalContentCard}>
                  {renderParsedEvaluation(selectedEvaluation.examiner_evaluation)}
                </View>
              </View>
            )}

            {selectedEvaluation.evaluation && (
              <View style={styles.modalEvaluationSection}>
                <View style={styles.modalSectionHeader}>
                  <View style={styles.modalSectionIconContainer}>
                    <Text style={styles.modalSectionIcon}>📊</Text>
                  </View>
                  <Text style={styles.modalSectionTitle}>Zusammenfassung</Text>
                </View>
                <View style={styles.modalContentCard}>
                  {renderParsedEvaluation(selectedEvaluation.evaluation)}
                </View>
              </View>
            )}
            
            <View style={styles.modalBottomSpacer} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
      <TouchableOpacity 
        key={evaluation.id} 
        style={styles.modernEvaluationCard}
        onPress={() => openEvaluationModal(evaluation)}
        activeOpacity={0.7}
      >
        <View style={styles.modernCardGradient}>
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
            
            <View style={styles.modernViewButton}>
              <Text style={styles.modernViewText}>Antippen zum Anzeigen</Text>
              <Maximize2 size={16} color="#E2827F" />
            </View>
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
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIconContainer}>
                        <Text style={styles.sectionIcon}>📋</Text>
                      </View>
                      <Text style={styles.modernSectionTitle}>Detaillierte Bewertung</Text>
                    </View>
                    <View style={styles.evaluationContentContainer}>
                      <ScrollView style={styles.modernEvaluationScrollView} nestedScrollEnabled>
                        {renderParsedEvaluation(evaluation.patient_evaluation)}
                      </ScrollView>
                    </View>
                  </View>
                )}
                
                {evaluation.examiner_evaluation && (
                  <View style={styles.modernEvaluationSection}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIconContainer}>
                        <Text style={styles.sectionIcon}>👨‍⚕️</Text>
                      </View>
                      <Text style={styles.modernSectionTitle}>Prüfer-Feedback</Text>
                    </View>
                    <View style={styles.evaluationContentContainer}>
                      <ScrollView style={styles.modernEvaluationScrollView} nestedScrollEnabled>
                        {renderParsedEvaluation(evaluation.examiner_evaluation)}
                      </ScrollView>
                    </View>
                  </View>
                )}

                {evaluation.evaluation && (
                  <View style={styles.modernEvaluationSection}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIconContainer}>
                        <Text style={styles.sectionIcon}>📊</Text>
                      </View>
                      <Text style={styles.modernSectionTitle}>Zusammenfassung</Text>
                    </View>
                    <View style={styles.evaluationContentContainer}>
                      <ScrollView style={styles.modernEvaluationScrollView} nestedScrollEnabled>
                        {renderParsedEvaluation(evaluation.evaluation)}
                      </ScrollView>
                    </View>
                  </View>
                )}
              </LinearGradient>
            </View>
          )}
        </View>
      </TouchableOpacity>
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
      <View style={styles.gradientBackground} />
      
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
              <BarChart3 size={24} color="#B87E70" />
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
                <Calendar size={48} color="#E2827F" />
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
      
      {/* Evaluation Modal */}
      {renderEvaluationModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modernContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#FFFFFF',
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
    color: '#B8755C',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modernSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
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
    backgroundColor: '#F9F6F2',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: 'rgba(181,87,64,0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(184, 126, 112, 0.2)',
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
    backgroundColor: '#F9F6F2',
    borderRadius: 24,
    shadowColor: 'rgba(181,87,64,0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(184, 126, 112, 0.2)',
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
    backgroundColor: '#F9F6F2',
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
    backgroundColor: '#E2827F',
    shadowColor: 'rgba(226, 130, 127, 0.4)',
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
    marginBottom: 20, // Increased from 16px for better breathing room
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  modernCardGradient: {
    borderRadius: 20,
    padding: 24, // Increased from 20px for better breathing room
    borderWidth: 1,
    borderColor: 'rgba(184, 126, 112, 0.2)',
    backgroundColor: '#F9F6F2',
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
    backgroundColor: '#F9F6F2',
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
  modernViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(226, 130, 127, 0.1)',
    gap: 6,
  },
  modernViewText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#E2827F',
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
    padding: 20,
  },
  modernScoreSection: {
    alignItems: 'center',
    marginBottom: 20,
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
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionIcon: {
    fontSize: 16,
  },
  modernSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    flex: 1,
  },
  evaluationContentContainer: {
    backgroundColor: '#fafbfc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modernEvaluationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  modernEvaluationScrollView: {
    maxHeight: 180,
  },

  // Parsed Evaluation Sections
  parsedSection: {
    marginBottom: 24, // Increased from 16px for better breathing room
    backgroundColor: '#FAFBFC', // Subtle background for better contrast
    borderRadius: 12,
    padding: 16, // Added padding for better spacing
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  parsedSectionTitle: {
    fontSize: 15, // Increased from 13px
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '700', // Stronger weight for better hierarchy
    color: '#059669',
    marginBottom: 12, // Increased from 6px
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  parsedSectionContentContainer: {
    paddingLeft: 4,
  },
  parsedSectionContent: {
    fontSize: 16, // Increased from 14px as requested
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    color: '#1F2937', // Darker for better contrast
    lineHeight: 25.6, // 1.6 ratio as requested (16 * 1.6)
    letterSpacing: 0.2,
  },

  // Enhanced Text Components
  enhancedTextContainer: {
    gap: 16, // Spacing between paragraphs
  },
  enhancedBodyText: {
    fontSize: 16, // Main body text at 16px
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    color: '#1F2937',
    lineHeight: 25.6, // 1.6 line height
    marginBottom: 16, // Space between paragraphs
    letterSpacing: 0.2,
  },
  enhancedBoldText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '700', // Bold for key terms
    color: '#B15740', // Medical app accent color for emphasis
    lineHeight: 25.6,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  enhancedListItem: {
    marginBottom: 12,
    paddingLeft: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#B87E70', // Medical app color
    backgroundColor: '#FDF8F6', // Very subtle background
    paddingVertical: 8,
    borderRadius: 6,
  },
  enhancedListText: {
    fontSize: 15, // Slightly smaller for lists
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    color: '#374151',
    lineHeight: 24, // 1.6 ratio
    letterSpacing: 0.2,
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
    borderColor: 'rgba(226, 130, 127, 0.3)',
    borderStyle: 'dashed',
    backgroundColor: '#F9F6F2',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#E2827F',
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

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F9F6F2',
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalScoreSection: {
    marginVertical: 20,
  },
  modalScoreGradient: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  modalScoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  modalScoreTextContainer: {
    flex: 1,
  },
  modalScoreText: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginBottom: 4,
  },
  modalScoreStatus: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInfoCard: {
    marginBottom: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  modalInfoGradient: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  modalInfoText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    flex: 1,
  },
  modalEvaluationSection: {
    marginBottom: 24,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  modalSectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalSectionIcon: {
    fontSize: 20,
  },
  modalSectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    flex: 1,
  },
  modalContentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  modalBottomSpacer: {
    height: 40,
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