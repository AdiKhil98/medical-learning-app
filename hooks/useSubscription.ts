import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';
import { supabase } from '../lib/supabase';

interface SubscriptionStatus {
  canUseSimulation: boolean;
  simulationsUsed: number;
  simulationLimit: number | null;
  subscriptionTier: string | null;
  message: string;
  shouldUpgrade?: boolean;
  remainingSimulations?: number;
}

export const useSubscription = (userId: string | undefined) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optimistic counter state
  const [optimisticDeduction, setOptimisticDeduction] = useState<number>(0);
  const [hasOptimisticState, setHasOptimisticState] = useState<boolean>(false);

  // ISSUE #10 FIX: Use ref to store latest checkAccess to avoid dependency issues
  const checkAccessRef = useRef<() => Promise<SubscriptionStatus>>();

  /**
   * Check if user can start a simulation - STRICT ACCESS CONTROL
   * Returns detailed information for blocking and upgrade prompts
   * CRITICAL: Block only when remaining === 0
   *
   * UPDATED 2025-12-09: Now uses NEW quota system (user_simulation_quota table)
   * via can_start_simulation RPC function for consistency across the app
   */
  const checkAccess = useCallback(async () => {
    if (!userId) {
      logger.info('[Access Control] No user ID - access denied');
      return {
        canUseSimulation: false,
        simulationsUsed: 0,
        simulationLimit: 0,
        subscriptionTier: null,
        message: 'Nicht angemeldet',
        shouldUpgrade: false,
        remainingSimulations: 0,
      };
    }

    setLoading(true);
    setError(null);

    try {
      // Use NEW quota system database function (matches Voiceflow widget logic)
      logger.info('[Access Control] Checking quota via can_start_simulation RPC...');
      const { data, error } = await supabase.rpc('can_start_simulation', {
        p_user_id: userId,
      });

      if (error) {
        logger.error('[Access Control] Error checking quota:', error);
        setError('Fehler beim Abrufen des Abonnementstatus');
        return {
          canUseSimulation: false,
          simulationsUsed: 0,
          simulationLimit: 0,
          subscriptionTier: null,
          message: 'Fehler beim Abrufen des Abonnementstatus',
          shouldUpgrade: false,
          remainingSimulations: 0,
        };
      }

      // Parse the response from can_start_simulation
      const canStart = data.can_start;
      const reason = data.reason;
      const simRemaining = data.simulations_remaining || 0;
      const simUsed = data.simulations_used || 0;
      const simTotal = data.total_simulations || 0;
      const dbMessage = data.message || '';

      logger.info('[Access Control] Quota check result:', {
        can_start: canStart,
        reason,
        simulations_remaining: simRemaining,
        simulations_used: simUsed,
        total_simulations: simTotal,
        message: dbMessage,
      });

      // Determine subscription tier from reason or total
      let tier = 'free';
      if (simTotal === -1 || reason === 'unlimited') {
        tier = 'unlimited';
      } else if (simTotal >= 100) {
        tier = 'profi';
      } else if (simTotal >= 20) {
        tier = 'basis';
      } else {
        tier = 'free';
      }

      // Determine if should show upgrade prompt
      const shouldUpgrade = !canStart && reason === 'quota_exceeded';

      const status = {
        canUseSimulation: canStart,
        simulationsUsed: simUsed,
        simulationLimit: simTotal === -1 ? 999999 : simTotal,
        subscriptionTier: tier,
        message: dbMessage,
        shouldUpgrade,
        remainingSimulations: simRemaining === -1 ? 999999 : simRemaining,
      };

      logger.info('[Access Control] Final Result:', {
        tier,
        totalLimit: status.simulationLimit,
        usedCount: simUsed,
        remaining: simRemaining,
        canStart,
        shouldUpgrade,
      });

      setSubscriptionStatus(status);
      return status;
    } catch (err) {
      logger.error('[Access Control] Exception:', err);
      setError('Fehler beim Überprüfen des Abonnementstatus');
      return {
        canUseSimulation: false,
        simulationsUsed: 0,
        simulationLimit: 0,
        subscriptionTier: null,
        message: 'Fehler beim Überprüfen des Abonnementstatus',
        shouldUpgrade: false,
        remainingSimulations: 0,
      };
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ISSUE #10 FIX: Keep ref updated with latest checkAccess
  useEffect(() => {
    checkAccessRef.current = checkAccess;
  }, [checkAccess]);

  /**
   * Record simulation usage
   */
  const recordUsage = useCallback(async () => {
    if (!userId) return false;

    try {
      // Simple usage recording without SubscriptionManager
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('subscription_tier, subscription_status')
        .eq('id', userId)
        .single();

      if (fetchError || !user) {
        logger.error('Error fetching user for usage recording:', fetchError);
        return false;
      }

      // Use the database functions we created
      const hasActiveSubscription = ['active', 'on_trial', 'past_due'].includes(user.subscription_status);

      if (!user.subscription_tier || !hasActiveSubscription) {
        // Free tier
        const { data, error } = await supabase.rpc('increment_free_simulations', { user_id: userId });

        if (error) {
          logger.error('Error updating free simulation usage:', error);
          return false;
        }

        // Check response from function
        if (data && !data.success) {
          logger.error('Free simulation increment failed:', data.error, data.message);
          setError(data.message || 'Failed to record simulation usage');
          return false;
        }

        logger.info('✅ Free simulation recorded:', data);
      } else {
        // Paid tier
        const { data, error } = await supabase.rpc('increment_monthly_simulations', { user_id: userId });

        if (error) {
          logger.error('Error updating monthly simulation usage:', error);
          return false;
        }

        // Check response from function
        if (data && !data.success) {
          logger.error('Monthly simulation increment failed:', data.error, data.message);
          setError(data.message || 'Failed to record simulation usage');
          return false;
        }

        logger.info('✅ Monthly simulation recorded:', data);
      }

      // Refresh the subscription status after recording usage
      await checkAccess();
      return true;
    } catch (err) {
      logger.error('Error recording simulation usage:', err);
      setError('Error recording simulation usage');
      return false;
    }
  }, [userId, checkAccess]);

  /**
   * Get subscription display info for dashboard
   * UNIVERSAL: Works for any tier and any limit value
   *
   * IMPORTANT: Optimistic deduction ONLY affects display (displayUsed, usageText)
   * Access control values (remaining) ALWAYS use real database values
   */
  const getSubscriptionInfo = useCallback(() => {
    if (!subscriptionStatus) return null;

    const { subscriptionTier, simulationsUsed, simulationLimit, message, remainingSimulations } = subscriptionStatus;

    // Calculate display count (optimistic if active, actual otherwise)
    // This is ONLY for visual feedback in the UI
    const displayUsed = hasOptimisticState ? simulationsUsed + optimisticDeduction : simulationsUsed;

    // UNIVERSAL: Map tier to display name (works for any tier)
    const tierDisplayNames: Record<string, string> = {
      free: 'Kostenlos',
      basis: 'Basis-Plan',
      profi: 'Profi-Plan',
      unlimited: 'Unlimited-Plan',
      // Add any custom tiers here
      custom_5: 'Custom 5',
      custom_50: 'Custom 50',
      custom_100: 'Custom 100',
    };

    const planName = tierDisplayNames[subscriptionTier || 'free'] || `${subscriptionTier}-Plan`;

    // UNIVERSAL: Format usage text based on tier (works for any limit)
    let usageText = '';
    if (subscriptionTier === 'unlimited') {
      usageText = `${displayUsed} Simulationen genutzt`;
    } else {
      // Works for 3, 5, 30, 50, 100, or ANY limit value
      usageText = `${displayUsed}/${simulationLimit} Simulationen genutzt`;
    }

    return {
      planName,
      usageText,
      message,
      canUpgrade: subscriptionTier === 'free' || subscriptionTier === 'basis' || subscriptionTier === 'profi',
      isUnlimited: subscriptionTier === 'unlimited',
      // Additional info for universal handling
      displayUsed, // Visual counter (can be optimistic)
      totalLimit: simulationLimit,
      // CRITICAL FIX: Use REAL database value for access control decisions
      // This ensures modal only shows when database confirms quota is exhausted
      remaining: remainingSimulations ?? 0,
    };
  }, [subscriptionStatus, hasOptimisticState, optimisticDeduction]);

  /**
   * Apply optimistic deduction (call when simulation STARTS)
   * Shows immediate feedback while backend handles actual deduction at 10-min mark
   */
  const applyOptimisticDeduction = useCallback(() => {
    logger.info('🎯 Applying optimistic deduction to counter...');
    setOptimisticDeduction(1);
    setHasOptimisticState(true);
  }, []);

  /**
   * Reset optimistic count to show actual backend count
   * Call this on: page refresh, simulation completion, or when returning to dashboard
   */
  const resetOptimisticCount = useCallback(() => {
    logger.info('🔄 Resetting to actual backend count...');
    setOptimisticDeduction(0);
    setHasOptimisticState(false);
    // Re-fetch actual count from backend
    checkAccess();
  }, [checkAccess]);

  // Check access on mount and when userId changes
  useEffect(() => {
    if (userId) {
      checkAccess();
    }
  }, [userId, checkAccess]);

  // Real-time subscription to usage changes
  // ISSUE #10 FIX: Only depend on userId, use ref for checkAccess to prevent duplicate subscriptions
  useEffect(() => {
    if (!userId) return;

    logger.info('[Real-time] Setting up subscription listener for user:', userId);

    // Subscribe to changes in the users table for this specific user
    const subscription = supabase
      .channel(`user-usage-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          logger.info('[Real-time] Usage update detected:', payload);

          // Re-check access when usage changes (use ref to get latest function)
          if (checkAccessRef.current) {
            checkAccessRef.current();
          }
        }
      )
      .subscribe((status) => {
        logger.info('[Real-time] Subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      logger.info('[Real-time] Cleaning up subscription listener');
      try {
        const result = subscription.unsubscribe();
        logger.info('[Real-time] Unsubscribe completed:', result);
      } catch (error) {
        logger.error('[Real-time] Error during unsubscribe:', error);
      }
    };
  }, [userId]); // Only userId - checkAccess accessed via ref

  return {
    subscriptionStatus,
    loading,
    error,
    checkAccess,
    recordUsage,
    getSubscriptionInfo,
    // Optimistic counter functions
    applyOptimisticDeduction,
    resetOptimisticCount,
    // Helper properties - ALWAYS use real database values for access control
    canUseSimulation: subscriptionStatus?.canUseSimulation || false,
    subscriptionTier: subscriptionStatus?.subscriptionTier,
    // CRITICAL FIX: Use real database value, not calculated
    // This ensures access checks are based on actual quota, not optimistic display
    simulationsRemaining: subscriptionStatus?.remainingSimulations ?? null,
  };
};
