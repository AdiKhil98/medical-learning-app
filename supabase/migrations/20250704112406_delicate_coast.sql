/*
  # Add notification settings to users table

  1. New Columns
    - `push_notifications_enabled` (boolean) - Controls push notification preferences
    - `sound_vibration_enabled` (boolean) - Controls sound and vibration preferences

  2. Updates
    - Add default values for existing users
    - Update RLS policies to allow users to update their own notification settings
*/

-- Add notification settings columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_vibration_enabled BOOLEAN DEFAULT true;

-- Update existing users with default values
UPDATE users 
SET 
  push_notifications_enabled = true,
  sound_vibration_enabled = true
WHERE push_notifications_enabled IS NULL OR sound_vibration_enabled IS NULL;

-- Ensure users can update their own notification settings
CREATE POLICY IF NOT EXISTS "Users can update their own notification settings"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);