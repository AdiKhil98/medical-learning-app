# Subscription Upgrade Fix - User Guide

## Problem
After upgrading from free plan to basic plan, the simulation counter still showed "3/3 used" and blocked access to simulations.

## Root Cause
The webhook handler didn't reset the `simulations_used_this_month` counter when creating a new subscription or upgrading tiers. This caused the old usage count to carry over to the new paid plan.

## Solution Applied

### 1. Webhook Fix (For Future Upgrades)
The webhook now automatically resets the counter to 0 when:
- A new subscription is created (`subscription_created` event)
- A subscription tier changes (`subscription_updated` event with tier change)

**Deployed:** The fix is now live in `netlify/functions/webhook/lemonsqueezy.js`

### 2. Manual Fix (For Your Current Account)

Since you already upgraded, you need to manually reset your counter once.

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase dashboard
2. Navigate to Table Editor → `users` table
3. Find your user record (by email)
4. Edit the row and set:
   - `simulations_used_this_month` = `0`
   - Click Save
5. Refresh your app - you should now see "0/30 used"

**Option B: Using SQL**

1. Open Supabase SQL Editor
2. Copy the contents of `fix_my_subscription.sql`
3. Replace `'YOUR_EMAIL_HERE'` with your actual email
4. Run the script
5. Check the output to verify the fix

**Example:**
```sql
-- Reset monthly counter
UPDATE users
SET simulations_used_this_month = 0
WHERE email = 'your.email@example.com'
  AND subscription_tier = 'basis'
  AND subscription_status = 'active';
```

## Verification

After applying the fix:

1. **Restart your app** (close and reopen)
2. Navigate to the simulation page
3. You should see: **"0/30 Simulationen genutzt"** (for Basic plan)
4. You should be able to start simulations without seeing the upgrade modal

## Future Upgrades

This fix ensures that all future subscription upgrades will automatically reset the counter. No manual intervention needed!

## Technical Details

### Counter Logic
- **Free tier:** Uses `free_simulations_used` (lifetime, max 3)
- **Paid tiers:** Use `simulations_used_this_month` (resets monthly + on tier change)

### What Changed
1. `subscription_created` event now includes: `simulations_used_this_month: 0`
2. `subscription_updated` event detects tier changes and resets counter
3. Both events now log the reset action for debugging

## Diagnostic Scripts

Two SQL scripts are provided:

1. **check_subscription_status.sql**
   - Check your current subscription state
   - See tier, limits, and remaining simulations

2. **fix_my_subscription.sql**
   - Reset your counter manually
   - Includes before/after verification queries

## Need Help?

If you're still seeing "3/3 used" after applying the fix:

1. Verify your subscription tier in database is set to "basis" (not "free")
2. Verify `subscription_status` is "active"
3. Verify `simulation_limit` is set to 30
4. Clear app cache and restart
5. Check browser console for any error logs

## Commit
Fix deployed in commit: `e84654b`
