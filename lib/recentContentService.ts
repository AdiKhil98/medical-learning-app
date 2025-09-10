import AsyncStorage from '@react-native-async-storage/async-storage';
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
const STORAGE_KEY = 'recent_medical_content';
const MAX_RECENT_ITEMS = 10;

let recentContentCache: { data: RecentContentItem[], timestamp: number } | null = null;

class RecentContentService {
  
  /**
   * Add a medical content item to recent history
   */
  async addRecentContent(contentData: RecentContentData): Promise<void> {
    try {
      console.log('📖 Adding recent content:', contentData.section_title);
      
      // Get current recent items from storage
      const recentItems = await this.getRecentContent();
      
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
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
      
      // Clear cache to force refresh
      recentContentCache = null;
      
      SecureLogger.log(`Added recent content: ${contentData.section_title} (view count: ${newItem.viewCount})`);
      
    } catch (error) {
      console.error('❌ Error adding recent content:', error);
      SecureLogger.log('Error adding recent content:', error);
    }
  }
  
  /**
   * Get recent medical content items
   */
  async getRecentContent(): Promise<RecentContentItem[]> {
    try {
      // Check cache first
      const now = Date.now();
      if (recentContentCache && (now - recentContentCache.timestamp) < CACHE_DURATION) {
        return recentContentCache.data;
      }
      
      // Get from AsyncStorage
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (!storedData) {
        console.log('📚 No recent content found in storage');
        return [];
      }
      
      const recentItems: RecentContentItem[] = JSON.parse(storedData);
      
      // Update cache
      recentContentCache = { data: recentItems, timestamp: now };
      
      console.log(`📚 Loaded ${recentItems.length} recent content items`);
      return recentItems;
      
    } catch (error) {
      console.error('❌ Error getting recent content:', error);
      SecureLogger.log('Error getting recent content:', error);
      return [];
    }
  }
  
  /**
   * Get the last 3 medical content items for homepage
   */
  async getRecentContentForHomepage(): Promise<RecentContentItem[]> {
    try {
      const recentItems = await this.getRecentContent();
      return recentItems.slice(0, 3);
    } catch (error) {
      console.error('❌ Error getting recent content for homepage:', error);
      return [];
    }
  }
  
  /**
   * Clear recent content history
   */
  async clearRecentContent(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      recentContentCache = null;
      SecureLogger.log('Cleared recent content history');
    } catch (error) {
      console.error('❌ Error clearing recent content:', error);
      SecureLogger.log('Error clearing recent content:', error);
    }
  }
  
  /**
   * Remove a specific item from recent content
   */
  async removeRecentContent(slug: string): Promise<void> {
    try {
      const recentItems = await this.getRecentContent();
      const filteredItems = recentItems.filter(item => item.slug !== slug);
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredItems));
      recentContentCache = null;
      
      SecureLogger.log(`Removed recent content: ${slug}`);
    } catch (error) {
      console.error('❌ Error removing recent content:', error);
      SecureLogger.log('Error removing recent content:', error);
    }
  }
  
  /**
   * Get recent content statistics
   */
  async getRecentContentStats(): Promise<{ totalItems: number; categories: Record<string, number> }> {
    try {
      const recentItems = await this.getRecentContent();
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
      console.error('❌ Error getting recent content stats:', error);
      return { totalItems: 0, categories: {} };
    }
  }
  
  /**
   * Track content view (call this when user opens medical content)
   */
  async trackContentView(section: any): Promise<void> {
    try {
      if (!section || !section.slug || !section.title) {
        console.warn('⚠️ Invalid section data for tracking');
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
      });
      
    } catch (error) {
      console.error('❌ Error tracking content view:', error);
    }
  }
  
  /**
   * Clear cache manually
   */
  clearCache(): void {
    recentContentCache = null;
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { cached: boolean; cacheTimestamp: number | null; itemCount: number } {
    return {
      cached: !!recentContentCache,
      cacheTimestamp: recentContentCache?.timestamp || null,
      itemCount: recentContentCache?.data?.length || 0
    };
  }
}

// Export singleton instance
export const recentContentService = new RecentContentService();