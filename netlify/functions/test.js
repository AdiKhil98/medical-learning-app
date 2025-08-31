// Simple test function to verify Netlify Functions are working
// URL: https://medical-learning-app.netlify.app/.netlify/functions/test
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight OK' }),
    };
  }

  // Return simple success response
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: '✅ Netlify Functions are working!',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      path: event.path,
      deployment: 'Netlify',
      functions_available: [
        'webhook-evaluation',
        'webhook',
        'test'
      ],
      webhook_url: 'https://medical-learning-app.netlify.app/api/webhook-evaluation'
    }),
  };
};