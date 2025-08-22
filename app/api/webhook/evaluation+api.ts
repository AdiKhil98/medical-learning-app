import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Extract data from Make.com webhook
    const { user_id, evaluation_name, score } = body;
    
    // Validate required fields
    if (!user_id || !evaluation_name || !score) {
      return Response.json(
        { error: 'Missing required fields: user_id, evaluation_name, score' },
        { status: 400 }
      );
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
      return Response.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }
    
    return Response.json(
      { 
        success: true, 
        message: 'Evaluation saved successfully',
        data: data[0]
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Handle GET requests for testing
export async function GET() {
  return Response.json(
    { 
      message: 'Evaluation webhook endpoint is running',
      endpoint: '/api/webhook/evaluation',
      method: 'POST',
      required_fields: ['user_id', 'evaluation_name', 'score']
    },
    { status: 200 }
  );
}