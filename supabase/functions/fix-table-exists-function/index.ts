import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Read environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create a Supabase client with the service role key for admin privileges
const createClient = async (key: string) => {
  const { createClient } = await import('npm:@supabase/supabase-js@2.38.4');
  return createClient(supabaseUrl, key);
};

// This function handles requests to fix the does_table_exist function
serve(async (req) => {
  try {
    // Check method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse the request body
    const { action } = await req.json();

    if (action !== 'fix') {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create Supabase client with service role key
    const supabase = await createClient(supabaseServiceRoleKey);

    // Execute SQL to fix the function
    const sql = `
    -- Drop the old (broken) function
    DROP FUNCTION IF EXISTS public.does_table_exist(text);

    -- Re-create it with an unambiguous parameter name
    CREATE OR REPLACE FUNCTION public.does_table_exist(_table_name text)
    RETURNS boolean
    LANGUAGE sql
    AS $$
      SELECT EXISTS (
        SELECT 1
          FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name   = _table_name
      );
    $$;`;

    // Use PostgreSQL function
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: sql
    });

    if (error) {
      console.error('Error executing SQL:', error);
      
      // Try using direct query with service role (more privileged)
      try {
        const { error: directError } = await supabase.sql(sql);
        if (directError) {
          throw directError;
        }
        return new Response(JSON.stringify({ success: true, message: 'Function fixed using direct SQL' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (directErr: any) {
        return new Response(JSON.stringify({ 
          error: 'Function fix failed', 
          message: error.message, 
          direct_error: directErr.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Function fixed successfully' }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error in edge function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});