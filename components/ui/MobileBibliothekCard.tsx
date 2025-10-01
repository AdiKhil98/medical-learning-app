import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, ChevronRight, BookOpen, Stethoscope } from 'lucide-react-native';

interface MobileBibliothekCardProps {
  title: string;
  icon?: React.ComponentType<any>;
  gradient?: string[];
  hasContent?: boolean;
  onPress?: () => void;
  itemCount?: number;
  isBookmarked?: boolean;
  onBookmarkPress?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 cards per row with 16px margins and 16px gap

export function MobileBibliothekCard({
  title,
  icon: IconComponent = Stethoscope,
  gradient = ['#E2827F', '#B87E70', '#A0645D'],
  hasContent = false,
  onPress,
  itemCount,
  isBookmarked = false,
  onBookmarkPress
}: MobileBibliothekCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.cardContainer, { width: CARD_WIDTH }]}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${title}${itemCount ? `, ${itemCount} Kategorien` : ''}`}
    >
      <View style={[styles.card, isPressed && styles.cardPressed]}>
        <LinearGradient
          colors={gradient}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Header with bookmark */}
          <View style={styles.cardHeader}>
            {hasContent && (
              <View style={styles.statusIndicator}>
                <View style={styles.statusDot} />
              </View>
            )}

            {onBookmarkPress && (
              <TouchableOpacity
                style={styles.bookmarkButton}
                onPress={onBookmarkPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Heart
                  size={16}
                  color={isBookmarked ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'}
                  fill={isBookmarked ? '#FFFFFF' : 'transparent'}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <IconComponent size={32} color="rgba(255, 255, 255, 0.9)" />
            </View>

            {/* Title */}
            <Text style={styles.cardTitle} numberOfLines={3}>
              {title}
            </Text>

            {/* Item count or content indicator */}
            <View style={styles.cardFooter}>
              {itemCount !== undefined ? (
                <Text style={styles.itemCount}>
                  {itemCount} {itemCount === 1 ? 'Kategorie' : 'Kategorien'}
                </Text>
              ) : hasContent ? (
                <Text style={styles.contentLabel}>Inhalte verfügbar</Text>
              ) : null}

              <ChevronRight size={14} color="rgba(255, 255, 255, 0.8)" />
            </View>
          </View>

          {/* Subtle overlay for depth */}
          <View style={styles.cardOverlay} />
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

// Alternative list view for dense content
export function MobileBibliothekListItem({
  title,
  icon: IconComponent = Stethoscope,
  gradient = ['#E2827F', '#B87E70'],
  hasContent = false,
  onPress,
  itemCount,
  isBookmarked = false,
  onBookmarkPress
}: MobileBibliothekCardProps) {
  return (
    <TouchableOpacity
      style={styles.listItemContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.listItem}>
        {/* Icon with gradient background */}
        <LinearGradient
          colors={gradient}
          style={styles.listIconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <IconComponent size={24} color="white" />
        </LinearGradient>

        {/* Content */}
        <View style={styles.listContent}>
          <Text style={styles.listTitle} numberOfLines={1}>
            {title}
          </Text>

          {itemCount !== undefined && (
            <Text style={styles.listSubtitle}>
              {itemCount} {itemCount === 1 ? 'Kategorie' : 'Kategorien'}
            </Text>
          )}
        </View>

        {/* Status indicators */}
        <View style={styles.listActions}>
          {hasContent && <View style={styles.listStatusDot} />}

          {onBookmarkPress && (
            <TouchableOpacity
              style={styles.listBookmarkButton}
              onPress={onBookmarkPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Heart
                size={16}
                color={isBookmarked ? '#E2827F' : '#9CA3AF'}
                fill={isBookmarked ? '#E2827F' : 'transparent'}
              />
            </TouchableOpacity>
          )}

          <ChevronRight size={18} color="#9CA3AF" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Card View Styles
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  cardGradient: {
    borderRadius: 16,
    minHeight: 160,
    padding: 16,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    margin: 1,
  },
  bookmarkButton: {
    padding: 4,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  iconContainer: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
    lineHeight: 18,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    textAlign: 'left',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  itemCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  contentLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    pointerEvents: 'none',
  },

  // List View Styles
  listItemContainer: {
    marginBottom: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  listIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  listSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  listBookmarkButton: {
    padding: 4,
  },
});