// Simple debug webhook to test basic functionality
const { createClient } = require('@supabase/supabase-js');

// Test Supabase connection
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  console.log('Debug webhook called:', event.httpMethod);

  try {
    // Test Supabase connection
    const { data, error } = await supabase
      .from('webhook_events')
      .insert({
        event_type: 'debug_test',
        event_data: { test: 'simple debug webhook' },
        status: 'processed'
      });

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Supabase failed',
          details: error.message
        })
      };
    }

    // Test user lookup
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'kheadi10@gmail.com')
      .single();

    if (userError) {
      console.error('User lookup error:', userError);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Webhook events insert worked, but user lookup failed',
          userError: userError.message
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Everything works!',
        user: { id: user.id, email: user.email }
      })
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Webhook failed',
        message: error.message
      })
    };
  }
};