-- Add 'incomplete' status to simulation_usage_logs status constraint

-- Drop existing constraint if it exists and recreate with new status
DO $$ 
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'simulation_usage_logs_status_check'
  ) THEN
    ALTER TABLE simulation_usage_logs DROP CONSTRAINT simulation_usage_logs_status_check;
  END IF;

  -- Add new constraint with 'incomplete' status
  ALTER TABLE simulation_usage_logs 
  ADD CONSTRAINT simulation_usage_logs_status_check 
  CHECK (status IN ('started', 'in_progress', 'used', 'completed', 'aborted', 'expired', 'incomplete'));

EXCEPTION
  WHEN OTHERS THEN
    -- If constraint doesn't exist or any other error, just add the new constraint
    BEGIN
      ALTER TABLE simulation_usage_logs 
      ADD CONSTRAINT simulation_usage_logs_status_check 
      CHECK (status IN ('started', 'in_progress', 'used', 'completed', 'aborted', 'expired', 'incomplete'));
    EXCEPTION
      WHEN duplicate_object THEN
        -- Constraint already exists with correct values, do nothing
        NULL;
    END;
END $$;

COMMIT;