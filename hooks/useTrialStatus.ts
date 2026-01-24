import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface TrialStatus {
  isLoading: boolean;
  isTrialActive: boolean;
  daysRemaining: number;
  daysUsed: number;
  totalDays: number;
  trialEndsAt: Date | null;
  trialEndsFormatted: string;
  isExpiringSoon: boolean; // 1-2 days left
  isExpired: boolean;
  isSubscribed: boolean;
  subscriptionTier: string | null;
}

export function useTrialStatus(): TrialStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<TrialStatus>({
    isLoading: true,
    isTrialActive: false,
    daysRemaining: 0,
    daysUsed: 0,
    totalDays: 5,
    trialEndsAt: null,
    trialEndsFormatted: '',
    isExpiringSoon: false,
    isExpired: false,
    isSubscribed: false,
    subscriptionTier: null,
  });

  const fetchTrialStatus = useCallback(async () => {
    if (!user) {
      setStatus((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Fetch from users table which has trial and subscription info
      const { data, error } = await supabase
        .from('users')
        .select('trial_started_at, trial_expires_at, subscription_tier, subscription_status, created_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        const now = new Date();

        // Check if user is a paid subscriber
        const paidTiers = ['monthly', 'quarterly', 'basic', 'premium'];
        const isSubscribed =
          paidTiers.includes(data.subscription_tier || '') &&
          ['active', 'past_due'].includes(data.subscription_status || '');

        // Get trial dates - use trial_started_at or fall back to created_at
        const startedAt = data.trial_started_at ? new Date(data.trial_started_at) : new Date(data.created_at);
        const expiresAt = data.trial_expires_at
          ? new Date(data.trial_expires_at)
          : new Date(startedAt.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from start

        // Calculate days
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysUsed = Math.floor((now.getTime() - startedAt.getTime()) / msPerDay);
        const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / msPerDay));

        const isExpired = now > expiresAt && !isSubscribed;
        const isExpiringSoon = daysRemaining <= 2 && daysRemaining > 0;
        const isTrialActive = !isExpired && !isSubscribed && daysRemaining > 0;

        // Format date in German
        const formatter = new Intl.DateTimeFormat('de-DE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        setStatus({
          isLoading: false,
          isTrialActive,
          daysRemaining,
          daysUsed: Math.min(daysUsed, 5),
          totalDays: 5,
          trialEndsAt: expiresAt,
          trialEndsFormatted: formatter.format(expiresAt),
          isExpiringSoon,
          isExpired,
          isSubscribed,
          subscriptionTier: data.subscription_tier,
        });
      }
    } catch (error) {
      console.error('Error fetching trial status:', error);
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    fetchTrialStatus();
  }, [fetchTrialStatus]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel(`trial-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        () => {
          fetchTrialStatus();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, fetchTrialStatus]);

  return status;
}
