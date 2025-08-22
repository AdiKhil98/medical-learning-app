// Public webhook endpoint - NO AUTHENTICATION REQUIRED
export default async function handler(req, res) {
  // Set CORS headers for external access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');

  console.log('Webhook called:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET - simple status check
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'PUBLIC webhook endpoint is working',
      timestamp: new Date().toISOString(),
      endpoint: '/webhook',
      access: 'PUBLIC - No authentication required',
      supported_methods: ['GET', 'POST']
    });
  }

  // Handle POST - process evaluation data
  if (req.method === 'POST') {
    try {
      console.log('Processing POST request...');
      const data = req.body || {};
      
      console.log('Webhook data received:', {
        user_id: data.user_id,
        exam_type: data.exam_type,
        evaluation_type: data.evaluation_type,
        has_evaluation: !!data.evaluation,
        status: data.status
      });

      // Simple success response for now
      return res.status(200).json({
        success: true,
        message: 'Evaluation webhook processed successfully',
        timestamp: new Date().toISOString(),
        processed_data: {
          user_id: data.user_id,
          exam_type: data.exam_type,
          evaluation_type: data.evaluation_type,
          status: data.status,
          evaluation_length: data.evaluation ? data.evaluation.length : 0
        }
      });

    } catch (error) {
      console.error('Webhook processing error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Handle any other method
  return res.status(405).json({
    error: 'Method not allowed',
    allowed_methods: ['GET', 'POST', 'OPTIONS']
  });
}