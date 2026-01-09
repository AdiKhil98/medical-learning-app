import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  BookOpen,
  AlertCircle,
  Lightbulb,
  FileText,
  ListChecks,
  Stethoscope,
  Activity,
  Pill,
  ClipboardList,
  HeartPulse,
  Microscope,
  ShieldAlert,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SecureLogger } from '@/lib/security';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '@/constants/tokens';
import { withErrorBoundary } from '@/components/withErrorBoundary';

interface KPContentDetail {
  id: string;
  slug: string;
  title_de: string;
  title_short: string;
  fachgebiet: string;
  bereich: string;
  priority: string;
  status: string;
  content: any;
}

// Section configuration with icons and colors
const SECTION_CONFIG: Record<string, { icon: any; color: string; title: string }> = {
  definition: { icon: BookOpen, color: '#6366f1', title: 'Definition' },
  epidemiologie: { icon: Activity, color: '#8b5cf6', title: 'Epidemiologie' },
  aetiologie: { icon: Microscope, color: '#ec4899', title: 'Ätiologie' },
  klassifikation: { icon: ListChecks, color: '#14b8a6', title: 'Klassifikation' },
  pathophysiologie: { icon: HeartPulse, color: '#f43f5e', title: 'Pathophysiologie' },
  symptome: { icon: Stethoscope, color: '#f97316', title: 'Symptome / Klinik' },
  diagnostik: { icon: ClipboardList, color: '#0ea5e9', title: 'Diagnostik' },
  differentialdiagnosen: { icon: ShieldAlert, color: '#eab308', title: 'Differentialdiagnosen' },
  therapie: { icon: Pill, color: '#22c55e', title: 'Therapie' },
  komplikationen: { icon: AlertCircle, color: '#ef4444', title: 'Komplikationen' },
  prognose: { icon: FileText, color: '#64748b', title: 'Prognose' },
  praevention: { icon: ShieldAlert, color: '#06b6d4', title: 'Prävention' },
  besonderheiten: { icon: Lightbulb, color: '#a855f7', title: 'Besonderheiten' },
};

// Priority badge colors
const PRIORITY_STYLES = {
  '+++': { bg: '#fee2e2', text: '#991b1b', label: 'Sehr wichtig' },
  '++': { bg: '#ffedd5', text: '#9a3412', label: 'Wichtig' },
  '+': { bg: '#dbeafe', text: '#1e40af', label: 'Relevant' },
};

// Collapsible Section Component
const ContentSection: React.FC<{
  sectionKey: string;
  content: any;
  defaultExpanded?: boolean;
}> = ({ sectionKey, content, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const heightAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const config = SECTION_CONFIG[sectionKey] || {
    icon: FileText,
    color: '#64748b',
    title: sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
  };

  const IconComponent = config.icon;

  const toggleExpanded = () => {
    const newValue = !isExpanded;
    setIsExpanded(newValue);
    Animated.parallel([
      Animated.spring(rotateAnim, {
        toValue: newValue ? 1 : 0,
        useNativeDriver: true,
      }),
      Animated.timing(heightAnim, {
        toValue: newValue ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Parse content - handle string or object
  const renderContent = () => {
    if (!content) return null;

    // If content is a string, render as text
    if (typeof content === 'string') {
      return <Text style={styles.contentText}>{content}</Text>;
    }

    // If content is an array, render each item
    if (Array.isArray(content)) {
      return content.map((item, index) => {
        if (typeof item === 'string') {
          return (
            <View key={index} style={styles.bulletItem}>
              <View style={[styles.bullet, { backgroundColor: config.color }]} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          );
        }
        // Handle nested objects
        if (typeof item === 'object') {
          return (
            <View key={index} style={styles.nestedContent}>
              {Object.entries(item).map(([key, value]) => (
                <View key={key} style={styles.nestedItem}>
                  <Text style={styles.nestedLabel}>{key}:</Text>
                  <Text style={styles.nestedValue}>{typeof value === 'string' ? value : JSON.stringify(value)}</Text>
                </View>
              ))}
            </View>
          );
        }
        return null;
      });
    }

    // If content is an object, render key-value pairs
    if (typeof content === 'object') {
      return Object.entries(content).map(([key, value]) => (
        <View key={key} style={styles.keyValuePair}>
          <Text style={styles.keyText}>{key}</Text>
          <Text style={styles.valueText}>
            {typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : JSON.stringify(value)}
          </Text>
        </View>
      ));
    }

    return null;
  };

  // Check for MERKE boxes (important notes)
  const renderMerkeBox = () => {
    if (content?.merke || content?.MERKE) {
      const merkeContent = content.merke || content.MERKE;
      return (
        <View style={styles.merkeBox}>
          <View style={styles.merkeHeader}>
            <Lightbulb size={18} color="#92400e" />
            <Text style={styles.merkeTitle}>MERKE</Text>
          </View>
          <Text style={styles.merkeText}>
            {typeof merkeContent === 'string' ? merkeContent : JSON.stringify(merkeContent)}
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.sectionContainer}>
      <TouchableOpacity onPress={toggleExpanded} style={styles.sectionHeader} activeOpacity={0.7}>
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIconContainer, { backgroundColor: `${config.color}15` }]}>
            <IconComponent size={20} color={config.color} />
          </View>
          <Text style={styles.sectionTitle}>{config.title}</Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color={MEDICAL_COLORS.slate500} />
        ) : (
          <ChevronDown size={20} color={MEDICAL_COLORS.slate500} />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.sectionBody}>
          {renderMerkeBox()}
          {renderContent()}
        </View>
      )}
    </View>
  );
};

const KPTopicDetailScreen: React.FC = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { session } = useAuth();

  const [topic, setTopic] = useState<KPContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allExpanded, setAllExpanded] = useState(false);

  const fetchTopic = useCallback(async () => {
    if (!session || !slug) {
      setError('Sie müssen angemeldet sein.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('kp_medical_content')
        .select('*')
        .eq('slug', slug)
        .single();

      if (fetchError) throw fetchError;
      if (!data) {
        setError('Thema nicht gefunden.');
        return;
      }

      // Parse content if it's a string
      let contentObj = data.content;
      if (typeof contentObj === 'string') {
        try {
          // Remove any leading text before the JSON object
          const jsonStart = contentObj.indexOf('{');
          if (jsonStart > 0) {
            contentObj = contentObj.substring(jsonStart);
          }
          contentObj = JSON.parse(contentObj);
        } catch (e) {
          SecureLogger.warn('Could not parse content as JSON:', e);
        }
      }

      setTopic({ ...data, content: contentObj });
    } catch (e) {
      SecureLogger.error('Error fetching KP topic:', e);
      setError(e instanceof Error ? e.message : 'Fehler beim Laden des Themas');
    } finally {
      setLoading(false);
    }
  }, [session, slug]);

  useEffect(() => {
    fetchTopic();
  }, [fetchTopic]);

  const handleBackPress = () => {
    router.push('/(tabs)/bibliothek/kp' as Href);
  };

  const toggleAllSections = () => {
    setAllExpanded(!allExpanded);
  };

  const backgroundGradient = MEDICAL_COLORS.backgroundGradient as unknown as readonly [string, string, ...string[]];

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={backgroundGradient} style={styles.backgroundGradient} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ec4899" />
            <Text style={styles.loadingText}>Thema wird geladen...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Error state
  if (error || !topic) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={backgroundGradient} style={styles.backgroundGradient} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Fehler</Text>
            <Text style={styles.errorText}>{error || 'Thema nicht gefunden.'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleBackPress}>
              <Text style={styles.retryButtonText}>Zurück zur Übersicht</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const priorityStyle = PRIORITY_STYLES[topic.priority as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES['+'];

  // Get content sections
  const contentSections =
    topic.content && typeof topic.content === 'object'
      ? Object.keys(topic.content).filter((key) => SECTION_CONFIG[key])
      : [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={backgroundGradient} style={styles.backgroundGradient} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <LinearGradient
              colors={['#ec4899', '#f472b6']}
              style={styles.backButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ChevronLeft size={20} color="#ffffff" />
            </LinearGradient>
            <Text style={styles.backButtonText}>Zurück</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleAllSections} style={styles.expandButton}>
            <Text style={styles.expandButtonText}>{allExpanded ? 'Alle einklappen' : 'Alle aufklappen'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Topic Header Card */}
          <View style={styles.topicHeader}>
            <LinearGradient
              colors={['#ec4899', '#f472b6', '#fda4af']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.topicHeaderGradient}
            >
              <View style={styles.topicMeta}>
                <View style={[styles.priorityBadge, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
                  <Text style={[styles.priorityText, { color: priorityStyle.text }]}>
                    {topic.priority} {priorityStyle.label}
                  </Text>
                </View>
                <Text style={styles.examRelevance}>Prüfungsrelevant</Text>
              </View>

              <Text style={styles.topicTitle}>{topic.title_de}</Text>

              <View style={styles.topicTags}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{topic.fachgebiet}</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{topic.bereich}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Content Sections */}
          <View style={styles.sectionsContainer}>
            {contentSections.length > 0 ? (
              contentSections.map((sectionKey) => (
                <ContentSection
                  key={sectionKey}
                  sectionKey={sectionKey}
                  content={topic.content[sectionKey]}
                  defaultExpanded={allExpanded || sectionKey === 'definition'}
                />
              ))
            ) : (
              <View style={styles.noContent}>
                <BookOpen size={48} color={MEDICAL_COLORS.slate300} />
                <Text style={styles.noContentText}>Keine strukturierten Inhalte verfügbar.</Text>
              </View>
            )}
          </View>

          {/* Extra content sections not in config */}
          {topic.content && typeof topic.content === 'object' && (
            <View style={styles.extraSections}>
              {Object.keys(topic.content)
                .filter((key) => !SECTION_CONFIG[key] && key !== 'merke' && key !== 'MERKE')
                .map((sectionKey) => (
                  <ContentSection
                    key={sectionKey}
                    sectionKey={sectionKey}
                    content={topic.content[sectionKey]}
                    defaultExpanded={allExpanded}
                  />
                ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  backButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  backButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: MEDICAL_COLORS.slate700,
  },
  expandButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: MEDICAL_COLORS.slate100,
    borderRadius: BORDER_RADIUS.lg,
  },
  expandButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: MEDICAL_COLORS.slate600,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  topicHeader: {
    marginBottom: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  topicHeaderGradient: {
    padding: SPACING.xxl,
  },
  topicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  priorityText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: '700',
  },
  examRelevance: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  topicTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: SPACING.lg,
    lineHeight: 32,
  },
  topicTags: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  tagText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#ffffff',
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  sectionsContainer: {
    gap: SPACING.md,
  },
  sectionContainer: {
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.sm,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: MEDICAL_COLORS.slate50,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: MEDICAL_COLORS.slate900,
  },
  sectionBody: {
    padding: SPACING.lg,
    paddingTop: 0,
  },
  contentText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.slate700,
    lineHeight: 24,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: SPACING.md,
  },
  bulletText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.slate700,
    lineHeight: 22,
  },
  nestedContent: {
    backgroundColor: MEDICAL_COLORS.slate50,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  nestedItem: {
    marginBottom: SPACING.xs,
  },
  nestedLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: MEDICAL_COLORS.slate600,
  },
  nestedValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: MEDICAL_COLORS.slate700,
    marginTop: 2,
  },
  keyValuePair: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: MEDICAL_COLORS.slate100,
  },
  keyText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.slate900,
    marginBottom: SPACING.xs,
  },
  valueText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.slate600,
    lineHeight: 22,
  },
  merkeBox: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  merkeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  merkeTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '800',
    color: '#92400e',
    letterSpacing: 0.5,
  },
  merkeText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: '#78350f',
    lineHeight: 22,
  },
  extraSections: {
    marginTop: SPACING.xl,
  },
  noContent: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxxxl,
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.sm,
  },
  noContentText: {
    marginTop: SPACING.lg,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.slate500,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxxxl,
  },
  loadingText: {
    marginTop: SPACING.lg,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.slate500,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxxxl,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.warmRed,
    marginBottom: SPACING.md,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.slate500,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#ec4899',
    paddingHorizontal: SPACING.xxxl,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  retryButtonText: {
    color: MEDICAL_COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default withErrorBoundary(KPTopicDetailScreen, 'KP Thema');
