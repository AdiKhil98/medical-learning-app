// Simple Vercel API function for webhook
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'Webhook endpoint is active and working',
      timestamp: new Date().toISOString(),
      method: 'GET',
      required_fields: ['user_id', 'evaluation_name', 'score']
    });
  }
  
  if (req.method === 'POST') {
    try {
      const data = req.body;
      console.log('Webhook received data:', data);
      
      // Validate required fields
      if (!data.user_id || !data.evaluation_name || !data.score) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: user_id, evaluation_name, score'
        });
      }
      
      // For now, just return success (we'll add Supabase integration later)
      return res.status(200).json({ 
        success: true,
        message: 'Evaluation data received successfully',
        received_data: {
          user_id: data.user_id,
          evaluation_name: data.evaluation_name,
          score: data.score
        },
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
  
  return res.status(405).json({ 
    success: false,
    error: 'Method not allowed' 
  });
}