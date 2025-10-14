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
      // Fetch FRESH data from database to prevent stale state
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

      console.log('[Access Control] User data:', {
        tier: user.subscription_tier,
        status: user.subscription_status,
        limit: user.simulation_limit,
        used: user.simulations_used_this_month,
        freeUsed: user.free_simulations_used
      });

      // Determine access based on subscription tier
      let canUse = false;
      let remaining = 0;
      let shouldUpgrade = false;
      let message = '';
      let tier = user.subscription_tier || 'free';

      if (!user.subscription_tier || user.subscription_status !== 'active') {
        // ===== FREE TIER =====
        const freeUsed = user.free_simulations_used || 0;
        remaining = Math.max(0, 3 - freeUsed);
        canUse = remaining > 0;

        if (!canUse) {
          shouldUpgrade = true;
          message = 'Sie haben alle 3 kostenlosen Simulationen verbraucht. Upgraden Sie für mehr!';
          console.log('[Access Control] FREE TIER - LIMIT REACHED');
        } else {
          message = `${remaining} kostenlose Simulationen verbleibend`;
          console.log(`[Access Control] FREE TIER - ${remaining} remaining`);
        }
      } else if (user.subscription_tier === 'unlimited') {
        // ===== UNLIMITED TIER =====
        canUse = true;
        remaining = 999999; // Unlimited
        message = 'Unbegrenzte Simulationen verfügbar';
        console.log('[Access Control] UNLIMITED TIER - Access granted');
      } else {
        // ===== PAID TIER (basis/profi) =====
        const limit = user.simulation_limit || 0;
        const used = user.simulations_used_this_month || 0;
        remaining = Math.max(0, limit - used);
        canUse = remaining > 0;

        if (!canUse) {
          shouldUpgrade = true;
          message = `Sie haben alle ${limit} Simulationen dieses Monats verbraucht. Upgraden Sie für mehr!`;
          console.log('[Access Control] PAID TIER - LIMIT REACHED');
        } else {
          message = `${remaining} Simulationen verbleibend in diesem Monat`;
          console.log(`[Access Control] PAID TIER - ${remaining} remaining`);
        }
      }

      const status = {
        canUseSimulation: canUse,
        simulationsUsed: tier === 'free' ? user.free_simulations_used : user.simulations_used_this_month,
        simulationLimit: tier === 'free' ? 3 : (tier === 'unlimited' ? 999999 : user.simulation_limit),
        subscriptionTier: tier,
        message,
        shouldUpgrade,
        remainingSimulations: remaining
      };

      console.log('[Access Control] Result:', {
        canStart: canUse,
        remaining,
        shouldUpgrade,
        tier
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
      if (!user.subscription_tier || user.subscription_status !== 'active') {
        // Free tier
        const { error } = await supabase.rpc('increment_free_simulations', { user_id: userId });
        if (error) {
          console.error('Error updating free simulation usage:', error);
          return false;
        }
      } else {
        // Paid tier
        const { error } = await supabase.rpc('increment_monthly_simulations', { user_id: userId });
        if (error) {
          console.error('Error updating monthly simulation usage:', error);
          return false;
        }
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
   */
  const getSubscriptionInfo = useCallback(() => {
    if (!subscriptionStatus) return null;

    const { subscriptionTier, simulationsUsed, simulationLimit, message } = subscriptionStatus;

    // Calculate display count (optimistic if active, actual otherwise)
    const displayUsed = hasOptimisticState
      ? simulationsUsed + optimisticDeduction
      : simulationsUsed;

    // Format display text
    let planName = 'Free Plan';
    let usageText = '';

    switch (subscriptionTier) {
      case 'basis':
        planName = 'Basis-Plan';
        usageText = `${displayUsed}/${simulationLimit} Simulationen genutzt`;
        break;
      case 'profi':
        planName = 'Profi-Plan';
        usageText = `${displayUsed}/${simulationLimit} Simulationen genutzt`;
        break;
      case 'unlimited':
        planName = 'Unlimited-Plan';
        usageText = `${displayUsed} Simulationen genutzt`;
        break;
      default:
        usageText = `${displayUsed}/${simulationLimit} kostenlose Simulationen genutzt`;
    }

    return {
      planName,
      usageText,
      message,
      canUpgrade: subscriptionTier === 'free' || subscriptionTier === 'basis',
      isUnlimited: subscriptionTier === 'unlimited'
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