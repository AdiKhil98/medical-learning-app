// Debug endpoint to check environment variables
exports.handler = async (event, context) => {
  console.log('Debug endpoint called');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Environment Variables Debug',
      available_vars: {
        SUPABASE_URL: !!process.env.SUPABASE_URL ? 'SET' : 'MISSING',
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
        LEMONSQUEEZY_WEBHOOK_SECRET: !!process.env.LEMONSQUEEZY_WEBHOOK_SECRET ? 'SET' : 'MISSING',

        // Check for prefixed versions
        EXPO_PUBLIC_SUPABASE_URL: !!process.env.EXPO_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',

        // Show first few characters if set
        SUPABASE_URL_preview: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 20) + '...' : 'NOT SET',
        SUPABASE_SERVICE_ROLE_KEY_preview: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'eyJ...' : 'NOT SET'
      },
      timestamp: new Date().toISOString()
    })
  };
};