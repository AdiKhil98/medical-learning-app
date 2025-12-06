import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { recentContentService, RecentContentItem } from '@/lib/recentContentService';

interface UseRecentContentResult {
  recentContent: RecentContentItem[];
  loading: boolean;
  error: string | null;
  refreshRecentContent: () => Promise<void>;
  addRecentContent: (section: any) => Promise<void>;
  clearRecentContent: () => Promise<void>;
  removeRecentContent: (slug: string) => Promise<void>;
}

/**
 * Hook for managing user-specific recent content
 * @param userId - The user ID (required for user-specific storage)
 */
export function useRecentContent(userId?: string): UseRecentContentResult {
  const [recentContent, setRecentContent] = useState<RecentContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecentContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const items = await recentContentService.getRecentContent(userId);
      setRecentContent(items);

    } catch (err) {
      logger.error('Error loading recent content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recent content');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refreshRecentContent = useCallback(async () => {
    await loadRecentContent();
  }, [loadRecentContent]);

  const addRecentContent = useCallback(async (section: any) => {
    try {
      await recentContentService.trackContentView(section, userId);
      // Refresh the list after adding
      await loadRecentContent();
    } catch (err) {
      logger.error('Error adding recent content:', err);
      setError(err instanceof Error ? err.message : 'Failed to add recent content');
    }
  }, [userId, loadRecentContent]);

  const clearRecentContent = useCallback(async () => {
    try {
      await recentContentService.clearRecentContent(userId);
      setRecentContent([]);
    } catch (err) {
      logger.error('Error clearing recent content:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear recent content');
    }
  }, [userId]);

  const removeRecentContent = useCallback(async (slug: string) => {
    try {
      await recentContentService.removeRecentContent(slug, userId);
      // Refresh the list after removing
      await loadRecentContent();
    } catch (err) {
      logger.error('Error removing recent content:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove recent content');
    }
  }, [userId, loadRecentContent]);

  // Load recent content on mount and when userId changes
  useEffect(() => {
    const initializeRecentContent = async () => {
      if (userId) {
        // Migrate old storage on first load
        await recentContentService.migrateOldStorage(userId);
        await loadRecentContent();
      } else {
        // If no userId, clear the content and legacy storage
        await recentContentService.clearLegacyStorage();
        setRecentContent([]);
        setLoading(false);
      }
    };

    initializeRecentContent();
  }, [userId, loadRecentContent]);

  return {
    recentContent,
    loading,
    error,
    refreshRecentContent,
    addRecentContent,
    clearRecentContent,
    removeRecentContent
  };
}

/**
 * Hook for displaying recent content on homepage (top 3 items)
 * @param userId - The user ID (required for user-specific storage)
 */
export function useRecentContentForHomepage(userId?: string) {
  const [recentContent, setRecentContent] = useState<RecentContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecentContent = useCallback(async () => {
    try {
      setLoading(true);
      const items = await recentContentService.getRecentContentForHomepage(userId);
      setRecentContent(items);
    } catch (error) {
      logger.error('Error loading recent content for homepage:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const initializeRecentContent = async () => {
      if (userId) {
        // Migrate old storage on first load
        await recentContentService.migrateOldStorage(userId);
        await loadRecentContent();
      } else {
        // If no userId, clear the content and legacy storage
        await recentContentService.clearLegacyStorage();
        setRecentContent([]);
        setLoading(false);
      }
    };

    initializeRecentContent();
  }, [userId, loadRecentContent]);

  return {
    recentContent,
    loading,
    refreshRecentContent: loadRecentContent
  };
}