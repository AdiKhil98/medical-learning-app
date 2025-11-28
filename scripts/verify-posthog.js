#!/usr/bin/env node

/**
 * PostHog Verification Script
 *
 * Verifies that PostHog is properly configured
 */

require('dotenv').config();

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST;

console.log('\n🔍 PostHog Configuration Check\n');
console.log('═'.repeat(50));

// Check API Key
if (!API_KEY) {
  console.error('❌ EXPO_PUBLIC_POSTHOG_API_KEY is not set');
  process.exit(1);
}

if (!API_KEY.startsWith('phc_')) {
  console.error('❌ Invalid API key format (should start with "phc_")');
  process.exit(1);
}

console.log(`✅ API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}`);

// Check Host
if (!HOST) {
  console.error('❌ EXPO_PUBLIC_POSTHOG_HOST is not set');
  process.exit(1);
}

console.log(`✅ Host: ${HOST}`);

// Check connectivity (simple)
console.log('\n📡 Checking PostHog connectivity...\n');

const https = require('https');
const url = new URL(HOST);

const options = {
  hostname: url.hostname,
  port: 443,
  path: '/decide?v=3',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const data = JSON.stringify({
  api_key: API_KEY,
  distinct_id: 'verification_script',
});

const req = https.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Successfully connected to PostHog!');
      console.log('\n📊 Response:', JSON.parse(body));
      console.log('\n🎉 PostHog is ready to track events!\n');
      process.exit(0);
    } else {
      console.error(`❌ Connection failed with status ${res.statusCode}`);
      console.error('Response:', body);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.error('\nPlease check:');
  console.error('  1. Your internet connection');
  console.error('  2. PostHog API key is correct');
  console.error('  3. PostHog host URL is correct');
  process.exit(1);
});

req.write(data);
req.end();
