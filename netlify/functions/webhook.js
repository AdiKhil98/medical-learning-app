// Netlify serverless function for Make.com evaluation webhooks
  // Now uses Supabase for persistent data storage

  const { createClient } = require('@supabase/supabase-js');

  // Initialize Supabase client
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // CORS headers for Make.com requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '3600',
  };

  // Response helper function
  const createResponse = (statusCode, body, additionalHeaders = {}) => {
    return {
      statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...additionalHeaders
      },
      body: JSON.stringify(body)
    };
  };

  // Validation function for incoming data
  const validateEvaluationData = (data) => {
    const errors = [];

    // Required fields validation
    if (!data.user_id || typeof data.user_id !== 'string') {
      errors.push('user_id is required and must be a string');
    }

    if (!data.session_id || typeof data.session_id !== 'string') {
      errors.push('session_id is required and must be a string');
    }

    if (!data.exam_type || !['KP', 'FSP'].includes(data.exam_type)) {
      errors.push('exam_type is required and must be either "KP" or "FSP"');
    }

    if (!data.conversation_type || !['patient', 'examiner'].includes(data.conversation_type)) {
      errors.push('conversation_type is required and must be either "patient" or "examiner"');
    }

    if (typeof data.score !== 'number' || data.score < 0 || data.score > 100) {
      errors.push('score is required and must be a number between 0 and 100');
    }

    if (!data.evaluation || typeof data.evaluation !== 'string') {
      errors.push('evaluation is required and must be a string');
    }

    if (!data.timestamp || isNaN(Date.parse(data.timestamp))) {
      errors.push('timestamp is required and must be a valid ISO date string');
    }

    return errors;
  };

  // Function to store evaluation data in Supabase
  const storeEvaluation = async (evaluationData) => {
    try {
      const { data, error } = await supabase
        .from('evaluation_scores')
        .insert({
          user_id: evaluationData.user_id,
          session_id: evaluationData.session_id,
          exam_type: evaluationData.exam_type,
          conversation_type: evaluationData.conversation_type,
          score: evaluationData.score,
          evaluation: evaluationData.evaluation,
          evaluation_timestamp: evaluationData.timestamp,
          webhook_source: 'make.com',
          raw_data: evaluationData
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error storing evaluation:', error);
        throw error;
      }

      console.log(`Stored evaluation ${data.id} for session ${evaluationData.session_id}`);
      return data.id;
    } catch (error) {
      console.error('Error storing evaluation:', error);
      throw error;
    }
  };

  // Function to get session summary from Supabase
  const getSessionSummary = async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('evaluation_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found, session doesn't exist yet
          return null;
        }
        console.error('Supabase error getting session summary:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting session summary:', error);
      return null;
    }
  };

  // Main handler function
  exports.handler = async (event, context) => {
    console.log('Webhook received:', {
      method: event.httpMethod,
      headers: event.headers,
      timestamp: new Date().toISOString()
    });

    try {
      // Handle OPTIONS request for CORS preflight
      if (event.httpMethod === 'OPTIONS') {
        return createResponse(200, { message: 'CORS preflight successful' });
      }

      // Only accept POST requests
      if (event.httpMethod !== 'POST') {
        return createResponse(405, {
          error: 'Method not allowed',
          message: 'Only POST requests are accepted'
        });
      }

      // Parse request body
      let requestBody;
      try {
        requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (parseError) {
        return createResponse(400, {
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON'
        });
      }

      // Validate required data
      const validationErrors = validateEvaluationData(requestBody);
      if (validationErrors.length > 0) {
        return createResponse(400, {
          error: 'Validation failed',
          message: 'Invalid evaluation data',
          errors: validationErrors
        });
      }

      // Store the evaluation data (triggers will automatically update session summary)
      const evaluationId = await storeEvaluation(requestBody);

      // Get updated session summary from database
      const sessionSummary = await getSessionSummary(requestBody.session_id);

      // Log successful processing
      console.log('Evaluation processed successfully:', {
        evaluationId,
        sessionId: requestBody.session_id,
        userId: requestBody.user_id,
        examType: requestBody.exam_type,
        conversationType: requestBody.conversation_type,
        score: requestBody.score
      });

      // Return success response
      return createResponse(200, {
        success: true,
        message: 'Evaluation data received and stored successfully',
        data: {
          evaluation_id: evaluationId,
          session_id: requestBody.session_id,
          stored_at: new Date().toISOString(),
          session_summary: sessionSummary
        }
      });

    } catch (error) {
      console.error('Webhook processing error:', error);

      return createResponse(500, {
        error: 'Internal server error',
        message: 'Failed to process evaluation webhook',
        timestamp: new Date().toISOString()
      });
    }
  };
