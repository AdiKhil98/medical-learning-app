// Helper function to verify webhook signature (Lemon Squeezy format)
function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(hmac.update(payload).digest('hex'), 'utf8');
  const signatureBuffer = Buffer.from(signature || '', 'utf8');

  return crypto.timingSafeEqual(digest, signatureBuffer);
}
