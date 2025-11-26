import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import Card from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { adminUserManagement } from '@/lib/edgeFunctions';

export default function SupabaseTestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const [runningSQL, setRunningSQL] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{step: string, success: boolean, message: string}[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkUserRole();
  }, [user]);

  const checkUserRole = async () => {
    try {
      if (!user) return;
      
      // Check user metadata for role
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      const role = userData?.app_metadata?.role || userData?.user_metadata?.role || null;
      setUserRole(role);
      
      logger.info('User role:', role);
    } catch (err: any) {
      logger.error('Error checking user role:', err.message);
    }
  };

  const makeUserAdmin = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        Alert.alert('Error', 'No user is logged in');
        return;
      }
      
      // Use Edge Function for admin operations
      await adminUserManagement.makeUserAdmin(user.id);
      
      await checkUserRole();
      Alert.alert('Success', 'User role updated to admin via Edge Function.');
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating user role');
      logger.error('Update role error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simple test query
      const { data, error } = await supabase
        .from('sections')
        .select('count');
      
      if (error) throw error;
      
      setConnectionStatus('success');
      logger.info('Connection successful!', data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while connecting to Supabase');
      setConnectionStatus('error');
      logger.error('Connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      
      setSections(data || []);
      logger.info('Sections fetched:', data?.length);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching sections');
      logger.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const addMigrationStatus = (step: string, success: boolean, message: string) => {
    setMigrationStatus(prev => [...prev, { step, success, message }]);
  };

  const fixUserProfile = async () => {
    try {
      setRunningSQL(true);
      setError(null);
      setMigrationStatus([]);
      
      addMigrationStatus('Start Fix', true, 'Starting to fix user profile...');
      
      if (!user) {
        addMigrationStatus('User Check', false, 'No user is logged in');
        return;
      }

      // Use Edge Function for user profile operations
      const result = await adminUserManagement.fixUserProfile(user.id);
      addMigrationStatus('Edge Function', true, result.message);

      Alert.alert('Success', 'User profile has been fixed successfully!');
    } catch (err: any) {
      setError(err.message || 'An error occurred while fixing user profile');
      logger.error('Fix user profile error:', err);
      Alert.alert('Error', err.message || 'An error occurred while fixing user profile');
    } finally {
      setRunningSQL(false);
    }
  };

  const runMigration = async () => {
    try {
      setRunningSQL(true);
      setError(null);
      setMigrationStatus([]);

      addMigrationStatus('Migration Start', true, 'Starting database migration via Edge Function...');
      
      // Use Edge Function for database migration
      const result = await adminUserManagement.runDatabaseMigration();
      addMigrationStatus('Edge Function Migration', true, result.message);
      
      // Fetch sections to verify everything worked
      addMigrationStatus('Final Check', true, 'Fetching sections to verify migration...');
      await fetchSections();
      addMigrationStatus('Final Check', true, 'Migration completed successfully!');
      
      Alert.alert('Success', 'Database migration completed successfully via Edge Function!');
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during migration');
      logger.error('Migration error:', err);
      Alert.alert('Migration Failed', err.message || 'An error occurred during Edge Function migration');
    } finally {
      setRunningSQL(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#E2827F" />
          <Text style={styles.backText}>Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Supabase Connection Test</Text>
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Fix User Profile</Text>
          <Text style={styles.descriptionText}>
            This fixes issues with missing user profiles or notification settings.
          </Text>
          <TouchableOpacity 
            style={[styles.button, {backgroundColor: '#F59E0B'}]} 
            onPress={fixUserProfile}
            disabled={loading || runningSQL}
          >
            <Text style={styles.buttonText}>
              Fix User Profile
            </Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>User Role</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.userInfo}>
              User ID: {user?.id || 'Not logged in'}
            </Text>
            <Text style={styles.userInfo}>
              Email: {user?.email || 'Not logged in'}
            </Text>
            <Text style={styles.userInfo}>
              Role: {userRole || 'No role assigned'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.button, {backgroundColor: '#22C55E'}]} 
            onPress={makeUserAdmin}
            disabled={loading || userRole === 'admin'}
          >
            <Text style={styles.buttonText}>
              {userRole === 'admin' ? 'Already Admin' : 'Make User Admin'}
            </Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.statusContainer}>
            {loading && connectionStatus !== 'success' && (
              <ActivityIndicator size="small" color="#E2827F" style={styles.spinner} />
            )}
            {connectionStatus === 'success' && (
              <Text style={styles.successText}>✅ Connected to Supabase successfully!</Text>
            )}
            {connectionStatus === 'error' && (
              <Text style={styles.errorText}>❌ Connection failed</Text>
            )}
            {error && <Text style={styles.errorDetails}>{error}</Text>}
          </View>
          <TouchableOpacity 
            style={styles.button} 
            onPress={testConnection}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Test Connection</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Database Setup</Text>
          <Text style={styles.descriptionText}>
            Click the button below to run database checks and ensure your user profile is properly set up.
          </Text>
          <TouchableOpacity 
            style={[styles.button, styles.warningButton]} 
            onPress={runMigration}
            disabled={runningSQL}
          >
            <Text style={styles.buttonText}>
              {runningSQL ? 'Running Checks...' : 'Run Database Checks'}
            </Text>
          </TouchableOpacity>
          
          {migrationStatus.length > 0 && (
            <View style={styles.migrationStatusContainer}>
              <Text style={styles.migrationStatusTitle}>Status:</Text>
              {migrationStatus.map((status, index) => (
                <View key={index} style={styles.migrationStep}>
                  <Text style={[
                    styles.migrationStepStatus, 
                    status.success ? styles.migrationSuccess : styles.migrationError
                  ]}>
                    {status.success ? '✅' : '❌'} {status.step}
                  </Text>
                  <Text style={styles.migrationStepMessage}>{status.message}</Text>
                </View>
              ))}
            </View>
          )}
          
          {runningSQL && <ActivityIndicator size="small" color="#F59E0B" style={styles.spinner} />}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Fetch Sections</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={fetchSections}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Fetch Sections</Text>
          </TouchableOpacity>
          
          {loading && !runningSQL && (
            <ActivityIndicator size="large" color="#E2827F" style={styles.spinner} />
          )}
          
          {error && !loading && !runningSQL && <Text style={styles.errorText}>{error}</Text>}
          
          <Text style={styles.resultHeader}>Sections ({sections.length})</Text>
          <ScrollView style={styles.sectionsContainer}>
            {sections.map((section) => (
              <View key={section.id} style={styles.sectionItem}>
                <Text style={styles.sectionItemTitle}>{section.title}</Text>
                <Text style={styles.sectionDetails}>
                  Slug: {section.slug}{'\n'}
                  Type: {section.type}{'\n'}
                  {section.category ? `Category: ${section.category}\n` : ''}
                  {section.parent_slug ? `Parent: ${section.parent_slug}\n` : ''}
                  {section.icon ? `Icon: ${section.icon}\n` : ''}
                  {section.color ? `Color: ${section.color}` : ''}
                </Text>
              </View>
            ))}
            
            {sections.length === 0 && !loading && !runningSQL && (
              <Text style={styles.noDataText}>No sections found. Try running database checks first.</Text>
            )}
          </ScrollView>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Details</Text>
          <Text style={styles.detailsText}>
            URL: {process.env.EXPO_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'}{'\n'}
            Key: {process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}{'\n'}
            {process.env.EXPO_PUBLIC_SUPABASE_URL && (
              `URL Host: ${new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).host}`
            )}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F3E8', // White Linen background
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#E2827F',
    marginLeft: 4,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1F2937',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 12,
  },
  descriptionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 16,
    lineHeight: 20,
  },
  statusContainer: {
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  spinner: {
    marginVertical: 8,
  },
  successText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#22C55E',
    marginBottom: 8,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 8,
  },
  errorDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#EF4444',
  },
  button: {
    backgroundColor: '#E2827F',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  warningButton: {
    backgroundColor: '#F59E0B',
  },
  buttonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
  migrationStatusContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  migrationStatusTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 8,
  },
  migrationStep: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  migrationStepStatus: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginBottom: 4,
  },
  migrationSuccess: {
    color: '#22C55E',
  },
  migrationError: {
    color: '#EF4444',
  },
  migrationStepMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4B5563',
    paddingLeft: 20,
  },
  resultHeader: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionsContainer: {
    maxHeight: 400,
  },
  sectionItem: {
    padding: 12,
    backgroundColor: '#F8F3E8', // White Linen background
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionItemTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4B5563',
  },
  noDataText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 20,
  },
  detailsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  userInfo: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
});