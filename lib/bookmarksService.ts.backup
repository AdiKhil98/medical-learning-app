import { supabase } from './supabase';
import { SecureLogger } from './security';

// Types for bookmark system
export interface UserBookmark {
  id: string;
  user_id: string;
  section_slug: string;
  section_title: string;
  section_category?: string;
  bookmark_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BookmarkFolder {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  display_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  bookmark_count?: number; // Computed field
}

export interface BookmarkFolderItem {
  id: string;
  bookmark_id: string;
  folder_id: string;
  display_order: number;
  added_at: string;
  bookmark?: UserBookmark; // Joined data
}

export interface CreateBookmarkData {
  section_slug: string;
  section_title: string;
  section_category?: string;
  bookmark_notes?: string;
}

export interface CreateFolderData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

// Cache for better performance
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const bookmarkCache = new Map<string, { data: UserBookmark[], timestamp: number }>();
const folderCache = new Map<string, { data: BookmarkFolder[], timestamp: number }>();

class BookmarksService {
  
  /**
   * Get current user's bookmarks
   */
  async getUserBookmarks(userId?: string): Promise<UserBookmark[]> {
    try {
      // Use provided userId or get from auth
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          SecureLogger.log('No authenticated user for bookmarks');
          return [];
        }
        targetUserId = user.id;
      }

      // Check cache
      const cacheKey = `bookmarks_${targetUserId}`;
      const cached = bookmarkCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        return cached.data;
      }

      const { data, error } = await supabase
        .from('user_bookmarks')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        SecureLogger.log('Error fetching user bookmarks:', error);
        throw error;
      }

      const bookmarks = (data || []) as UserBookmark[];
      
      // Update cache
      bookmarkCache.set(cacheKey, { data: bookmarks, timestamp: now });
      
      SecureLogger.log(`Fetched ${bookmarks.length} bookmarks for user`);
      return bookmarks;

    } catch (error) {
      SecureLogger.log('Error in getUserBookmarks:', error);
      throw error;
    }
  }

  /**
   * Add a bookmark for current user
   */
  async addBookmark(bookmarkData: CreateBookmarkData): Promise<UserBookmark> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User must be authenticated to add bookmarks');
      }

      const { data, error } = await supabase
        .from('user_bookmarks')
        .insert([{
          user_id: user.id,
          ...bookmarkData
        }])
        .select()
        .single();

      if (error) {
        // Handle duplicate bookmark gracefully
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Section is already bookmarked');
        }
        SecureLogger.log('Error adding bookmark:', error);
        throw error;
      }

      const bookmark = data as UserBookmark;
      
      // Clear cache to force refresh
      this.clearUserCache(user.id);
      
      SecureLogger.log('Added bookmark for section:', bookmarkData.section_slug);
      return bookmark;

    } catch (error) {
      SecureLogger.log('Error in addBookmark:', error);
      throw error;
    }
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(sectionSlug: string): Promise<void> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User must be authenticated to remove bookmarks');
      }

      const { error } = await supabase
        .from('user_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('section_slug', sectionSlug);

      if (error) {
        SecureLogger.log('Error removing bookmark:', error);
        throw error;
      }

      // Clear cache to force refresh
      this.clearUserCache(user.id);
      
      SecureLogger.log('Removed bookmark for section:', sectionSlug);

    } catch (error) {
      SecureLogger.log('Error in removeBookmark:', error);
      throw error;
    }
  }

  /**
   * Check if a section is bookmarked by current user
   */
  async isBookmarked(sectionSlug: string): Promise<boolean> {
    try {
      const bookmarks = await this.getUserBookmarks();
      return bookmarks.some(bookmark => bookmark.section_slug === sectionSlug);
    } catch (error) {
      SecureLogger.log('Error checking bookmark status:', error);
      return false;
    }
  }

  /**
   * Update bookmark notes
   */
  async updateBookmarkNotes(sectionSlug: string, notes: string): Promise<void> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User must be authenticated to update bookmarks');
      }

      const { error } = await supabase
        .from('user_bookmarks')
        .update({ 
          bookmark_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('section_slug', sectionSlug);

      if (error) {
        SecureLogger.log('Error updating bookmark notes:', error);
        throw error;
      }

      // Clear cache to force refresh
      this.clearUserCache(user.id);
      
      SecureLogger.log('Updated bookmark notes for section:', sectionSlug);

    } catch (error) {
      SecureLogger.log('Error in updateBookmarkNotes:', error);
      throw error;
    }
  }

  /**
   * Get bookmark folders for current user
   */
  async getUserFolders(userId?: string): Promise<BookmarkFolder[]> {
    try {
      // Use provided userId or get from auth
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          SecureLogger.log('No authenticated user for folders');
          return [];
        }
        targetUserId = user.id;
      }

      // Check cache
      const cacheKey = `folders_${targetUserId}`;
      const cached = folderCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        return cached.data;
      }

      const { data, error } = await supabase
        .from('bookmark_folders')
        .select('*')
        .eq('user_id', targetUserId)
        .order('display_order', { ascending: true });

      if (error) {
        SecureLogger.log('Error fetching bookmark folders:', error);
        throw error;
      }

      const folders = (data || []) as BookmarkFolder[];
      
      // Update cache
      folderCache.set(cacheKey, { data: folders, timestamp: now });
      
      SecureLogger.log(`Fetched ${folders.length} bookmark folders for user`);
      return folders;

    } catch (error) {
      SecureLogger.log('Error in getUserFolders:', error);
      throw error;
    }
  }

  /**
   * Create a new bookmark folder
   */
  async createFolder(folderData: CreateFolderData): Promise<BookmarkFolder> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User must be authenticated to create folders');
      }

      const { data, error } = await supabase
        .from('bookmark_folders')
        .insert([{
          user_id: user.id,
          color: '#4F46E5', // Default blue
          icon: 'Folder',   // Default icon
          ...folderData
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Folder name already exists');
        }
        SecureLogger.log('Error creating folder:', error);
        throw error;
      }

      const folder = data as BookmarkFolder;
      
      // Clear cache to force refresh
      this.clearUserCache(user.id);
      
      SecureLogger.log('Created bookmark folder:', folderData.name);
      return folder;

    } catch (error) {
      SecureLogger.log('Error in createFolder:', error);
      throw error;
    }
  }

  /**
   * Get bookmarks count grouped by category
   */
  async getBookmarkStats(userId?: string): Promise<Record<string, number>> {
    try {
      const bookmarks = await this.getUserBookmarks(userId);
      const stats: Record<string, number> = {};
      
      bookmarks.forEach(bookmark => {
        const category = bookmark.section_category || 'Uncategorized';
        stats[category] = (stats[category] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      SecureLogger.log('Error getting bookmark stats:', error);
      return {};
    }
  }

  /**
   * Search bookmarks by title or notes
   */
  async searchBookmarks(query: string, userId?: string): Promise<UserBookmark[]> {
    try {
      const bookmarks = await this.getUserBookmarks(userId);
      const searchTerm = query.toLowerCase();
      
      return bookmarks.filter(bookmark => 
        bookmark.section_title.toLowerCase().includes(searchTerm) ||
        (bookmark.bookmark_notes && bookmark.bookmark_notes.toLowerCase().includes(searchTerm)) ||
        (bookmark.section_category && bookmark.section_category.toLowerCase().includes(searchTerm))
      );
    } catch (error) {
      SecureLogger.log('Error searching bookmarks:', error);
      return [];
    }
  }

  /**
   * Toggle bookmark status for a section
   */
  async toggleBookmark(sectionSlug: string, sectionTitle: string, sectionCategory?: string): Promise<boolean> {
    try {
      const isCurrentlyBookmarked = await this.isBookmarked(sectionSlug);
      
      if (isCurrentlyBookmarked) {
        await this.removeBookmark(sectionSlug);
        return false; // Now unbookmarked
      } else {
        await this.addBookmark({
          section_slug: sectionSlug,
          section_title: sectionTitle,
          section_category: sectionCategory
        });
        return true; // Now bookmarked
      }
    } catch (error) {
      SecureLogger.log('Error toggling bookmark:', error);
      throw error;
    }
  }

  /**
   * Clear cache for specific user
   */
  private clearUserCache(userId: string): void {
    bookmarkCache.delete(`bookmarks_${userId}`);
    folderCache.delete(`folders_${userId}`);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    bookmarkCache.clear();
    folderCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { bookmarkCacheSize: number; folderCacheSize: number } {
    return {
      bookmarkCacheSize: bookmarkCache.size,
      folderCacheSize: folderCache.size
    };
  }
}

// Export singleton instance
export const bookmarksService = new BookmarksService();