import React, { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import InteractiveMedicalContent from './InteractiveMedicalContent';

interface MedicalContentLoaderProps {
  slug: string;
  onBackPress?: () => void;
  onOpenModal?: () => void;
  currentSection?: any;
}

interface SupabaseRow {
  idx: number;
  slug: string;
  title: string;
  parent_slug: string | null;
  description?: string;
  icon: string;
  color: string;
  content_improved?: string;
  content_html?: string;
  category: string;
  last_updated?: string;
}

const MedicalContentLoader: React.FC<MedicalContentLoaderProps> = ({ slug, onBackPress, onOpenModal, currentSection }) => {
  const { colors } = useTheme();
  const [data, setData] = useState<SupabaseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // If currentSection is already provided, use it directly (avoids duplicate fetch)
        if (currentSection) {
          logger.info('✅ Using cached section data from parent');
          setData(currentSection);
          setLoading(false);
          return;
        }

        logger.info('🔄 Fetching medical content for slug:', slug);

        const { data: result, error } = await supabase
          .from('sections')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error) {
          logger.error('❌ Supabase query error:', error);
          setError(`Database error: ${error.message}`);
          return;
        }

        if (!result) {
          logger.error('❌ No data found for slug:', slug);
          setError(`No content found for: ${slug}`);
          return;
        }

        logger.info('✅ Data fetched successfully');
        setData(result);

      } catch (err) {
        logger.error('❌ Unexpected error:', err);
        setError(`Unexpected error: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug, currentSection]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Lade medizinische Inhalte...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          {error}
        </Text>
        <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
          Slug: {slug}
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          Keine Daten gefunden
        </Text>
      </View>
    );
  }

  return (
    <InteractiveMedicalContent
      supabaseRow={data}
      onBackPress={onBackPress}
      onOpenModal={onOpenModal}
      currentSection={currentSection}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default MedicalContentLoader;