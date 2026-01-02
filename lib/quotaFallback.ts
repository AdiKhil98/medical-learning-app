/**
 * Quota Fallback Helper
 *
 * This module provides a fallback mechanism to ensure simulations are counted
 * even if the primary RPC function doesn't update the quota table properly.
 */

import { supabase } from './supabase';
import { logger } from '@/utils/logger';

/**
 * Verify and fix quota if simulation was not properly counted
 *
 * @param userId - User ID
 * @param expectedIncrease - Whether we expect the quota to have increased
 * @returns Promise with result
 */
export async function verifyAndFixQuota(
  userId: string | undefined,
  usedBefore: number
): Promise<{ fixed: boolean; newUsed: number }> {
  if (!userId) {
    return { fixed: false, newUsed: 0 };
  }

  try {
    // Wait a bit for any triggers to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check current quota
    const { data: quotaCheck, error: checkError } = await supabase.rpc('can_start_simulation', {
      p_user_id: userId,
    });

    if (checkError) {
      logger.error('❌ Quota check failed', new Error(checkError.message));
      return { fixed: false, newUsed: usedBefore };
    }

    const currentUsed = quotaCheck?.simulations_used || 0;
    logger.info('📊 Quota check', { before: usedBefore, current: currentUsed });

    // If quota didn't increment, force update it
    if (currentUsed <= usedBefore) {
      logger.warn('⚠️ QUOTA NOT INCREMENTED - Applying fallback fix...');

      const newUsed = usedBefore + 1;

      // Try direct table update
      const { error: updateError } = await supabase
        .from('user_simulation_quota')
        .update({
          simulations_used: newUsed,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        logger.error('❌ Fallback update failed', new Error(updateError.message));
        return { fixed: false, newUsed: usedBefore };
      }

      logger.warn('✅ FALLBACK: Quota updated successfully!', { newUsed });
      return { fixed: true, newUsed };
    }

    logger.info('✅ Quota correctly incremented', { currentUsed });
    return { fixed: false, newUsed: currentUsed };
  } catch (error) {
    logger.error('❌ verifyAndFixQuota exception', error);
    return { fixed: false, newUsed: usedBefore };
  }
}

/**
 * Get current quota used count
 */
export async function getCurrentQuotaUsed(userId: string | undefined): Promise<number> {
  if (!userId) return 0;

  try {
    const { data, error } = await supabase.rpc('can_start_simulation', {
      p_user_id: userId,
    });

    if (error) {
      logger.error('❌ getCurrentQuotaUsed failed', new Error(error.message));
      return 0;
    }

    return data?.simulations_used || 0;
  } catch (error) {
    logger.error('❌ getCurrentQuotaUsed exception', error);
    return 0;
  }
}
