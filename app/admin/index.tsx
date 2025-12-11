import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Shield,
  Users,
  FileText,
  TestTube,
  BarChart,
  Bell,
  Settings,
  Database,
  MessageSquare,
  Lightbulb,
  Wand2,
  CreditCard
} from 'lucide-react-native';
import { colors } from '@/constants/colors';

export default function AdminDashboard() {
  const router = useRouter();
  
  const { user } = useAuth();
  const [feedbackCount, setFeedbackCount] = useState(0);

  useEffect(() => {
    loadFeedbackCount();
  }, []);

  const loadFeedbackCount = async () => {
    try {
      const { count, error } = await supabase
        .from('user_feedback')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'in_progress']);

      if (!error) {
        setFeedbackCount(count || 0);
      }
    } catch (error) {
      logger.error('Error loading feedback count:', error);
    }
  };

  const adminFeatures = [
    {
      title: 'Test Simulation',
      icon: TestTube,
      route: '/admin/test-simulation',
      description: 'Simulationen testen',
      color: '#10B981'
    },
    {
      title: 'Post Update',
      icon: Bell,
      route: '/admin/add-update',
      description: 'Neue Updates veröffentlichen',
      color: '#E2827F'
    },
    {
      title: 'Manage Users',
      icon: Users,
      route: '/admin/manage-users',
      description: 'Benutzer verwalten',
      color: '#E2827F'
    },
    {
      title: 'Subscription Manager',
      icon: CreditCard,
      route: '/admin/subscriptions',
      description: 'Abonnements & Duplikate verwalten',
      color: '#8B5CF6'
    },
    {
      title: 'Feedback Manager',
      icon: MessageSquare,
      route: '/admin/feedback-manager',
      description: 'Bug-Reports & Vorschläge',
      color: '#F97316',
      badge: feedbackCount > 0 ? feedbackCount : null
    },
    {
      title: 'Analytics',
      icon: BarChart,
      route: '/admin/analytics',
      description: 'App-Statistiken anzeigen',
      color: '#F59E0B'
    },
    {
      title: 'Content Management',
      icon: FileText,
      route: '/admin/content',
      description: 'Fragen & Inhalte verwalten',
      color: '#EF4444'
    },
    {
      title: 'Daily Tips',
      icon: Lightbulb,
      route: '/admin/daily-tips',
      description: 'Tägliche Tipps verwalten',
      color: '#F59E0B'
    },
    {
      title: 'Transform Medical Content',
      icon: Wand2,
      route: '/admin/transform-content',
      description: 'Alle medizinischen Inhalte in erweiterte Formate umwandeln',
      color: '#E2827F'
    },
    {
      title: 'Database',
      icon: Database,
      route: '/admin/database',
      description: 'Datenbank-Operationen',
      color: '#06B6D4'
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Shield size={28} color={colors.primary} />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Admin Panel</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Angemeldet als: {user?.email}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.grid}>
          {adminFeatures.map((feature, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => router.push(feature.route)}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: feature.color + '20' }]}>
                  <feature.icon size={32} color={feature.color} />
                  {feature.badge && (
                    <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                      <Text style={styles.badgeText}>{feature.badge}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {feature.title}
              </Text>
              <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                {feature.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  content: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  card: {
    width: '45%',
    margin: '2.5%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    position: 'relative',
    marginBottom: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
});