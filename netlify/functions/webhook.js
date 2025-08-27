// Netlify serverless function for webhook
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Handle GET - status check
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'Netlify webhook endpoint is working',
        timestamp: new Date().toISOString(),
        domain: 'kpmeds.de',
        endpoint: '/.netlify/functions/webhook'
      })
    };
  }

  // Handle POST - process webhook data
  if (event.httpMethod === 'POST') {
    try {
      console.log('Netlify webhook received:', event.body);
      
      const data = JSON.parse(event.body || '{}');
      
      // Extract evaluation data
      const {
        user_id,
        session_id,
        exam_type,
        evaluation_type,
        evaluation,
        status
      } = data;

      console.log('Processing evaluation:', {
        user_id,
        exam_type,
        evaluation_type,
        status,
        evaluation_length: evaluation ? evaluation.length : 0
      });

      // TODO: Add Supabase integration here later
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Evaluation received successfully on Netlify',
          timestamp: new Date().toISOString(),
          processed_data: {
            user_id,
            exam_type,
            evaluation_type,
            status,
            evaluation_preview: evaluation ? evaluation.substring(0, 100) + '...' : null
          }
        })
      };

    } catch (error) {
      console.error('Netlify webhook error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Internal server error',
          message: error.message
        })
      };
    }
  }

  // Method not allowed
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({
      error: 'Method not allowed',
      allowed_methods: ['GET', 'POST']
    })
  };
};