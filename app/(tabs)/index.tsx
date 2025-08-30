import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, BookOpen, Library, Menu as MenuIcon, Lightbulb, HelpCircle, CheckCircle, XCircle, Trophy, Flame, Target, Brain, Zap, Clock, MapPin, PlayCircle, Sparkles, BarChart3 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import Menu from '@/components/ui/Menu';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from '@/components/ui/Logo';

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
  correct_answer?: 'a' | 'b' | 'c' | 'A' | 'B' | 'C';
  correct_choice?: 'a' | 'b' | 'c' | 'A' | 'B' | 'C';
  explanation?: string;
  category?: string;
}

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
  correct_answer?: 'a' | 'b' | 'c' | 'A' | 'B' | 'C';
  correct_choice?: 'a' | 'b' | 'c' | 'A' | 'B' | 'C';
  explanation?: string;
  category?: string;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Supabase-integrated states
  const [dailyTip, setDailyTip] = useState<DailyTip | null>(null);
  const [dailyQuestion, setDailyQuestion] = useState<DailyQuestion | null>(null);
  
  // New gamification states
  const [userStats, setUserStats] = useState<UserStats>({
    streak: 5,
    average: 73,
    completed: 12,
    bestScore: 89,
    totalXP: 2450,
    level: 5,
    rank: 'Medizinstudent'
  });
  
  // Fallback static data for Today's Focus
  const [todaysFocus] = useState<TodaysFocus>({
    title: 'Heutiger Fokus: Anamnese 🩺',
    description: 'Meistere die Kunst der Patientenbefragung',
    progress: 3,
    total: 5,
    timeEstimate: '~20 Min. verbleibend',
    category: 'Klinische Fertigkeiten'
  });
  
  // Static challenge for fallback
  const [staticChallenge] = useState<DailyChallenge>({
    title: 'Tägliche Herausforderung 🎯',
    question: 'Was sind die Hauptsymptome einer Appendizitis?',
    difficulty: 'Mittel',
    points: 50,
    timeLimit: '2 Min.',
    attempted: false,
    streak: 3,
    options: [
      'Rechter Unterbauchschmerz, Übelkeit, Fieber',
      'Linker Oberbauchschmerz, Sodbrennen',
      'Rückenschmerzen, Müdigkeit'
    ],
    correctAnswer: 0,
    explanation: 'Appendizitis zeigt typischerweise McBurney-Punkt-Schmerz, begleitet von Übelkeit und erhöhter Temperatur.'
  });
  
  const [learningPath] = useState<LearningNode[]>([
    { name: 'Grundlagen', completed: true, inProgress: false, locked: false, score: 75 },
    { name: 'Anamnese', completed: false, inProgress: true, locked: false, progress: 60 },
    { name: 'Untersuchung', completed: false, inProgress: false, locked: false },
    { name: 'Diagnose', completed: false, inProgress: false, locked: true },
    { name: 'Therapie', completed: false, inProgress: false, locked: true }
  ]);
  
  const [upcomingEvents] = useState<UpcomingEvent[]>([
    { date: 'Morgen', title: 'KP Übungsprüfung', type: 'practice', icon: '📝' },
    { date: 'In 3 Tagen', title: 'Wochenabschluss', type: 'milestone', icon: '🏁' },
    { date: 'In 7 Tagen', title: 'Prüfungssimulation', type: 'exam', icon: '🎓' }
  ]);
  
  const [showAchievements, setShowAchievements] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showChallengeResult, setShowChallengeResult] = useState(false);
  const [selectedQuestionAnswer, setSelectedQuestionAnswer] = useState<'a' | 'b' | 'c' | null>(null);
  const [showQuestionResult, setShowQuestionResult] = useState(false);
  const [showDailyReward, setShowDailyReward] = useState(false);
  
  // Animation Values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [streakPulse] = useState(new Animated.Value(1));

  useEffect(() => {
    initializeAnimations();
    loadUserData();
    loadDailyContent();
    checkDailyReward();
  }, [user]);
  
  const initializeAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
    
    // Pulsing streak animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(streakPulse, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(streakPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    );
    pulseAnimation.start();
  };
  
  const loadUserData = async () => {
    try {
      setLoading(true);
      
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
          
        if (error) throw error;
        setUserData(data);
        
        // Load user stats from various tables
        await loadUserStats();
      }
    } catch (error) {
      console.error('Error loading dashboard data', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadUserStats = async () => {
    // This would typically fetch from multiple tables
    // For now using mock data, but in production would load:
    // - Login streak from login_activity
    // - Scores from evaluation_sessions  
    // - XP and level from user progress table
    // - Achievements from user_achievements table
  };
  
  const loadDailyContent = async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      console.log('Fetching daily content for date:', today);

      // Fetch today's tip
      const { data: tipData, error: tipError } = await supabase
        .from('daily_tips')
        .select('*')
        .eq('date', today)
        .maybeSingle();

      if (tipError) {
        console.error('Error fetching daily tip:', tipError);
      } else {
        console.log('Tip data received:', tipData);
      }
      
      setDailyTip(tipData); // Will be null if no tip exists for today

      // Fetch today's question
      const { data: questionData, error: questionError } = await supabase
        .from('daily_questions')
        .select('*')
        .eq('date', today)
        .maybeSingle();

      if (questionError) {
        console.error('Error fetching daily question:', questionError);
      } else {
        console.log('Question data received:', questionData);
        if (questionData) {
          console.log('Question columns:', Object.keys(questionData));
        }
      }
      
      setDailyQuestion(questionData); // Will be null if no question exists for today
      
      console.log('Daily content found:', { 
        tipExists: !!tipData, 
        questionExists: !!questionData 
      });
    } catch (error) {
      console.error('Error loading daily content:', error);
    }
  };
  
  const checkDailyReward = () => {
    const lastRewardDate = localStorage?.getItem('lastRewardDate');
    const today = new Date().toDateString();
    
    if (lastRewardDate !== today && userStats.streak > 0) {
      setTimeout(() => setShowDailyReward(true), 2000);
    }
  };

  // Get user's first name from full name
  const getFirstName = () => {
    if (!userData || !userData.name) return 'Zaid57';
    return userData.name.split(' ')[0];
  };
  
  // Dynamic greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = getFirstName();
    
    if (hour < 12) return `Guten Morgen, ${name}! 🌅`;
    if (hour < 18) return `Guten Tag, ${name}! ☀️`;
    return `Guten Abend, ${name}! 🌙`;
  };
  
  // Motivational subtitle based on user progress
  const getMotivation = () => {
    if (userStats.streak > 0) return `${userStats.streak} Tage Lernsträhne - Weiter so! 🔥`;
    if (userStats.average >= 60) return `Durchschnitt: ${userStats.average}% - Großartige Leistung! 🎯`;
    return 'Bereit für deine nächste Herausforderung? 💪';
  };
  
  // Get level progress
  const getLevelProgress = () => {
    const currentLevelXP = (userStats.level - 1) * 500;
    const nextLevelXP = userStats.level * 500;
    const progress = ((userStats.totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(100, Math.max(0, progress));
  };
  
  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Leicht': return MEDICAL_COLORS.success;
      case 'Mittel': return MEDICAL_COLORS.warning;
      case 'Schwer': return MEDICAL_COLORS.danger;
      default: return MEDICAL_COLORS.gray;
    }
  };
  
  // Get trending indicator
  const getTrendingIcon = (value: number, isPositive: boolean = true) => {
    return isPositive ? '↗️' : '↘️';
  };
  
  // Handle interactions
  const handleCardPress = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    switch (action) {
      case 'simulation':
        router.push('/simulation');
        break;
      case 'continue':
        router.push('/library');
        break;
      case 'random':
        Alert.alert('🎲', 'Zufälliges Thema wird geladen...');
        break;
      case 'progress':
        router.push('/progress');
        break;
      default:
        break;
    }
  };

  const handleChallengeAnswer = (answerIndex: number) => {
    if (showChallengeResult) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedAnswer(answerIndex);
    setShowChallengeResult(true);
    
    // Add XP and update streak if correct
    if (answerIndex === staticChallenge.correctAnswer) {
      setUserStats(prev => ({
        ...prev,
        totalXP: prev.totalXP + staticChallenge.points
      }));
    }
  };
  
  const resetChallenge = () => {
    setSelectedAnswer(null);
    setShowChallengeResult(false);
  };
  
  const handleQuestionAnswer = (answer: 'a' | 'b' | 'c') => {
    if (showQuestionResult || !dailyQuestion) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedQuestionAnswer(answer);
    setShowQuestionResult(true);
    
    // Add XP if correct
    const correctAnswer = (dailyQuestion.correct_choice || dailyQuestion.correct_answer)?.toLowerCase();
    if (answer === correctAnswer) {
      setUserStats(prev => ({
        ...prev,
        totalXP: prev.totalXP + 25 // Award 25 XP for daily question
      }));
    }
  };
  
  const resetQuestion = () => {
    setSelectedQuestionAnswer(null);
    setShowQuestionResult(false);
  };
  
  const getAnswerButtonStyle = (option: 'a' | 'b' | 'c') => {
    if (!showQuestionResult) {
      return selectedQuestionAnswer === option ? 'selectedOption' : 'challengeOption';
    }
    
    const correctAnswer = (dailyQuestion?.correct_choice || dailyQuestion?.correct_answer)?.toLowerCase();
    
    if (option === correctAnswer) {
      return 'correctOption';
    }
    
    if (selectedQuestionAnswer === option && option !== correctAnswer) {
      return 'wrongOption';
    }
    
    return 'challengeOption';
  };
  
  const getAnswerIcon = (option: 'a' | 'b' | 'c') => {
    if (!showQuestionResult || !dailyQuestion) return null;
    
    const correctAnswer = (dailyQuestion.correct_choice || dailyQuestion.correct_answer)?.toLowerCase();
    
    if (option === correctAnswer) {
      return <CheckCircle size={20} color={MEDICAL_COLORS.white} />;
    }
    
    if (selectedQuestionAnswer === option && option !== correctAnswer) {
      return <XCircle size={20} color={MEDICAL_COLORS.white} />;
    }
    
    return null;
  };
  
  const claimDailyReward = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    localStorage?.setItem('lastRewardDate', new Date().toDateString());
    setUserStats(prev => ({
      ...prev,
      totalXP: prev.totalXP + (prev.streak * 10)
    }));
    setShowDailyReward(false);
  };

  // Quick actions data
  const quickActions: QuickAction[] = [
    {
      icon: '🚀',
      title: 'Schnellsimulation',
      subtitle: '15 Min. Übung',
      gradient: MEDICAL_COLORS.gradient3,
      route: 'simulation'
    },
    {
      icon: '📖',
      title: 'Weiterlesen',
      subtitle: 'Letztes Kapitel fortsetzen',
      gradient: MEDICAL_COLORS.gradient4,
      route: 'continue'
    },
    {
      icon: '🎲',
      title: 'Zufälliges Thema',
      subtitle: 'Überrasche mich!',
      gradient: MEDICAL_COLORS.gradient2,
      route: 'random'
    },
    {
      icon: '📊',
      title: 'Mein Fortschritt',
      subtitle: 'Detaillierte Statistiken',
      gradient: MEDICAL_COLORS.gradient1,
      route: 'progress'
    }
  ];
  
  // Smart recommendations
  const recommendations: Recommendation[] = [
    {
      title: 'Pharmakologie üben',
      description: 'Schwachstelle erkannt: 23% unter dem Durchschnitt',
      type: 'weak_area',
      confidence: 89
    },
    {
      title: 'Anatomie Kapitel 4',
      description: 'Nutzer wie du verbesserten sich um 20%',
      type: 'similar_users',
      confidence: 76
    }
  ];
  
  // Achievements
  const achievements: Achievement[] = [
    {
      id: 'first_week',
      title: 'Erste Woche',
      description: '7 Tage in Folge gelernt',
      unlocked: userStats.streak >= 7,
      progress: Math.min(userStats.streak, 7),
      maxProgress: 7
    },
    {
      id: 'score_master',
      title: 'Punktemeister',
      description: '90+ Punkte erreichen',
      unlocked: userStats.bestScore >= 90
    },
    {
      id: 'xp_collector',
      title: 'XP Sammler',
      description: '2000 XP erreichen',
      unlocked: userStats.totalXP >= 2000,
      progress: Math.min(userStats.totalXP, 2000),
      maxProgress: 2000
    }
  ];

  const gradientColors = isDarkMode 
    ? ['#1F2937', '#111827', '#0F172A']
    : ['#E3F2FD', '#BBDEFB', '#E1F5FE'];

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: MEDICAL_COLORS.lightGray,
    },
    header: {
      backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    heroSection: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    heroGradient: {
      padding: 24,
      borderRadius: 20,
      marginBottom: 20,
    },
    greetingText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: MEDICAL_COLORS.white,
      marginBottom: 8,
    },
    motivationText: {
      fontSize: 16,
      color: MEDICAL_COLORS.white,
      opacity: 0.9,
      marginBottom: 16,
    },
    levelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    levelInfo: {
      flex: 1,
    },
    levelText: {
      fontSize: 14,
      color: MEDICAL_COLORS.white,
      opacity: 0.8,
    },
    rankText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: MEDICAL_COLORS.white,
    },
    xpContainer: {
      alignItems: 'center',
    },
    xpText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: MEDICAL_COLORS.white,
    },
    xpLabel: {
      fontSize: 12,
      color: MEDICAL_COLORS.white,
      opacity: 0.8,
    },
    progressBar: {
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 3,
      marginTop: 12,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: MEDICAL_COLORS.white,
      borderRadius: 3,
    },
    
    // Quick Stats Styles
    quickStatsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 20,
      gap: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: MEDICAL_COLORS.white,
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    statIcon: {
      marginBottom: 8,
    },
    statNumber: {
      fontSize: 20,
      fontWeight: 'bold',
      color: MEDICAL_COLORS.dark,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: MEDICAL_COLORS.gray,
      textAlign: 'center',
    },
    statTrend: {
      fontSize: 10,
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: MEDICAL_COLORS.dark,
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    
    // Focus Card Styles  
    focusCard: {
      marginHorizontal: 16,
      marginBottom: 20,
      backgroundColor: MEDICAL_COLORS.white,
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    focusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    focusIcon: {
      marginRight: 12,
    },
    focusTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: MEDICAL_COLORS.dark,
      flex: 1,
    },
    focusDescription: {
      fontSize: 14,
      color: MEDICAL_COLORS.gray,
      marginBottom: 16,
      lineHeight: 20,
    },
    focusProgressContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    focusProgressText: {
      fontSize: 14,
      fontWeight: '600',
      color: MEDICAL_COLORS.primary,
    },
    focusTimeText: {
      fontSize: 12,
      color: MEDICAL_COLORS.gray,
    },
    focusProgressBar: {
      height: 8,
      backgroundColor: MEDICAL_COLORS.lightGray,
      borderRadius: 4,
      marginBottom: 16,
      overflow: 'hidden',
    },
    focusProgressFill: {
      height: '100%',
      backgroundColor: MEDICAL_COLORS.success,
      borderRadius: 4,
    },
    focusButton: {
      backgroundColor: MEDICAL_COLORS.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    focusButtonText: {
      color: MEDICAL_COLORS.white,
      fontWeight: 'bold',
      fontSize: 14,
    },
    
    // Challenge Card Styles
    challengeCard: {
      marginHorizontal: 16,
      marginBottom: 20,
      backgroundColor: MEDICAL_COLORS.white,
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    challengeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    challengeIcon: {
      marginRight: 12,
    },
    challengeTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: MEDICAL_COLORS.dark,
      flex: 1,
    },
    challengeBadges: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    difficultyBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    pointsBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: MEDICAL_COLORS.gradientGold[0],
    },
    badgeText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: MEDICAL_COLORS.white,
    },
    challengeQuestion: {
      fontSize: 16,
      color: MEDICAL_COLORS.dark,
      marginBottom: 16,
      lineHeight: 22,
    },
    challengeOptions: {
      gap: 8,
      marginBottom: 16,
    },
    challengeOption: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: MEDICAL_COLORS.lightGray,
      backgroundColor: MEDICAL_COLORS.white,
    },
    selectedOption: {
      borderColor: MEDICAL_COLORS.primary,
      backgroundColor: MEDICAL_COLORS.light,
    },
    correctOption: {
      borderColor: MEDICAL_COLORS.success,
      backgroundColor: '#E8F5E8',
    },
    wrongOption: {
      borderColor: MEDICAL_COLORS.danger,
      backgroundColor: '#FEE8E8',
    },
    optionText: {
      fontSize: 14,
      color: MEDICAL_COLORS.dark,
      flex: 1,
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    challengeResult: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: MEDICAL_COLORS.light,
      marginTop: 16,
    },
    resultText: {
      fontSize: 14,
      color: MEDICAL_COLORS.dark,
      marginBottom: 8,
    },
    explanationText: {
      fontSize: 14,
      color: MEDICAL_COLORS.gray,
      fontStyle: 'italic',
      lineHeight: 20,
    },
    
    // Learning Path Styles
    learningPathContainer: {
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    pathNode: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    nodeIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    completedNode: {
      backgroundColor: MEDICAL_COLORS.success,
    },
    inProgressNode: {
      backgroundColor: MEDICAL_COLORS.primary,
    },
    lockedNode: {
      backgroundColor: MEDICAL_COLORS.gray,
    },
    availableNode: {
      backgroundColor: MEDICAL_COLORS.lightGray,
      borderWidth: 2,
      borderColor: MEDICAL_COLORS.gray,
    },
    nodeContent: {
      flex: 1,
    },
    nodeName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: MEDICAL_COLORS.dark,
      marginBottom: 4,
    },
    nodeProgress: {
      fontSize: 12,
      color: MEDICAL_COLORS.gray,
    },
    pathConnector: {
      width: 2,
      height: 20,
      backgroundColor: MEDICAL_COLORS.lightGray,
      marginLeft: 24,
      marginVertical: -8,
    },
    
    // Quick Actions Styles
    quickActionsGrid: {
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    actionCard: {
      flex: 1,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      minHeight: 120,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    actionIcon: {
      fontSize: 32,
      marginBottom: 8,
    },
    actionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: MEDICAL_COLORS.white,
      textAlign: 'center',
      marginBottom: 4,
    },
    actionSubtitle: {
      fontSize: 11,
      color: MEDICAL_COLORS.white,
      opacity: 0.9,
      textAlign: 'center',
    },
    
    // Events Timeline Styles
    eventsContainer: {
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    eventItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: MEDICAL_COLORS.white,
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    eventIcon: {
      fontSize: 24,
      marginRight: 16,
    },
    eventContent: {
      flex: 1,
    },
    eventTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: MEDICAL_COLORS.dark,
      marginBottom: 2,
    },
    eventDate: {
      fontSize: 12,
      color: MEDICAL_COLORS.gray,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
      />
      
      {/* Header */}
      <View style={dynamicStyles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => setIsMenuOpen(true)}
            style={styles.menuButtonContainer}
          >
            <MenuIcon size={24} color={colors.primary} />
          </TouchableOpacity>
          <Logo size="medium" textColor={isDarkMode ? '#FFFFFF' : undefined} />
          <TouchableOpacity 
            onPress={() => setShowAchievements(true)}
            style={styles.achievementButton}
          >
            <Trophy size={20} color={MEDICAL_COLORS.warning} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            { opacity: fadeAnim },
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Hero Section */}
          <View style={dynamicStyles.heroSection}>
            <LinearGradient
              colors={MEDICAL_COLORS.gradient1}
              style={dynamicStyles.heroGradient}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
            >
              <Text style={dynamicStyles.greetingText}>
                {getGreeting()}
              </Text>
              <Text style={dynamicStyles.motivationText}>
                {getMotivation()}
              </Text>
              
              <View style={dynamicStyles.levelContainer}>
                <View style={dynamicStyles.levelInfo}>
                  <Text style={dynamicStyles.levelText}>Level {userStats.level}</Text>
                  <Text style={dynamicStyles.rankText}>{userStats.rank}</Text>
                </View>
                <View style={dynamicStyles.xpContainer}>
                  <Text style={dynamicStyles.xpText}>{userStats.totalXP}</Text>
                  <Text style={dynamicStyles.xpLabel}>XP</Text>
                </View>
              </View>
              
              <View style={dynamicStyles.progressBar}>
                <View 
                  style={[
                    dynamicStyles.progressFill,
                    { width: `${getLevelProgress()}%` }
                  ]} 
                />
              </View>
            </LinearGradient>
          </View>

          {/* Quick Stats Cards */}
          <View style={dynamicStyles.quickStatsGrid}>
            <Animated.View 
              style={[
                dynamicStyles.statCard,
                { transform: [{ scale: streakPulse }] }
              ]}
            >
              <View style={dynamicStyles.statIcon}>
                <Flame size={24} color={MEDICAL_COLORS.warning} />
              </View>
              <Text style={dynamicStyles.statNumber}>{userStats.streak}</Text>
              <Text style={dynamicStyles.statLabel}>Lernsträhne</Text>
              <Text style={dynamicStyles.statTrend}>🔥 {getTrendingIcon(userStats.streak)}</Text>
            </Animated.View>
            
            <TouchableOpacity 
              style={dynamicStyles.statCard}
              onPress={() => handleCardPress('progress')}
            >
              <View style={dynamicStyles.statIcon}>
                <BarChart3 size={24} color={MEDICAL_COLORS.success} />
              </View>
              <Text style={dynamicStyles.statNumber}>{userStats.average}%</Text>
              <Text style={dynamicStyles.statLabel}>Durchschnitt</Text>
              <Text style={dynamicStyles.statTrend}>📈 {getTrendingIcon(userStats.average)}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={dynamicStyles.statCard}>
              <View style={dynamicStyles.statIcon}>
                <Target size={24} color={MEDICAL_COLORS.primary} />
              </View>
              <Text style={dynamicStyles.statNumber}>{userStats.completed}</Text>
              <Text style={dynamicStyles.statLabel}>Simulationen</Text>
              <Text style={dynamicStyles.statTrend}>⚡ +2</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={dynamicStyles.statCard}>
              <View style={dynamicStyles.statIcon}>
                <Trophy size={24} color={MEDICAL_COLORS.warning} />
              </View>
              <Text style={dynamicStyles.statNumber}>{userStats.bestScore}%</Text>
              <Text style={dynamicStyles.statLabel}>Beste Note</Text>
              <Text style={dynamicStyles.statTrend}>🏆 Neu!</Text>
            </TouchableOpacity>
          </View>

          {/* Database-Driven Daily Tip or Today's Focus */}
          <Text style={dynamicStyles.sectionTitle}>💡 {dailyTip ? 'Tipp des Tages' : 'Heutiger Fokus'}</Text>
          {dailyTip ? (
            <View style={dynamicStyles.focusCard}>
              <View style={dynamicStyles.focusHeader}>
                <Lightbulb size={24} color={MEDICAL_COLORS.warning} style={dynamicStyles.focusIcon} />
                <Text style={dynamicStyles.focusTitle}>Tipp des Tages</Text>
                {dailyTip.category && (
                  <View style={[dynamicStyles.difficultyBadge, { backgroundColor: MEDICAL_COLORS.warning }]}>
                    <Text style={dynamicStyles.badgeText}>{dailyTip.category}</Text>
                  </View>
                )}
              </View>
              <Text style={dynamicStyles.focusDescription}>
                {dailyTip.tip || dailyTip.tip_content || dailyTip.content || 'Kein Tipp-Inhalt verfügbar'}
              </Text>
            </View>
          ) : (
            // Fallback to Today's Focus when no database tip
            <View style={dynamicStyles.focusCard}>
              <View style={dynamicStyles.focusHeader}>
                <Brain size={24} color={MEDICAL_COLORS.primary} style={dynamicStyles.focusIcon} />
                <Text style={dynamicStyles.focusTitle}>{todaysFocus.title}</Text>
              </View>
              <Text style={dynamicStyles.focusDescription}>
                {todaysFocus.description}
              </Text>
              
              <View style={dynamicStyles.focusProgressContainer}>
                <Text style={dynamicStyles.focusProgressText}>
                  {todaysFocus.progress}/{todaysFocus.total} Module abgeschlossen
                </Text>
                <Text style={dynamicStyles.focusTimeText}>
                  {todaysFocus.timeEstimate}
                </Text>
              </View>
              
              <View style={dynamicStyles.focusProgressBar}>
                <View 
                  style={[
                    dynamicStyles.focusProgressFill,
                    { width: `${(todaysFocus.progress / todaysFocus.total) * 100}%` }
                  ]} 
                />
              </View>
              
              <TouchableOpacity 
                style={dynamicStyles.focusButton}
                onPress={() => handleCardPress('continue')}
              >
                <Text style={dynamicStyles.focusButtonText}>Weiter lernen →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Database-Driven Daily Question */}
          {dailyQuestion && (
            <>
              <Text style={dynamicStyles.sectionTitle}>❓ Frage des Tages</Text>
              <View style={dynamicStyles.challengeCard}>
                <View style={dynamicStyles.challengeHeader}>
                  <HelpCircle size={24} color={MEDICAL_COLORS.primary} style={dynamicStyles.challengeIcon} />
                  <Text style={dynamicStyles.challengeTitle}>Frage des Tages</Text>
                </View>
                
                <View style={dynamicStyles.challengeBadges}>
                  {dailyQuestion.category && (
                    <View style={[dynamicStyles.difficultyBadge, { backgroundColor: MEDICAL_COLORS.primary }]}>
                      <Text style={dynamicStyles.badgeText}>{dailyQuestion.category}</Text>
                    </View>
                  )}
                  <View style={dynamicStyles.pointsBadge}>
                    <Text style={dynamicStyles.badgeText}>25 XP</Text>
                  </View>
                </View>
                
                <Text style={dynamicStyles.challengeQuestion}>
                  {dailyQuestion.question}
                </Text>
                
                <View style={dynamicStyles.challengeOptions}>
                  <TouchableOpacity
                    style={[
                      dynamicStyles.challengeOption,
                      selectedQuestionAnswer === 'a' && dynamicStyles.selectedOption,
                      showQuestionResult && getAnswerButtonStyle('a') === 'correctOption' && dynamicStyles.correctOption,
                      showQuestionResult && getAnswerButtonStyle('a') === 'wrongOption' && dynamicStyles.wrongOption
                    ]}
                    onPress={() => handleQuestionAnswer('a')}
                    disabled={showQuestionResult}
                  >
                    <View style={dynamicStyles.optionContent}>
                      <Text style={dynamicStyles.optionText}>
                        {dailyQuestion.choice_a || dailyQuestion.option_a || 'Option A'}
                      </Text>
                      {getAnswerIcon('a')}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      dynamicStyles.challengeOption,
                      selectedQuestionAnswer === 'b' && dynamicStyles.selectedOption,
                      showQuestionResult && getAnswerButtonStyle('b') === 'correctOption' && dynamicStyles.correctOption,
                      showQuestionResult && getAnswerButtonStyle('b') === 'wrongOption' && dynamicStyles.wrongOption
                    ]}
                    onPress={() => handleQuestionAnswer('b')}
                    disabled={showQuestionResult}
                  >
                    <View style={dynamicStyles.optionContent}>
                      <Text style={dynamicStyles.optionText}>
                        {dailyQuestion.choice_b || dailyQuestion.option_b || 'Option B'}
                      </Text>
                      {getAnswerIcon('b')}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      dynamicStyles.challengeOption,
                      selectedQuestionAnswer === 'c' && dynamicStyles.selectedOption,
                      showQuestionResult && getAnswerButtonStyle('c') === 'correctOption' && dynamicStyles.correctOption,
                      showQuestionResult && getAnswerButtonStyle('c') === 'wrongOption' && dynamicStyles.wrongOption
                    ]}
                    onPress={() => handleQuestionAnswer('c')}
                    disabled={showQuestionResult}
                  >
                    <View style={dynamicStyles.optionContent}>
                      <Text style={dynamicStyles.optionText}>
                        {dailyQuestion.choice_c || dailyQuestion.option_c || 'Option C'}
                      </Text>
                      {getAnswerIcon('c')}
                    </View>
                  </TouchableOpacity>
                </View>

                {showQuestionResult && (
                  <View style={dynamicStyles.challengeResult}>
                    <Text style={dynamicStyles.resultText}>
                      {selectedQuestionAnswer === (dailyQuestion.correct_choice || dailyQuestion.correct_answer)?.toLowerCase() 
                        ? '🎉 Richtig! +25 XP' 
                        : '❌ Leider falsch.'}
                    </Text>
                    {dailyQuestion.explanation && (
                      <Text style={dynamicStyles.explanationText}>
                        {dailyQuestion.explanation}
                      </Text>
                    )}
                    <TouchableOpacity 
                      style={[dynamicStyles.focusButton, { marginTop: 12, backgroundColor: MEDICAL_COLORS.gray }]}
                      onPress={resetQuestion}
                    >
                      <Text style={dynamicStyles.focusButtonText}>Neue Frage</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Daily Challenge */}
          <Text style={dynamicStyles.sectionTitle}>🏆 Tägliche Herausforderung</Text>
          <View style={dynamicStyles.challengeCard}>
            <View style={dynamicStyles.challengeHeader}>
              <Zap size={24} color={MEDICAL_COLORS.warning} style={dynamicStyles.challengeIcon} />
              <Text style={dynamicStyles.challengeTitle}>{staticChallenge.title}</Text>
            </View>
            
            <View style={dynamicStyles.challengeBadges}>
              <View style={[
                dynamicStyles.difficultyBadge,
                { backgroundColor: getDifficultyColor(staticChallenge.difficulty) }
              ]}>
                <Text style={dynamicStyles.badgeText}>{staticChallenge.difficulty}</Text>
              </View>
              <View style={dynamicStyles.pointsBadge}>
                <Text style={dynamicStyles.badgeText}>{staticChallenge.points} XP</Text>
              </View>
              <View style={[dynamicStyles.difficultyBadge, { backgroundColor: MEDICAL_COLORS.primary }]}>
                <Text style={dynamicStyles.badgeText}>{staticChallenge.timeLimit}</Text>
              </View>
            </View>
            
            <Text style={dynamicStyles.challengeQuestion}>
              {staticChallenge.question}
            </Text>
            
            {!staticChallenge.attempted ? (
              <View style={dynamicStyles.challengeOptions}>
                {staticChallenge.options.map((option, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={[
                      dynamicStyles.challengeOption,
                      selectedAnswer === index && dynamicStyles.selectedOption,
                      showChallengeResult && index === staticChallenge.correctAnswer && dynamicStyles.correctOption,
                      showChallengeResult && selectedAnswer === index && index !== staticChallenge.correctAnswer && dynamicStyles.wrongOption
                    ]}
                    onPress={() => handleChallengeAnswer(index)}
                    disabled={showChallengeResult}
                  >
                    <Text style={dynamicStyles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={dynamicStyles.challengeResult}>
                <Text style={dynamicStyles.resultText}>
                  ✅ Herausforderung bereits abgeschlossen!
                </Text>
                <Text style={dynamicStyles.resultText}>
                  Serie: {staticChallenge.streak} Tage 🔥
                </Text>
              </View>
            )}
            
            {showChallengeResult && (
              <View style={dynamicStyles.challengeResult}>
                <Text style={dynamicStyles.resultText}>
                  {selectedAnswer === staticChallenge.correctAnswer ? '🎉 Richtig! +' + staticChallenge.points + ' XP' : '❌ Leider falsch.'}
                </Text>
                {staticChallenge.explanation && (
                  <Text style={dynamicStyles.explanationText}>
                    {staticChallenge.explanation}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Learning Path */}
          <Text style={dynamicStyles.sectionTitle}>🗺️ Lernpfad</Text>
          <View style={dynamicStyles.learningPathContainer}>
            {learningPath.map((node, index) => (
              <View key={index}>
                <TouchableOpacity 
                  style={dynamicStyles.pathNode}
                  disabled={node.locked}
                  onPress={() => !node.locked && handleCardPress('continue')}
                >
                  <View style={[
                    dynamicStyles.nodeIcon,
                    node.completed && dynamicStyles.completedNode,
                    node.inProgress && dynamicStyles.inProgressNode,
                    node.locked && dynamicStyles.lockedNode,
                    !node.completed && !node.inProgress && !node.locked && dynamicStyles.availableNode
                  ]}>
                    {node.completed && <CheckCircle size={20} color={MEDICAL_COLORS.white} />}
                    {node.inProgress && <Clock size={20} color={MEDICAL_COLORS.white} />}
                    {node.locked && <MapPin size={20} color={MEDICAL_COLORS.white} />}
                    {!node.completed && !node.inProgress && !node.locked && <PlayCircle size={20} color={MEDICAL_COLORS.gray} />}
                  </View>
                  <View style={dynamicStyles.nodeContent}>
                    <Text style={dynamicStyles.nodeName}>{node.name}</Text>
                    <Text style={dynamicStyles.nodeProgress}>
                      {node.completed && `Abgeschlossen • ${node.score}%`}
                      {node.inProgress && `${node.progress}% abgeschlossen`}
                      {node.locked && 'Gesperrt'}
                      {!node.completed && !node.inProgress && !node.locked && 'Verfügbar'}
                    </Text>
                  </View>
                </TouchableOpacity>
                {index < learningPath.length - 1 && (
                  <View style={dynamicStyles.pathConnector} />
                )}
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <Text style={dynamicStyles.sectionTitle}>⚡ Schnellaktionen</Text>
          <View style={dynamicStyles.quickActionsGrid}>
            <View style={dynamicStyles.actionsRow}>
              {quickActions.slice(0, 2).map((action, index) => (
                <TouchableOpacity 
                  key={index}
                  onPress={() => handleCardPress(action.route)}
                >
                  <LinearGradient
                    colors={action.gradient}
                    style={dynamicStyles.actionCard}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                  >
                    <Text style={dynamicStyles.actionIcon}>{action.icon}</Text>
                    <Text style={dynamicStyles.actionTitle}>{action.title}</Text>
                    <Text style={dynamicStyles.actionSubtitle}>{action.subtitle}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
            <View style={dynamicStyles.actionsRow}>
              {quickActions.slice(2, 4).map((action, index) => (
                <TouchableOpacity 
                  key={index}
                  onPress={() => handleCardPress(action.route)}
                >
                  <LinearGradient
                    colors={action.gradient}
                    style={dynamicStyles.actionCard}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                  >
                    <Text style={dynamicStyles.actionIcon}>{action.icon}</Text>
                    <Text style={dynamicStyles.actionTitle}>{action.title}</Text>
                    <Text style={dynamicStyles.actionSubtitle}>{action.subtitle}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Upcoming Events */}
          <Text style={dynamicStyles.sectionTitle}>📅 Anstehende Termine</Text>
          <View style={dynamicStyles.eventsContainer}>
            {upcomingEvents.map((event, index) => (
              <TouchableOpacity key={index} style={dynamicStyles.eventItem}>
                <Text style={dynamicStyles.eventIcon}>{event.icon}</Text>
                <View style={dynamicStyles.eventContent}>
                  <Text style={dynamicStyles.eventTitle}>{event.title}</Text>
                  <Text style={dynamicStyles.eventDate}>{event.date}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Smart Recommendations */}
          <Text style={dynamicStyles.sectionTitle}>💡 Empfohlene Themen</Text>
          <View style={dynamicStyles.eventsContainer}>
            {recommendations.map((rec, index) => (
              <TouchableOpacity key={index} style={dynamicStyles.eventItem}>
                <View style={dynamicStyles.eventContent}>
                  <Text style={dynamicStyles.eventTitle}>{rec.title}</Text>
                  <Text style={dynamicStyles.eventDate}>{rec.description}</Text>
                </View>
                <Text style={dynamicStyles.eventIcon}>💪</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Daily Reward Modal */}
      <Modal
        visible={showDailyReward}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDailyReward(false)}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContainer}>
            <Text style={dynamicStyles.modalTitle}>🎁 Tägliche Belohnung!</Text>
            <View style={dynamicStyles.rewardContainer}>
              <Sparkles size={48} color={MEDICAL_COLORS.warning} />
              <Text style={dynamicStyles.rewardText}>
                Großartig! Du hast deine {userStats.streak}-Tage-Serie fortgesetzt!
              </Text>
              <Text style={dynamicStyles.rewardText}>
                Belohnung: {userStats.streak * 10} XP
              </Text>
            </View>
            <TouchableOpacity 
              style={dynamicStyles.claimButton}
              onPress={claimDailyReward}
            >
              <Text style={dynamicStyles.claimButtonText}>Belohnung einlösen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Achievements Modal */}
      <Modal
        visible={showAchievements}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAchievements(false)}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContainer}>
            <Text style={dynamicStyles.modalTitle}>🏆 Errungenschaften</Text>
            <ScrollView>
              {achievements.map((achievement) => (
                <View key={achievement.id} style={dynamicStyles.eventItem}>
                  <View style={dynamicStyles.eventContent}>
                    <Text style={[
                      dynamicStyles.eventTitle,
                      { color: achievement.unlocked ? MEDICAL_COLORS.dark : MEDICAL_COLORS.gray }
                    ]}>
                      {achievement.title}
                    </Text>
                    <Text style={dynamicStyles.eventDate}>{achievement.description}</Text>
                    {achievement.progress !== undefined && (
                      <View style={dynamicStyles.focusProgressBar}>
                        <View 
                          style={[
                            dynamicStyles.focusProgressFill,
                            { width: `${(achievement.progress / (achievement.maxProgress || 1)) * 100}%` }
                          ]} 
                        />
                      </View>
                    )}
                  </View>
                  <Text style={dynamicStyles.eventIcon}>
                    {achievement.unlocked ? '✅' : '⏳'}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={dynamicStyles.claimButton}
              onPress={() => setShowAchievements(false)}
            >
              <Text style={dynamicStyles.claimButtonText}>Schließen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  menuButtonContainer: {
    padding: 8,
  },
  achievementButton: {
    padding: 8,
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});