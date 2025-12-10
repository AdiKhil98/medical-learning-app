-- Migration: Add counter sync trigger to keep quota tables in sync
-- Date: 2025-12-10
-- Purpose: Automatically synchronize users.simulations_used_this_month with user_simulation_quota.simulations_used
--
-- PROBLEM:
-- - mark_simulation_counted() increments users.simulations_used_this_month
-- - BUT does NOT update user_simulation_quota.simulations_used
-- - This causes data inconsistency between the two tables
--
-- SOLUTION:
-- - Create trigger that automatically syncs quota table when users table is updated
-- - Ensures single source of truth is maintained

-- ============================================
-- STEP 1: Create sync function for monthly counter
-- ============================================

CREATE OR REPLACE FUNCTION sync_monthly_simulation_counter()
RETURNS TRIGGER AS $$
DECLARE
  v_rows_updated integer;
BEGIN
  -- When users.simulations_used_this_month is updated,
  -- also update user_simulation_quota for the CURRENT period
  UPDATE user_simulation_quota
  SET
    simulations_used = NEW.simulations_used_this_month,
    updated_at = NOW()
  WHERE user_id = NEW.id
    AND period_start <= NOW()
    AND period_end > NOW();

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- Log if no quota record was found (shouldn't happen normally)
  IF v_rows_updated = 0 THEN
    RAISE WARNING 'No current quota record found for user % when syncing monthly counter', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_monthly_simulation_counter IS
'Trigger function that synchronizes users.simulations_used_this_month to user_simulation_quota.simulations_used for the current period.
Ensures both tables always show the same counter value.';

-- ============================================
-- STEP 2: Create sync function for free tier counter
-- ============================================

CREATE OR REPLACE FUNCTION sync_free_tier_simulation_counter()
RETURNS TRIGGER AS $$
DECLARE
  v_rows_updated integer;
BEGIN
  -- When users.free_simulations_used is updated,
  -- also update user_simulation_quota for the CURRENT period (free tier only)
  UPDATE user_simulation_quota
  SET
    simulations_used = NEW.free_simulations_used,
    updated_at = NOW()
  WHERE user_id = NEW.id
    AND subscription_tier = 'free'
    AND period_start <= NOW()
    AND period_end > NOW();

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- Log if no quota record was found
  IF v_rows_updated = 0 THEN
    RAISE WARNING 'No current free tier quota record found for user % when syncing free counter', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_free_tier_simulation_counter IS
'Trigger function that synchronizes users.free_simulations_used to user_simulation_quota.simulations_used for free tier users.
Ensures both tables always show the same counter value for free tier.';

-- ============================================
-- STEP 3: Create triggers on users table
-- ============================================

-- Drop existing triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS trigger_sync_monthly_counter ON users;
DROP TRIGGER IF EXISTS trigger_sync_free_counter ON users;

-- Trigger for paid tier monthly counter
CREATE TRIGGER trigger_sync_monthly_counter
AFTER UPDATE OF simulations_used_this_month ON users
FOR EACH ROW
WHEN (NEW.simulations_used_this_month IS DISTINCT FROM OLD.simulations_used_this_month)
EXECUTE FUNCTION sync_monthly_simulation_counter();

COMMENT ON TRIGGER trigger_sync_monthly_counter ON users IS
'Automatically syncs users.simulations_used_this_month to user_simulation_quota.simulations_used when counter changes.';

-- Trigger for free tier counter
CREATE TRIGGER trigger_sync_free_counter
AFTER UPDATE OF free_simulations_used ON users
FOR EACH ROW
WHEN (NEW.free_simulations_used IS DISTINCT FROM OLD.free_simulations_used)
EXECUTE FUNCTION sync_free_tier_simulation_counter();

COMMENT ON TRIGGER trigger_sync_free_counter ON users IS
'Automatically syncs users.free_simulations_used to user_simulation_quota.simulations_used for free tier when counter changes.';

-- ============================================
-- STEP 4: Add helper function to manually reconcile if needed
-- ============================================

CREATE OR REPLACE FUNCTION reconcile_user_quota(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_user_record RECORD;
  v_quota_record RECORD;
  v_changes_made boolean := false;
  v_old_quota_used integer;
BEGIN
  -- Get user record
  SELECT * INTO v_user_record
  FROM users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Get current quota record
  SELECT * INTO v_quota_record
  FROM user_simulation_quota
  WHERE user_id = p_user_id
    AND period_start <= NOW()
    AND period_end > NOW();

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No current quota record found',
      'recommendation', 'User may need quota initialization'
    );
  END IF;

  v_old_quota_used := v_quota_record.simulations_used;

  -- Determine which counter is source of truth based on tier
  IF v_quota_record.subscription_tier = 'free' THEN
    -- Free tier: users.free_simulations_used is source
    IF v_quota_record.simulations_used != v_user_record.free_simulations_used THEN
      UPDATE user_simulation_quota
      SET simulations_used = v_user_record.free_simulations_used,
          updated_at = NOW()
      WHERE user_id = p_user_id
        AND period_start <= NOW()
        AND period_end > NOW();

      v_changes_made := true;
    END IF;

    RETURN json_build_object(
      'success', true,
      'tier', 'free',
      'changes_made', v_changes_made,
      'old_quota_used', v_old_quota_used,
      'new_quota_used', v_user_record.free_simulations_used,
      'source_of_truth', 'users.free_simulations_used'
    );

  ELSE
    -- Paid tier: users.simulations_used_this_month is source
    IF v_quota_record.simulations_used != v_user_record.simulations_used_this_month THEN
      UPDATE user_simulation_quota
      SET simulations_used = v_user_record.simulations_used_this_month,
          updated_at = NOW()
      WHERE user_id = p_user_id
        AND period_start <= NOW()
        AND period_end > NOW();

      v_changes_made := true;
    END IF;

    RETURN json_build_object(
      'success', true,
      'tier', v_quota_record.subscription_tier,
      'changes_made', v_changes_made,
      'old_quota_used', v_old_quota_used,
      'new_quota_used', v_user_record.simulations_used_this_month,
      'source_of_truth', 'users.simulations_used_this_month'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reconcile_user_quota IS
'Manually reconcile a user''s quota counter by syncing from users table to user_simulation_quota table.
Use this if counters get out of sync due to bugs or manual updates.
Returns JSON with changes made.';

GRANT EXECUTE ON FUNCTION reconcile_user_quota TO service_role;

-- ============================================
-- STEP 5: One-time sync of existing data
-- ============================================

DO $$
DECLARE
  v_synced_count integer := 0;
  v_user_record record;
BEGIN
  RAISE NOTICE 'Starting one-time sync of existing quota data...';

  -- Sync all users with current period quotas
  FOR v_user_record IN
    SELECT
      u.id,
      u.simulations_used_this_month,
      u.free_simulations_used,
      q.subscription_tier,
      q.simulations_used as quota_used
    FROM users u
    JOIN user_simulation_quota q ON q.user_id = u.id
    WHERE q.period_start <= NOW()
      AND q.period_end > NOW()
  LOOP
    -- Determine which counter to use based on tier
    IF v_user_record.subscription_tier = 'free' THEN
      -- Free tier: sync from free_simulations_used
      IF v_user_record.quota_used != v_user_record.free_simulations_used THEN
        UPDATE user_simulation_quota
        SET simulations_used = v_user_record.free_simulations_used,
            updated_at = NOW()
        WHERE user_id = v_user_record.id
          AND period_start <= NOW()
          AND period_end > NOW();

        v_synced_count := v_synced_count + 1;

        RAISE NOTICE 'Synced user % (free tier): quota_used % → %',
          v_user_record.id, v_user_record.quota_used, v_user_record.free_simulations_used;
      END IF;
    ELSE
      -- Paid tier: sync from simulations_used_this_month
      IF v_user_record.quota_used != v_user_record.simulations_used_this_month THEN
        UPDATE user_simulation_quota
        SET simulations_used = v_user_record.simulations_used_this_month,
            updated_at = NOW()
        WHERE user_id = v_user_record.id
          AND period_start <= NOW()
          AND period_end > NOW();

        v_synced_count := v_synced_count + 1;

        RAISE NOTICE 'Synced user % (% tier): quota_used % → %',
          v_user_record.id, v_user_record.subscription_tier,
          v_user_record.quota_used, v_user_record.simulations_used_this_month;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Counter sync migration completed!';
  RAISE NOTICE 'Synced % user quota records', v_synced_count;
  RAISE NOTICE 'Triggers installed for automatic sync';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
