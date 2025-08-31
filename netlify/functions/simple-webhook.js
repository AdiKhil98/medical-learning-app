const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '{}' };
  }

  // Handle GET
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'Simple Netlify webhook is working',
        timestamp: new Date().toISOString(),
        supabase_configured: !!(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
      })
    };
  }

  // Handle POST
  if (event.httpMethod === 'POST') {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Environment variables not configured'
          })
        };
      }

      const data = JSON.parse(event.body || '{}');
      
      // Basic validation
      if (!data.user_id || !data.session_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'user_id and session_id required'
          })
        };
      }

      // Connect to Supabase
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data: result, error } = await supabase
        .from('evaluation_scores')
        .insert({
          user_id: data.user_id,
          session_id: data.session_id,
          exam_type: data.exam_type || 'KP',
          conversation_type: data.conversation_type || 'patient',
          score: data.score || 0,
          evaluation: data.evaluation || 'Test evaluation',
          evaluation_timestamp: new Date().toISOString(),
          webhook_source: 'netlify-simple'
        })
        .select()
        .single();

      if (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: error.message
          })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          evaluation_id: result.id,
          message: 'Simple webhook working!'
        })
      };

    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message
        })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};