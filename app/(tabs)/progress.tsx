import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, SafeAreaView, TouchableOpacity, Platform, Modal } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Award, Calendar, Target, BarChart3, Users, Clock, Trophy, ChevronRight, X, Maximize2, Menu as MenuIcon } from 'lucide-react-native';
import Menu from '@/components/ui/Menu';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';
import EvaluationDetailScreen from '@/components/evaluation/EvaluationDetailScreen';
import EvaluationWebView from '@/components/evaluation/EvaluationWebView';
import { parseEvaluation } from '@/utils/parseEvaluation';
import type { Evaluation as ParsedEvaluation } from '@/types/evaluation';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '@/constants/tokens';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
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

// Chart-specific colors (derived from MEDICAL_COLORS)
const CHART_COLORS = {
  chartGradient: MEDICAL_COLORS.mintGreen, // #FDF7F6 - Very light coral for chart fill
  gridColor: '#f0f0f0', // Light gray for chart grid
  border: 'rgba(184, 126, 112, 0.2)', // Chart border with transparency
  success: '#66BB6A', // Green for scores >= 60
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
  html_report?: string | null; // NEW: Pre-generated HTML report from Make.com
}

export default function ProgressScreen() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [activeTab, setActiveTab] = useState<'KP' | 'FSP'>('KP');
  const [chartData, setChartData] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
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

  // FIX: Memoize chart data preparation to prevent expensive recalculations (300-500ms → ~50ms)
  const prepareChartData = useCallback(() => {
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
  }, [evaluations]);

  const getFilteredEvaluations = () => {
    return evaluations
      .filter(evaluation => evaluation.exam_type === activeTab)
      .slice(0, 7);
  };


  // FIX: Memoize chart rendering to prevent expensive Victory re-renders (300-500ms → ~50ms)
  const renderChart = useMemo(() => {
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
                fill: activeTab === 'KP' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                fillOpacity: 1,
                stroke: activeTab === 'KP' ? '#6366F1' : '#EC4899',
                strokeWidth: 3
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
            size={6}
            style={{
              data: {
                fill: activeTab === 'KP' ? '#6366F1' : '#EC4899',
                stroke: '#fff',
                strokeWidth: 2
              }
            }}
          />
        </VictoryChart>
      </View>
    );
  }, [chartData, activeTab]); // Only re-render when chart data or active tab changes


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

    const evaluationType = `${selectedEvaluation.exam_type} - ${
      selectedEvaluation.conversation_type === 'patient' ? 'Patientengespräch' : 'Prüfergespräch'
    }`;

    console.log('Selected Evaluation:', selectedEvaluation);
    console.log('Has HTML Report:', !!selectedEvaluation.html_report);
    console.log('HTML Report Length:', selectedEvaluation.html_report?.length || 0);

    // NEW APPROACH: Try HTML report first (pre-generated from Make.com)
    if (selectedEvaluation.html_report && selectedEvaluation.html_report.trim().length > 0) {
      console.log('Using HTML Report (NEW)');
      return (
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalVisible}
          onRequestClose={closeEvaluationModal}
          presentationStyle="fullScreen"
        >
          <EvaluationWebView
            htmlReport={selectedEvaluation.html_report}
            onClose={closeEvaluationModal}
            evaluationType={evaluationType}
            showLegacyWarning={false}
          />
        </Modal>
      );
    }

    // OLD APPROACH: Parse text evaluation (for backward compatibility)
    const evaluationText = selectedEvaluation.patient_evaluation ||
                          selectedEvaluation.examiner_evaluation ||
                          selectedEvaluation.evaluation ||
                          '';

    console.log('Evaluation fields:', {
      hasPatientEval: !!selectedEvaluation.patient_evaluation,
      hasExaminerEval: !!selectedEvaluation.examiner_evaluation,
      hasEvaluation: !!selectedEvaluation.evaluation,
      patientEvalLength: selectedEvaluation.patient_evaluation?.length || 0,
      examinerEvalLength: selectedEvaluation.examiner_evaluation?.length || 0,
      evaluationLength: selectedEvaluation.evaluation?.length || 0,
    });

    // If no evaluation data at all, show error
    if (!evaluationText || evaluationText.trim().length === 0) {
      console.error('No evaluation data found in selectedEvaluation');
      return (
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalVisible}
          onRequestClose={closeEvaluationModal}
          presentationStyle="fullScreen"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Keine Bewertung verfügbar</Text>
              <TouchableOpacity onPress={closeEvaluationModal}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Inter-Regular', color: '#6B7280', textAlign: 'center' }}>
                Für diese Prüfung ist keine Bewertung vorhanden.
              </Text>
              <TouchableOpacity onPress={closeEvaluationModal} style={{ marginTop: 24, backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
                <Text style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' }}>Schließen</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      );
    }

    // OLD EVALUATION: Show legacy warning (suggest re-running simulation for new format)
    // Uncomment this block to show warning for old evaluations
    /*
    console.log('Using Legacy Text Evaluation (OLD) - showing warning');
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={closeEvaluationModal}
        presentationStyle="fullScreen"
      >
        <EvaluationWebView
          htmlReport=""
          onClose={closeEvaluationModal}
          evaluationType={evaluationType}
          showLegacyWarning={true}
        />
      </Modal>
    );
    */

    // FALLBACK: Use old parsing method for backward compatibility
    try {
      console.log('Using Legacy Text Evaluation (OLD) - parsing with old method');

      // Parse the evaluation text into structured data
      const parsedEvaluation = parseEvaluation(
        evaluationText,
        selectedEvaluation.id,
        selectedEvaluation.created_at
      );

      console.log('Parsed Evaluation:', parsedEvaluation);

      // Override the evaluation type with the actual exam type
      parsedEvaluation.evaluationType = evaluationType;

      // Override the score with the actual score from the database
      parsedEvaluation.score.total = selectedEvaluation.score;
      parsedEvaluation.score.percentage = selectedEvaluation.score;

      return (
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalVisible}
          onRequestClose={closeEvaluationModal}
          presentationStyle="fullScreen"
        >
          <EvaluationDetailScreen
            evaluation={parsedEvaluation}
            onClose={closeEvaluationModal}
          />
        </Modal>
      );
    } catch (error) {
      console.error('Error parsing evaluation:', error);

      // Fallback to raw text if parsing fails
      return (
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalVisible}
          onRequestClose={closeEvaluationModal}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bewertung Details</Text>
              <TouchableOpacity onPress={closeEvaluationModal}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.modalContentCard}>
                <Text style={styles.modalInfoText}>Score: {selectedEvaluation.score}/100</Text>
                <Text style={styles.parsedSectionContent}>{evaluationText}</Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      );
    }
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

      {/* Modern Header - Same as Homepage */}
      <View style={styles.appHeader}>
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuOpen(true)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(251, 146, 60, 0.15)', 'rgba(239, 68, 68, 0.10)']}
                style={styles.menuButtonGradient}
              >
                <MenuIcon size={24} color="#FB923C" />
              </LinearGradient>
            </TouchableOpacity>
            <Logo size="medium" variant="medical" textColor="#FB923C" animated={true} />
            <UserAvatar size="medium" />
          </View>
        </LinearGradient>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Page Title Section */}
        <View style={styles.pageTitleSection}>
          <Text style={styles.pageTitle}>Lernfortschritt</Text>
          <Text style={styles.pageSubtitle}>
            Verfolgen Sie Ihre Entwicklung in der medizinischen Ausbildung
          </Text>
        </View>

        {/* Stats Overview Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrapperPurple}>
              <Award size={28} color="#8B5CF6" />
            </View>
            <View style={styles.statTextContent}>
              <Text style={styles.statValue}>{averageScore}%</Text>
              <Text style={styles.statLabel}>Durchschnitt</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconWrapperPink}>
              <Target size={28} color="#EC4899" />
            </View>
            <View style={styles.statTextContent}>
              <Text style={styles.statValue}>{passedCount}/{totalAttempts}</Text>
              <Text style={styles.statLabel}>Bestanden</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconWrapperCyan}>
              <TrendingUp size={28} color="#06B6D4" />
            </View>
            <View style={styles.statTextContent}>
              <Text style={styles.statValue}>
                {chartData ? (chartData.KP?.length || 0) + (chartData.FSP?.length || 0) : 0}
              </Text>
              <Text style={styles.statLabel}>Versuche</Text>
            </View>
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
                  { backgroundColor: activeTab === 'KP' ? '#6366F1' : '#EC4899' }
                ]} />
                <Text style={styles.legendText}>{activeTab} Score</Text>
              </View>
            </View>
          </View>
          {renderChart}
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

      {/* Menu */}
      <Menu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modernContainer: {
    flex: 1,
    backgroundColor: MEDICAL_COLORS.white,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
    backgroundColor: MEDICAL_COLORS.white,
  },
  scrollView: {
    flex: 1,
  },

  // App Header Styles (Same as Homepage)
  appHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 1000,
  },
  headerGradient: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: SPACING.md,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  menuButtonGradient: {
    padding: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Page Title Section
  pageTitleSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  pageTitle: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.secondary,
    marginBottom: SPACING.xs + 2,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm + 1,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.slate500,
    lineHeight: 22,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: SPACING.lg,
    padding: SPACING.xxl,
    gap: SPACING.lg,
    ...SHADOWS.md,
  },
  statIconWrapperPurple: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconWrapperPink: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconWrapperCyan: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#CFFAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextContent: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.slate900,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.slate500,
  },

  // Modern Chart
  modernChartContainer: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xxxl,
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: SPACING.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: SPACING.sm },
    shadowOpacity: 0.1,
    shadowRadius: SPACING.xxl,
    elevation: 8,
    padding: SPACING.xxxl,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  chartTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.slate900,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legendDot: {
    width: SPACING.md,
    height: SPACING.md,
    borderRadius: SPACING.xs + 2,
  },
  legendText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.slate500,
  },

  // Enhanced Chart Styles
  chartWrapper: {
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    margin: SPACING.lg,
  },
  emptyChartText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.slate500,
  },

  // Modern Tabs
  modernTabsContainer: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.slate900,
    marginBottom: SPACING.xxl,
    letterSpacing: -0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    borderRadius: SPACING.lg,
    backgroundColor: MEDICAL_COLORS.slate100,
  },
  activeTab: {
    backgroundColor: '#EC4899',
    shadowColor: 'rgba(236, 72, 153, 0.4)',
    shadowOffset: { width: 0, height: SPACING.sm },
    shadowOpacity: 0.3,
    shadowRadius: SPACING.lg,
    elevation: 8,
  },
  tabText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.slate500,
  },
  activeTabText: {
    color: MEDICAL_COLORS.white,
  },

  // Modern Cards
  modernCardsContainer: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xxxl,
  },
  modernEvaluationCard: {
    marginBottom: SPACING.lg,
    borderRadius: SPACING.lg,
    ...SHADOWS.md,
  },
  modernCardGradient: {
    borderRadius: SPACING.lg,
    padding: SPACING.xxl,
    backgroundColor: MEDICAL_COLORS.white,
  },
  modernCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  modernCardLeft: {
    flex: 1,
  },
  modernDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs + 2,
  },
  modernCardDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.slate500,
  },
  modernCardType: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.slate900,
  },
  modernCardRight: {
    alignItems: 'flex-end',
  },
  modernScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: SPACING.md,
    marginBottom: SPACING.xs,
  },
  modernScoreText: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: 'Inter-Bold',
  },
  modernScoreMax: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.slate500,
  },
  modernPassStatus: {
    fontSize: TYPOGRAPHY.fontSize.xs,
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
    marginRight: SPACING.lg,
  },
  progressBar: {
    height: SPACING.xs + 2,
    backgroundColor: MEDICAL_COLORS.slate100,
    borderRadius: SPACING.xs - 1,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: SPACING.xs,
  },
  progressText: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.slate500,
  },
  modernViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    gap: SPACING.xs + 2,
  },
  modernViewText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: 'Inter-SemiBold',
    color: MEDICAL_COLORS.warmRed,
  },
  chevron: {
    transform: [{ rotate: '90deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '-90deg' }],
  },

  // Expanded Details
  modernEvaluationDetails: {
    marginTop: SPACING.lg,
    borderRadius: SPACING.lg,
    overflow: 'hidden',
  },
  detailsGradient: {
    padding: SPACING.xl,
  },
  modernScoreSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modernScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.xl,
    gap: SPACING.xs + 2,
  },
  modernScoreBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modernEvaluationSection: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionIconContainer: {
    width: SPACING.xxxl,
    height: SPACING.xxxl,
    borderRadius: SPACING.sm,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  sectionIcon: {
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  modernSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.slate900,
    flex: 1,
  },
  evaluationContentContainer: {
    backgroundColor: '#fafbfc',
    borderRadius: SPACING.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modernEvaluationText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.slate700,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  modernEvaluationScrollView: {
    maxHeight: 180,
  },

  // Parsed Evaluation Sections
  parsedSection: {
    marginBottom: SPACING.xxl,
    backgroundColor: '#FAFBFC',
    borderRadius: SPACING.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  parsedSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm + 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#059669',
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  parsedSectionContentContainer: {
    paddingLeft: SPACING.xs,
  },
  parsedSectionContent: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    color: MEDICAL_COLORS.slate900,
    lineHeight: 25.6,
    letterSpacing: 0.2,
  },

  // Enhanced Text Components
  enhancedTextContainer: {
    gap: SPACING.lg,
  },
  enhancedBodyText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    color: MEDICAL_COLORS.slate900,
    lineHeight: 25.6,
    marginBottom: SPACING.lg,
    letterSpacing: 0.2,
  },
  enhancedBoldText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.primaryDark,
    lineHeight: 25.6,
    marginBottom: SPACING.sm,
    letterSpacing: 0.2,
  },
  enhancedListItem: {
    marginBottom: SPACING.md,
    paddingLeft: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: MEDICAL_COLORS.secondary,
    backgroundColor: '#FDF8F6',
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.xs + 2,
  },
  enhancedListText: {
    fontSize: TYPOGRAPHY.fontSize.sm + 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    color: MEDICAL_COLORS.slate700,
    lineHeight: 24,
    letterSpacing: 0.2,
  },

  // Empty State
  modernEmptyState: {
    marginTop: SPACING.xl,
  },
  emptyStateGradient: {
    alignItems: 'center',
    padding: SPACING.xxxxl,
    borderRadius: SPACING.xl,
    borderWidth: 2,
    borderColor: 'rgba(226, 130, 127, 0.3)',
    borderStyle: 'dashed',
    backgroundColor: MEDICAL_COLORS.offWhite,
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.primary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
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