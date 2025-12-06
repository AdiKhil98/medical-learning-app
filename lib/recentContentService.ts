import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';
import { supabase } from './supabase';
import { SecureLogger } from './security';

// Types for recent content tracking
export interface RecentContentItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category?: string;
  type: 'content' | 'section' | 'subsection';
  icon?: string;
  color?: string;
  viewedAt: string;
  viewCount: number;
}

export interface RecentContentData {
  section_slug: string;
  section_title: string;
  section_description?: string;
  section_category?: string;
  section_type?: string;
  section_icon?: string;
  section_color?: string;
}

// Cache for better performance
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY_PREFIX = 'recent_medical_content';
const MAX_RECENT_ITEMS = 10;

// User-specific cache
let recentContentCache: Map<string, { data: RecentContentItem[], timestamp: number }> = new Map();

class RecentContentService {

  /**
   * Get user-specific storage key
   */
  private getStorageKey(userId?: string): string {
    if (!userId) {
      // Fallback to legacy key if no userId (shouldn't happen in normal use)
      return STORAGE_KEY_PREFIX;
    }
    return `${STORAGE_KEY_PREFIX}_${userId}`;
  }

  /**
   * Add a medical content item to recent history
   * @param contentData - The content data to add
   * @param userId - The user ID (required for user-specific storage)
   */
  async addRecentContent(contentData: RecentContentData, userId?: string): Promise<void> {
    try {
      logger.info('📖 Adding recent content:', contentData.section_title, userId ? `for user ${userId}` : '(no userId)');

      const storageKey = this.getStorageKey(userId);

      // Get current recent items from storage
      const recentItems = await this.getRecentContent(userId);

      // Create new recent item
      const newItem: RecentContentItem = {
        id: `recent_${contentData.section_slug}_${Date.now()}`,
        slug: contentData.section_slug,
        title: contentData.section_title,
        description: contentData.section_description,
        category: contentData.section_category,
        type: contentData.section_type as any || 'content',
        icon: contentData.section_icon,
        color: contentData.section_color,
        viewedAt: new Date().toISOString(),
        viewCount: 1
      };

      // Remove existing item if it exists (to update it)
      const filteredItems = recentItems.filter(item => item.slug !== contentData.section_slug);

      // Check if we're updating an existing item's view count
      const existingItem = recentItems.find(item => item.slug === contentData.section_slug);
      if (existingItem) {
        newItem.viewCount = existingItem.viewCount + 1;
      }

      // Add new item to the beginning
      const updatedItems = [newItem, ...filteredItems].slice(0, MAX_RECENT_ITEMS);

      // Save to AsyncStorage with user-specific key
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedItems));

      // Clear cache for this user to force refresh
      if (userId) {
        recentContentCache.delete(userId);
      }

      SecureLogger.log(`Added recent content: ${contentData.section_title} (view count: ${newItem.viewCount}) for user ${userId || 'unknown'}`);

    } catch (error) {
      logger.error('❌ Error adding recent content:', error);
      SecureLogger.log('Error adding recent content:', error);
    }
  }
  
  /**
   * Get recent medical content items
   * @param userId - The user ID (required for user-specific storage)
   */
  async getRecentContent(userId?: string): Promise<RecentContentItem[]> {
    try {
      const storageKey = this.getStorageKey(userId);

      // Check cache first
      const now = Date.now();
      const cachedData = userId ? recentContentCache.get(userId) : null;
      if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
        return cachedData.data;
      }

      // Get from AsyncStorage with user-specific key
      const storedData = await AsyncStorage.getItem(storageKey);

      if (!storedData) {
        logger.info(`📚 No recent content found in storage for user ${userId || 'unknown'}`);
        return [];
      }

      const recentItems: RecentContentItem[] = JSON.parse(storedData);

      // Update cache for this user
      if (userId) {
        recentContentCache.set(userId, { data: recentItems, timestamp: now });
      }

      logger.info(`📚 Loaded ${recentItems.length} recent content items for user ${userId || 'unknown'}`);
      return recentItems;

    } catch (error) {
      logger.error('❌ Error getting recent content:', error);
      SecureLogger.log('Error getting recent content:', error);
      return [];
    }
  }
  
  /**
   * Get the last 3 medical content items for homepage
   * @param userId - The user ID (required for user-specific storage)
   */
  async getRecentContentForHomepage(userId?: string): Promise<RecentContentItem[]> {
    try {
      const recentItems = await this.getRecentContent(userId);
      return recentItems.slice(0, 3);
    } catch (error) {
      logger.error('❌ Error getting recent content for homepage:', error);
      return [];
    }
  }

  /**
   * Clear recent content history for a specific user
   * @param userId - The user ID (required for user-specific storage)
   */
  async clearRecentContent(userId?: string): Promise<void> {
    try {
      const storageKey = this.getStorageKey(userId);
      await AsyncStorage.removeItem(storageKey);

      // Clear cache for this user
      if (userId) {
        recentContentCache.delete(userId);
      }

      SecureLogger.log(`Cleared recent content history for user ${userId || 'unknown'}`);
    } catch (error) {
      logger.error('❌ Error clearing recent content:', error);
      SecureLogger.log('Error clearing recent content:', error);
    }
  }

  /**
   * Remove a specific item from recent content
   * @param slug - The content slug to remove
   * @param userId - The user ID (required for user-specific storage)
   */
  async removeRecentContent(slug: string, userId?: string): Promise<void> {
    try {
      const storageKey = this.getStorageKey(userId);
      const recentItems = await this.getRecentContent(userId);
      const filteredItems = recentItems.filter(item => item.slug !== slug);

      await AsyncStorage.setItem(storageKey, JSON.stringify(filteredItems));

      // Clear cache for this user
      if (userId) {
        recentContentCache.delete(userId);
      }

      SecureLogger.log(`Removed recent content: ${slug} for user ${userId || 'unknown'}`);
    } catch (error) {
      logger.error('❌ Error removing recent content:', error);
      SecureLogger.log('Error removing recent content:', error);
    }
  }
  
  /**
   * Get recent content statistics
   * @param userId - The user ID (required for user-specific storage)
   */
  async getRecentContentStats(userId?: string): Promise<{ totalItems: number; categories: Record<string, number> }> {
    try {
      const recentItems = await this.getRecentContent(userId);
      const stats = {
        totalItems: recentItems.length,
        categories: {} as Record<string, number>
      };

      recentItems.forEach(item => {
        const category = item.category || 'Uncategorized';
        stats.categories[category] = (stats.categories[category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('❌ Error getting recent content stats:', error);
      return { totalItems: 0, categories: {} };
    }
  }

  /**
   * Track content view (call this when user opens medical content)
   * @param section - The section data to track
   * @param userId - The user ID (required for user-specific storage)
   */
  async trackContentView(section: any, userId?: string): Promise<void> {
    try {
      if (!section || !section.slug || !section.title) {
        logger.warn('⚠️ Invalid section data for tracking');
        return;
      }

      await this.addRecentContent({
        section_slug: section.slug,
        section_title: section.title,
        section_description: section.description,
        section_category: section.category,
        section_type: section.type,
        section_icon: section.icon,
        section_color: section.color
      }, userId);

    } catch (error) {
      logger.error('❌ Error tracking content view:', error);
    }
  }

  /**
   * Clear cache manually for a specific user or all users
   * @param userId - Optional user ID. If not provided, clears all caches
   */
  clearCache(userId?: string): void {
    if (userId) {
      recentContentCache.delete(userId);
    } else {
      recentContentCache.clear();
    }
  }

  /**
   * Get cache statistics for a specific user
   * @param userId - The user ID
   */
  getCacheStats(userId?: string): { cached: boolean; cacheTimestamp: number | null; itemCount: number } {
    const cachedData = userId ? recentContentCache.get(userId) : null;
    return {
      cached: !!cachedData,
      cacheTimestamp: cachedData?.timestamp || null,
      itemCount: cachedData?.data?.length || 0
    };
  }
}

// Export singleton instance
export const recentContentService = new RecentContentService();