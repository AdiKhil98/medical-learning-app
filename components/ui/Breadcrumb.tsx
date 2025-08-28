import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, Home } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { MedicalSection } from '@/lib/medicalContentService';

interface BreadcrumbProps {
  path: MedicalSection[];
  currentTitle?: string;
  onNavigate?: (slug: string) => void;
}

export default function Breadcrumb({ path, currentTitle, onNavigate }: BreadcrumbProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const handleNavigate = (slug: string | null, index: number) => {
    if (slug) {
      if (onNavigate) {
        onNavigate(slug);
      } else {
        // Navigate to appropriate route based on hierarchy level
        if (index === 0) {
          router.push('/bibliothek');
        } else {
          router.push(`/bibliothek/${slug}`);
        }
      }
    } else {
      router.push('/bibliothek');
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    breadcrumbItem: {
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: 120,
    },
    breadcrumbText: {
      fontSize: 14,
      color: colors.primary,
      fontFamily: 'Inter-Medium',
    },
    currentText: {
      fontSize: 14,
      color: colors.text,
      fontFamily: 'Inter-Medium',
      fontWeight: '600',
    },
    separator: {
      marginHorizontal: 8,
    },
    homeButton: {
      padding: 4,
      borderRadius: 4,
    },
  });

  if (path.length === 0 && !currentTitle) return null;

  return (
    <View style={dynamicStyles.container}>
      {/* Home icon */}
      <TouchableOpacity
        style={dynamicStyles.homeButton}
        onPress={() => handleNavigate(null, -1)}
      >
        <Home size={16} color={colors.primary} />
      </TouchableOpacity>

      {path.length > 0 && (
        <ChevronRight size={14} color={colors.textSecondary} style={dynamicStyles.separator} />
      )}

      {/* Path items */}
      {path.map((item, index) => (
        <React.Fragment key={item.slug}>
          <TouchableOpacity
            style={dynamicStyles.breadcrumbItem}
            onPress={() => handleNavigate(item.slug, index)}
          >
            <Text style={dynamicStyles.breadcrumbText} numberOfLines={1}>
              {item.title}
            </Text>
          </TouchableOpacity>
          
          {(index < path.length - 1 || currentTitle) && (
            <ChevronRight size={14} color={colors.textSecondary} style={dynamicStyles.separator} />
          )}
        </React.Fragment>
      ))}

      {/* Current item (non-clickable) */}
      {currentTitle && (
        <Text style={dynamicStyles.currentText} numberOfLines={1}>
          {currentTitle}
        </Text>
      )}
    </View>
  );
}