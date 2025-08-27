// Root level serverless function for Make.com webhook
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  console.log('Method:', req.method);
  console.log('Body:', req.body);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'Evaluation webhook is working',
      endpoint: '/evaluation',
      timestamp: new Date().toISOString(),
      expected_fields: ['user_id', 'exam_type', 'evaluation']
    });
  }

  if (req.method === 'POST') {
    try {
      const data = req.body || {};
      console.log('Received webhook data:', JSON.stringify(data, null, 2));
      
      // Extract the relevant fields from Make.com data
      const {
        user_id,
        session_id,
        exam_type,
        evaluation_type,
        evaluation,
        status
      } = data;

      // For now, just return success - we'll add Supabase integration next
      return res.status(200).json({
        success: true,
        message: 'Evaluation webhook received successfully',
        received_data: {
          user_id,
          session_id,
          exam_type,
          evaluation_type,
          evaluation_preview: evaluation ? evaluation.substring(0, 100) + '...' : 'No evaluation',
          status
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

  return res.status(405).json({ error: 'Method not allowed' });
}