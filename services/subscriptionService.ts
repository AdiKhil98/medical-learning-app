import { supabase } from '@/lib/supabase';

export interface SubscriptionPlan {
  tier: 'free' | 'basis' | 'profi' | 'unlimited';
  simulationLimit: number | null;
  status: 'active' | 'inactive';
}

const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    tier: 'free',
    simulationLimit: null, // Free tier uses free_simulations_used (limit: 3)
    status: 'inactive'
  },
  basic: {
    tier: 'basis',
    simulationLimit: 30,
    status: 'active'
  },
  professional: {
    tier: 'profi',
    simulationLimit: 60,
    status: 'active'
  },
  unlimited: {
    tier: 'unlimited',
    simulationLimit: null,
    status: 'active'
  }
};

export class SubscriptionService {
  /**
   * Update user's subscription plan in the database
   */
  static async updateUserSubscription(userId: string, planId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan) {
        return { success: false, error: `Invalid plan: ${planId}` };
      }

      // Prepare update data based on plan type
      const updateData: any = {
        subscription_tier: plan.tier === 'free' ? null : plan.tier,
        subscription_status: plan.status,
        simulation_limit: plan.simulationLimit,
        subscription_updated_at: new Date().toISOString()
      };

      // Reset usage counters when changing plans
      if (plan.tier === 'free') {
        // Switch to free tier - reset everything
        updateData.simulations_used_this_month = 0;
        updateData.free_simulations_used = 0;
        updateData.subscription_id = null;
        updateData.variant_id = null;
      } else {
        // Switch to paid tier - reset monthly usage, keep free usage
        updateData.simulations_used_this_month = 0;
        updateData.subscription_period_start = new Date().toISOString().split('T')[0];
        updateData.subscription_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating subscription:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Subscription updated successfully:', data);
      return { success: true };

    } catch (error) {
      console.error('Error in updateUserSubscription:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  /**
   * Get available subscription plans
   */
  static getAvailablePlans() {
    return SUBSCRIPTION_PLANS;
  }

  /**
   * Get plan details by ID
   */
  static getPlanDetails(planId: string): SubscriptionPlan | null {
    return SUBSCRIPTION_PLANS[planId] || null;
  }
}