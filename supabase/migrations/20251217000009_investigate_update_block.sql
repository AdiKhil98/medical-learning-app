-- ============================================
-- INVESTIGATE WHY UPDATE ISN'T WORKING
-- Date: 2025-12-17
-- ============================================

-- Check for triggers on users table
SELECT
  'Triggers on users table' as check_type,
  t.tgname as trigger_name,
  p.proname as function_name,
  CASE t.tgtype::int & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as timing,
  CASE t.tgtype::int & 28
    WHEN 4 THEN 'INSERT'
    WHEN 8 THEN 'DELETE'
    WHEN 16 THEN 'UPDATE'
    WHEN 20 THEN 'INSERT OR UPDATE'
    WHEN 24 THEN 'DELETE OR UPDATE'
    WHEN 28 THEN 'INSERT OR DELETE OR UPDATE'
  END as event
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'users'::regclass
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Check RLS policies on users table
SELECT
  'RLS policies on users table' as check_type,
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- Try to see the actual update permission
SELECT
  'Current user permissions' as check_type,
  has_table_privilege('users', 'UPDATE') as can_update_users,
  has_table_privilege('users', 'SELECT') as can_select_users;
