-- Migration: Fix NULL simulation_limit for active subscriptions
-- This prevents the "4/30 but blocked" bug

-- Step 1: Create function to validate and fix user data
CREATE OR REPLACE FUNCTION validate_and_fix_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Fix NULL limit for active paid subscriptions
  IF NEW.subscription_tier IS NOT NULL
     AND NEW.subscription_status = 'active'
     AND NEW.simulation_limit IS NULL THEN

    -- Set appropriate limit based on tier
    NEW.simulation_limit := CASE
      WHEN NEW.subscription_tier = 'basis' THEN 30
      WHEN NEW.subscription_tier = 'profi' THEN 60
      WHEN NEW.subscription_tier = 'unlimited' THEN 999999
      WHEN NEW.subscription_tier LIKE 'custom_%' THEN
        CAST(SUBSTRING(NEW.subscription_tier FROM 'custom_(.*)') AS INTEGER)
      ELSE 30  -- Default fallback
    END;

    RAISE NOTICE 'Auto-fixed NULL limit for user % (%): Set to %',
      NEW.email, NEW.subscription_tier, NEW.simulation_limit;
  END IF;

  -- Cap used count at limit if it exceeds (data corruption prevention)
  IF NEW.simulation_limit IS NOT NULL
     AND NEW.simulations_used_this_month > NEW.simulation_limit THEN

    RAISE WARNING 'User % has used (%s) > limit (%s), capping at limit',
      NEW.email, NEW.simulations_used_this_month, NEW.simulation_limit;

    NEW.simulations_used_this_month := NEW.simulation_limit;
  END IF;

  -- Ensure non-negative counters
  IF NEW.simulations_used_this_month < 0 THEN
    NEW.simulations_used_this_month := 0;
  END IF;

  IF NEW.free_simulations_used < 0 THEN
    NEW.free_simulations_used := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger to auto-fix on INSERT/UPDATE
DROP TRIGGER IF EXISTS validate_user_data_trigger ON users;

CREATE TRIGGER validate_user_data_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_and_fix_user_data();

-- Step 3: Fix existing data (one-time)
UPDATE users
SET
  simulation_limit = CASE
    WHEN subscription_tier = 'basis' THEN 30
    WHEN subscription_tier = 'profi' THEN 60
    WHEN subscription_tier = 'unlimited' THEN 999999
    WHEN subscription_tier LIKE 'custom_%' THEN
      CAST(SUBSTRING(subscription_tier FROM 'custom_(.*)') AS INTEGER)
    ELSE simulation_limit
  END,
  simulations_used_this_month = LEAST(
    simulations_used_this_month,
    COALESCE(simulation_limit, 999999)
  )
WHERE subscription_status = 'active'
  AND subscription_tier IS NOT NULL
  AND (
    simulation_limit IS NULL
    OR simulations_used_this_month > simulation_limit
  );

-- Step 4: Add helpful view for debugging
CREATE OR REPLACE VIEW user_simulation_status AS
SELECT
  id,
  email,
  subscription_tier,
  subscription_status,
  simulation_limit,
  simulations_used_this_month,
  free_simulations_used,

  -- Calculate which counter to use
  CASE
    WHEN subscription_tier IS NULL OR subscription_status != 'active' THEN 'free_simulations_used'
    ELSE 'simulations_used_this_month'
  END as active_counter,

  -- Calculate remaining
  CASE
    WHEN subscription_tier IS NULL OR subscription_status != 'active' THEN
      3 - COALESCE(free_simulations_used, 0)
    WHEN subscription_tier = 'unlimited' THEN
      999999
    ELSE
      COALESCE(simulation_limit, 0) - COALESCE(simulations_used_this_month, 0)
  END as remaining_simulations,

  -- Can start?
  CASE
    WHEN subscription_tier IS NULL OR subscription_status != 'active' THEN
      (3 - COALESCE(free_simulations_used, 0)) > 0
    WHEN subscription_tier = 'unlimited' THEN
      true
    ELSE
      (COALESCE(simulation_limit, 0) - COALESCE(simulations_used_this_month, 0)) > 0
  END as can_start_simulation

FROM users;

-- Grant access to the view
GRANT SELECT ON user_simulation_status TO authenticated;

COMMENT ON VIEW user_simulation_status IS 'Diagnostic view showing calculated simulation status for all users';
