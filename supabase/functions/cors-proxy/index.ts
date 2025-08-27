import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Get Supabase configuration from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Parse the request
    const url = new URL(req.url);
    const path = url.pathname.replace('/functions/v1/cors-proxy', '');
    const method = req.method;

    // Get authorization header from the request
    const authHeader = req.headers.get('Authorization');
    
    let response;
    let data;

    // Handle different API endpoints
    if (path.startsWith('/auth/')) {
      // Handle authentication requests
      if (path === '/auth/sign-in' && method === 'POST') {
        const body = await req.json();
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: body.email,
          password: body.password,
        });
        
        if (error) throw error;
        data = authData;
      } else if (path === '/auth/sign-up' && method === 'POST') {
        const body = await req.json();
        const { data: authData, error } = await supabase.auth.signUp({
          email: body.email,
          password: body.password,
          options: { data: body.options?.data }
        });
        
        if (error) throw error;
        data = authData;
      } else if (path === '/auth/sign-out' && method === 'POST') {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        data = { message: 'Signed out successfully' };
      }
    } else if (path.startsWith('/rest/v1/')) {
      // Handle database requests
      const tablePath = path.replace('/rest/v1/', '');
      const queryParams = url.searchParams;
      
      // Set auth header if provided
      if (authHeader) {
        supabase.auth.setAuth(authHeader.replace('Bearer ', ''));
      }

      if (method === 'GET') {
        let query = supabase.from(tablePath).select('*');
        
        // Apply query parameters
        for (const [key, value] of queryParams.entries()) {
          if (key === 'select') {
            query = supabase.from(tablePath).select(value);
          } else if (key.startsWith('eq.')) {
            const column = key.replace('eq.', '');
            query = query.eq(column, value);
          }
        }
        
        const { data: queryData, error } = await query;
        if (error) throw error;
        data = queryData;
      } else if (method === 'POST') {
        const body = await req.json();
        const { data: insertData, error } = await supabase
          .from(tablePath)
          .insert(body);
        
        if (error) throw error;
        data = insertData;
      } else if (method === 'PUT' || method === 'PATCH') {
        const body = await req.json();
        const { data: updateData, error } = await supabase
          .from(tablePath)
          .update(body);
        
        if (error) throw error;
        data = updateData;
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('CORS Proxy Error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});