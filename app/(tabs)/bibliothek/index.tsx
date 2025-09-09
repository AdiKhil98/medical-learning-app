import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import HierarchicalBibliothek from '@/components/ui/HierarchicalBibliothek';

const BibliothekIndex: React.FC = () => {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HierarchicalBibliothek />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default BibliothekIndex;