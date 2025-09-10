import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { bookmarksService, UserBookmark } from '@/lib/bookmarksService';

/**
 * Debug component for testing bookmark removal functionality
 * Add this to any screen temporarily to test removal
 */
export default function DebugBookmarkRemoval() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<UserBookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      console.log('🔄 Loading bookmarks for debug...');
      const userBookmarks = await bookmarksService.getUserBookmarks();
      setBookmarks(userBookmarks);
      console.log('📚 Loaded bookmarks:', userBookmarks.length);
    } catch (error) {
      console.error('❌ Error loading bookmarks:', error);
      Alert.alert('Error', 'Could not load bookmarks: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testRemove = async (bookmark: UserBookmark) => {
    try {
      console.log('🧪 Testing remove for:', bookmark.section_title);
      
      Alert.alert(
        'Debug Remove Test',
        `Test remove "${bookmark.section_title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Test Remove',
            onPress: async () => {
              try {
                console.log('🗑️ Starting remove test...');
                await bookmarksService.removeBookmark(bookmark.section_slug);
                console.log('✅ Remove test successful!');
                
                Alert.alert('Success!', 'Bookmark removed successfully!');
                await loadBookmarks(); // Reload
                
              } catch (error: any) {
                console.error('❌ Remove test failed:', error);
                Alert.alert('Remove Failed', `Error: ${error.message}`);
              }
            }
          }
        ]
      );
      
    } catch (error: any) {
      console.error('❌ Test setup error:', error);
      Alert.alert('Test Error', error.message);
    }
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
      marginBottom: 10,
    },
    info: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    bookmarkItem: {
      padding: 15,
      backgroundColor: colors.card,
      marginBottom: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bookmarkTitle: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 5,
    },
    bookmarkSlug: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    testButton: {
      backgroundColor: '#ff4444',
      padding: 10,
      borderRadius: 5,
      alignItems: 'center',
    },
    buttonText: {
      color: 'white',
      fontWeight: 'bold',
    },
    noBookmarks: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 50,
    }
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading bookmarks...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔧 Debug Bookmark Removal</Text>
      <Text style={styles.info}>
        User: {user?.email || 'Not authenticated'}{'\n'}
        Bookmarks found: {bookmarks.length}
      </Text>

      {bookmarks.length === 0 ? (
        <Text style={styles.noBookmarks}>
          No bookmarks found to test with.{'\n'}
          Add some bookmarks first, then come back to test removal.
        </Text>
      ) : (
        bookmarks.map((bookmark) => (
          <View key={bookmark.id} style={styles.bookmarkItem}>
            <Text style={styles.bookmarkTitle}>{bookmark.section_title}</Text>
            <Text style={styles.bookmarkSlug}>Slug: {bookmark.section_slug}</Text>
            
            <TouchableOpacity
              style={styles.testButton}
              onPress={() => testRemove(bookmark)}
            >
              <Text style={styles.buttonText}>🗑️ Test Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}