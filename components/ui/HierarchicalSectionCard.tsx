import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, FileText, FolderIcon, File, BookOpen, FileCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { MedicalSection } from '@/lib/medicalContentService';
import Card from './Card';

interface HierarchicalSectionCardProps {
  section: MedicalSection;
  onPress: () => void;
  hierarchyLevel?: number;
}

export default function HierarchicalSectionCard({ 
  section, 
  onPress, 
  hierarchyLevel = 0 
}: HierarchicalSectionCardProps) {
  const { colors, isDarkMode } = useTheme();

  // Get appropriate icon based on hierarchy level and type
  const getHierarchyIcon = () => {
    if (section.has_content || section.type === 'file-text' || section.type === 'markdown') {
      return <FileCheck size={20} color={section.color || colors.primary} />;
    }
    
    switch (hierarchyLevel) {
      case 0: // Main category
        return <FolderIcon size={24} color={section.color || colors.primary} />;
      case 1: // Sub-category
        return <BookOpen size={22} color={section.color || colors.primary} />;
      case 2: // Section
        return <File size={20} color={section.color || colors.primary} />;
      case 3: // Sub section
        return <FileText size={18} color={section.color || colors.primary} />;
      case 4: // Sub sub section
        return <FileText size={16} color={section.color || colors.primary} />;
      case 5: // Document
        return <FileText size={16} color={section.color || colors.primary} />;
      default:
        return <FolderIcon size={20} color={section.color || colors.primary} />;
    }
  };

  // Get card styling based on hierarchy level
  const getCardStyle = () => {
    const baseStyle = {
      marginBottom: 8,
      marginLeft: hierarchyLevel * 8, // Indentation based on level
    };
    
    switch (hierarchyLevel) {
      case 0: // Main category - most prominent
        return {
          ...baseStyle,
          borderRadius: 16,
          elevation: 4,
          shadowRadius: 8,
        };
      case 1: // Sub-category
        return {
          ...baseStyle,
          borderRadius: 12,
          elevation: 2,
          shadowRadius: 4,
        };
      default: // Lower levels
        return {
          ...baseStyle,
          borderRadius: 8,
          elevation: 1,
          shadowRadius: 2,
        };
    }
  };

  // Get text styling based on hierarchy level
  const getTextSize = () => {
    switch (hierarchyLevel) {
      case 0: return 18; // Main category
      case 1: return 16; // Sub-category
      case 2: return 15; // Section
      default: return 14; // Sub sections and documents
    }
  };

  const gradientColors = section.color 
    ? [`${section.color}15`, `${section.color}08`] 
    : [isDarkMode ? '#374151' : '#F3F4F6', isDarkMode ? '#1F2937' : '#FFFFFF'];

  const dynamicStyles = StyleSheet.create({
    card: {
      ...getCardStyle(),
      backgroundColor: colors.card,
      shadowColor: section.color || colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      overflow: 'hidden',
    },
    touchable: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    gradientBackground: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: hierarchyLevel >= 3 ? 12 : 16,
      borderRadius: hierarchyLevel === 0 ? 16 : hierarchyLevel === 1 ? 12 : 8,
    },
    colorIndicator: {
      width: 4,
      height: '100%',
      backgroundColor: section.color || colors.primary,
      borderRadius: 2,
      marginRight: 12,
    },
    iconContainer: {
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contentContainer: {
      flex: 1,
      marginRight: 8,
    },
    title: {
      fontSize: getTextSize(),
      fontWeight: hierarchyLevel <= 1 ? '700' : '600',
      color: colors.text,
      marginBottom: section.description ? 4 : 0,
      fontFamily: 'Inter-Bold',
    },
    description: {
      fontSize: hierarchyLevel >= 3 ? 12 : 13,
      color: colors.textSecondary,
      lineHeight: 18,
      fontFamily: 'Inter-Regular',
    },
    chevronContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: 8,
    },
    categoryBadge: {
      backgroundColor: `${section.color || colors.primary}20`,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginTop: 4,
    },
    categoryText: {
      fontSize: 11,
      color: section.color || colors.primary,
      fontWeight: '600',
      fontFamily: 'Inter-Medium',
    },
  });

  return (
    <Card style={dynamicStyles.card}>
      <TouchableOpacity style={dynamicStyles.touchable} onPress={onPress} activeOpacity={0.7}>
        <LinearGradient colors={gradientColors} style={dynamicStyles.gradientBackground}>
          {hierarchyLevel <= 2 && <View style={dynamicStyles.colorIndicator} />}
          
          <View style={dynamicStyles.iconContainer}>
            {getHierarchyIcon()}
          </View>
          
          <View style={dynamicStyles.contentContainer}>
            <Text style={dynamicStyles.title} numberOfLines={2}>
              {section.title}
            </Text>
            
            {section.description && (
              <Text style={dynamicStyles.description} numberOfLines={2}>
                {section.description}
              </Text>
            )}
            
            {section.category && hierarchyLevel <= 1 && (
              <View style={dynamicStyles.categoryBadge}>
                <Text style={dynamicStyles.categoryText}>
                  {section.category.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          
          <View style={dynamicStyles.chevronContainer}>
            <ChevronRight size={16} color={colors.textSecondary} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Card>
  );
}