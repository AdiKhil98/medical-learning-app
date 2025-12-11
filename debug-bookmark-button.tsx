import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { bookmarksService } from '@/lib/bookmarksService';
import BookmarkButton from '@/components/ui/BookmarkButton';
import { colors } from '@/constants/colors';

/**
 * Debug component for testing bookmark button functionality
 * Add this to any screen temporarily to test bookmark buttons
 */
export default function DebugBookmarkButton() {
    const { user } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log('🔧 Debug:', message);
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testBookmarkStatus = async () => {
    try {
      addLog('Testing bookmark status check...');
      const isBookmarked = await bookmarksService.isBookmarked('test-section-slug');
      addLog(`Bookmark status result: ${isBookmarked}`);
    } catch (error: any) {
      addLog(`Error checking bookmark status: ${error.message}`);
    }
  };

  const testAuthentication = async () => {
    try {
      addLog('Testing authentication...');
      if (user) {
        addLog(`User authenticated: ${user.email} (ID: ${user.id})`);
      } else {
        addLog('No user authenticated');
      }
    } catch (error: any) {
      addLog(`Authentication error: ${error.message}`);
    }
  };

  const testBookmarkToggle = async () => {
    try {
      addLog('Testing bookmark toggle...');
      const result = await bookmarksService.toggleBookmark(
        'debug-test-slug',
        'Debug Test Section',
        'Test Category'
      );
      addLog(`Toggle result: ${result}`);
    } catch (error: any) {
      addLog(`Toggle error: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  const styles = StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 10,
    },
    testButton: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      alignItems: 'center',
    },
    clearButton: {
      backgroundColor: '#ff4444',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      alignItems: 'center',
    },
    buttonText: {
      color: 'white',
      fontWeight: 'bold',
    },
    bookmarkTest: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 8,
      marginBottom: 8,
    },
    bookmarkTestText: {
      flex: 1,
      marginLeft: 12,
      color: colors.text,
    },
    logContainer: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 12,
      maxHeight: 200,
    },
    logText: {
      fontSize: 12,
      color: colors.text,
      fontFamily: 'monospace',
      marginBottom: 4,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔧 Bookmark Button Debug</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Status</Text>
        <Text style={[styles.logText, { color: colors.text }]}>
          User: {user?.email || 'Not authenticated'}{'\n'}
          User ID: {user?.id || 'N/A'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Actions</Text>
        
        <TouchableOpacity style={styles.testButton} onPress={testAuthentication}>
          <Text style={styles.buttonText}>Test Authentication</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testBookmarkStatus}>
          <Text style={styles.buttonText}>Test Bookmark Status Check</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testBookmarkToggle}>
          <Text style={styles.buttonText}>Test Bookmark Toggle</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} onPress={clearLogs}>
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Bookmark Button</Text>
        <View style={styles.bookmarkTest}>
          <BookmarkButton
            sectionSlug="debug-test-section"
            sectionTitle="Debug Test Section"
            sectionCategory="Test"
            size={24}
          />
          <Text style={styles.bookmarkTestText}>
            Debug Test Section{'\n'}
            Slug: debug-test-section
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debug Logs</Text>
        <ScrollView style={styles.logContainer} nestedScrollEnabled>
          {testResults.length === 0 ? (
            <Text style={styles.logText}>No logs yet. Run tests above.</Text>
          ) : (
            testResults.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))
          )}
        </ScrollView>
      </View>
    </ScrollView>
  );
}