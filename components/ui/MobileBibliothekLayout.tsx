import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import {
  Grid3X3,
  List,
  Search,
  Stethoscope,
  Heart,
  Activity,
  Brain,
  Baby,
  Users,
  AlertTriangle,
  FileText,
  FolderOpen,
} from 'lucide-react-native';
import { MobileBibliothekCard, MobileBibliothekListItem } from './MobileBibliothekCard';

// Export Section type for compatibility with HierarchicalBibliothek
export interface Section {
  id: string;
  slug: string;
  title: string;
  type: 'main-category' | 'sub-category' | 'section' | 'subsection' | 'content' | string;
  icon?: string;
  color?: string;
  description?: string;
  parent_slug?: string | null;
  hasChildren?: boolean;
  content_improved?: any;
  childCount?: number;
}

interface MobileBibliothekLayoutProps {
  sections: Section[];
  title: string;
  onSectionPress: (section: Section) => void;
  onBookmarkPress?: (section: Section) => void;
  bookmarkedSections?: Set<string>;
  showViewToggle?: boolean;
  subtitle?: string;
  loading?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function MobileBibliothekLayout({
  sections,
  title,
  onSectionPress,
  onBookmarkPress,
  bookmarkedSections = new Set(),
  showViewToggle = true,
  subtitle,
  loading = false,
}: MobileBibliothekLayoutProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, any> = {
      Stethoscope,
      Heart,
      Activity,
      Brain,
      Baby,
      Users,
      AlertTriangle,
      Scan: Heart, // Replace magnifying glass with heart icon
      FileText,
      FolderOpen,
    };
    return iconMap[iconName] || Stethoscope; // Default to Stethoscope instead of Search
  };

  const getGradient = (index: number) => {
    const gradients = [
      ['#E2827F', '#B87E70', '#A0645D'], // Main medical red
      ['#4F46E5', '#6366F1', '#8B5CF6'], // Purple
      ['#059669', '#10B981', '#34D399'], // Green
      ['#DC2626', '#EF4444', '#F87171'], // Red
      ['#D97706', '#F59E0B', '#FBBF24'], // Orange
      ['#7C2D12', '#9A3412', '#C2410C'], // Brown
    ];
    return gradients[index % gradients.length];
  };

  const renderGridView = () => (
    <View style={styles.gridContainer}>
      {sections.map((section, index) => (
        <MobileBibliothekCard
          key={section.id}
          title={section.title}
          icon={getIconComponent(section.icon)}
          gradient={getGradient(index)}
          hasContent={Boolean(section.content_improved)}
          itemCount={section.childCount}
          isBookmarked={bookmarkedSections.has(section.slug)}
          onPress={() => onSectionPress(section)}
          onBookmarkPress={onBookmarkPress ? () => onBookmarkPress(section) : undefined}
        />
      ))}
    </View>
  );

  const renderListView = () => (
    <View style={styles.listContainer}>
      {sections.map((section, index) => (
        <MobileBibliothekListItem
          key={section.id}
          title={section.title}
          icon={getIconComponent(section.icon)}
          gradient={getGradient(index)}
          hasContent={Boolean(section.content_improved)}
          itemCount={section.childCount}
          isBookmarked={bookmarkedSections.has(section.slug)}
          onPress={() => onSectionPress(section)}
          onBookmarkPress={onBookmarkPress ? () => onBookmarkPress(section) : undefined}
        />
      ))}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      bounces={true}
      alwaysBounceVertical={true}
    >
      {/* Content Header - now scrollable */}
      {title && (
        <View style={styles.contentHeader}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>{title}</Text>
            {loading && <View style={styles.headerLoader} />}
          </View>
          {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
      )}

      {/* View Toggle Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionCount}>
            {sections.length} {sections.length === 1 ? 'Kategorie' : 'Kategorien'}
          </Text>
        </View>

        {showViewToggle && (
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'grid' && styles.toggleButtonActive]}
              onPress={() => setViewMode('grid')}
            >
              <Grid3X3 size={18} color={viewMode === 'grid' ? '#FFFFFF' : '#6B7280'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <List size={18} color={viewMode === 'list' ? '#FFFFFF' : '#6B7280'} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>{viewMode === 'grid' ? renderGridView() : renderListView()}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  contentHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 0,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    flex: 1,
    color: '#A04A35',
  },
  headerLoader: {
    marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 20,
    color: '#333333',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contentContainer: {
    paddingHorizontal: 0,
  },
  headerLeft: {
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#E2827F',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Increased bottom padding to ensure all content is accessible
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  listContainer: {
    gap: 8,
    paddingHorizontal: 16,
  },
});
