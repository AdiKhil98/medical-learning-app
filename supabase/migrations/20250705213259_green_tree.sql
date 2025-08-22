/*
  # Add notification settings to users table

  1. New Columns
    - `push_notifications_enabled` (boolean) - Controls push notification preferences
    - `sound_vibration_enabled` (boolean) - Controls sound and vibration preferences
    - `push_token` (text) - Stores push notification token

  2. Updates
    - Add default values for existing users
    - Update RLS policies to allow users to update their own notification settings
*/

-- Add notification settings columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'push_notifications_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN push_notifications_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sound_vibration_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN sound_vibration_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'push_token'
  ) THEN
    ALTER TABLE users ADD COLUMN push_token TEXT;
  END IF;
END $$;

-- Update existing users with default values
UPDATE users 
SET 
  push_notifications_enabled = COALESCE(push_notifications_enabled, true),
  sound_vibration_enabled = COALESCE(sound_vibration_enabled, true)
WHERE push_notifications_enabled IS NULL OR sound_vibration_enabled IS NULL;

-- Ensure users can update their own notification settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can update their own notification settings'
  ) THEN
    CREATE POLICY "Users can update their own notification settings"
      ON users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;