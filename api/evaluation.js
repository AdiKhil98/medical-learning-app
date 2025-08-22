// Simple Vercel API function for webhook
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  console.log('Request method:', req.method);
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Accept both GET and POST
  if (req.method === 'GET' || req.method === 'POST') {
    
    if (req.method === 'GET') {
      return res.status(200).json({ 
        status: 'Webhook endpoint is active and working',
        timestamp: new Date().toISOString(),
        method: req.method,
        supported_methods: ['GET', 'POST'],
        required_fields: ['user_id', 'evaluation_name', 'score']
      });
    }
    
    // Handle POST
    try {
      const data = req.body || {};
      console.log('Processing POST data:', data);
      
      // Return success even with missing fields for testing
      return res.status(200).json({ 
        success: true,
        message: 'Webhook received data successfully',
        method: req.method,
        received_data: data,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        details: error.message
      });
    }
  }
  
  // Log unsupported method
  console.log('Unsupported method:', req.method);
  return res.status(200).json({ 
    message: 'Webhook endpoint reached',
    method: req.method,
    supported_methods: ['GET', 'POST'],
    timestamp: new Date().toISOString()
  });
}