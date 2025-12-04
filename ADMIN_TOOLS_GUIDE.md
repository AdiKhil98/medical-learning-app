# 🔧 Admin Subscription Tools - Usage Guide

Your admin tools are now available at:
`/.netlify/functions/admin-subscriptions`

## 📋 Available Actions:

### 1. **List User Subscriptions**
Get all subscriptions for a specific user

**Request:**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/admin-subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "list",
    "email": "user@example.com"
  }'
```

**Or by userId:**
```json
{
  "action": "list",
  "userId": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "email": "user@example.com",
    "subscription_tier": "profi",
    "simulation_limit": 60,
    "simulations_used_this_month": 15
  },
  "subscriptions": [
    {
      "lemonsqueezy_subscription_id": "12345",
      "tier": "profi",
      "status": "active",
      "simulation_limit": 60,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 1,
  "active": 1
}
```

---

### 2. **Check for Duplicate Subscriptions**
Find all users with multiple active subscriptions

**Request:**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/admin-subscriptions \
  -H "Content-Type: application/json" \
  -d '{"action": "check-duplicates"}'
```

**Response:**
```json
{
  "success": true,
  "duplicates_found": 2,
  "users": [
    {
      "user_email": "user1@example.com",
      "user_id": "uuid-1",
      "subscription_count": 2,
      "subscription_ids": ["12345", "67890"]
    }
  ]
}
```

---

### 3. **Cancel a Subscription**
Cancel a subscription via Lemon Squeezy API

**Request:**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/admin-subscriptions \
  -H "Content-Type": application/json" \
  -d '{
    "action": "cancel",
    "subscriptionId": "12345"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription cancelled",
  "subscription_id": "12345"
}
```

---

### 4. **Force Sync User Limits**
Manually sync user limits from their primary subscription

**Request:**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/admin-subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sync",
    "userId": "uuid-here"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User limits synced",
  "result": {
    "tier": "profi",
    "status": "active",
    "tier_changed": false
  }
}
```

---

### 5. **Get Subscription History**
View audit log of subscription changes for a user

**Request:**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/admin-subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "history",
    "userId": "uuid-here"
  }'
```

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "old_tier": "basis",
      "new_tier": "profi",
      "old_limit": 30,
      "new_limit": 60,
      "change_source": "webhook",
      "created_at": "2025-01-20T15:30:00Z"
    }
  ],
  "total": 1
}
```

---

## 🛠️ Common Use Cases:

### Clean Up Duplicate Subscriptions:
```bash
# 1. Check for duplicates
curl -X POST ... -d '{"action": "check-duplicates"}'

# 2. List subscriptions for affected user
curl -X POST ... -d '{"action": "list", "email": "user@example.com"}'

# 3. Cancel the duplicate (keep the newer one)
curl -X POST ... -d '{"action": "cancel", "subscriptionId": "OLD_ID"}'

# 4. Sync user limits to ensure correct state
curl -X POST ... -d '{"action": "sync", "userId": "USER_ID"}'
```

### Debug User Subscription Issues:
```bash
# 1. Get user subscriptions
curl -X POST ... -d '{"action": "list", "email": "user@example.com"}'

# 2. Check history to see what changed
curl -X POST ... -d '{"action": "history", "userId": "USER_ID"}'

# 3. Force sync if limits are wrong
curl -X POST ... -d '{"action": "sync", "userId": "USER_ID"}'
```

---

## 🔒 Security Note:

These admin tools have **NO AUTHENTICATION**! You should:

1. **Add authentication** before deploying to production
2. **Use Netlify Identity** or similar
3. **Restrict access** to admin users only

**Example with basic auth check:**
```javascript
// Add this at the start of exports.handler
const adminKey = process.env.ADMIN_SECRET_KEY;
const providedKey = event.headers['x-admin-key'];

if (providedKey !== adminKey) {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: 'Unauthorized' })
  };
}
```

Then use:
```bash
curl -X POST ... \
  -H "X-Admin-Key: your-secret-key" \
  -d '{"action": "list", ...}'
```
