import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

interface DebugLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface DebugPanelProps {
  logs: DebugLog[];
  onClear?: () => void;
  visible?: boolean;
}

export function DebugPanel({ logs, onClear, visible = true }: DebugPanelProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚨 DEBUG PANEL 🚨</Text>
        {onClear && (
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView style={styles.logContainer}>
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>No logs yet...</Text>
        ) : (
          logs.map((log, index) => (
            <View key={index} style={[styles.logItem, styles[`log_${log.type}`]]}>
              <Text style={styles.timestamp}>{log.timestamp}</Text>
              <Text style={styles.message}>{log.message}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 400,
    maxHeight: 300,
    backgroundColor: '#000000',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ff0000',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#ff0000',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  clearButtonText: {
    color: '#ff0000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logContainer: {
    maxHeight: 250,
    padding: 10,
  },
  emptyText: {
    color: '#888888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  logItem: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 4,
    borderLeftWidth: 4,
  },
  log_info: {
    backgroundColor: '#1a1a1a',
    borderLeftColor: '#3b82f6',
  },
  log_success: {
    backgroundColor: '#0a2a0a',
    borderLeftColor: '#22c55e',
  },
  log_error: {
    backgroundColor: '#2a0a0a',
    borderLeftColor: '#ef4444',
  },
  log_warning: {
    backgroundColor: '#2a2a0a',
    borderLeftColor: '#f59e0b',
  },
  timestamp: {
    color: '#888888',
    fontSize: 10,
    marginBottom: 2,
  },
  message: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
