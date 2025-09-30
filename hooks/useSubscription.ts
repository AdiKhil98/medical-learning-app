import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SubscriptionManager } from '../utils/subscriptionManager';

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

  const subscriptionManager = new SubscriptionManager(supabase);

  /**
   * Check if user can start a simulation
   */
  const checkAccess = useCallback(async () => {
    if (!userId) return null;

    setLoading(true);
    setError(null);

    try {
      const status = await subscriptionManager.checkSimulationAccess(userId);
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
      const success = await subscriptionManager.recordSimulationUsage(userId);
      if (success) {
        // Refresh the subscription status after recording usage
        await checkAccess();
      }
      return success;
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

    // Format display text
    let planName = 'Free Plan';
    let usageText = '';

    switch (subscriptionTier) {
      case 'basis':
        planName = 'Basis-Plan';
        usageText = `${simulationsUsed}/${simulationLimit} simulations used`;
        break;
      case 'profi':
        planName = 'Profi-Plan';
        usageText = `${simulationsUsed}/${simulationLimit} simulations used`;
        break;
      case 'unlimited':
        planName = 'Unlimited-Plan';
        usageText = `${simulationsUsed} simulations used`;
        break;
      default:
        usageText = `${simulationsUsed}/${simulationLimit} free simulations used`;
    }

    return {
      planName,
      usageText,
      message,
      canUpgrade: subscriptionTier === 'free' || subscriptionTier === 'basis',
      isUnlimited: subscriptionTier === 'unlimited'
    };
  }, [subscriptionStatus]);

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
    // Helper properties
    canUseSimulation: subscriptionStatus?.canUseSimulation || false,
    subscriptionTier: subscriptionStatus?.subscriptionTier,
    simulationsRemaining: subscriptionStatus?.simulationLimit
      ? subscriptionStatus.simulationLimit - subscriptionStatus.simulationsUsed
      : null
  };
};