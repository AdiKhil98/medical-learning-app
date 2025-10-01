import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (you'll need to import your existing client)
// const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

interface SubscriptionStatus {
  canUseSimulation: boolean;
  simulationsUsed: number;
  simulationLimit: number | null; // null = unlimited
  subscriptionTier: string | null;
  message: string;
}

interface UserSubscription {
  id: string;
  subscription_tier: string | null;
  subscription_status: string;
  simulation_limit: number | null;
  simulations_used_this_month: number;
  free_simulations_used: number;
  subscription_period_end: string;
}

export class SubscriptionManager {
  constructor(private supabase: any) {}

  /**
   * Check if user can start a new simulation
   */
  async checkSimulationAccess(userId: string): Promise<SubscriptionStatus> {
    try {
      const { data: user, error } = await this.supabase
        .from('users')
        .select(`
          id,
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
        return {
          canUseSimulation: false,
          simulationsUsed: 0,
          simulationLimit: 0,
          subscriptionTier: null,
          message: 'User not found'
        };
      }

      // Check if subscription period has ended and needs reset
      const now = new Date();
      const periodEnd = new Date(user.subscription_period_end);
      if (now > periodEnd && user.subscription_status === 'active') {
        // Reset usage for this user
        await this.resetUserUsage(userId);
        user.simulations_used_this_month = 0;
      }

      // Free tier logic
      if (!user.subscription_tier || user.subscription_status !== 'active') {
        const freeLimit = 3;
        const canUse = user.free_simulations_used < freeLimit;

        return {
          canUseSimulation: canUse,
          simulationsUsed: user.free_simulations_used,
          simulationLimit: freeLimit,
          subscriptionTier: 'free',
          message: canUse
            ? `${freeLimit - user.free_simulations_used} free simulations remaining`
            : 'Free simulations used up. Please upgrade to continue.'
        };
      }

      // Paid subscription logic
      if (user.subscription_tier === 'unlimited') {
        return {
          canUseSimulation: true,
          simulationsUsed: user.simulations_used_this_month,
          simulationLimit: null,
          subscriptionTier: user.subscription_tier,
          message: 'Unlimited simulations'
        };
      }

      // Basis/Profi plans with limits
      const canUse = user.simulations_used_this_month < user.simulation_limit;
      const remaining = user.simulation_limit - user.simulations_used_this_month;

      return {
        canUseSimulation: canUse,
        simulationsUsed: user.simulations_used_this_month,
        simulationLimit: user.simulation_limit,
        subscriptionTier: user.subscription_tier,
        message: canUse
          ? `${remaining} simulations remaining this month`
          : 'Monthly simulation limit reached. Upgrade or wait for next period.'
      };

    } catch (error) {
      console.error('Error checking simulation access:', error);
      return {
        canUseSimulation: false,
        simulationsUsed: 0,
        simulationLimit: 0,
        subscriptionTier: null,
        message: 'Error checking subscription status'
      };
    }
  }

  /**
   * Record that a simulation was used
   */
  async recordSimulationUsage(userId: string): Promise<boolean> {
    try {
      const { data: user, error } = await this.supabase
        .from('users')
        .select('subscription_tier, subscription_status')
        .eq('id', userId)
        .single();

      if (error || !user) {
        console.error('User not found for usage recording');
        return false;
      }

      // Update usage based on subscription type
      if (!user.subscription_tier || user.subscription_status !== 'active') {
        // Free tier - increment free simulations used
        const { error: updateError } = await this.supabase
          .rpc('increment_free_simulations', { user_id: userId });

        if (updateError) {
          console.error('Error updating free simulation usage:', updateError);
          return false;
        }
      } else {
        // Paid tier - increment monthly usage
        const { error: updateError } = await this.supabase
          .rpc('increment_monthly_simulations', { user_id: userId });

        if (updateError) {
          console.error('Error updating simulation usage:', updateError);
          return false;
        }
      }

      // Also log to simulation_usage_logs if that table exists
      await this.logSimulationUsage(userId);

      return true;
    } catch (error) {
      console.error('Error recording simulation usage:', error);
      return false;
    }
  }

  /**
   * Reset usage for a specific user
   */
  private async resetUserUsage(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({
          simulations_used_this_month: 0,
          subscription_period_start: new Date().toISOString().split('T')[0],
          subscription_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        .eq('id', userId);

      if (error) {
        console.error('Error resetting user usage:', error);
      }
    } catch (error) {
      console.error('Error in resetUserUsage:', error);
    }
  }

  /**
   * Log simulation usage (if simulation_usage_logs table exists)
   */
  private async logSimulationUsage(userId: string): Promise<void> {
    try {
      // This assumes you have a simulation_usage_logs table
      // Adjust the table name and columns as needed
      await this.supabase
        .from('simulation_usage_logs')
        .insert({
          user_id: userId,
          used_at: new Date().toISOString(),
          simulation_type: 'medical_simulation'
        });
    } catch (error) {
      // Don't throw error if logging fails - just log it
      console.log('Note: Could not log to simulation_usage_logs table:', error);
    }
  }
}