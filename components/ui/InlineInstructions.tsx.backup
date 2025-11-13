import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions
} from 'react-native';

interface Tab {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface InlineInstructionsProps {
  tabs: Tab[];
}

// Memoized tab button component for better performance
const TabButton = React.memo(({
  tab,
  isActive,
  isSmallScreen,
  onPress
}: {
  tab: Tab;
  isActive: boolean;
  isSmallScreen: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[
      styles.tab,
      isActive && styles.activeTab,
      isSmallScreen && styles.tabMobile,
    ]}
    onPress={onPress}
    activeOpacity={0.8}
    accessible={true}
    accessibilityRole="button"
  >
    <Text style={[
      styles.tabText,
      isActive && styles.activeTabText,
      isSmallScreen && styles.tabTextMobile,
    ]}>
      {tab.title}
    </Text>
  </TouchableOpacity>
));

export default function InlineInstructions({ tabs }: InlineInstructionsProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

  const handleTabPress = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  const { width: screenWidth } = Dimensions.get('window');
  const isSmallScreen = useMemo(() => screenWidth < 768, [screenWidth]);

  const activeTabContent = useMemo(
    () => tabs.find(tab => tab.id === activeTab)?.content,
    [tabs, activeTab]
  );

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={[styles.tabContainer, isSmallScreen && styles.tabContainerMobile]}>
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            isSmallScreen={isSmallScreen}
            onPress={() => handleTabPress(tab.id)}
          />
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={21}
          scrollEventThrottle={16}
        >
          {activeTabContent}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(248, 243, 232, 0.95)',
    borderRadius: 16,
    margin: 20,
    shadowColor: 'rgba(181, 87, 64, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(248, 243, 232, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184, 126, 112, 0.2)',
  },
  tabContainerMobile: {
    flexDirection: 'column',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    backgroundColor: 'transparent',
  },
  tabMobile: {
    flex: 0,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184, 126, 112, 0.1)',
  },
  activeTab: {
    backgroundColor: '#B15740',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#B87E70',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tabTextMobile: {
    fontSize: 14,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  contentContainer: {
    backgroundColor: '#FFFFFF',
    minHeight: 400,
    maxHeight: 500,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
});