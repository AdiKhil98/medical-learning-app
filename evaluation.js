// Root level serverless function
export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'Webhook working',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method === 'POST') {
    const { user_id, evaluation_name, score } = req.body || {};
    
    return res.status(200).json({
      success: true,
      message: 'Data received',
      data: { user_id, evaluation_name, score }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}