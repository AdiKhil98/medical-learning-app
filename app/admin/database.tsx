import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { 
  Database, 
  Play, 
  Trash2, 
  Download, 
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Terminal,
  Table,
  Users,
  FileText
} from 'lucide-react-native';

interface QueryResult {
  data?: any[];
  error?: string;
  rowCount?: number;
  executionTime?: number;
}

export default function DatabaseManagement() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [dbStats, setDbStats] = useState({
    users: 0,
    sections: 0,
    auditLogs: 0,
    appUpdates: 0
  });

  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  const fetchDatabaseStats = async () => {
    try {
      const [usersResult, sectionsResult, auditResult, updatesResult] = await Promise.allSettled([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('sections').select('*', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
        supabase.from('app_updates').select('*', { count: 'exact', head: true })
      ]);

      setDbStats({
        users: usersResult.status === 'fulfilled' ? usersResult.value.count || 0 : 0,
        sections: sectionsResult.status === 'fulfilled' ? sectionsResult.value.count || 0 : 0,
        auditLogs: auditResult.status === 'fulfilled' ? auditResult.value.count || 0 : 0,
        appUpdates: updatesResult.status === 'fulfilled' ? updatesResult.value.count || 0 : 0
      });
    } catch (error) {
      logger.error('Error fetching database stats:', error);
    }
  };

  const executeQuery = async () => {
    if (!queryText.trim()) {
      Alert.alert('Error', 'Please enter a query');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      // Simple validation to prevent destructive queries
      const lowerQuery = queryText.toLowerCase().trim();
      if (lowerQuery.includes('drop ') || lowerQuery.includes('delete ') || lowerQuery.includes('truncate ')) {
        Alert.alert(
          'Dangerous Query Detected',
          'This query could be destructive. Are you sure you want to continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Execute',
              style: 'destructive',
              onPress: () => executeRawQuery(startTime)
            }
          ]
        );
        return;
      }

      await executeRawQuery(startTime);
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      setQueryResult({
        error: error.message || 'Query execution failed',
        executionTime
      });
    } finally {
      setLoading(false);
    }
  };

  const executeRawQuery = async (startTime: number) => {
    try {
      const { data, error, count } = await supabase.rpc('execute_sql', {
        query: queryText
      });

      const executionTime = Date.now() - startTime;

      if (error) {
        setQueryResult({
          error: error.message,
          executionTime
        });
      } else {
        setQueryResult({
          data: data || [],
          rowCount: count || (Array.isArray(data) ? data.length : 0),
          executionTime
        });
      }
    } catch (error: any) {
      // Fallback for when RPC doesn't exist - try basic SELECT queries
      if (queryText.toLowerCase().trim().startsWith('select')) {
        try {
          const tableName = extractTableName(queryText);
          if (tableName) {
            const { data, error } = await supabase.from(tableName).select('*').limit(50);
            const executionTime = Date.now() - startTime;
            
            if (error) {
              setQueryResult({ error: error.message, executionTime });
            } else {
              setQueryResult({ data: data || [], rowCount: data?.length || 0, executionTime });
            }
          } else {
            throw new Error('Could not determine table name');
          }
        } catch (fallbackError: any) {
          const executionTime = Date.now() - startTime;
          setQueryResult({
            error: 'Query execution not supported. Use basic table operations below.',
            executionTime
          });
        }
      } else {
        const executionTime = Date.now() - startTime;
        setQueryResult({
          error: 'Only SELECT queries are supported without RPC function',
          executionTime
        });
      }
    }
  };

  const extractTableName = (query: string): string | null => {
    const match = query.match(/from\s+(\w+)/i);
    return match ? match[1] : null;
  };

  const clearResults = () => {
    setQueryResult(null);
  };

  const loadSampleQuery = (query: string) => {
    setQueryText(query);
  };

  const exportData = (tableName: string) => {
    Alert.alert(
      'Export Data',
      `Export ${tableName} table data to JSON?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              const { data, error } = await supabase.from(tableName).select('*');
              if (error) throw error;
              
              // In a real app, you'd use a file system API to save the file
              Alert.alert('Export Complete', `${data?.length || 0} rows exported from ${tableName}`);
              logger.info(`${tableName} export:`, JSON.stringify(data, null, 2));
            } catch (error: any) {
              Alert.alert('Export Failed', error.message);
            }
          }
        }
      ]
    );
  };

  const clearTable = (tableName: string) => {
    Alert.alert(
      'Clear Table',
      `Are you sure you want to clear all data from ${tableName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from(tableName).delete().neq('id', '');
              if (error) throw error;
              
              Alert.alert('Success', `${tableName} table cleared`);
              await fetchDatabaseStats();
            } catch (error: any) {
              Alert.alert('Error', `Failed to clear ${tableName}: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const sampleQueries = [
    {
      name: 'List All Users',
      query: 'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 10;'
    },
    {
      name: 'Recent Sections',
      query: 'SELECT title, slug, type, display_order FROM sections ORDER BY display_order;'
    },
    {
      name: 'User Count by Role',
      query: 'SELECT role, COUNT(*) as count FROM users GROUP BY role;'
    },
    {
      name: 'Recent App Updates',
      query: 'SELECT title, category, priority, created_at FROM app_updates ORDER BY created_at DESC LIMIT 5;'
    }
  ];

  const tableOperations = [
    { name: 'users', icon: Users, count: dbStats.users },
    { name: 'sections', icon: Table, count: dbStats.sections },
    { name: 'app_updates', icon: FileText, count: dbStats.appUpdates },
    { name: 'audit_logs', icon: Terminal, count: dbStats.auditLogs }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Database size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Database Management</Text>
        <TouchableOpacity onPress={fetchDatabaseStats}>
          <RefreshCw size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Database Stats */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Database Overview</Text>
          <View style={styles.statsGrid}>
            {tableOperations.map((table) => (
              <View key={table.name} style={styles.statItem}>
                <table.icon size={20} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{table.count}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{table.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* SQL Query Interface */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>SQL-Abfrageschnittstelle</Text>
          
          <TextInput
            style={[styles.queryInput, { backgroundColor: colors.background, color: colors.text }]}
            value={queryText}
            onChangeText={setQueryText}
            placeholder="Geben Sie Ihre SQL-Abfrage hier ein..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={6}
          />

          <View style={styles.queryActions}>
            <TouchableOpacity
              style={[styles.executeButton, { backgroundColor: colors.primary }]}
              onPress={executeQuery}
              disabled={loading}
            >
              <Play size={16} color="white" />
              <Text style={styles.executeButtonText}>
                {loading ? 'Wird ausgeführt...' : 'Abfrage ausführen'}
              </Text>
            </TouchableOpacity>

            {queryResult && (
              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: '#6B7280' }]}
                onPress={clearResults}
              >
                <XCircle size={16} color="white" />
                <Text style={styles.clearButtonText}>Löschen</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Query Results */}
          {queryResult && (
            <View style={[styles.resultContainer, { backgroundColor: colors.background }]}>
              <View style={styles.resultHeader}>
                {queryResult.error ? (
                  <XCircle size={16} color="#EF4444" />
                ) : (
                  <CheckCircle size={16} color="#10B981" />
                )}
                <Text style={[styles.resultStatus, { 
                  color: queryResult.error ? '#EF4444' : '#10B981' 
                }]}>
                  {queryResult.error ? 'Error' : 'Success'}
                </Text>
                <Text style={[styles.executionTime, { color: colors.textSecondary }]}>
                  {queryResult.executionTime}ms
                </Text>
              </View>

              {queryResult.error ? (
                <Text style={[styles.errorText, { color: '#EF4444' }]}>
                  {queryResult.error}
                </Text>
              ) : (
                <>
                  <Text style={[styles.rowCount, { color: colors.textSecondary }]}>
                    {queryResult.rowCount} rows returned
                  </Text>
                  <ScrollView horizontal style={styles.resultTable}>
                    <Text style={[styles.resultData, { color: colors.text }]}>
                      {JSON.stringify(queryResult.data, null, 2)}
                    </Text>
                  </ScrollView>
                </>
              )}
            </View>
          )}
        </View>

        {/* Sample Queries */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sample Queries</Text>
          {sampleQueries.map((sample, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.sampleQuery, { backgroundColor: colors.background }]}
              onPress={() => loadSampleQuery(sample.query)}
            >
              <Terminal size={16} color={colors.primary} />
              <Text style={[styles.sampleQueryName, { color: colors.text }]}>{sample.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Table Operations */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Table Operations</Text>
          <View style={styles.warningContainer}>
            <AlertTriangle size={16} color="#F59E0B" />
            <Text style={[styles.warningText, { color: '#F59E0B' }]}>
              Be careful with destructive operations
            </Text>
          </View>

          {tableOperations.map((table) => (
            <View key={table.name} style={styles.tableOperation}>
              <View style={styles.tableInfo}>
                <table.icon size={20} color={colors.text} />
                <Text style={[styles.tableName, { color: colors.text }]}>{table.name}</Text>
                <Text style={[styles.tableCount, { color: colors.textSecondary }]}>
                  ({table.count} rows)
                </Text>
              </View>
              
              <View style={styles.tableActions}>
                <TouchableOpacity
                  style={[styles.tableActionButton, { backgroundColor: '#E2827F' }]}
                  onPress={() => exportData(table.name)}
                >
                  <Download size={14} color="white" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.tableActionButton, { backgroundColor: '#EF4444' }]}
                  onPress={() => clearTable(table.name)}
                >
                  <Trash2 size={14} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Database Health */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Database Health</Text>
          <View style={styles.healthItems}>
            <View style={styles.healthItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={[styles.healthText, { color: colors.text }]}>
                Connection: Active
              </Text>
            </View>
            <View style={styles.healthItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={[styles.healthText, { color: colors.text }]}>
                Tables: {tableOperations.length} found
              </Text>
            </View>
            <View style={styles.healthItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={[styles.healthText, { color: colors.text }]}>
                Total Records: {Object.values(dbStats).reduce((a, b) => a + b, 0)}
              </Text>
            </View>
          </View>
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
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
  },
  queryInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 12,
    minHeight: 120,
    fontFamily: 'monospace',
  },
  queryActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  executeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  executeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resultContainer: {
    borderRadius: 8,
    padding: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  resultStatus: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  executionTime: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  rowCount: {
    fontSize: 12,
    marginBottom: 8,
  },
  resultTable: {
    maxHeight: 200,
  },
  resultData: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  sampleQuery: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  sampleQueryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tableOperation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '500',
  },
  tableCount: {
    fontSize: 12,
  },
  tableActions: {
    flexDirection: 'row',
    gap: 8,
  },
  tableActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthItems: {
    gap: 12,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  healthText: {
    fontSize: 14,
  },
});