# BILLING CYCLE FIX - TESTING & VERIFICATION GUIDE

## Overview
This guide helps you test and verify that simulation quotas now reset based on individual user billing cycles (e.g., 28th of each month) instead of globally on the 1st of every month.

---

## Pre-Deployment Checklist

Before deploying, ensure:

- [x] Step 1: Migration `20260101000001_add_billing_cycle_lazy_reset.sql` applied
- [x] Step 2: Webhook code updated to use billing_anchor dates
- [x] Step 3: Renewal detection logic added to subscription_updated
- [x] Step 4: Migration `20260101000002_disable_monthly_cron.sql` applied
- [x] Step 5: Sync script created (`scripts/sync-billing-periods.js`)

---

## STEP-BY-STEP TESTING

### Test 1: Verify Cron Job is Disabled

**Run in Supabase SQL Editor:**

```sql
-- Should return only auto_cleanup_orphaned_sessions, NOT reset-monthly-simulation-counters
SELECT
  jobname,
  schedule,
  active,
  'Active cron jobs' as note
FROM cron.job
ORDER BY jobname;
```

**Expected Result:**
```
jobname: auto_cleanup_orphaned_sessions
schedule: */15 * * * *
active: true
```

✅ **PASS:** No `reset-monthly-simulation-counters` job exists
❌ **FAIL:** If you see `reset-monthly-simulation-counters`, run the disable migration again

---

### Test 2: Check User's Current Billing Period

Replace `USER_EMAIL` with a real user email:

```sql
SELECT
  u.email,
  u.subscription_tier,
  u.simulations_used_this_month,
  u.simulation_limit,
  uq.period_start,
  uq.period_end,
  uq.simulations_used as quota_simulations_used,
  uq.total_simulations as quota_total,
  us.renews_at as next_billing_date,
  us.status as subscription_status
FROM users u
LEFT JOIN user_simulation_quota uq ON u.id = uq.user_id
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
WHERE u.email = 'USER_EMAIL';
```

**What to Check:**
- ✅ `period_end` should match the user's billing date (e.g., 28th)
- ✅ `next_billing_date` should be approximately the same as `period_end`
- ❌ If `period_end` is end of current month (30th/31st), billing dates aren't synced yet

**Fix:** Run `node scripts/sync-billing-periods.js`

---

### Test 3: Simulate Lazy Reset (Manual Test)

**WARNING:** Only do this on a test user or in staging!

```sql
-- Step 1: Get a test user ID
SELECT id, email FROM users WHERE email = 'TEST_USER_EMAIL';

-- Step 2: Manually expire their period (set period_end to 1 hour ago)
UPDATE user_simulation_quota
SET period_end = NOW() - INTERVAL '1 hour'
WHERE user_id = 'PASTE_USER_ID_HERE';

-- Step 3: Call can_start_simulation to trigger lazy reset
SELECT can_start_simulation('PASTE_USER_ID_HERE');

-- Step 4: Check if period was reset and extended
SELECT
  period_start,
  period_end,
  simulations_used,
  total_simulations
FROM user_simulation_quota
WHERE user_id = 'PASTE_USER_ID_HERE';
```

**Expected Result:**
- ✅ `can_start_simulation` returns `"can_start": true`
- ✅ `simulations_used` should be 0 (reset)
- ✅ `period_end` should be ~1 month in the future
- ❌ If counter didn't reset, check migration was applied

---

### Test 4: Run Sync Script

**Before running:** Ensure you have these environment variables in `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LEMONSQUEEZY_API_KEY=your_lemonsqueezy_api_key
```

**Run the script:**
```bash
cd /c/Code/ProjectBolt
node scripts/sync-billing-periods.js
```

**Expected Output:**
```
========================================
SYNC BILLING PERIODS FROM LEMON SQUEEZY
========================================

📊 Found X active subscriptions

🔍 Processing subscription ls_sub_xxxxx...
   📅 Billing anchor: 2024-12-28 (day 28 of month)
   📅 Current period ends: 2025-01-28T15:42:00.000Z
   ✅ Updated successfully

========================================
SYNC COMPLETE
========================================
✅ Success: X
❌ Errors: 0
⚠️  Skipped: 0
```

**What to Check:**
- ✅ All active subscriptions processed
- ✅ Billing anchor dates extracted correctly
- ✅ Period dates updated in database
- ❌ If errors, check API key and Lemon Squeezy subscription IDs

---

### Test 5: Verify Webhook Logs (After Deployment)

After deploying the updated webhook, monitor Netlify function logs:

**Check in Netlify Dashboard:**
1. Go to Functions → lemonsqueezy
2. Look for recent invocations
3. Check logs for these messages:

**For subscription_created:**
```
📅 Billing period: 2025-01-28T00:00:00.000Z → 2025-02-28T00:00:00.000Z
📅 Next renewal: 2025-02-28T15:42:00.000Z
```

**For subscription_updated (renewal):**
```
🔍 Checking if billing period renewed...
   Existing period end: 2025-01-28T15:42:00.000Z
   New period end: 2025-02-28T15:42:00.000Z
✅ BILLING PERIOD RENEWED - Resetting simulation counter!
✅ Counter reset from 60 → 0
```

**For subscription_updated (no renewal):**
```
🔍 Checking if billing period renewed...
   Existing period end: 2025-02-28T15:42:00.000Z
   New period end: 2025-02-28T15:42:00.000Z
ℹ️  No renewal detected (period end unchanged)
```

---

## VERIFICATION QUERIES

### Query 1: Find Users with Mismatched Billing Periods

Find users whose `period_end` doesn't align with their billing date:

```sql
SELECT
  u.email,
  uq.period_end,
  EXTRACT(DAY FROM uq.period_end::timestamp) as period_end_day,
  us.renews_at,
  EXTRACT(DAY FROM us.renews_at::timestamp) as renewal_day,
  CASE
    WHEN EXTRACT(DAY FROM uq.period_end::timestamp) = EXTRACT(DAY FROM us.renews_at::timestamp)
    THEN '✅ Aligned'
    ELSE '❌ Misaligned'
  END as status
FROM users u
JOIN user_simulation_quota uq ON u.id = uq.user_id
JOIN user_subscriptions us ON u.id = us.user_id
WHERE us.status = 'active'
  AND uq.period_end IS NOT NULL
  AND us.renews_at IS NOT NULL
ORDER BY status DESC, u.email;
```

**Expected:** All users show `✅ Aligned`

---

### Query 2: Check Recent Simulation Usage

See which users are close to their limits:

```sql
SELECT
  u.email,
  uq.simulations_used,
  uq.total_simulations,
  uq.period_end,
  CASE
    WHEN uq.simulations_used >= uq.total_simulations THEN '🚫 Limit reached'
    WHEN uq.simulations_used >= uq.total_simulations * 0.8 THEN '⚠️  Near limit'
    ELSE '✅ Available'
  END as usage_status,
  ROUND((uq.simulations_used::numeric / NULLIF(uq.total_simulations, 0)) * 100, 1) as usage_percent
FROM users u
JOIN user_simulation_quota uq ON u.id = uq.user_id
WHERE u.subscription_tier != 'free'
  AND uq.total_simulations > 0
ORDER BY usage_percent DESC;
```

---

### Query 3: Find Users Whose Period Has Expired

These users should auto-reset on their next simulation:

```sql
SELECT
  u.email,
  u.subscription_tier,
  uq.period_end,
  uq.simulations_used,
  uq.total_simulations,
  us.status as subscription_status,
  NOW() - uq.period_end as time_since_expiry
FROM users u
JOIN user_simulation_quota uq ON u.id = uq.user_id
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
WHERE uq.period_end < NOW()
  AND us.status = 'active'
ORDER BY uq.period_end ASC;
```

**Expected:** Empty after sync script runs and lazy reset handles stragglers

---

## MONITORING POST-DEPLOYMENT

### Day 1: Immediate Checks
- [ ] Verify webhook receives events successfully
- [ ] Check Netlify logs for billing period logging
- [ ] Test one manual subscription update via Lemon Squeezy dashboard

### Week 1: Ongoing Monitoring
- [ ] Monitor for users hitting limits incorrectly
- [ ] Check for any webhook errors in Netlify logs
- [ ] Verify at least one user renewal happens correctly

### Month 1: Full Cycle Verification
- [ ] Verify users reset on their billing dates (not 1st of month)
- [ ] Check for any edge cases (month end dates, leap years, etc.)
- [ ] Confirm no users complaining about incorrect resets

---

## TROUBLESHOOTING

### Issue: User's counter didn't reset on billing date

**Check 1:** Did webhook arrive?
```sql
SELECT * FROM webhook_events
WHERE user_id = 'USER_ID'
  AND event_type = 'subscription_updated'
ORDER BY created_at DESC
LIMIT 5;
```

**Check 2:** Does lazy reset work?
```sql
SELECT can_start_simulation('USER_ID');
```

**Check 3:** Is subscription still active?
```sql
SELECT status, renews_at FROM user_subscriptions
WHERE user_id = 'USER_ID';
```

---

### Issue: Sync script fails with API errors

**Possible causes:**
1. Invalid `LEMONSQUEEZY_API_KEY` → Check .env file
2. Subscription deleted in Lemon Squeezy → Expected, script will skip
3. Rate limiting → Script has 200ms delays, should be fine

---

### Issue: Period dates look wrong after sync

**Check:** Compare with Lemon Squeezy dashboard
1. Go to Lemon Squeezy → Subscriptions
2. Find the subscription ID
3. Check "Current period" and "Renews at" dates
4. Should match your database

---

## ROLLBACK PLAN

If you need to rollback:

### 1. Re-enable Monthly Cron Job

```sql
SELECT cron.schedule(
  'reset-monthly-simulation-counters',
  '1 0 1 * *',
  $$SELECT reset_monthly_simulation_counters();$$
);
```

### 2. Revert Webhook Code

```bash
cd /c/Code/ProjectBolt
git checkout netlify/functions/lemonsqueezy.js.before-step2
# Or restore from backup manually
```

### 3. Revert Database Function

```sql
-- Restore old can_start_simulation (without lazy reset)
-- Find the previous version in migration history
-- Or recreate from backup
```

---

## SUCCESS CRITERIA

✅ **All checks passed if:**

1. No `reset-monthly-simulation-counters` cron job exists
2. User billing periods match their Lemon Squeezy billing_anchor
3. Sync script runs without errors
4. Webhook logs show billing period detection
5. Test user's lazy reset works correctly
6. No users reset on the 1st of the month (only on their billing dates)

---

## Support

If issues persist:
1. Check Netlify function logs
2. Check Supabase logs
3. Verify Lemon Squeezy webhook is active
4. Ensure all migrations were applied successfully

**Last Updated:** 2026-01-01
