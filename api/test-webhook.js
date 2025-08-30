// Simple test endpoint for Vercel deployment verification
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'CORS preflight OK' });
  }

  return res.status(200).json({
    message: 'Vercel API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    deployment: 'Vercel'
  });
};