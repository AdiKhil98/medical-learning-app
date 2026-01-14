-- Migration: Fix users table subscription_tier constraint
-- Date: 2026-01-14
-- Purpose: Update the users table constraint to use English tier names
--          matching the rest of the system (free, basic, premium)
--
-- Background: The users table had an old constraint only allowing
-- ('basis', 'profi', 'unlimited') but the webhook and quota system
-- now use English names ('free', 'basic', 'premium').

-- ============================================
-- STEP 1: Migrate existing data to new tier names
-- ============================================

-- Update legacy German tier names to English
UPDATE users
SET subscription_tier = 'basic'
WHERE subscription_tier = 'basis';

UPDATE users
SET subscription_tier = 'premium'
WHERE subscription_tier = 'profi';

UPDATE users
SET subscription_tier = 'premium'
WHERE subscription_tier = 'unlimited';

-- ============================================
-- STEP 2: Drop the old constraint
-- ============================================

-- Find and drop the existing constraint
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find the constraint name (it might have different names)
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_name = 'users'
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%subscription_tier%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No subscription_tier constraint found on users table';
  END IF;
END $$;

-- ============================================
-- STEP 3: Add new constraint with correct tier names
-- ============================================

ALTER TABLE users
ADD CONSTRAINT users_subscription_tier_check
CHECK (subscription_tier IS NULL OR subscription_tier IN ('free', 'basic', 'premium'));

COMMENT ON CONSTRAINT users_subscription_tier_check ON users IS
'Valid subscription tiers: free, basic, premium (or NULL for no subscription)';

-- ============================================
-- STEP 4: Log migration completion
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'users.subscription_tier constraint updated to:';
  RAISE NOTICE '  - NULL (no subscription)';
  RAISE NOTICE '  - free (3 simulations/month)';
  RAISE NOTICE '  - basic (30 simulations/month)';
  RAISE NOTICE '  - premium (60 simulations/month)';
  RAISE NOTICE '========================================';
END $$;
