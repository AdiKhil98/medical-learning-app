-- ============================================
-- Add Profile Preferences to Users Table (FIXED)
-- Migration: 20251212123810_add_profile_preferences_fixed
-- Description: Adds columns for weekly profile edit limit and font size preference
-- Handles case where constraint might already exist
-- ============================================

-- Step 1: Add last_profile_update column for weekly edit limit tracking
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_profile_update timestamptz;

-- Step 2: Add font_size_preference column with default
ALTER TABLE users
ADD COLUMN IF NOT EXISTS font_size_preference text DEFAULT 'Mittel';

-- Step 3: Ensure all existing users have font size preference set
UPDATE users
SET font_size_preference = 'Mittel'
WHERE font_size_preference IS NULL;

-- Step 4: Make font_size_preference NOT NULL (safe after update)
-- Only if the column exists and is nullable
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'font_size_preference' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE users ALTER COLUMN font_size_preference SET NOT NULL;
    END IF;
END $$;

-- Step 5: Add CHECK constraint for data integrity (drop first if exists)
-- Only allow Klein, Mittel, or Groß as values
ALTER TABLE users
DROP CONSTRAINT IF EXISTS font_size_preference_check;

ALTER TABLE users
ADD CONSTRAINT font_size_preference_check
CHECK (font_size_preference IN ('Klein', 'Mittel', 'Groß'));

-- Step 6: Add helpful comments for documentation
COMMENT ON COLUMN users.last_profile_update IS 'Timestamp of last profile data update - used for weekly edit limit (NULL = never updated, can edit)';
COMMENT ON COLUMN users.font_size_preference IS 'User font size preference: Klein (small), Mittel (medium), or Groß (large)';

-- ============================================
-- Migration Complete
-- ============================================
