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

export function useRecentContent(): UseRecentContentResult {
  const [recentContent, setRecentContent] = useState<RecentContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecentContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const items = await recentContentService.getRecentContent();
      setRecentContent(items);
      
    } catch (err) {
      logger.error('Error loading recent content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recent content');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRecentContent = useCallback(async () => {
    await loadRecentContent();
  }, [loadRecentContent]);

  const addRecentContent = useCallback(async (section: any) => {
    try {
      await recentContentService.trackContentView(section);
      // Refresh the list after adding
      await loadRecentContent();
    } catch (err) {
      logger.error('Error adding recent content:', err);
      setError(err instanceof Error ? err.message : 'Failed to add recent content');
    }
  }, [loadRecentContent]);

  const clearRecentContent = useCallback(async () => {
    try {
      await recentContentService.clearRecentContent();
      setRecentContent([]);
    } catch (err) {
      logger.error('Error clearing recent content:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear recent content');
    }
  }, []);

  const removeRecentContent = useCallback(async (slug: string) => {
    try {
      await recentContentService.removeRecentContent(slug);
      // Refresh the list after removing
      await loadRecentContent();
    } catch (err) {
      logger.error('Error removing recent content:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove recent content');
    }
  }, [loadRecentContent]);

  // Load recent content on mount
  useEffect(() => {
    loadRecentContent();
  }, [loadRecentContent]);

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

export function useRecentContentForHomepage() {
  const [recentContent, setRecentContent] = useState<RecentContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecentContent = useCallback(async () => {
    try {
      setLoading(true);
      const items = await recentContentService.getRecentContentForHomepage();
      setRecentContent(items);
    } catch (error) {
      logger.error('Error loading recent content for homepage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentContent();
  }, [loadRecentContent]);

  return {
    recentContent,
    loading,
    refreshRecentContent: loadRecentContent
  };
}