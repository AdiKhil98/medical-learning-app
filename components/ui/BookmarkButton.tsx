import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Heart, HeartOff } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { bookmarksService } from '@/lib/bookmarksService';

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
      setIsChecking(true);
      const bookmarked = await bookmarksService.isBookmarked(sectionSlug);
      setIsBookmarked(bookmarked);
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggleBookmark = async () => {
    try {
      setIsLoading(true);
      
      const newBookmarkStatus = await bookmarksService.toggleBookmark(
        sectionSlug,
        sectionTitle,
        sectionCategory
      );
      
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
        
        Alert.alert('Lesezeichen', message, [{ text: 'OK' }]);
      }

    } catch (error) {
      console.error('Error toggling bookmark:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Speichern des Lesezeichens';
      Alert.alert('Fehler', errorMessage, [{ text: 'OK' }]);
      
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while checking initial status
  if (isChecking) {
    return (
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.card }, style]}
        disabled={true}
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
            <Heart
              size={size}
              color={colors.primary}
              fill={colors.primary}
              style={showAnimation ? styles.heartFilled : undefined}
            />
          ) : (
            <HeartOff
              size={size}
              color={colors.textSecondary}
              style={showAnimation ? styles.heartEmpty : undefined}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heartFilled: {
    transform: [{ scale: 1.1 }], // Slightly larger when filled
  },
  heartEmpty: {
    opacity: 0.7,
  },
});

export default BookmarkButton;