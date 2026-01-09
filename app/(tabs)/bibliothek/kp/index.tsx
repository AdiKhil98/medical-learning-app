import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, ChevronRight, ChevronLeft, Search, Filter, BookOpen, Menu as MenuIcon, X } from 'lucide-react-native';
import { useRouter, Href } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Menu from '@/components/ui/Menu';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';
import { SecureLogger } from '@/lib/security';
import { MEDICAL_COLORS } from '@/constants/medicalColors';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '@/constants/tokens';
import { withErrorBoundary } from '@/components/withErrorBoundary';
import { colors } from '@/constants/colors';

interface KPContent {
  id: string;
  slug: string;
  title_de: string;
  title_short: string;
  fachgebiet: string;
  bereich: string;
  priority: string;
  status: string;
}

// Priority badge colors
const PRIORITY_STYLES = {
  '+++': { bg: '#fee2e2', text: '#991b1b', label: '+++' },
  '++': { bg: '#ffedd5', text: '#9a3412', label: '++' },
  '+': { bg: '#dbeafe', text: '#1e40af', label: '+' },
};

// Group topics by Fachgebiet and Bereich
const groupTopics = (topics: KPContent[]) => {
  const grouped: Record<string, Record<string, KPContent[]>> = {};

  topics.forEach((topic) => {
    const fachgebiet = topic.fachgebiet || 'Sonstige';
    const bereich = topic.bereich || 'Allgemein';

    if (!grouped[fachgebiet]) {
      grouped[fachgebiet] = {};
    }
    if (!grouped[fachgebiet][bereich]) {
      grouped[fachgebiet][bereich] = [];
    }
    grouped[fachgebiet][bereich].push(topic);
  });

  return grouped;
};

// Animated Topic Card Component
const TopicCard: React.FC<{
  topic: KPContent;
  onPress: () => void;
  index: number;
}> = ({ topic, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, [index, fadeAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const priorityStyle = PRIORITY_STYLES[topic.priority as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES['+'];

  return (
    <Animated.View
      style={[
        styles.topicCardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={topic.title_de}
      >
        <View style={styles.topicCard}>
          <View style={styles.topicCardContent}>
            <View style={styles.topicHeader}>
              <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
                <Text style={[styles.priorityText, { color: priorityStyle.text }]}>{priorityStyle.label}</Text>
              </View>
              <Text style={styles.bereichText} numberOfLines={1}>
                {topic.bereich}
              </Text>
            </View>
            <Text style={styles.topicTitle} numberOfLines={2}>
              {topic.title_short || topic.title_de}
            </Text>
            <View style={styles.topicFooter}>
              <Text style={styles.fachgebietText}>{topic.fachgebiet}</Text>
              <ChevronRight size={18} color={MEDICAL_COLORS.slate400} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Collapsible Section Component
const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}> = ({ title, children, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpanded = () => {
    const newValue = !isExpanded;
    setIsExpanded(newValue);
    Animated.spring(rotateAnim, {
      toValue: newValue ? 1 : 0,
      useNativeDriver: true,
    }).start();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={styles.collapsibleSection}>
      <TouchableOpacity onPress={toggleExpanded} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronRight size={20} color={MEDICAL_COLORS.slate600} />
        </Animated.View>
      </TouchableOpacity>
      {isExpanded && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
};

const KPBibliothekIndex: React.FC = () => {
  const router = useRouter();
  const { session } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [topics, setTopics] = useState<KPContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch KP content from database
  const fetchTopics = useCallback(async () => {
    if (!session) {
      setError('Sie müssen angemeldet sein.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('kp_medical_content')
        .select('id, slug, title_de, title_short, fachgebiet, bereich, priority, status')
        .eq('status', 'active')
        .order('fachgebiet', { ascending: true });

      if (fetchError) throw fetchError;

      setTopics(data || []);
    } catch (e) {
      SecureLogger.error('Error fetching KP topics:', e);
      setError(e instanceof Error ? e.message : 'Fehler beim Laden der Themen');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  // Filter and group topics
  const filteredAndGroupedTopics = useMemo(() => {
    let filtered = [...topics];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (topic) =>
          topic.title_de.toLowerCase().includes(query) ||
          topic.title_short?.toLowerCase().includes(query) ||
          topic.fachgebiet?.toLowerCase().includes(query) ||
          topic.bereich?.toLowerCase().includes(query)
      );
    }

    // Apply priority filter
    if (priorityFilter) {
      filtered = filtered.filter((topic) => topic.priority === priorityFilter);
    }

    return groupTopics(filtered);
  }, [topics, searchQuery, priorityFilter]);

  const handleTopicPress = (slug: string) => {
    router.push(`/(tabs)/bibliothek/kp/${slug}` as Href);
  };

  const handleBackPress = () => {
    router.push('/(tabs)/bibliothek' as Href);
  };

  const backgroundGradient = MEDICAL_COLORS.backgroundGradient as unknown as readonly [string, string, ...string[]];

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={backgroundGradient} style={styles.backgroundGradient} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={MEDICAL_COLORS.secondary} />
            <Text style={styles.loadingText}>KP Themen werden geladen...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={backgroundGradient} style={styles.backgroundGradient} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Fehler</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchTopics}>
              <Text style={styles.retryButtonText}>Erneut versuchen</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const totalTopics = topics.length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={backgroundGradient} style={styles.backgroundGradient} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View
          style={[
            styles.modernHeader,
            Platform.OS === 'web' && {
              position: 'sticky' as any,
              top: 0,
              zIndex: 1000,
            },
          ]}
        >
          {Platform.OS === 'web' && (
            <LinearGradient
              colors={['#ec4899', '#f472b6', '#fda4af']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 3, width: '100%' }}
            />
          )}
          <LinearGradient colors={MEDICAL_COLORS.headerGradient as any} style={styles.headerGradient}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.menuButton} onPress={() => setMenuOpen(true)} activeOpacity={0.7}>
                  <LinearGradient
                    colors={['rgba(236, 72, 153, 0.15)', 'rgba(244, 114, 182, 0.10)']}
                    style={styles.menuButtonGradient}
                  >
                    <MenuIcon size={22} color="#ec4899" />
                  </LinearGradient>
                </TouchableOpacity>
                <Logo size="medium" variant="medical" textColor="#ec4899" animated={false} />
              </View>
              <UserAvatar size="medium" />
            </View>
          </LinearGradient>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Back Button and Breadcrumb */}
          <View style={styles.navigationRow}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <ChevronLeft size={20} color={MEDICAL_COLORS.secondary} />
              <Text style={styles.backButtonText}>Zurück</Text>
            </TouchableOpacity>
            <View style={styles.breadcrumb}>
              <Home size={14} color={colors.textSecondary} />
              <ChevronRight size={14} color={colors.textSecondary} style={styles.breadcrumbSeparator} />
              <Text style={styles.breadcrumbText}>Bibliothek</Text>
              <ChevronRight size={14} color={colors.textSecondary} style={styles.breadcrumbSeparator} />
              <Text style={styles.breadcrumbActive}>KP (444)</Text>
            </View>
          </View>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={['#ec4899', '#f472b6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <BookOpen size={40} color="#ffffff" />
              <Text style={styles.heroTitle}>KP Bibliothek (444)</Text>
              <Text style={styles.heroSubtitle}>{totalTopics} prüfungsrelevante Themen nach Fachgebiet gruppiert</Text>
            </LinearGradient>
          </View>

          {/* Search & Filter Bar */}
          <View style={styles.searchFilterContainer}>
            <View style={styles.searchContainer}>
              <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Thema suchen..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.filterButton, priorityFilter && styles.filterButtonActive]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter size={20} color={priorityFilter ? '#ec4899' : colors.text} />
            </TouchableOpacity>
          </View>

          {/* Priority Filter Pills */}
          {showFilters && (
            <View style={styles.filterPills}>
              <TouchableOpacity
                style={[styles.filterPill, !priorityFilter && styles.filterPillActive]}
                onPress={() => setPriorityFilter(null)}
              >
                <Text style={[styles.filterPillText, !priorityFilter && styles.filterPillTextActive]}>Alle</Text>
              </TouchableOpacity>
              {Object.entries(PRIORITY_STYLES).map(([priority, style]) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.filterPill,
                    priorityFilter === priority && styles.filterPillActive,
                    { backgroundColor: priorityFilter === priority ? style.bg : undefined },
                  ]}
                  onPress={() => setPriorityFilter(priorityFilter === priority ? null : priority)}
                >
                  <Text style={[styles.filterPillText, priorityFilter === priority && { color: style.text }]}>
                    {style.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Topics grouped by Fachgebiet and Bereich */}
          {Object.entries(filteredAndGroupedTopics).map(([fachgebiet, bereiche]) => (
            <CollapsibleSection key={fachgebiet} title={fachgebiet} defaultExpanded={true}>
              {Object.entries(bereiche).map(([bereich, bereichTopics]) => (
                <View key={bereich} style={styles.bereichSection}>
                  <Text style={styles.bereichTitle}>{bereich}</Text>
                  <View style={styles.topicsGrid}>
                    {bereichTopics.map((topic, index) => (
                      <TopicCard
                        key={topic.id}
                        topic={topic}
                        onPress={() => handleTopicPress(topic.slug)}
                        index={index}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </CollapsibleSection>
          ))}

          {/* Empty state */}
          {Object.keys(filteredAndGroupedTopics).length === 0 && (
            <View style={styles.emptyState}>
              <BookOpen size={48} color={MEDICAL_COLORS.slate300} />
              <Text style={styles.emptyStateText}>Keine Themen gefunden für &ldquo;{searchQuery}&rdquo;</Text>
            </View>
          )}
        </ScrollView>

        <Menu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
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
  modernHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerGradient: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    minWidth: 44,
    minHeight: 44,
  },
  menuButtonGradient: {
    padding: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 96,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbSeparator: {
    marginHorizontal: 4,
  },
  breadcrumbText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: colors.textSecondary,
  },
  breadcrumbActive: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#ec4899',
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  heroSection: {
    marginBottom: SPACING.xl,
  },
  heroGradient: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxxl,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: 'rgba(255,255,255,0.9)',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  searchFilterContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  searchContainer: {
    flex: 1,
    position: 'relative',
    height: 48,
  },
  searchIcon: {
    position: 'absolute',
    left: SPACING.lg,
    top: 14,
    zIndex: 1,
  },
  searchInput: {
    height: '100%',
    backgroundColor: MEDICAL_COLORS.white,
    borderWidth: 2,
    borderColor: MEDICAL_COLORS.slate200,
    borderRadius: BORDER_RADIUS.lg,
    paddingLeft: 48,
    paddingRight: 40,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: MEDICAL_COLORS.slate900,
  },
  clearButton: {
    position: 'absolute',
    right: SPACING.md,
    top: 14,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: MEDICAL_COLORS.white,
    borderWidth: 2,
    borderColor: MEDICAL_COLORS.slate200,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    borderColor: '#ec4899',
    backgroundColor: '#fdf2f8',
  },
  filterPills: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: MEDICAL_COLORS.slate100,
    borderWidth: 1,
    borderColor: MEDICAL_COLORS.slate200,
  },
  filterPillActive: {
    borderColor: '#ec4899',
  },
  filterPillText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: MEDICAL_COLORS.slate600,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  filterPillTextActive: {
    color: '#ec4899',
  },
  collapsibleSection: {
    marginBottom: SPACING.xl,
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.md,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: MEDICAL_COLORS.slate50,
    borderBottomWidth: 1,
    borderBottomColor: MEDICAL_COLORS.slate100,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: MEDICAL_COLORS.slate900,
  },
  sectionContent: {
    padding: SPACING.lg,
  },
  bereichSection: {
    marginBottom: SPACING.xl,
  },
  bereichTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: MEDICAL_COLORS.slate700,
    marginBottom: SPACING.md,
    paddingLeft: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#ec4899',
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  topicCardWrapper: {
    width: '100%',
  },
  topicCard: {
    backgroundColor: MEDICAL_COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: MEDICAL_COLORS.slate200,
    ...SHADOWS.sm,
  },
  topicCardContent: {
    padding: SPACING.lg,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bereichText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: MEDICAL_COLORS.slate500,
  },
  topicTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: MEDICAL_COLORS.slate900,
    marginBottom: SPACING.sm,
    lineHeight: 22,
  },
  topicFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fachgebietText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: MEDICAL_COLORS.slate400,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxxxl,
  },
  emptyStateText: {
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
    backgroundColor: MEDICAL_COLORS.secondary,
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

export default withErrorBoundary(KPBibliothekIndex, 'KP Bibliothek');
