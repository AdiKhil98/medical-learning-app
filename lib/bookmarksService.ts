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
      console.log('🗑️ removeBookmark called for section:', sectionSlug);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Authentication error:', authError);
        throw new Error('User must be authenticated to remove bookmarks');
      }

      console.log('👤 User authenticated:', user.id);

      // First, check if bookmark exists
      const { data: existingBookmark, error: checkError } = await supabase
        .from('user_bookmarks')
        .select('id, section_title')
        .eq('user_id', user.id)
        .eq('section_slug', sectionSlug)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking existing bookmark:', checkError);
        throw new Error(`Error checking bookmark: ${checkError.message}`);
      }

      if (!existingBookmark) {
        console.warn('⚠️ Bookmark not found for section:', sectionSlug);
        throw new Error('Bookmark not found or already removed');
      }

      console.log('📖 Found bookmark to delete:', existingBookmark.section_title);

      // Perform the delete
      const { data: deleteData, error: deleteError } = await supabase
        .from('user_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('section_slug', sectionSlug)
        .select(); // Return deleted rows for confirmation

      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
        SecureLogger.log('Error removing bookmark:', deleteError);
        throw new Error(`Failed to remove bookmark: ${deleteError.message}`);
      }

      console.log('✅ Delete successful, rows affected:', deleteData?.length || 0);

      // Clear cache to force refresh
      this.clearUserCache(user.id);
      
      SecureLogger.log('Removed bookmark for section:', sectionSlug);
      console.log('🎉 Bookmark removed successfully!');

    } catch (error) {
      console.error('💥 Error in removeBookmark:', error);
      SecureLogger.log('Error in removeBookmark:', error);
      throw error;
    }
  }

  /**
   * Check if a section is bookmarked by current user
   */
  async isBookmarked(sectionSlug: string): Promise<boolean> {
    try {
      console.log('🔍 Checking if bookmarked:', sectionSlug);
      const bookmarks = await this.getUserBookmarks();
      console.log('📚 User has', bookmarks.length, 'total bookmarks');
      
      const isBookmarked = bookmarks.some(bookmark => bookmark.section_slug === sectionSlug);
      console.log('✅ isBookmarked result:', isBookmarked);
      
      if (isBookmarked) {
        const found = bookmarks.find(bookmark => bookmark.section_slug === sectionSlug);
        console.log('📖 Found bookmark:', found?.section_title);
      }
      
      return isBookmarked;
    } catch (error) {
      console.error('❌ Error checking bookmark status:', error);
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
      console.log('🔄 toggleBookmark called for:', sectionTitle, 'slug:', sectionSlug);
      console.log('🔄 toggleBookmark category:', sectionCategory);
      
      // First check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Authentication error in toggle:', authError);
        throw new Error('User must be authenticated to toggle bookmarks');
      }
      console.log('👤 User authenticated for toggle:', user.id);
      
      const isCurrentlyBookmarked = await this.isBookmarked(sectionSlug);
      console.log('📊 Current bookmark status:', isCurrentlyBookmarked);
      
      if (isCurrentlyBookmarked) {
        console.log('🗑️ Item is bookmarked, removing...');
        try {
          await this.removeBookmark(sectionSlug);
          console.log('✅ Toggle: removed bookmark successfully');
          
          // Verify the removal worked
          const verifyRemoval = await this.isBookmarked(sectionSlug);
          console.log('🔍 Verification after removal - still bookmarked?', verifyRemoval);
          
          return false; // Now unbookmarked
        } catch (removeError) {
          console.error('❌ Failed to remove bookmark in toggle:', removeError);
          throw removeError;
        }
      } else {
        console.log('➕ Item not bookmarked, adding...');
        try {
          await this.addBookmark({
            section_slug: sectionSlug,
            section_title: sectionTitle,
            section_category: sectionCategory
          });
          console.log('✅ Toggle: added bookmark successfully');
          
          // Verify the addition worked
          const verifyAddition = await this.isBookmarked(sectionSlug);
          console.log('🔍 Verification after addition - now bookmarked?', verifyAddition);
          
          return true; // Now bookmarked
        } catch (addError) {
          console.error('❌ Failed to add bookmark in toggle:', addError);
          throw addError;
        }
      }
    } catch (error) {
      console.error('💥 Error toggling bookmark:', error);
      console.error('💥 Error details:', JSON.stringify(error, null, 2));
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