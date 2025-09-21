# Lemon Squeezy Webhook Integration

This document outlines the Lemon Squeezy webhook integration for handling subscription events.

## Overview

The webhook handler processes the following Lemon Squeezy events:
- `subscription_created` - Grant user access to purchased tier
- `subscription_updated` - Update user's tier on upgrade/downgrade
- `subscription_cancelled` - Mark subscription as cancelled (keeps access until end of period)
- `subscription_expired` - Remove user's access

## Files Created

### 1. Database Migration
- **File**: `supabase/migrations/20250921233645_add_subscription_fields.sql`
- **Purpose**: Adds subscription fields to users table and creates webhook_events table for logging

### 2. Webhook Handler
- **File**: `api/webhook/lemonsqueezy/index.js`
- **Endpoint**: `https://kpmed.de/api/webhook/lemonsqueezy`
- **Purpose**: Main webhook handler with signature verification

### 3. Test Endpoint
- **File**: `api/webhook/lemonsqueezy/test.js`
- **Purpose**: Testing webhook functionality and signature verification

### 4. Environment Variables
- **File**: `.env`
- **Added**: `LEMONSQUEEZY_WEBHOOK_SECRET=kpmedsecret`

## Database Schema

### Users Table - New Fields
```sql
subscription_id text                    -- Lemon Squeezy subscription ID
variant_id text                        -- Lemon Squeezy product variant ID
subscription_status text               -- active, cancelled, expired, inactive
subscription_tier text                 -- basis, profi, unlimited
subscription_variant_name text         -- Basis-Plan, Profi-Plan, Unlimited-Plan
simulation_limit integer               -- 30, 60, or null for unlimited
subscription_expires_at timestamptz    -- When subscription ends
lemon_squeezy_customer_email text      -- Customer email from Lemon Squeezy
subscription_created_at timestamptz    -- When subscription was created
subscription_updated_at timestamptz    -- Last update timestamp
```

### Webhook Events Table
```sql
id uuid PRIMARY KEY
event_type text                        -- subscription_created, etc.
event_data jsonb                       -- Full webhook payload
subscription_id text                   -- Reference to subscription
user_id uuid                          -- Reference to user
processed_at timestamptz              -- When event was processed
status text                           -- processed, failed, ignored
error_message text                    -- Error details if failed
created_at timestamptz               -- Event creation time
```

## Subscription Tiers

| Tier | Name | Monthly Price | Simulation Limit |
|------|------|---------------|------------------|
| basis | Basis-Plan | ₪185 | 30 |
| profi | Profi-Plan | ₪278 | 60 |
| unlimited | Unlimited-Plan | ₪555 | unlimited (null) |

## Webhook Configuration

### Lemon Squeezy Dashboard Setup
1. Go to Settings → Webhooks
2. Create new webhook with:
   - **URL**: `https://kpmed.de/api/webhook/lemonsqueezy`
   - **Events**: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`
   - **Secret**: `kpmedsecret` (already configured)

### Signature Verification
The webhook uses HMAC SHA-256 signature verification with the header `x-signature`.

## Testing

### 1. Basic Connectivity Test
```bash
curl -X GET https://kpmed.de/api/webhook/lemonsqueezy/test
```

Expected response:
```json
{
  "success": true,
  "message": "Lemon Squeezy webhook endpoint is working",
  "timestamp": "2025-09-21T23:36:45.000Z",
  "environment": {
    "hasWebhookSecret": true,
    "hasSupabaseUrl": true,
    "hasSupabaseKey": true
  }
}
```

### 2. Signature Verification Test
```bash
# Generate test signature in Node.js
const crypto = require('crypto');
const payload = '{"test": "data"}';
const secret = 'kpmedsecret';
const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');

# Test with curl
curl -X POST https://kpmed.de/api/webhook/lemonsqueezy/test-signature \
  -H "Content-Type: application/json" \
  -H "x-signature: ${signature}" \
  -d '{"test": "data"}'
```

### 3. Full Webhook Test
```bash
# Test subscription_created event
curl -X POST https://kpmed.de/api/webhook/lemonsqueezy \
  -H "Content-Type: application/json" \
  -H "x-signature: [GENERATED_SIGNATURE]" \
  -d '{
    "meta": {
      "event_name": "subscription_created"
    },
    "data": {
      "id": "test-subscription-123",
      "attributes": {
        "variant_id": "test-variant-456",
        "variant_name": "Basis-Plan",
        "user_email": "test@example.com",
        "status": "active",
        "ends_at": "2025-10-21T23:36:45.000Z"
      }
    }
  }'
```

## Event Processing Flow

### subscription_created
1. Find user by email
2. Update user record with subscription data
3. Set subscription_status to 'active'
4. Set appropriate tier and simulation limit
5. Log webhook event

### subscription_updated
1. Find user by current subscription_id
2. Update tier if variant changed (upgrade/downgrade)
3. Update subscription status
4. Log webhook event

### subscription_cancelled
1. Find user by subscription_id
2. Set subscription_status to 'cancelled'
3. Keep access until ends_at date
4. Log webhook event

### subscription_expired
1. Find user by subscription_id
2. Set subscription_status to 'expired'
3. Remove tier and simulation limit
4. Log webhook event

## Error Handling

- All webhook events are logged in the `webhook_events` table
- Failed events include error messages
- Invalid signatures return 401 status
- Missing data returns 400 status
- User not found returns 404 status
- Server errors return 500 status

## Security Features

- HMAC SHA-256 signature verification
- Timing-safe signature comparison
- Input validation
- SQL injection protection via Supabase
- Row Level Security (RLS) on webhook_events table

## Monitoring

- Check `webhook_events` table for processing status
- Monitor application logs for webhook processing
- Failed events are logged with error messages
- Success events include user_id and subscription_id

## Deployment Notes

1. Run the database migration first:
   ```bash
   supabase db push
   ```

2. Ensure environment variables are set in production
3. Verify webhook endpoint is accessible from Lemon Squeezy
4. Test with Lemon Squeezy's webhook testing tool
5. Monitor initial webhook events for proper processing