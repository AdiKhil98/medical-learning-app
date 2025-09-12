import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionData {
  id: string;
  plan_type: 'free' | 'basic' | 'professional' | 'unlimited';
  status: 'trial' | 'active' | 'cancelled' | 'expired';
  simulations_limit: number | null; // null = unlimited
  simulations_used: number;
  simulations_remaining: number;
  
  // Trial info
  in_trial: boolean;
  trial_end_date: string | null;
  
  // Subscription info
  subscription_end_date: string | null;
  next_billing_date: string | null;
  current_period_start: string;
  current_period_end: string;
  
  billing_cycle: 'monthly' | 'yearly';
  amount: number;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        // No subscription found - user needs to be set up with default
        await createDefaultSubscription();
        return;
      }

      // Process subscription data
      const now = new Date();
      const trialEnd = data.trial_end_date ? new Date(data.trial_end_date) : null;
      const inTrial = trialEnd ? now < trialEnd : false;

      const processedData: SubscriptionData = {
        id: data.id,
        plan_type: data.plan_type,
        status: inTrial ? 'trial' : data.status,
        simulations_limit: data.simulations_limit,
        simulations_used: data.simulations_used,
        simulations_remaining: data.simulations_limit 
          ? Math.max(0, data.simulations_limit - data.simulations_used)
          : Infinity,
        in_trial: inTrial,
        trial_end_date: data.trial_end_date,
        subscription_end_date: data.subscription_end_date,
        next_billing_date: data.next_billing_date,
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        billing_cycle: data.billing_cycle,
        amount: data.amount,
      };

      setSubscription(processedData);

    } catch (err: any) {
      // Silently handle missing table errors for cleaner console
      if (err?.code === '42P01' || err?.message?.includes('relation') || err?.status === 403) {
        // Table doesn't exist or no permissions - use default free tier
        setSubscription({
          id: 'default',
          plan_type: 'free',
          status: 'active',
          simulations_limit: null,
          simulations_used: 0,
          simulations_remaining: Infinity,
          in_trial: false,
          trial_end_date: null,
          subscription_end_date: null,
          next_billing_date: null,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          billing_cycle: 'yearly',
          amount: 0,
        });
      } else {
        console.error('Error fetching subscription:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
      }
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSubscription = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days trial
      const periodEnd = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now

      const { data, error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_type: 'free',
          status: 'active',
          simulations_limit: 3,
          simulations_used: 0,
          billing_cycle: 'monthly',
          amount: 0,
          trial_start_date: now.toISOString(),
          trial_end_date: trialEnd.toISOString(),
          subscription_start_date: now.toISOString(),
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Refresh subscription after creation
      await fetchSubscription();

    } catch (err: any) {
      // Silently handle table permission errors
      if (err?.status === 403 || err?.message?.includes('permission')) {
        // Can't create subscription record - app will use default free tier
        return;
      }
      console.error('Error creating default subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to create subscription');
    }
  };

  const canUseSimulation = (): boolean => {
    // Temporarily allow unlimited simulations for testing
    return true;
    
    // Original logic (commented out for testing):
    // if (!subscription) return false;
    // if (subscription.in_trial) return true;
    // if (subscription.plan_type === 'unlimited') return true;
    // return subscription.simulations_remaining > 0;
  };

  const useSimulation = async (type: 'kp' | 'fsp'): Promise<boolean> => {
    // Temporarily skip subscription checks for testing
    console.log('📝 useSimulation called for type:', type);
    
    // Skip all database operations during testing
    return true;
    
    // Original logic (commented out for testing):
    // if (!subscription || !user) {
    //   throw new Error('No subscription or user found');
    // }
    // if (!canUseSimulation()) {
    //   throw new Error('Simulation limit reached');
    // }

    try {
      // Don't increment usage during trial or unlimited
      if (!subscription.in_trial && subscription.plan_type !== 'unlimited') {
        // Increment simulations_used
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({ 
            simulations_used: subscription.simulations_used + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        if (updateError) {
          throw updateError;
        }
      }

      // Log the simulation usage
      const { error: logError } = await supabase
        .from('simulation_usage_logs')
        .insert({
          user_id: user.id,
          subscription_id: subscription.id,
          simulation_type: type,
          billing_period_start: subscription.current_period_start,
          billing_period_end: subscription.current_period_end,
          status: 'started'
        });

      if (logError) {
        console.error('Error logging simulation usage:', logError);
        // Don't throw error for logging failure
      }

      // Refresh subscription data
      await fetchSubscription();
      return true;

    } catch (err) {
      console.error('Error using simulation:', err);
      throw err;
    }
  };

  const getSimulationStatusText = (): string => {
    if (!subscription) return 'Laden...';
    
    if (subscription.in_trial) {
      const daysLeft = Math.ceil(
        (new Date(subscription.trial_end_date!).getTime() - new Date().getTime()) / 
        (24 * 60 * 60 * 1000)
      );
      return `Testversion: ${daysLeft} Tag${daysLeft !== 1 ? 'e' : ''} verbleibend`;
    }

    if (subscription.plan_type === 'unlimited') {
      return 'Unbegrenzte Simulationen';
    }

    if (subscription.plan_type === 'free') {
      return `${subscription.simulations_remaining} von ${subscription.simulations_limit} Simulationen verbleibend`;
    }

    return `${subscription.simulations_remaining} Simulationen verbleibend`;
  };

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  return {
    subscription,
    loading,
    error,
    canUseSimulation,
    useSimulation,
    getSimulationStatusText,
    refreshSubscription: fetchSubscription,
  };
};