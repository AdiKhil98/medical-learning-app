import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { OptimizedImage } from '@/components/OptimizedImage';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronRight,
  BookOpen,
  FileText,
  Stethoscope,
  Scissors,
  AlertTriangle,
  Microscope,
  Droplets,
  Scan,
  Heart,
  Brain,
  Bone,
  Eye,
} from 'lucide-react-native';
import Card from './Card';
import { MedicalSection } from '@/lib/medicalContentService';
import { colors } from '@/constants/colors';

interface MedicalSectionCardProps {
  section: MedicalSection;
  onPress: () => void;
  showCategory?: boolean;
  compact?: boolean;
}

// Map medical categories to appropriate icons
const getCategoryIcon = (category: string, title: string, iconName?: string) => {
  const categoryLower = category?.toLowerCase() || '';
  const titleLower = title.toLowerCase();
  
  // Check category first
  switch (categoryLower) {
    case 'innere medizin':
    case 'internal medicine':
      return Stethoscope;
    case 'chirurgie':
    case 'surgery':
      return Scissors;
    case 'notfallmedizin':
    case 'emergency':
      return AlertTriangle;
    case 'infektiologie':
    case 'infectious diseases':
      return Microscope;
    case 'urologie':
    case 'urology':
      return Droplets;
    case 'radiologie':
    case 'radiology':
      return Scan;
    case 'kardiologie':
    case 'cardiology':
      return Heart;
    case 'neurologie':
    case 'neurology':
      return Brain;
    case 'orthopädie':
    case 'orthopedics':
      return Bone;
    case 'ophthalmologie':
    case 'ophthalmology':
      return Eye;
  }
  
  // Check title keywords
  if (titleLower.includes('herz') || titleLower.includes('kardio')) return Heart;
  if (titleLower.includes('gehirn') || titleLower.includes('neuro')) return Brain;
  if (titleLower.includes('knochen') || titleLower.includes('ortho')) return Bone;
  if (titleLower.includes('auge') || titleLower.includes('augen')) return Eye;
  if (titleLower.includes('chirurg')) return Scissors;
  if (titleLower.includes('notfall') || titleLower.includes('emergency')) return AlertTriangle;
  
  // Default icons based on type
  return BookOpen;
};

// Get category-specific colors
const getCategoryColor = (category: string, title: string, defaultColor?: string) => {
  if (defaultColor) return defaultColor;
  
  const categoryLower = category?.toLowerCase() || '';
  const titleLower = title.toLowerCase();
  
  switch (categoryLower) {
    case 'innere medizin':
      return '#E2827F';
    case 'chirurgie':
      return '#E5877E';
    case 'notfallmedizin':
      return '#EF4444';
    case 'infektiologie':
      return '#DC2626';
    case 'urologie':
      return '#0369A1';
    case 'radiologie':
      return '#22C55E';
    case 'kardiologie':
      return '#BE123C';
    case 'neurologie':
      return '#B15740';
    case 'orthopädie':
      return '#D97706';
    case 'ophthalmologie':
      return '#059669';
    default:
      if (titleLower.includes('herz')) return '#BE123C';
      if (titleLower.includes('gehirn')) return '#B15740';
      if (titleLower.includes('chirurg')) return '#E5877E';
      return '#6B7280';
  }
};

export default memo(function MedicalSectionCard({ 
  section, 
  onPress, 
  showCategory = true, 
  compact = false 
}: MedicalSectionCardProps) {
    
  const IconComponent = useMemo(() => 
    getCategoryIcon(section.category || '', section.title, section.icon), 
    [section.category, section.title, section.icon]
  );
  
  const categoryColor = useMemo(() => 
    getCategoryColor(section.category || '', section.title, section.color), 
    [section.category, section.title, section.color]
  );
  
  const gradientColors = useMemo(() => [
    `${categoryColor}15`, 
    `${categoryColor}05`
  ], [categoryColor]);

  const cardStyles = useMemo(() => ({
    ...styles.card,
    backgroundColor: colors.card,
    ...(compact && styles.compactCard),
  }), [colors.card, compact]);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    categoryBadge: {
      backgroundColor: `${categoryColor}20`,
      borderColor: categoryColor,
    },
    categoryBadgeText: {
      color: categoryColor,
    },
    title: {
      fontSize: compact ? 14 : 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: compact ? 4 : 8,
    },
    description: {
      fontSize: compact ? 12 : 14,
      color: colors.textSecondary,
      lineHeight: compact ? 16 : 20,
    },
    contentIndicator: {
      backgroundColor: `${categoryColor}20`,
      borderColor: categoryColor,
    },
    contentIndicatorText: {
      color: categoryColor,
      fontSize: 11,
    },
  }), [colors, categoryColor, compact]);

  const hasContent = !!(
    section.content_html ||
    (Array.isArray(section.content_improved) && section.content_improved.length > 0) ||
    (Array.isArray(section.content_json) && section.content_json.length > 0) ||
    section.content_details
  );

  const getContentTypeLabel = () => {
    if (section.content_html) return 'HTML';
    if (Array.isArray(section.content_improved) && section.content_improved.length > 0) return 'Strukturiert';
    if (Array.isArray(section.content_json) && section.content_json.length > 0) return 'JSON';
    if (section.content_details) return 'Text';
    return null;
  };

  return (
    <Card style={cardStyles}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <LinearGradient colors={gradientColors} style={styles.gradient}>
          <View style={styles.content}>
            {/* Header with icon and category */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}15` }]}>
                  <IconComponent size={compact ? 18 : 24} color={categoryColor} />
                </View>
                <View style={styles.headerText}>
                  <Text style={dynamicStyles.title} numberOfLines={compact ? 1 : 2}>
                    {section.title}
                  </Text>
                  {showCategory && section.category && (
                    <View style={[styles.categoryBadge, dynamicStyles.categoryBadge]}>
                      <Text style={[styles.categoryBadgeText, dynamicStyles.categoryBadgeText]}>
                        {section.category}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </View>

            {/* Image if available */}
            {section.image_url && !compact && (
              <View style={styles.imageContainer}>
                <OptimizedImage
                  source={{ uri: section.image_url }}
                  style={styles.image}
                  resizeMode="cover"
                  lazy={true}
                  height={120}
                  alt={section.title}
                />
              </View>
            )}

            {/* Description */}
            {section.description && (
              <Text 
                style={dynamicStyles.description} 
                numberOfLines={compact ? 2 : 3}
              >
                {section.description}
              </Text>
            )}

            {/* Footer with content indicators */}
            <View style={styles.footer}>
              {hasContent && (
                <View style={[styles.contentIndicator, dynamicStyles.contentIndicator]}>
                  <FileText size={12} color={categoryColor} />
                  <Text style={dynamicStyles.contentIndicatorText}>
                    {getContentTypeLabel()}
                  </Text>
                </View>
              )}
              
              {section.type && (
                <View style={styles.typeIndicator}>
                  <Text style={[styles.typeText, { color: colors.textSecondary }]}>
                    {section.type === 'folder' ? 'Kategorie' : 'Inhalt'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  compactCard: {
    marginBottom: 8,
  },
  gradient: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageContainer: {
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 120,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  contentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  typeIndicator: {
    flex: 1,
    alignItems: 'flex-end',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});