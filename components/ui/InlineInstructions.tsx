import React, { useState } from 'react';
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

export default function InlineInstructions({ tabs }: InlineInstructionsProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
  };

  const { width: screenWidth } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 768;

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={[styles.tabContainer, isSmallScreen && styles.tabContainerMobile]}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab,
              isSmallScreen && styles.tabMobile,
            ]}
            onPress={() => handleTabPress(tab.id)}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText,
              isSmallScreen && styles.tabTextMobile,
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
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