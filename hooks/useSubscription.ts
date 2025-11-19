import { useState, useEffect, useCallback } from 'react';
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

  /**
   * Check if user can start a simulation - STRICT ACCESS CONTROL
   * Returns detailed information for blocking and upgrade prompts
   * CRITICAL: Block only when remaining === 0
   */
  const checkAccess = useCallback(async () => {
    if (!userId) {
      console.log('[Access Control] No user ID - access denied');
      return {
        canUseSimulation: false,
        simulationsUsed: 0,
        simulationLimit: 0,
        subscriptionTier: null,
        message: 'Nicht angemeldet',
        shouldUpgrade: false,
        remainingSimulations: 0
      };
    }

    setLoading(true);
    setError(null);

    try {
      // STEP 1: Check and reset monthly counter if in new billing period
      console.log('[Access Control] Checking if monthly counter needs reset...');
      try {
        const { data: resetResult, error: resetError } = await supabase
          .rpc('check_and_reset_monthly_counter', { user_id_input: userId });

        if (resetError) {
          console.warn('[Access Control] Counter reset check failed:', resetError);
        } else if (resetResult) {
          console.log('[Access Control] ✅ Monthly counter was automatically reset (new billing period)');
        }
      } catch (resetErr) {
        console.warn('[Access Control] Counter reset error (non-critical):', resetErr);
      }

      // STEP 2: Fetch FRESH data from database to prevent stale state
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          subscription_tier,
          subscription_status,
          simulation_limit,
          simulations_used_this_month,
          free_simulations_used,
          subscription_period_end
        `)
        .eq('id', userId)
        .single();

      if (error || !user) {
        console.error('[Access Control] Error fetching user subscription:', error);
        setError('Fehler beim Abrufen des Abonnementstatus');
        return {
          canUseSimulation: false,
          simulationsUsed: 0,
          simulationLimit: 0,
          subscriptionTier: null,
          message: 'Fehler beim Abrufen des Abonnementstatus',
          shouldUpgrade: false,
          remainingSimulations: 0
        };
      }

      // ISSUE #20 FIX: Validate required fields exist in user object
      const requiredFields = [
        'subscription_tier',
        'subscription_status',
        'simulation_limit',
        'simulations_used_this_month',
        'free_simulations_used'
      ];

      for (const field of requiredFields) {
        if (!(field in user)) {
          console.error(`[Access Control] Missing required field: ${field}`);
          setError('Unvollständige Benutzerdaten');
          return {
            canUseSimulation: false,
            simulationsUsed: 0,
            simulationLimit: 0,
            subscriptionTier: null,
            message: 'Unvollständige Benutzerdaten - bitte Support kontaktieren',
            shouldUpgrade: false,
            remainingSimulations: 0
          };
        }
      }

      console.log('[Access Control] User data:', {
        tier: user.subscription_tier,
        status: user.subscription_status,
        limit: user.simulation_limit,
        used: user.simulations_used_this_month,
        freeUsed: user.free_simulations_used
      });

      // CRITICAL: Validate and sanitize data to handle edge cases
      // FIX: If limit is NULL for paid tier, calculate from tier name
      let calculatedLimit = user.simulation_limit;

      const isActiveStatus = ['active', 'on_trial', 'past_due'].includes(user.subscription_status);

      if (calculatedLimit === null && user.subscription_tier && isActiveStatus) {
        // Auto-calculate limit from tier name if missing
        if (user.subscription_tier === 'basis') {
          calculatedLimit = 30;
        } else if (user.subscription_tier === 'profi') {
          calculatedLimit = 60;
        } else if (user.subscription_tier === 'unlimited') {
          calculatedLimit = 999999;
        } else if (user.subscription_tier.startsWith('custom_')) {
          // Extract number from custom_X tier names
          const match = user.subscription_tier.match(/custom_(\d+)/);
          calculatedLimit = match ? parseInt(match[1]) : 30;
        } else {
          calculatedLimit = 30; // Default fallback
        }

        console.warn(`[Access Control] NULL limit detected for ${user.subscription_tier}, auto-calculated: ${calculatedLimit}`);
      }

      const sanitizedData = {
        tier: user.subscription_tier || 'free',
        status: user.subscription_status || 'inactive',
        limit: Math.max(0, calculatedLimit || 0),
        usedMonthly: Math.max(0, user.simulations_used_this_month || 0),
        usedFree: Math.max(0, user.free_simulations_used || 0)
      };

      // Determine access based on subscription tier
      let canUse = false;
      let remaining = 0;
      let shouldUpgrade = false;
      let message = '';
      let totalLimit = 0;
      let usedCount = 0;
      let tier = sanitizedData.tier;

      // Check if subscription is active (includes on_trial and past_due for grace period)
      const hasActiveSubscription = ['active', 'on_trial', 'past_due'].includes(sanitizedData.status);

      if (!sanitizedData.tier || sanitizedData.tier === 'free' || !hasActiveSubscription) {
        // ===== FREE TIER: Always 3 simulations (lifetime) =====
        totalLimit = 3;
        usedCount = sanitizedData.usedFree;

        // CRITICAL: Calculate remaining = limit - used
        remaining = totalLimit - usedCount;

        // CRITICAL: Can only start if remaining > 0
        canUse = remaining > 0;

        if (canUse) {
          message = `${remaining} von ${totalLimit} kostenlosen Simulationen verbleibend`;
          console.log(`[Access Control] ✅ FREE TIER ALLOWED - Calculation: ${totalLimit} - ${usedCount} = ${remaining}, canStart: true`);
        } else {
          // remaining === 0, limit reached
          shouldUpgrade = true;
          message = `Sie haben alle ${totalLimit} kostenlosen Simulationen verbraucht. Upgraden Sie für mehr!`;
          console.log(`[Access Control] ❌ FREE TIER BLOCKED - Calculation: ${totalLimit} - ${usedCount} = ${remaining}, canStart: false`);
        }
      } else if (sanitizedData.tier === 'unlimited') {
        // ===== UNLIMITED TIER: No limit =====
        totalLimit = 999999;
        usedCount = sanitizedData.usedMonthly;
        remaining = 999999;
        canUse = true; // Always allow
        message = 'Unbegrenzte Simulationen verfügbar';
        console.log(`[Access Control] ✅ UNLIMITED TIER - Always allowed (used: ${usedCount})`);
      } else {
        // ===== PAID TIER: Dynamic limit from database (works for 5, 30, 50, 100, any value) =====
        totalLimit = sanitizedData.limit;
        usedCount = sanitizedData.usedMonthly;

        // CRITICAL: Calculate remaining = limit - used
        remaining = totalLimit - usedCount;

        // CRITICAL: Can only start if remaining > 0
        canUse = remaining > 0;

        if (canUse) {
          message = `${remaining} von ${totalLimit} Simulationen verbleibend`;
          console.log(`[Access Control] ✅ PAID TIER ALLOWED - Calculation: ${totalLimit} - ${usedCount} = ${remaining}, canStart: true`);
        } else {
          // remaining === 0, limit reached
          shouldUpgrade = true;
          message = `Sie haben alle ${totalLimit} Simulationen dieses Monats verbraucht. Upgraden Sie für mehr!`;
          console.log(`[Access Control] ❌ PAID TIER BLOCKED - Calculation: ${totalLimit} - ${usedCount} = ${remaining}, canStart: false`);
        }
      }

      const status = {
        canUseSimulation: canUse,
        simulationsUsed: usedCount,
        simulationLimit: totalLimit,
        subscriptionTier: tier,
        message,
        shouldUpgrade,
        remainingSimulations: remaining
      };

      console.log('[Access Control] Final Result:', {
        tier,
        totalLimit,
        usedCount,
        remaining,
        calculation: `${totalLimit} - ${usedCount} = ${remaining}`,
        canStart: canUse,
        shouldUpgrade
      });

      setSubscriptionStatus(status);
      return status;
    } catch (err) {
      console.error('[Access Control] Exception:', err);
      setError('Fehler beim Überprüfen des Abonnementstatus');
      return {
        canUseSimulation: false,
        simulationsUsed: 0,
        simulationLimit: 0,
        subscriptionTier: null,
        message: 'Fehler beim Überprüfen des Abonnementstatus',
        shouldUpgrade: false,
        remainingSimulations: 0
      };
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
        console.error('Error fetching user for usage recording:', fetchError);
        return false;
      }

      // Use the database functions we created
      const hasActiveSubscription = ['active', 'on_trial', 'past_due'].includes(user.subscription_status);

      if (!user.subscription_tier || !hasActiveSubscription) {
        // Free tier
        const { data, error } = await supabase.rpc('increment_free_simulations', { user_id: userId });

        if (error) {
          console.error('Error updating free simulation usage:', error);
          return false;
        }

        // Check response from function
        if (data && !data.success) {
          console.error('Free simulation increment failed:', data.error, data.message);
          setError(data.message || 'Failed to record simulation usage');
          return false;
        }

        console.log('✅ Free simulation recorded:', data);
      } else {
        // Paid tier
        const { data, error } = await supabase.rpc('increment_monthly_simulations', { user_id: userId });

        if (error) {
          console.error('Error updating monthly simulation usage:', error);
          return false;
        }

        // Check response from function
        if (data && !data.success) {
          console.error('Monthly simulation increment failed:', data.error, data.message);
          setError(data.message || 'Failed to record simulation usage');
          return false;
        }

        console.log('✅ Monthly simulation recorded:', data);
      }

      // Refresh the subscription status after recording usage
      await checkAccess();
      return true;
    } catch (err) {
      console.error('Error recording simulation usage:', err);
      setError('Error recording simulation usage');
      return false;
    }
  }, [userId, checkAccess]);

  /**
   * Get subscription display info for dashboard
   * UNIVERSAL: Works for any tier and any limit value
   */
  const getSubscriptionInfo = useCallback(() => {
    if (!subscriptionStatus) return null;

    const { subscriptionTier, simulationsUsed, simulationLimit, message } = subscriptionStatus;

    // Calculate display count (optimistic if active, actual otherwise)
    const displayUsed = hasOptimisticState
      ? simulationsUsed + optimisticDeduction
      : simulationsUsed;

    // UNIVERSAL: Map tier to display name (works for any tier)
    const tierDisplayNames: Record<string, string> = {
      'free': 'Kostenlos',
      'basis': 'Basis-Plan',
      'profi': 'Profi-Plan',
      'unlimited': 'Unlimited-Plan',
      // Add any custom tiers here
      'custom_5': 'Custom 5',
      'custom_50': 'Custom 50',
      'custom_100': 'Custom 100'
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
      displayUsed,
      totalLimit: simulationLimit,
      remaining: simulationLimit ? simulationLimit - displayUsed : 0
    };
  }, [subscriptionStatus, hasOptimisticState, optimisticDeduction]);

  /**
   * Apply optimistic deduction (call when simulation STARTS)
   * Shows immediate feedback while backend handles actual deduction at 10-min mark
   */
  const applyOptimisticDeduction = useCallback(() => {
    console.log('🎯 Applying optimistic deduction to counter...');
    setOptimisticDeduction(1);
    setHasOptimisticState(true);
  }, []);

  /**
   * Reset optimistic count to show actual backend count
   * Call this on: page refresh, simulation completion, or when returning to dashboard
   */
  const resetOptimisticCount = useCallback(() => {
    console.log('🔄 Resetting to actual backend count...');
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
  useEffect(() => {
    if (!userId) return;

    console.log('[Real-time] Setting up subscription listener for user:', userId);

    // Subscribe to changes in the users table for this specific user
    const subscription = supabase
      .channel(`user-usage-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          console.log('[Real-time] Usage update detected:', payload);

          // Re-check access when usage changes
          checkAccess();
        }
      )
      .subscribe((status) => {
        console.log('[Real-time] Subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('[Real-time] Cleaning up subscription listener');
      try {
        const result = subscription.unsubscribe();
        console.log('[Real-time] Unsubscribe completed:', result);
      } catch (error) {
        console.error('[Real-time] Error during unsubscribe:', error);
      }
    };
  }, [userId, checkAccess]);

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
    // Helper properties
    canUseSimulation: subscriptionStatus?.canUseSimulation || false,
    subscriptionTier: subscriptionStatus?.subscriptionTier,
    simulationsRemaining: subscriptionStatus?.simulationLimit
      ? subscriptionStatus.simulationLimit - subscriptionStatus.simulationsUsed
      : null
  };
};