const crypto = require('crypto');

// Test endpoint to verify webhook is working
async function testWebhook(req, res) {
  console.log('Test webhook endpoint called:', req.method);

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'Lemon Squeezy webhook endpoint is working',
      timestamp: new Date().toISOString(),
      environment: {
        hasWebhookSecret: !!process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  }

  if (req.method === 'POST') {
    // Simple POST test without signature verification
    const body = req.body;

    console.log('Test webhook received POST data:', JSON.stringify(body, null, 2));

    return res.status(200).json({
      success: true,
      message: 'Test webhook processed successfully',
      receivedData: body,
      timestamp: new Date().toISOString()
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Generate test signature for webhook testing
function generateTestSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return 'sha256=' + hmac.digest('hex');
}

// Test webhook with signature verification
async function testWebhookWithSignature(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = JSON.stringify(req.body);
    const providedSignature = req.headers['x-signature'];
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || 'kpmedsecret';

    // Generate expected signature
    const expectedSignature = generateTestSignature(payload, webhookSecret);

    console.log('Test webhook signature verification:');
    console.log('Provided signature:', providedSignature);
    console.log('Expected signature:', expectedSignature);
    console.log('Payload:', payload);

    // Verify signature
    const isValid = providedSignature === expectedSignature;

    return res.status(200).json({
      success: true,
      message: 'Signature test completed',
      signatureValid: isValid,
      providedSignature,
      expectedSignature,
      payload: req.body,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test webhook error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  testWebhook,
  testWebhookWithSignature,
  generateTestSignature
};