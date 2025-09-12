import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import HierarchicalBibliothek from '@/components/ui/HierarchicalBibliothek';
import { runGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';

const BibliothekIndex: React.FC = () => {
  const { colors } = useTheme();

  // Ensure Voiceflow widget is cleaned up when entering Bibliothek
  useEffect(() => {
    console.log('📚 Bibliothek page loaded - running Voiceflow cleanup');
    runGlobalVoiceflowCleanup();
    
    // Run cleanup again after a delay to catch any delayed widgets
    const timeouts = [
      setTimeout(() => runGlobalVoiceflowCleanup(), 500),
      setTimeout(() => runGlobalVoiceflowCleanup(), 1500),
      setTimeout(() => runGlobalVoiceflowCleanup(), 3000),
    ];

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

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