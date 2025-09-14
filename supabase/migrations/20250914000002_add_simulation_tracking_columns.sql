-- Add columns to existing simulation_usage_logs table for tracking
-- This extends the existing table structure

-- First, create the table if it doesn't exist (based on existing usage in useSubscription.ts)
CREATE TABLE IF NOT EXISTS simulation_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid, -- Optional, for subscription tracking
  simulation_type text NOT NULL CHECK (simulation_type IN ('kp', 'fsp')),
  status text DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'used', 'completed', 'aborted', 'expired')),
  billing_period_start timestamptz,
  billing_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns for session tracking if they don't exist
DO $$ 
BEGIN
  -- Add session_token column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'simulation_usage_logs' AND column_name = 'session_token') THEN
    ALTER TABLE simulation_usage_logs ADD COLUMN session_token text UNIQUE;
  END IF;

  -- Add started_at column  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'simulation_usage_logs' AND column_name = 'started_at') THEN
    ALTER TABLE simulation_usage_logs ADD COLUMN started_at timestamptz DEFAULT now();
  END IF;

  -- Add marked_used_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'simulation_usage_logs' AND column_name = 'marked_used_at') THEN
    ALTER TABLE simulation_usage_logs ADD COLUMN marked_used_at timestamptz;
  END IF;

  -- Add completed_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'simulation_usage_logs' AND column_name = 'completed_at') THEN
    ALTER TABLE simulation_usage_logs ADD COLUMN completed_at timestamptz;
  END IF;

  -- Add duration_seconds column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'simulation_usage_logs' AND column_name = 'duration_seconds') THEN
    ALTER TABLE simulation_usage_logs ADD COLUMN duration_seconds integer;
  END IF;
END $$;

-- Enable Row Level Security if not already enabled
ALTER TABLE simulation_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$ 
BEGIN
  -- Policy for users to view their own logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simulation_usage_logs' AND policyname = 'Users can view their own simulation logs') THEN
    CREATE POLICY "Users can view their own simulation logs"
      ON simulation_usage_logs
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Policy for users to create their own logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simulation_usage_logs' AND policyname = 'Users can create their own simulation logs') THEN
    CREATE POLICY "Users can create their own simulation logs"
      ON simulation_usage_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for users to update their own logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simulation_usage_logs' AND policyname = 'Users can update their own simulation logs') THEN
    CREATE POLICY "Users can update their own simulation logs"
      ON simulation_usage_logs
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_simulation_usage_logs_user_id ON simulation_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_simulation_usage_logs_session_token ON simulation_usage_logs(session_token);
CREATE INDEX IF NOT EXISTS idx_simulation_usage_logs_status ON simulation_usage_logs(status);
CREATE INDEX IF NOT EXISTS idx_simulation_usage_logs_started_at ON simulation_usage_logs(started_at DESC);

COMMIT;