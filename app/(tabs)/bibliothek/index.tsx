import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Search, BookOpen, Stethoscope, Scissors, AlertTriangle, Microscope, Droplets, Scan, BookOpen as FolderIcon } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import Input from '@/components/ui/Input';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '@/components/ui/Card';

// Section type
interface Section {
  id: string;
  slug: string;
  title: string;
  parent_slug: string | null;
  description: string | null;
  type: 'folder' | 'file-text' | 'markdown';
  icon: string;
  color: string;
  display_order: number;
}

// Map title/iconName to icon component and color
const getCategoryDetails = (title: string, iconName?: string, color?: string) => {
  const name = title.toLowerCase().trim();
  switch (true) {
    case name === 'innere medizin': return { icon: 'Stethoscope', color: '#0077B6' };
    case name === 'chirurgie': return { icon: 'Scissors', color: '#48CAE4' };
    case name === 'notfallmedizin': return { icon: 'AlertTriangle', color: '#EF4444' };
    case name === 'infektiologie': return { icon: 'Microscope', color: '#DC2626' };
    case name === 'urologie': return { icon: 'Droplets', color: '#0369A1' };
    case name === 'radiologie': return { icon: 'Scan', color: '#22C55E' };
    default: return { icon: iconName || 'FileText', color: color || '#6B7280' };
  }
};

// Render Lucide Icon
const getIconComponent = (iconName: string, color: string, size = 24) => {
  switch (iconName) {
    case 'Stethoscope': return <Stethoscope size={size} color={color} />;
    case 'Scissors': return <Scissors size={size} color={color} />;
    case 'AlertTriangle': return <AlertTriangle size={size} color={color} />;
    case 'Microscope': return <Microscope size={size} color={color} />;
    case 'Droplets': return <Droplets size={size} color={color} />;
    case 'Scan': return <Scan size={size} color={color} />;
    default: return <FolderIcon size={size} color={color} />;
  }
};

export default function IndexScreen() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch only root categories
  const fetchRootSections = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from<Section>('sections')
        .select('*')
        .is('parent_slug', null)
        .order('display_order', { ascending: true });
      if (error) throw error;
      setSections(data || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRootSections(); }, [fetchRootSections]);

  // Navigate into folder or content
  const navigateTo = (sec: Section) => {
    const isLeaf = sec.type === 'file-text' || sec.type === 'markdown';
    if (isLeaf) router.push(`/bibliothek/content/${sec.slug}`);
    else router.push(`/bibliothek/${sec.slug}`);
  };

  // Filter root sections by search
  const filtered = sections.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

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
      marginBottom: 8,
      color: colors.text,
    },
    itemText: {
      flex: 1,
      marginLeft: 8,
      fontSize: 16,
      color: colors.text,
    },
    card: {
      marginBottom: 12,
      borderRadius: 12,
      overflow: 'hidden',
      elevation: 2,
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    errorText: {
      color: colors.error,
    },
    emptyText: {
      marginTop: 8,
      fontSize: 16,
      color: colors.textSecondary,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={dynamicStyles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
      />
      
      <View style={styles.header}>
        <Text style={dynamicStyles.title}>Bibliothek</Text>
        <Input
          placeholder="Fachgebiet suchen..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Search size={20} color={colors.textSecondary} />}
          containerStyle={styles.searchContainer}
        />
      </View>
      <ScrollView style={styles.content}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <BookOpen size={60} color={colors.textSecondary} />
            <Text style={dynamicStyles.emptyText}>Keine Kategorien gefunden</Text>
          </View>
        ) : (
          filtered.map(sec => {
            const { icon, color } = getCategoryDetails(sec.title, sec.icon, sec.color);
            return (
              <Card key={sec.slug} style={dynamicStyles.card}>
                <TouchableOpacity onPress={() => navigateTo(sec)} style={styles.row}>
                  <LinearGradient colors={[`${color}20`, `${color}10`]} style={styles.rowBg}>
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    {getIconComponent(icon, color)}
                    <Text style={dynamicStyles.itemText}>{sec.title}</Text>
                    <ChevronRight size={20} color={colors.textSecondary} />
                  </LinearGradient>
                </TouchableOpacity>
              </Card>
            );
          })
        )}
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 16 },
  searchContainer: { marginBottom: 12 },
  content: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBg: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
});