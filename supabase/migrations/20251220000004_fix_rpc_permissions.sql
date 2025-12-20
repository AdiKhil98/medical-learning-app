-- Migration: Fix RPC function permissions for anon/authenticated users
-- Date: 2025-12-20
-- Purpose: Allow browser (using anon key) to call mark_simulation_counted

-- Grant EXECUTE permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_simulation_counted(text, uuid) TO authenticated;

-- Grant EXECUTE permission to anon users (for unauthenticated calls, though we check auth inside)
GRANT EXECUTE ON FUNCTION mark_simulation_counted(text, uuid) TO anon;

-- Ensure the function is SECURITY DEFINER (runs with creator's privileges)
-- This is already set in the previous migration, but let's be explicit
ALTER FUNCTION mark_simulation_counted(text, uuid) SECURITY DEFINER;

COMMENT ON FUNCTION mark_simulation_counted IS
'FIXED: Grants execute permission to authenticated and anon roles.
Updates user_simulation_quota.simulations_used DIRECTLY (bypasses broken sync trigger).
Validates duration >= 295 seconds before marking.
Atomic operation prevents double-counting.';
