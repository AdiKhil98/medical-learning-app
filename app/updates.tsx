import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Bell, AlertCircle, CheckCircle, Info } from 'lucide-react-native';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Update {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  created_at: string;
  version?: string;
}

export default function Updates() {
  const { colors } = useTheme();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUpdates();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'feature': return <CheckCircle size={20} color="#10B981" />;
      case 'bugfix': return <AlertCircle size={20} color="#F59E0B" />;
      case 'announcement': return <Bell size={20} color="#3B82F6" />;
      default: return <Info size={20} color={colors.text} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'normal': return colors.text;
      case 'low': return colors.textSecondary;
      default: return colors.text;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Bell size={24} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Updates & Neuigkeiten</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {updates.map((update) => (
          <View key={update.id} style={[styles.updateCard, { backgroundColor: colors.card }]}>
            <View style={styles.updateHeader}>
              {getCategoryIcon(update.category)}
              <Text style={[styles.updateTitle, { color: getPriorityColor(update.priority) }]}>
                {update.title}
              </Text>
            </View>
            
            <Text style={[styles.updateContent, { color: colors.textSecondary }]}>
              {update.content}
            </Text>
            
            <View style={styles.updateFooter}>
              {update.version && (
                <Text style={[styles.version, { color: colors.textSecondary }]}>
                  v{update.version}
                </Text>
              )}
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {format(new Date(update.created_at), 'dd. MMM yyyy', { locale: de })}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: { flex: 1 },
  updateCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  updateTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  updateContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  updateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
  },
});