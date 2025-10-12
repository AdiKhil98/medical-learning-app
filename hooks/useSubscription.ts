import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface SubscriptionStatus {
  canUseSimulation: boolean;
  simulationsUsed: number;
  simulationLimit: number | null;
  subscriptionTier: string | null;
  message: string;
}

export const useSubscription = (userId: string | undefined) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optimistic counter state
  const [optimisticDeduction, setOptimisticDeduction] = useState<number>(0);
  const [hasOptimisticState, setHasOptimisticState] = useState<boolean>(false);

  /**
   * Check if user can start a simulation
   */
  const checkAccess = useCallback(async () => {
    if (!userId) return null;

    setLoading(true);
    setError(null);

    try {
      // Simple direct Supabase query without SubscriptionManager
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
        console.error('Error fetching user subscription:', error);
        return null;
      }

      // Simple logic for access control
      let canUse = true;
      let message = 'Ready to start simulation';

      if (!user.subscription_tier || user.subscription_status !== 'active') {
        // Free tier
        canUse = user.free_simulations_used < 3;
        message = canUse
          ? `${3 - user.free_simulations_used} kostenlose Simulationen verbleibend`
          : 'Kostenlose Simulationen aufgebraucht. Bitte upgraden.';
      } else if (user.subscription_tier !== 'unlimited') {
        // Paid tier with limits
        canUse = user.simulations_used_this_month < user.simulation_limit;
        message = canUse
          ? `${user.simulation_limit - user.simulations_used_this_month} Simulationen verbleibend in diesem Monat`
          : 'Monatliches Simulationslimit erreicht.';
      }

      const status: SubscriptionStatus = {
        canUseSimulation: canUse,
        simulationsUsed: user.subscription_tier ? user.simulations_used_this_month : user.free_simulations_used,
        simulationLimit: user.subscription_tier ? user.simulation_limit : 3,
        subscriptionTier: user.subscription_tier || 'free',
        message
      };

      setSubscriptionStatus(status);
      return status;
    } catch (err) {
      console.error('Error checking subscription access:', err);
      setError('Error checking subscription status');
      return null;
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