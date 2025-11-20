-- Add Content Access Control Based on Subscription
-- Migration: 20241120_add_content_access_control
--
-- This migration adds subscription-based access control to the sections table
-- to ensure only users with appropriate subscription tiers can access premium content.

-- ============================================================================
-- 1. ADD REQUIRED_TIER COLUMN TO SECTIONS
-- ============================================================================

-- Add column to specify which subscription tier is required to access this section
ALTER TABLE sections
ADD COLUMN IF NOT EXISTS required_tier text
  CHECK (required_tier IN ('free', 'basis', 'profi', 'unlimited'))
  DEFAULT 'free';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sections_required_tier ON sections(required_tier);

-- Add helpful comment
COMMENT ON COLUMN sections.required_tier IS 'Minimum subscription tier required to access this section: free, basis, profi, or unlimited';

-- ============================================================================
-- 2. CREATE SUBSCRIPTION ACCESS CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_content_access(
  user_id_input UUID,
  section_slug_input TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_tier TEXT;
  v_user_status TEXT;
  v_section_required_tier TEXT;
  v_user_role TEXT;
  v_tier_hierarchy INT;
  v_required_hierarchy INT;
BEGIN
  -- Get user's subscription info and role
  SELECT
    COALESCE(subscription_tier, 'free'),
    COALESCE(subscription_status, 'inactive'),
    role
  INTO v_user_tier, v_user_status, v_user_role
  FROM users
  WHERE id = user_id_input;

  -- If user not found, deny access
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Admins have access to everything
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Get section's required tier
  SELECT COALESCE(required_tier, 'free')
  INTO v_section_required_tier
  FROM sections
  WHERE slug = section_slug_input;

  -- If section not found, deny access
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Free content is accessible to everyone
  IF v_section_required_tier = 'free' THEN
    RETURN true;
  END IF;

  -- For paid tiers, check subscription status is active
  IF v_user_status != 'active' THEN
    RETURN false;
  END IF;

  -- Define tier hierarchy (higher number = higher tier)
  v_tier_hierarchy := CASE v_user_tier
    WHEN 'free' THEN 0
    WHEN 'basis' THEN 1
    WHEN 'profi' THEN 2
    WHEN 'unlimited' THEN 3
    ELSE 0
  END;

  v_required_hierarchy := CASE v_section_required_tier
    WHEN 'free' THEN 0
    WHEN 'basis' THEN 1
    WHEN 'profi' THEN 2
    WHEN 'unlimited' THEN 3
    ELSE 0
  END;

  -- User has access if their tier is >= required tier
  RETURN v_tier_hierarchy >= v_required_hierarchy;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_content_access(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 3. CREATE HELPER FUNCTION TO CHECK USER'S OWN ACCESS
-- ============================================================================

CREATE OR REPLACE FUNCTION check_my_content_access(section_slug_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN check_content_access(auth.uid(), section_slug_input);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_my_content_access(TEXT) TO authenticated;

-- ============================================================================
-- 4. UPDATE RLS POLICIES WITH SUBSCRIPTION CHECKS
-- ============================================================================

-- Drop the old policy that allowed all authenticated users
DROP POLICY IF EXISTS "Authenticated users can read sections" ON sections;

-- Create new policy with subscription check
CREATE POLICY "Users can read sections based on subscription"
  ON sections
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can see everything
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR
    -- Free content is accessible to all
    COALESCE(required_tier, 'free') = 'free'
    OR
    -- For paid content, check subscription
    (
      SELECT
        subscription_status = 'active'
        AND
        CASE
          WHEN subscription_tier = 'unlimited' THEN true
          WHEN subscription_tier = 'profi' THEN sections.required_tier IN ('profi', 'basis', 'free')
          WHEN subscription_tier = 'basis' THEN sections.required_tier IN ('basis', 'free')
          ELSE sections.required_tier = 'free'
        END
      FROM users
      WHERE users.id = auth.uid()
    )
  );

-- Keep admin policies unchanged
-- (Admin insert, update, delete policies remain as they were)

-- ============================================================================
-- 5. CREATE FUNCTION TO GET USER'S ACCESSIBLE SECTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_accessible_sections()
RETURNS TABLE (
  id UUID,
  slug TEXT,
  title TEXT,
  parent_slug TEXT,
  description TEXT,
  type TEXT,
  icon TEXT,
  color TEXT,
  display_order INTEGER,
  image_url TEXT,
  category TEXT,
  required_tier TEXT,
  has_access BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_tier TEXT;
  v_user_status TEXT;
  v_user_role TEXT;
BEGIN
  v_user_id := auth.uid();

  -- Get user's subscription info
  SELECT
    COALESCE(subscription_tier, 'free'),
    COALESCE(subscription_status, 'inactive'),
    role
  INTO v_user_tier, v_user_status, v_user_role
  FROM users
  WHERE users.id = v_user_id;

  RETURN QUERY
  SELECT
    s.id,
    s.slug,
    s.title,
    s.parent_slug,
    s.description,
    s.type,
    s.icon,
    s.color,
    s.display_order,
    s.image_url,
    s.category,
    s.required_tier,
    -- Determine if user has access
    CASE
      WHEN v_user_role = 'admin' THEN true
      WHEN COALESCE(s.required_tier, 'free') = 'free' THEN true
      WHEN v_user_status != 'active' THEN false
      WHEN v_user_tier = 'unlimited' THEN true
      WHEN v_user_tier = 'profi' THEN s.required_tier IN ('profi', 'basis', 'free')
      WHEN v_user_tier = 'basis' THEN s.required_tier IN ('basis', 'free')
      ELSE false
    END AS has_access
  FROM sections s
  ORDER BY s.display_order, s.title;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_accessible_sections() TO authenticated;

-- ============================================================================
-- 6. MARK SOME CONTENT AS PREMIUM (EXAMPLE DATA)
-- ============================================================================

-- Mark advanced content as requiring higher tiers
-- This is just example data - adjust based on your content strategy

-- Free content (accessible to all) - keep most basic content free
UPDATE sections
SET required_tier = 'free'
WHERE required_tier IS NULL
  OR parent_slug IS NULL  -- Top-level categories remain free
  OR type = 'folder';      -- Folder navigation remains free

-- You can manually mark specific content as premium later:
-- UPDATE sections SET required_tier = 'basis' WHERE slug = 'advanced-cardiology';
-- UPDATE sections SET required_tier = 'profi' WHERE slug = 'specialist-content';
-- UPDATE sections SET required_tier = 'unlimited' WHERE slug = 'exclusive-content';

-- ============================================================================
-- 7. ADD AUDIT TRIGGER FOR ACCESS ATTEMPTS (OPTIONAL)
-- ============================================================================

-- Create table to log denied access attempts
CREATE TABLE IF NOT EXISTS content_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  section_slug TEXT,
  user_tier TEXT,
  required_tier TEXT,
  access_granted BOOLEAN,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE content_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view access logs
CREATE POLICY "Admins can view access logs" ON content_access_log
  FOR SELECT
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Create function to log access attempts
CREATE OR REPLACE FUNCTION log_content_access(
  section_slug_input TEXT,
  access_granted_input BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_tier TEXT;
  v_required_tier TEXT;
BEGIN
  -- Get user's tier
  SELECT COALESCE(subscription_tier, 'free')
  INTO v_user_tier
  FROM users
  WHERE id = auth.uid();

  -- Get section's required tier
  SELECT COALESCE(required_tier, 'free')
  INTO v_required_tier
  FROM sections
  WHERE slug = section_slug_input;

  -- Insert log entry
  INSERT INTO content_access_log (
    user_id,
    section_slug,
    user_tier,
    required_tier,
    access_granted
  ) VALUES (
    auth.uid(),
    section_slug_input,
    v_user_tier,
    v_required_tier,
    access_granted_input
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_content_access(TEXT, BOOLEAN) TO authenticated;

-- Create index for analytics
CREATE INDEX IF NOT EXISTS idx_content_access_log_user ON content_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_content_access_log_section ON content_access_log(section_slug);
CREATE INDEX IF NOT EXISTS idx_content_access_log_time ON content_access_log(attempted_at);

-- Add helpful comments
COMMENT ON TABLE content_access_log IS 'Logs content access attempts for analytics and security';
COMMENT ON FUNCTION check_content_access(UUID, TEXT) IS 'Checks if a user has access to a specific section based on their subscription tier';
COMMENT ON FUNCTION get_accessible_sections() IS 'Returns all sections with access information for the current user';

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- This migration adds:
-- 1. required_tier column to sections table
-- 2. check_content_access() function to verify subscription access
-- 3. Updated RLS policies to enforce subscription-based access
-- 4. get_accessible_sections() helper function for client queries
-- 5. Content access logging for analytics and security
--
-- Security improvements:
-- - Content now properly restricted by subscription tier
-- - Admins maintain full access
-- - Free content remains accessible to all
-- - Access attempts logged for audit purposes
