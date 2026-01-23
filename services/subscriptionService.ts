import { supabase } from '@/lib/supabase';

export interface SubscriptionPlan {
  tier: 'trial' | 'free' | 'basic' | 'premium';
  simulationLimit: number | null; // null = unlimited
  status: 'active' | 'inactive' | 'on_trial';
}

export interface TrialStatus {
  has_trial: boolean;
  is_active: boolean;
  trial_started_at?: string;
  trial_expires_at?: string;
  days_remaining?: number;
  message?: string;
}

const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  trial: {
    tier: 'trial',
    simulationLimit: null, // Unlimited during trial
    status: 'on_trial',
  },
  free: {
    tier: 'free',
    simulationLimit: 0, // No simulations after trial expires
    status: 'inactive',
  },
  basic: {
    tier: 'basic',
    simulationLimit: 30,
    status: 'active',
  },
  premium: {
    tier: 'premium',
    simulationLimit: 60,
    status: 'active',
  },
};

export class SubscriptionService {
  /**
   * Check if user can switch to free tier (prevent abuse)
   */
  static async canSwitchToFreeTier(userId: string): Promise<{ canSwitch: boolean; reason?: string }> {
    try {
      console.log('🔍 Checking free tier eligibility for user:', userId);

      const { data: user, error } = await supabase
        .from('users')
        .select('has_used_free_tier, subscription_tier, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching user for free tier check:', error);
        return { canSwitch: false, reason: 'Fehler beim Überprüfen des Benutzerstatus' };
      }

      console.log('📊 User free tier status:', {
        has_used_free_tier: user.has_used_free_tier,
        subscription_tier: user.subscription_tier,
      });

      // Allow new users who haven't used free tier yet
      if (!user.has_used_free_tier) {
        console.log('✅ User can use free tier (first time)');
        return { canSwitch: true };
      }

      // Block users who have already used free tier
      console.log('❌ User has already used free tier - blocking');
      return {
        canSwitch: false,
        reason:
          'Sie haben bereits Ihren kostenlosen Plan genutzt. Um mehr Simulationen zu erhalten, wählen Sie bitte einen kostenpflichtigen Plan.',
      };
    } catch (error) {
      console.error('Error checking free tier eligibility:', error);
      return { canSwitch: false, reason: 'Ein unerwarteter Fehler ist aufgetreten' };
    }
  }

  /**
   * Update user's subscription plan in the database
   */
  static async updateUserSubscription(userId: string, planId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan) {
        return { success: false, error: `Invalid plan: ${planId}` };
      }

      // Check free tier eligibility
      if (planId === 'free') {
        console.log('🔍 Checking eligibility for free tier...');
        const eligibility = await this.canSwitchToFreeTier(userId);
        console.log('📋 Eligibility result:', eligibility);

        if (!eligibility.canSwitch) {
          console.log('🚫 Free tier blocked:', eligibility.reason);
          return { success: false, error: eligibility.reason };
        }
        console.log('✅ Free tier allowed, proceeding...');
      }

      // Prepare update data based on plan type
      const updateData: any = {
        subscription_tier: plan.tier === 'free' ? null : plan.tier,
        subscription_status: plan.status,
        simulation_limit: plan.simulationLimit,
        subscription_updated_at: new Date().toISOString(),
      };

      // Reset usage counters when changing plans
      if (plan.tier === 'free') {
        // Switch to free tier - reset everything and mark as used
        updateData.simulations_used_this_month = 0;
        updateData.free_simulations_used = 0;
        updateData.subscription_id = null;
        updateData.variant_id = null;
        updateData.has_used_free_tier = true;
        updateData.first_free_tier_used_at = new Date().toISOString();
        updateData.free_tier_reset_count = 1; // Track that they've used it
      } else {
        // Switch to paid tier - reset monthly usage, keep free usage
        updateData.simulations_used_this_month = 0;
        updateData.subscription_period_start = new Date().toISOString().split('T')[0];
        updateData.subscription_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

        // Mark that they've used free tier if switching from free
        if (!updateData.has_used_free_tier) {
          updateData.has_used_free_tier = true;
          updateData.first_free_tier_used_at = new Date().toISOString();
        }
      }

      const { data, error } = await supabase.from('users').update(updateData).eq('id', userId).select().single();

      if (error) {
        console.error('Error updating subscription:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Subscription updated successfully:', data);

      // ⭐ CREATE QUOTA RECORD FOR FREE TIER ⭐
      if (plan.tier === 'free') {
        console.log('📊 Creating quota record for free tier user...');

        // Call RPC function (bypasses RLS)
        const { data: quotaResult, error: quotaError } = await supabase.rpc('create_free_tier_quota', {
          p_user_id: userId,
        });

        if (quotaError || !quotaResult?.success) {
          console.error('❌ Error creating quota:', quotaError || quotaResult);
          // Rollback: reset has_used_free_tier flag
          await supabase.from('users').update({ has_used_free_tier: false }).eq('id', userId);
          return {
            success: false,
            error: quotaError?.message || quotaResult?.error || 'Fehler beim Erstellen der Simulation-Quota',
          };
        }

        console.log('✅ Quota record created/updated successfully:', quotaResult);
      }

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

  /**
   * Get trial status for a user
   */
  static async getTrialStatus(userId: string): Promise<TrialStatus> {
    try {
      const { data, error } = await supabase.rpc('get_trial_status', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error getting trial status:', error);
        return { has_trial: false, is_active: false };
      }

      return data as TrialStatus;
    } catch (error) {
      console.error('Error in getTrialStatus:', error);
      return { has_trial: false, is_active: false };
    }
  }

  /**
   * Check if user is on active trial
   */
  static async isOnActiveTrial(userId: string): Promise<boolean> {
    const status = await this.getTrialStatus(userId);
    return status.has_trial && status.is_active;
  }

  /**
   * Activate trial for a user (called on signup or manually)
   */
  static async activateTrial(userId: string): Promise<{ success: boolean; error?: string; trial_expires_at?: string }> {
    try {
      console.log('Starting 5-day trial for user:', userId);

      const { data, error } = await supabase.rpc('initialize_trial_period', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error activating trial:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error || data.message };
      }

      console.log('Trial activated successfully:', data);
      return {
        success: true,
        trial_expires_at: data.trial_expires_at,
      };
    } catch (error) {
      console.error('Error in activateTrial:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  /**
   * Check if user can access simulations (trial active OR paid subscription)
   */
  static async canAccessSimulations(userId: string): Promise<{
    canAccess: boolean;
    reason: 'trial_active' | 'subscription_active' | 'trial_expired' | 'no_subscription';
    message: string;
    daysRemaining?: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('can_start_simulation', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error checking simulation access:', error);
        return {
          canAccess: false,
          reason: 'no_subscription',
          message: 'Fehler beim Pruefen des Zugangs',
        };
      }

      const canStart = data.can_start;
      const reason = data.reason;
      const daysRemaining = data.days_remaining;

      let mappedReason: 'trial_active' | 'subscription_active' | 'trial_expired' | 'no_subscription';
      if (reason === 'trial_active' || reason === 'trial_started') {
        mappedReason = 'trial_active';
      } else if (reason === 'has_quota' || reason === 'unlimited') {
        mappedReason = 'subscription_active';
      } else if (reason === 'trial_expired') {
        mappedReason = 'trial_expired';
      } else {
        mappedReason = 'no_subscription';
      }

      return {
        canAccess: canStart,
        reason: mappedReason,
        message: data.message,
        daysRemaining,
      };
    } catch (error) {
      console.error('Error in canAccessSimulations:', error);
      return {
        canAccess: false,
        reason: 'no_subscription',
        message: 'Ein Fehler ist aufgetreten',
      };
    }
  }

  /**
   * Get display info for trial status
   */
  static formatTrialStatus(daysRemaining: number): string {
    if (daysRemaining <= 0) {
      return 'Testphase abgelaufen';
    }
    if (daysRemaining === 1) {
      return '1 Tag Testphase verbleibend';
    }
    return `${daysRemaining} Tage Testphase verbleibend`;
  }
}
