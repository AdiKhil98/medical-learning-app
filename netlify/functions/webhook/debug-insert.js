const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  console.log('Debug insert webhook called');

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Try to insert a test event
    const { data, error } = await supabase
      .from('webhook_events')
      .insert({
        event_type: 'debug_test',
        event_data: { test: 'debug insert test' },
        subscription_id: 'debug-sub-123',
        user_id: null,
        status: 'processed',
        error_message: null
      })
      .select();

    if (error) {
      console.error('Insert error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Failed to insert',
          details: error
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Debug insert successful',
        data: data,
        environment: {
          hasSupabaseUrl: !!process.env.SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          supabaseUrlPreview: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 20) + '...' : 'NOT SET'
        }
      })
    };

  } catch (error) {
    console.error('Debug insert error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Exception occurred',
        message: error.message
      })
    };
  }
};