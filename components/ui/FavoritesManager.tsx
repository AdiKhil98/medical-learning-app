import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import {
  X,
  Heart,
  Star,
  BookOpen,
  Clock,
  Trash2,
  Share,
  Filter,
} from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FavoriteSection {
  id: string;
  title: string;
  category: string;
  addedAt: Date;
  lastViewed?: Date;
  type: 'definition' | 'epidemiology' | 'etiology' | 'symptoms' | 'diagnosis' | 'therapy' | 'prognosis' | 'emergency';
}

interface FavoritesManagerProps {
  isVisible: boolean;
  favorites: FavoriteSection[];
  onClose: () => void;
  onSectionSelect: (sectionId: string) => void;
  onRemoveFavorite: (sectionId: string) => void;
  onClearAll?: () => void;
}

const FavoritesManager: React.FC<FavoritesManagerProps> = ({
  isVisible,
  favorites,
  onClose,
  onSectionSelect,
  onRemoveFavorite,
  onClearAll,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'category'>('recent');

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isVisible, fadeAnim, scaleAnim]);

  const handleSectionPress = useCallback((sectionId: string) => {
    onSectionSelect(sectionId);
    onClose();
  }, [onSectionSelect, onClose]);

  const getSortedAndFilteredFavorites = useCallback(() => {
    let filtered = favorites;

    if (filterType !== 'all') {
      filtered = favorites.filter(fav => fav.type === filterType);
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'recent':
        default:
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      }
    });
  }, [favorites, filterType, sortBy]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'definition': return '📋';
      case 'epidemiology': return '📊';
      case 'symptoms': return '🔍';
      case 'diagnosis': return '🩺';
      case 'therapy': return '💊';
      default: return '📖';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'definition': return '#667eea';
      case 'epidemiology': return '#10b981';
      case 'symptoms': return '#f59e0b';
      case 'diagnosis': return '#ef4444';
      case 'therapy': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `vor ${Math.round(diffInHours)} Std.`;
    } else if (diffInHours < 168) { // 7 days
      return `vor ${Math.round(diffInHours / 24)} Tagen`;
    } else {
      return date.toLocaleDateString('de-DE');
    }
  };

  const renderFavoriteItem = (favorite: FavoriteSection, index: number) => (
    <View key={favorite.id} style={styles.favoriteItem}>
      <TouchableOpacity
        style={styles.favoriteContent}
        onPress={() => handleSectionPress(favorite.id)}
        activeOpacity={0.7}
      >
        <View style={styles.favoriteHeader}>
          <View style={styles.favoriteIcon}>
            <Text style={styles.favoriteIconText}>
              {getTypeIcon(favorite.type)}
            </Text>
          </View>
          <View style={styles.favoriteInfo}>
            <Text style={styles.favoriteTitle} numberOfLines={2}>
              {favorite.title}
            </Text>
            <Text style={styles.favoriteCategory}>{favorite.category}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor(favorite.type) }]}>
            <Text style={styles.typeBadgeText}>
              {favorite.type.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.favoriteFooter}>
          <View style={styles.favoriteTime}>
            <Clock size={12} color="#9ca3af" />
            <Text style={styles.favoriteTimeText}>
              Hinzugefügt {formatDate(favorite.addedAt)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onRemoveFavorite(favorite.id)}
            style={styles.removeButton}
          >
            <Trash2 size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (!isVisible) return null;

  const sortedFavorites = getSortedAndFilteredFavorites();

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalContainer}>
              {/* Header */}
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.modalHeader}
              >
                <View style={styles.headerContent}>
                  <View style={styles.headerLeft}>
                    <Heart size={24} color="white" fill="white" />
                    <View style={styles.headerText}>
                      <Text style={styles.headerTitle}>Meine Favoriten</Text>
                      <Text style={styles.headerSubtitle}>
                        {favorites.length} gespeicherte Abschnitte
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <X size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {/* Filter and Sort Controls */}
              <View style={styles.controlsSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterRow}>
                    {['all', 'definition', 'epidemiology', 'symptoms', 'diagnosis', 'therapy'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.filterButton,
                          filterType === type && styles.filterButtonActive
                        ]}
                        onPress={() => setFilterType(type)}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          filterType === type && styles.filterButtonTextActive
                        ]}>
                          {type === 'all' ? 'Alle' : type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                
                <View style={styles.sortRow}>
                  {[
                    { key: 'recent', label: 'Zuletzt' },
                    { key: 'alphabetical', label: 'A-Z' },
                    { key: 'category', label: 'Kategorie' }
                  ].map((sort) => (
                    <TouchableOpacity
                      key={sort.key}
                      style={[
                        styles.sortButton,
                        sortBy === sort.key && styles.sortButtonActive
                      ]}
                      onPress={() => setSortBy(sort.key as any)}
                    >
                      <Text style={[
                        styles.sortButtonText,
                        sortBy === sort.key && styles.sortButtonTextActive
                      ]}>
                        {sort.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Favorites List */}
              <ScrollView style={styles.favoritesList} showsVerticalScrollIndicator={false}>
                {sortedFavorites.length > 0 ? (
                  sortedFavorites.map(renderFavoriteItem)
                ) : (
                  <View style={styles.emptyState}>
                    <Star size={48} color="#d1d5db" />
                    <Text style={styles.emptyStateTitle}>Noch keine Favoriten</Text>
                    <Text style={styles.emptyStateText}>
                      Tippen Sie auf das Lesezeichen-Symbol in einem Abschnitt, um ihn zu Ihren Favoriten hinzuzufügen.
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Footer Actions */}
              {favorites.length > 0 && (
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.shareButton}>
                    <Share size={16} color="#667eea" />
                    <Text style={styles.shareButtonText}>Teilen</Text>
                  </TouchableOpacity>
                  
                  {onClearAll && (
                    <TouchableOpacity 
                      style={styles.clearAllButton}
                      onPress={onClearAll}
                    >
                      <Trash2 size={16} color="#ef4444" />
                      <Text style={styles.clearAllButtonText}>Alle löschen</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: Math.min(screenWidth - 40, 500),
    maxHeight: screenHeight * 0.85,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  controlsSection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sortButtonActive: {
    backgroundColor: '#f3f0ff',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  favoritesList: {
    flex: 1,
    padding: 15,
  },
  favoriteItem: {
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    overflow: 'hidden',
  },
  favoriteContent: {
    padding: 15,
  },
  favoriteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  favoriteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  favoriteIconText: {
    fontSize: 18,
  },
  favoriteInfo: {
    flex: 1,
    marginRight: 12,
  },
  favoriteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 22,
  },
  favoriteCategory: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  favoriteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f9fafb',
  },
  favoriteTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteTimeText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  removeButton: {
    padding: 6,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  shareButtonText: {
    color: '#667eea',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearAllButtonText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
});

export default FavoritesManager;