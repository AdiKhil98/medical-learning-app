import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

interface Section {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  parent_slug: string | null;
  type: 'folder' | 'file-text' | 'markdown';
  content_type?: string;
  has_content?: boolean;
  content_json?: any;
  display_order: number;
}

export default function SectionDetailScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  const [current, setCurrent] = useState<Section | null>(null);
  const [children, setChildren] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSectionAndChildren = useCallback(async () => {
    if (!slug || typeof slug !== 'string') return;
    setLoading(true);

    try {
      // 1) Fetch current section
      const { data: cur, error: curErr } = await supabase
        .from('sections')
        .select('*, content_json')
        .eq('slug', slug)
        .maybeSingle();
      if (curErr) throw curErr;
      if (!cur) throw new Error('Section not found');

      // 2) Check if this section has content_json with data
      if (Array.isArray(cur.content_json) && cur.content_json.length > 0) {
        router.replace(`/bibliothek/content/${slug}`);
        return;
      }

      // 3) Check if this is a leaf section with other content indicators
      const hasContentJson = cur.content_json && 
        Array.isArray(cur.content_json.sections) && 
        cur.content_json.sections.length > 0;

      const isLeaf = 
        cur.type === 'file-text' ||
        cur.type === 'markdown' ||
        cur.content_type === 'document' ||
        cur.has_content ||
        hasContentJson;

      if (isLeaf) {
        // Redirect to content viewer
        router.replace(`/bibliothek/content/${slug}`);
        return;
      }

      setCurrent(cur);

      // 4) Fetch direct children only
      const { data: kids, error: kidsErr } = await supabase
        .from('sections')
        .select('*')
        .eq('parent_slug', slug)
        .order('display_order', { ascending: true });
      if (kidsErr) throw kidsErr;
      console.log(`Fetched ${kids?.length || 0} children for "${slug}"`);
      setChildren(kids || []);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => {
    fetchSectionAndChildren();
  }, [fetchSectionAndChildren]);

  const gradientColors = isDarkMode 
    ? ['#1F2937', '#111827', '#0F172A']
    : ['#e0f2fe', '#f0f9ff', '#ffffff'];

  const dynamicStyles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: colors.background 
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.background,
    },
    backText: {
      marginLeft: 4,
      fontSize: 16,
      color: colors.primary,
    },
    header: {
      marginHorizontal: 16,
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    subHeader: {
      marginHorizontal: 16,
      marginBottom: 12,
      fontSize: 16,
      color: colors.textSecondary,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 16,
      marginBottom: 8,
      borderRadius: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 4,
    },
    itemText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 16,
    },
    error: {
      fontSize: 16,
      color: colors.error,
      marginBottom: 8,
    },
    link: {
      color: colors.primary,
      fontSize: 16,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !current) {
    return (
      <SafeAreaView style={dynamicStyles.center}>
        <Text style={dynamicStyles.error}>Oops – konnte nichts laden.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={dynamicStyles.link}>← Zurück</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
      />
      
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <ChevronLeft size={24} color={colors.primary} />
        <Text style={dynamicStyles.backText}>Zurück</Text>
      </TouchableOpacity>

      <Text style={dynamicStyles.header}>{current.title}</Text>
      {current.description && (
        <Text style={dynamicStyles.subHeader}>{current.description}</Text>
      )}

      <ScrollView style={styles.list}>
        {children.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={dynamicStyles.emptyText}>Keine weiteren Unterpunkte.</Text>
          </View>
        ) : (
          children.map((sec) => (
            <TouchableOpacity
              key={sec.slug}
              style={dynamicStyles.item}
              onPress={() =>
                router.push({
                  pathname: '/bibliothek/[slug]',
                  params: { slug: sec.slug },
                })
              }
              activeOpacity={0.7}
            >
              <Text style={dynamicStyles.itemText}>{sec.title}</Text>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  list: { marginTop: 8, paddingHorizontal: 16 },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
});