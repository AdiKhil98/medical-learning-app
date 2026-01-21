import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import type { AudioLibraryType, AudioSubscription, AudioSubscriptionStatus } from '@/types/audio';

export const useAudioSubscription = (
  userId: string | undefined,
  libraryType: AudioLibraryType
): AudioSubscriptionStatus & { checkAccess: () => Promise<boolean>; refreshStatus: () => void } => {
  const [hasAccess, setHasAccess] = useState(false);
  const [subscription, setSubscription] = useState<AudioSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      logger.info('[Audio Subscription] No user ID - access denied');
      setHasAccess(false);
      setSubscription(null);
      setLoading(false);
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if user has access via RPC function
      const { data: accessData, error: accessError } = await supabase.rpc('has_audio_access', {
        p_user_id: userId,
        p_library_type: libraryType,
      });

      if (accessError) {
        logger.error('[Audio Subscription] Error checking access:', accessError);
        // If RPC doesn't exist yet, fall back to direct table query
        const { data: subData, error: subError } = await supabase
          .from('audio_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('library_type', libraryType)
          .eq('status', 'active')
          .gte('expires_at', new Date().toISOString())
          .single();

        if (subError && subError.code !== 'PGRST116') {
          // PGRST116 = no rows returned
          logger.error('[Audio Subscription] Error fetching subscription:', subError);
          setError('Fehler beim Abrufen des Audio-Abonnementstatus');
          setHasAccess(false);
          setSubscription(null);
          setLoading(false);
          return false;
        }

        const access = !!subData;
        setHasAccess(access);
        setSubscription(subData || null);
        setLoading(false);
        logger.info('[Audio Subscription] Access check result (fallback):', { access, libraryType });
        return access;
      }

      const access = accessData === true;
      setHasAccess(access);

      // Fetch subscription details if access is granted
      if (access) {
        const { data: subData } = await supabase
          .from('audio_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('library_type', libraryType)
          .eq('status', 'active')
          .gte('expires_at', new Date().toISOString())
          .single();

        setSubscription(subData || null);
      } else {
        setSubscription(null);
      }

      setLoading(false);
      logger.info('[Audio Subscription] Access check result:', { access, libraryType });
      return access;
    } catch (err) {
      logger.error('[Audio Subscription] Exception:', err);
      setError('Fehler beim Überprüfen des Audio-Abonnementstatus');
      setHasAccess(false);
      setSubscription(null);
      setLoading(false);
      return false;
    }
  }, [userId, libraryType]);

  const refreshStatus = useCallback(() => {
    checkAccess();
  }, [checkAccess]);

  // Check access on mount and when userId/libraryType changes
  useEffect(() => {
    if (userId) {
      checkAccess();
    } else {
      setHasAccess(false);
      setSubscription(null);
      setLoading(false);
    }
  }, [userId, libraryType, checkAccess]);

  // Real-time subscription to changes
  useEffect(() => {
    if (!userId) return;

    logger.info('[Audio Subscription] Setting up real-time listener for:', { userId, libraryType });

    const subscription = supabase
      .channel(`audio-subscription-${userId}-${libraryType}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audio_subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          logger.info('[Audio Subscription] Real-time update:', payload);
          checkAccess();
        }
      )
      .subscribe((status) => {
        logger.info('[Audio Subscription] Subscription status:', status);
      });

    return () => {
      logger.info('[Audio Subscription] Cleaning up real-time listener');
      subscription.unsubscribe();
    };
  }, [userId, libraryType, checkAccess]);

  return {
    hasAccess,
    subscription,
    loading,
    error,
    checkAccess,
    refreshStatus,
  };
};
