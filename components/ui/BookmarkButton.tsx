import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Plus, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { bookmarksService } from '@/lib/bookmarksService';
import { BORDER_WIDTH, SHADOWS } from '@/constants/tokens';

interface BookmarkButtonProps {
  sectionSlug: string;
  sectionTitle: string;
  sectionCategory?: string;
  size?: number;
  style?: any;
  onBookmarkChange?: (isBookmarked: boolean) => void;
  showAnimation?: boolean;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  sectionSlug,
  sectionTitle,
  sectionCategory,
  size = 24,
  style,
  onBookmarkChange,
  showAnimation = true,
}) => {
  const { colors } = useTheme();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check initial bookmark status
  useEffect(() => {
    checkBookmarkStatus();
  }, [sectionSlug]);

  const checkBookmarkStatus = async () => {
    try {
      logger.info('🔍 BookmarkButton checking status for:', sectionSlug);
      setIsChecking(true);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Bookmark status check timeout')), 10000)
      );
      
      const statusPromise = bookmarksService.isBookmarked(sectionSlug);
      
      const bookmarked = await Promise.race([statusPromise, timeoutPromise]);
      logger.info('✅ BookmarkButton status result:', bookmarked);
      setIsBookmarked(bookmarked);
    } catch (error) {
      logger.error('❌ Error checking bookmark status:', error);
      // Default to false if check fails
      setIsBookmarked(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggleBookmark = async () => {
    try {
      logger.info('🎯 BookmarkButton toggle started for:', sectionTitle);
      logger.info('🎯 Current UI state - isBookmarked:', isBookmarked);
      setIsLoading(true);
      
      const newBookmarkStatus = await bookmarksService.toggleBookmark(
        sectionSlug,
        sectionTitle,
        sectionCategory
      );
      
      logger.info('🎯 Toggle completed, new status:', newBookmarkStatus);
      setIsBookmarked(newBookmarkStatus);
      
      // Notify parent component
      if (onBookmarkChange) {
        onBookmarkChange(newBookmarkStatus);
      }

      // Show feedback to user
      if (showAnimation) {
        const message = newBookmarkStatus 
          ? '⭐ Zu Favoriten hinzugefügt!'
          : '❌ Aus Favoriten entfernt';
        
        logger.info('🎯 Showing user feedback:', message);
        Alert.alert('Lesezeichen', message, [{ text: 'OK' }]);
      }

    } catch (error) {
      logger.error('💥 BookmarkButton toggle error:', error);
      logger.error('💥 BookmarkButton error details:', JSON.stringify(error, null, 2));
      
      // Show detailed error message for debugging
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Speichern des Lesezeichens';
      const fullErrorDetails = `Fehler: ${errorMessage}\n\nSektion: ${sectionSlug}\nTitel: ${sectionTitle}`;
      
      Alert.alert(
        'Bookmark Fehler', 
        fullErrorDetails,
        [
          { text: 'OK' },
          { 
            text: 'Erneut versuchen', 
            onPress: () => handleToggleBookmark()
          }
        ]
      );
      
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while checking initial status
  if (isChecking) {
    return (
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.card }, style]}
        onPress={() => {
          logger.info('🔄 Force refresh bookmark status');
          checkBookmarkStatus();
        }}
      >
        <ActivityIndicator 
          size="small" 
          color={colors.textSecondary} 
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { 
          backgroundColor: isBookmarked ? colors.primary + '15' : colors.card,
          borderColor: isBookmarked ? colors.primary : colors.border,
        },
        style
      ]}
      onPress={handleToggleBookmark}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator 
          size="small" 
          color={isBookmarked ? colors.primary : colors.textSecondary} 
        />
      ) : (
        <>
          {isBookmarked ? (
            <Check
              size={size}
              color={colors.primary}
              style={showAnimation ? styles.iconBookmarked : undefined}
            />
          ) : (
            <Plus
              size={size}
              color={colors.textSecondary}
              style={showAnimation ? styles.iconUnbookmarked : undefined}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

// FIX: Increase touch target to 48x48 for better accessibility (was 44x44)
// FIX: Apply design tokens for shadows and border width
const styles = StyleSheet.create({
  button: {
    width: 48, // Minimum 48px for accessibility
    height: 48, // Minimum 48px for accessibility
    borderRadius: 24, // Half of width/height for circle
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: BORDER_WIDTH.medium,
    ...SHADOWS.sm,
  },
  iconBookmarked: {
    transform: [{ scale: 1.1 }], // Slightly larger when bookmarked
  },
  iconUnbookmarked: {
    opacity: 0.7,
  },
});

export default BookmarkButton;