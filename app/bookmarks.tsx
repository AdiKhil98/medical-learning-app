import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import BookmarksList from '@/components/ui/BookmarksList';

export default function BookmarksPage() {
  const { colors } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <BookmarksList />
    </SafeAreaView>
  );
}