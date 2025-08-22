-- Fix the ambiguous column reference by renaming the parameter
CREATE OR REPLACE FUNCTION does_table_exist(_table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = _table_name
    AND table_schema = 'public'
  );
END;
$$;

-- The issue was that 'table_name' exists both as a parameter name and as a column
-- in information_schema.tables, causing the ambiguity.
-- This fix renames the parameter to '_table_name' to avoid the conflict.