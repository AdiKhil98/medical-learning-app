-- Migration: Fix user_simulation_quota to sync with users table trial status
-- Issue: users table has trial data but user_simulation_quota still has old 'free' tier

-- Step 1: Update user_simulation_quota for users who are on trial
-- Set subscription_tier to 'trial' and total_simulations to -1 (unlimited)
UPDATE user_simulation_quota usq
SET
    subscription_tier = 'trial',
    total_simulations = -1,
    updated_at = NOW()
FROM users u
WHERE usq.user_id = u.id
    AND u.subscription_tier = 'trial'
    AND u.subscription_status = 'on_trial'
    AND u.trial_expires_at > NOW()
    AND usq.subscription_tier = 'free';

-- Step 2: Update user_simulation_quota for users whose trial has expired
-- Set subscription_tier to 'expired_trial' and total_simulations to 0
UPDATE user_simulation_quota usq
SET
    subscription_tier = 'expired_trial',
    total_simulations = 0,
    updated_at = NOW()
FROM users u
WHERE usq.user_id = u.id
    AND u.subscription_tier = 'trial'
    AND (u.trial_expires_at <= NOW() OR u.subscription_status = 'expired')
    AND usq.subscription_tier = 'free';

-- Step 3: Create or replace trigger to keep tables in sync going forward
CREATE OR REPLACE FUNCTION sync_quota_with_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- When users table is updated, sync the quota table
    IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.trial_expires_at IS DISTINCT FROM OLD.trial_expires_at THEN

        -- Determine the new quota based on subscription
        IF NEW.subscription_tier IN ('monthly', 'quarterly', 'basic', 'premium')
           AND NEW.subscription_status IN ('active', 'past_due') THEN
            -- Paid subscriber: unlimited simulations
            UPDATE user_simulation_quota
            SET subscription_tier = NEW.subscription_tier,
                total_simulations = -1,
                updated_at = NOW()
            WHERE user_id = NEW.id;

        ELSIF NEW.subscription_tier = 'trial'
              AND NEW.subscription_status = 'on_trial'
              AND NEW.trial_expires_at > NOW() THEN
            -- Active trial: unlimited simulations
            UPDATE user_simulation_quota
            SET subscription_tier = 'trial',
                total_simulations = -1,
                updated_at = NOW()
            WHERE user_id = NEW.id;

        ELSIF NEW.trial_expires_at <= NOW() OR NEW.subscription_status = 'expired' THEN
            -- Expired trial: no simulations
            UPDATE user_simulation_quota
            SET subscription_tier = 'expired_trial',
                total_simulations = 0,
                updated_at = NOW()
            WHERE user_id = NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_quota_on_user_update ON users;

-- Create the sync trigger
CREATE TRIGGER sync_quota_on_user_update
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_quota_with_user_subscription();

-- Step 4: Update the can_start_simulation function to check users table directly
CREATE OR REPLACE FUNCTION can_start_simulation(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user_record RECORD;
    v_simulations_used INTEGER;
    v_result JSON;
BEGIN
    -- Get user data including trial info
    SELECT
        subscription_tier,
        subscription_status,
        trial_expires_at,
        trial_started_at
    INTO v_user_record
    FROM users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'can_start', false,
            'reason', 'user_not_found',
            'message', 'User not found'
        );
    END IF;

    -- Check if user is a paid subscriber (always allowed)
    IF v_user_record.subscription_tier IN ('monthly', 'quarterly', 'basic', 'premium')
       AND v_user_record.subscription_status IN ('active', 'past_due') THEN
        RETURN json_build_object(
            'can_start', true,
            'reason', 'paid_subscriber',
            'subscription_tier', v_user_record.subscription_tier
        );
    END IF;

    -- Check if user has active trial
    IF v_user_record.subscription_tier = 'trial'
       AND v_user_record.subscription_status = 'on_trial'
       AND v_user_record.trial_expires_at > NOW() THEN
        RETURN json_build_object(
            'can_start', true,
            'reason', 'trial_active',
            'trial_expires_at', v_user_record.trial_expires_at,
            'days_remaining', CEIL(EXTRACT(EPOCH FROM (v_user_record.trial_expires_at - NOW())) / 86400)
        );
    END IF;

    -- Trial expired or no subscription
    RETURN json_build_object(
        'can_start', false,
        'reason', 'trial_expired',
        'message', 'Your trial has expired. Please subscribe to continue.',
        'trial_expired_at', v_user_record.trial_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the updates
DO $$
DECLARE
    trial_count INTEGER;
    expired_count INTEGER;
    paid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trial_count
    FROM user_simulation_quota
    WHERE subscription_tier = 'trial';

    SELECT COUNT(*) INTO expired_count
    FROM user_simulation_quota
    WHERE subscription_tier = 'expired_trial';

    SELECT COUNT(*) INTO paid_count
    FROM user_simulation_quota
    WHERE subscription_tier IN ('monthly', 'quarterly', 'basic', 'premium');

    RAISE NOTICE 'Migration complete:';
    RAISE NOTICE '  - Trial users in quota table: %', trial_count;
    RAISE NOTICE '  - Expired trial users: %', expired_count;
    RAISE NOTICE '  - Paid subscribers: %', paid_count;
END $$;
