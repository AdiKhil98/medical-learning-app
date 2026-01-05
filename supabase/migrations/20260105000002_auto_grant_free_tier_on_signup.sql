-- Auto-grant free tier quota when new user signs up
-- This trigger automatically gives users 3 free simulations upon registration

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically create free tier quota for new user
  PERFORM create_free_tier_quota(NEW.id);

  RAISE NOTICE 'Auto-granted free tier quota to new user: %', NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after user insert
DROP TRIGGER IF EXISTS auto_grant_free_tier_on_signup ON public.users;

CREATE TRIGGER auto_grant_free_tier_on_signup
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_signup();

-- Add comment
COMMENT ON FUNCTION handle_new_user_signup IS 'Automatically grants free tier quota (3 simulations) to newly registered users';
COMMENT ON TRIGGER auto_grant_free_tier_on_signup ON public.users IS 'Auto-grants free tier quota when new user signs up';

-- Test: Check if trigger exists
SELECT
  '✅ Trigger created successfully' as status,
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgname = 'auto_grant_free_tier_on_signup';
