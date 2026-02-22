import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: any;
}

async function sendExpoPushNotification(messages: PushMessage[]) {
  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  
  if (!expoAccessToken) {
    throw new Error('EXPO_ACCESS_TOKEN not configured');
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${expoAccessToken}`,
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Expo push notification failed: ${errorText}`);
  }

  return await response.json();
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Get Supabase configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { action } = await req.json();

    if (action === 'send-daily-notifications') {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's tip and question
      const [tipResult, questionResult] = await Promise.all([
        supabase
          .from('daily_tips')
          .select('*')
          .eq('date', today)
          .maybeSingle(),
        supabase
          .from('daily_questions')
          .select('*')
          .eq('date', today)
          .maybeSingle()
      ]);

      if (tipResult.error) throw tipResult.error;
      if (questionResult.error) throw questionResult.error;

      const dailyTip = tipResult.data;
      const dailyQuestion = questionResult.data;

      // Get users with push notifications enabled and valid push tokens
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('push_token')
        .eq('push_notifications_enabled', true)
        .not('push_token', 'is', null);

      if (usersError) throw usersError;

      const messages: PushMessage[] = [];

      // Create notification messages
      if (dailyTip && users && users.length > 0) {
        for (const user of users) {
          if (user.push_token) {
            messages.push({
              to: user.push_token,
              title: '💡 Tipp des Tages',
              body: dailyTip.title,
              data: {
                type: 'daily_tip',
                tip_id: dailyTip.id,
                date: today
              }
            });
          }
        }
      }

      if (dailyQuestion && users && users.length > 0) {
        for (const user of users) {
          if (user.push_token) {
            messages.push({
              to: user.push_token,
              title: '❓ Frage des Tages',
              body: 'Eine neue Frage wartet auf Sie!',
              data: {
                type: 'daily_question',
                question_id: dailyQuestion.id,
                date: today
              }
            });
          }
        }
      }

      // Send notifications if we have messages
      let notificationResults = null;
      if (messages.length > 0) {
        notificationResults = await sendExpoPushNotification(messages);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Sent ${messages.length} notifications`,
        tip: dailyTip ? dailyTip.title : 'No tip for today',
        question: dailyQuestion ? 'Question available' : 'No question for today',
        notifications_sent: messages.length,
        results: notificationResults
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });

    } else if (action === 'test-notification') {
      // Test notification functionality
      const { push_token, title, body } = await req.json();
      
      if (!push_token) {
        throw new Error('Push token is required for test notification');
      }

      const testMessage: PushMessage = {
        to: push_token,
        title: title || 'MedMeister Test',
        body: body || 'Dies ist eine Test-Benachrichtigung von MedMeister!',
        data: { test: true }
      };

      const result = await sendExpoPushNotification([testMessage]);

      return new Response(JSON.stringify({
        success: true,
        message: 'Test notification sent',
        result
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Send Daily Notifications Error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});