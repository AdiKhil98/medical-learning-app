-- This function allows executing SQL statements from the client
-- It's restricted to authenticated users with the 'admin' role for security
CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user has admin role
  IF (SELECT auth.jwt() ->> 'role') <> 'admin' THEN
    RAISE EXCEPTION 'Only admin users can execute arbitrary SQL';
  END IF;

  -- Execute the SQL query
  EXECUTE sql_query;
END;
$$;

-- This function checks if a table exists
CREATE OR REPLACE FUNCTION does_table_exist(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = $1
  );
END;
$$;