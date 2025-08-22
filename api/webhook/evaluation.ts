import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Evaluation webhook endpoint is running',
      endpoint: '/api/webhook/evaluation',
      method: 'POST',
      required_fields: ['user_id', 'evaluation_name', 'score']
    });
  }

  if (req.method === 'POST') {
    try {
      const { user_id, evaluation_name, score } = req.body;
      
      // Validate required fields
      if (!user_id || !evaluation_name || !score) {
        return res.status(400).json({
          error: 'Missing required fields: user_id, evaluation_name, score'
        });
      }
      
      // Insert evaluation into database
      const { data, error } = await supabase
        .from('user_evaluations')
        .insert([
          {
            user_id,
            evaluation_name,
            score
          }
        ])
        .select();
      
      if (error) {
        console.error('Error inserting evaluation:', error);
        return res.status(500).json({
          error: 'Database error',
          details: error.message
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Evaluation saved successfully',
        data: data[0]
      });
      
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}