import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Grid3X3, List, Search, Stethoscope, Heart, Activity, Brain, Baby, Users, AlertTriangle, FileText, FolderOpen } from 'lucide-react-native';
import { MobileBibliothekCard, MobileBibliothekListItem } from './MobileBibliothekCard';

interface Section {
  id: string;
  slug: string;
  title: string;
  type: string;
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
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function MobileBibliothekLayout({
  sections,
  title,
  onSectionPress,
  onBookmarkPress,
  bookmarkedSections = new Set(),
  showViewToggle = true
}: MobileBibliothekLayoutProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'Stethoscope': Stethoscope,
      'Heart': Heart,
      'Activity': Activity,
      'Brain': Brain,
      'Baby': Baby,
      'Users': Users,
      'AlertTriangle': AlertTriangle,
      'Scan': Heart, // Replace magnifying glass with heart icon
      'FileText': FileText,
      'FolderOpen': FolderOpen,
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>{title}</Text>
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
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {viewMode === 'grid' ? renderGridView() : renderListView()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
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
    padding: 16,
    paddingBottom: 32,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  listContainer: {
    gap: 8,
  },
});