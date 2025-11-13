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
import { LinearGradient } from 'expo-linear-gradient';

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
    {isActive ? (
      <LinearGradient
        colors={['#8b5cf6', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.activeTabGradient}
      >
        <Text style={[
          styles.tabText,
          styles.activeTabText,
          isSmallScreen && styles.tabTextMobile,
        ]}>
          {tab.title}
        </Text>
      </LinearGradient>
    ) : (
      <Text style={[
        styles.tabText,
        isSmallScreen && styles.tabTextMobile,
      ]}>
        {tab.title}
      </Text>
    )}
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
      {/* Animated gradient background effect */}
      <View style={styles.gradientBackground}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.08)', 'rgba(236, 72, 153, 0.08)', 'rgba(167, 139, 250, 0.05)']}
          start={{ x: 0.2, y: 0.3 }}
          end={{ x: 0.8, y: 0.7 }}
          style={styles.gradientOverlay}
        />
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, isSmallScreen && styles.tabContainerMobile]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              isSmallScreen={isSmallScreen}
              onPress={() => handleTabPress(tab.id)}
            />
          ))}
        </ScrollView>
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
    backgroundColor: '#f5f7fa',
    borderRadius: 20,
    margin: 20,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  gradientOverlay: {
    flex: 1,
    opacity: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    zIndex: 1,
  },
  tabScrollContent: {
    flexDirection: 'row',
    gap: 10,
  },
  tabContainerMobile: {
    paddingHorizontal: 10,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  activeTabGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabMobile: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  activeTab: {
    backgroundColor: 'transparent',
    padding: 0,
    borderWidth: 0,
    shadowColor: 'rgba(139, 92, 246, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tabTextMobile: {
    fontSize: 14,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  contentContainer: {
    backgroundColor: 'transparent',
    minHeight: 400,
    maxHeight: 600,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
});
