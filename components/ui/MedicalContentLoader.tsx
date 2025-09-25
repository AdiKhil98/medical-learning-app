import React, { useEffect, useState } from 'react';
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
        console.log('🔄 Fetching medical content for slug:', slug);
        
        // First, let's check if Supabase connection works at all
        const { data: testConnection, error: connectionError } = await supabase
          .from('sections')
          .select('slug, title')
          .limit(1);
          
        if (connectionError) {
          console.error('❌ Supabase connection failed:', connectionError);
          setError(`Database connection error: ${connectionError.message}`);
          return;
        }
        
        console.log('✅ Supabase connection successful, testing query...');
        
        const { data: result, error } = await supabase
          .from('sections')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error) {
          console.error('❌ Supabase query error:', error);
          console.error('❌ Error details:', { code: error.code, hint: error.hint, details: error.details });
          
          // Try to find similar slugs if exact match fails
          const { data: similarSlugs } = await supabase
            .from('sections')
            .select('slug, title')
            .ilike('slug', `%${slug}%`)
            .limit(5);
            
          console.log('🔍 Similar slugs found:', similarSlugs);
          setError(`Database error: ${error.message}. Similar slugs: ${similarSlugs?.map(s => s.slug).join(', ') || 'none'}`);
          return;
        }

        if (!result) {
          console.error('❌ No data found for slug:', slug);
          setError(`No content found for: ${slug}`);
          return;
        }

        console.log('✅ Data fetched successfully:', result);
        setData(result);
        
      } catch (err) {
        console.error('❌ Unexpected error:', err);
        setError(`Unexpected error: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

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