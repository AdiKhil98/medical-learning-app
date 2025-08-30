// Netlify Function for Make.com webhook evaluation integration
// URL: https://medical-learning-app.netlify.app/.netlify/functions/webhook-evaluation

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pavjavrijaihnwbydfrk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdmphdnJpamFpaG53YnlkZnJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE0Mzg2NiwiZXhwIjoyMDYwNzE5ODY2fQ.Kqmk5QEaUzUFjOPn42x1DV2PbZmUwi_AYbLvFh3_Lmc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers for Make.com requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '3600',
};

// Validation helper
function validateEvaluationData(data) {
  const errors = [];
  
  // Required fields
  if (!data.user_id || typeof data.user_id !== 'string') {
    errors.push('user_id is required and must be a string');
  }
  
  if (!data.session_id || typeof data.session_id !== 'string') {
    errors.push('session_id is required and must be a string');
  }
  
  if (!data.exam_type || !['KP', 'FSP'].includes(data.exam_type)) {
    errors.push('exam_type is required and must be "KP" or "FSP"');
  }
  
  if (!data.conversation_type || !['patient', 'examiner'].includes(data.conversation_type)) {
    errors.push('conversation_type is required and must be "patient" or "examiner"');
  }
  
  // Score validation - accept both number and string formats
  let score = data.score;
  if (typeof score === 'string') {
    // Try to extract number from string like "85/100" or "85%"
    const numMatch = score.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      score = parseFloat(numMatch[1]);
    } else {
      errors.push('score must be a valid number or contain a number');
    }
  }
  
  if (typeof score !== 'number' || score < 0 || score > 100) {
    errors.push('score must be a number between 0 and 100');
  }
  
  if (!data.evaluation || typeof data.evaluation !== 'string') {
    errors.push('evaluation is required and must be a string');
  }
  
  return { errors, processedScore: score };
}

// Store evaluation in Supabase
async function storeEvaluation(data, processedScore) {
  try {
    const evaluationData = {
      user_id: data.user_id,
      session_id: data.session_id,
      exam_type: data.exam_type,
      conversation_type: data.conversation_type,
      score: processedScore,
      evaluation: data.evaluation,
      evaluation_timestamp: data.timestamp || new Date().toISOString(),
      webhook_source: 'make.com',
      raw_data: data
    };

    const { data: result, error } = await supabase
      .from('evaluation_scores')
      .insert(evaluationData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insertion error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('Evaluation stored successfully:', result.id);
    return result;

  } catch (error) {
    console.error('Error storing evaluation:', error);
    throw error;
  }
}

// Response helper
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  };
}

// Main Netlify Function handler
exports.handler = async (event, context) => {
  console.log('Webhook called:', {
    httpMethod: event.httpMethod,
    path: event.path,
    timestamp: new Date().toISOString()
  });

  // Handle OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, { message: 'CORS preflight OK' });
  }

  // Handle GET (status check)
  if (event.httpMethod === 'GET') {
    return createResponse(200, {
      status: 'Netlify webhook endpoint is working',
      endpoint: '/.netlify/functions/webhook-evaluation',
      deployment: 'Netlify',
      methods: ['GET', 'POST'],
      timestamp: new Date().toISOString(),
      required_fields: {
        user_id: 'string (UUID)',
        session_id: 'string (unique session identifier)', 
        exam_type: 'string (KP or FSP)',
        conversation_type: 'string (patient or examiner)',
        score: 'number or string (0-100)',
        evaluation: 'string (evaluation text)',
        timestamp: 'string (optional, ISO date)'
      },
      example: {
        user_id: '12345678-1234-1234-1234-123456789012',
        session_id: 'session_2025_001',
        exam_type: 'KP',
        conversation_type: 'patient',
        score: 85,
        evaluation: 'Patient communication was excellent...',
        timestamp: '2025-08-30T10:00:00.000Z'
      }
    });
  }

  // Handle POST (evaluation data)
  if (event.httpMethod === 'POST') {
    try {
      let data;
      
      // Parse body
      try {
        data = event.body ? JSON.parse(event.body) : {};
      } catch (parseError) {
        return createResponse(400, {
          success: false,
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON'
        });
      }
      
      if (!data || Object.keys(data).length === 0) {
        return createResponse(400, {
          success: false,
          error: 'Missing request body',
          message: 'Request body is required'
        });
      }

      console.log('Received evaluation data:', JSON.stringify(data, null, 2));

      // Validate data
      const { errors, processedScore } = validateEvaluationData(data);
      
      if (errors.length > 0) {
        return createResponse(400, {
          success: false,
          error: 'Validation failed',
          errors: errors,
          received_data: data
        });
      }

      // Store in database
      const result = await storeEvaluation(data, processedScore);

      // Return success response
      return createResponse(200, {
        success: true,
        message: 'Evaluation stored successfully',
        data: {
          evaluation_id: result.id,
          user_id: result.user_id,
          session_id: result.session_id,
          exam_type: result.exam_type,
          conversation_type: result.conversation_type,
          score: result.score,
          stored_at: result.created_at,
          webhook_source: result.webhook_source,
          deployment: 'Netlify'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Webhook processing error:', error);
      
      return createResponse(500, {
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Method not allowed
  return createResponse(405, {
    error: 'Method not allowed',
    allowed_methods: ['GET', 'POST', 'OPTIONS']
  });
};
