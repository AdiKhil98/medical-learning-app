import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

    // Get Supabase configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Parse request body
    const { action, user_id, data } = await req.json();

    // Verify the requesting user has admin privileges
    // This is a simplified check - in production you might want more robust verification
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Check if user has admin role
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || userData?.role !== 'admin') {
      throw new Error('Admin privileges required');
    }

    let result;

    switch (action) {
      case 'make-user-admin':
        if (!user_id) {
          throw new Error('user_id is required');
        }

        // Update user role to admin
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'admin' })
          .eq('id', user_id);

        if (updateError) throw updateError;

        result = { message: 'User role updated to admin successfully' };
        break;

      case 'fix-user-profile':
        if (!user_id) {
          throw new Error('user_id is required');
        }

        // Check if user exists in users table
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user_id)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (!existingUser) {
          // Get user data from auth
          const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(user_id);
          
          if (authError) throw authError;

          // Create user profile
          const { error: insertError } = await supabase
            .from('users')
            .insert([
              {
                id: user_id,
                name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
                email: authUser.email,
                role: 'user',
                push_notifications_enabled: true,
                sound_vibration_enabled: true,
              }
            ]);

          if (insertError) throw insertError;
          result = { message: 'User profile created successfully' };
        } else {
          // Update missing notification settings
          const { error: updateError } = await supabase
            .from('users')
            .update({
              push_notifications_enabled: existingUser.push_notifications_enabled ?? true,
              sound_vibration_enabled: existingUser.sound_vibration_enabled ?? true,
            })
            .eq('id', user_id);

          if (updateError) throw updateError;
          result = { message: 'User profile updated successfully' };
        }
        break;

      case 'update-notification-settings':
        if (!user_id || !data) {
          throw new Error('user_id and data are required');
        }

        const { error: notificationError } = await supabase
          .from('users')
          .update({
            push_notifications_enabled: data.push_notifications_enabled,
            sound_vibration_enabled: data.sound_vibration_enabled,
            push_token: data.push_token
          })
          .eq('id', user_id);

        if (notificationError) throw notificationError;
        result = { message: 'Notification settings updated successfully' };
        break;

      case 'run-database-migration':
        // This is a placeholder for database migration operations
        // You would implement specific migration logic here
        result = { message: 'Database migration completed successfully' };
        break;

      default:
        throw new Error('Invalid action');
    }

    return new Response(JSON.stringify({
      success: true,
      ...result
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Admin User Management Error:', error);
    
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