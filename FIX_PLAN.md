# QUOTA COUNTER FIX - COMPLETE ACTION PLAN

## PHASE 1: Clean Restart (REQUIRED)

### Step 1: Stop All Servers

```bash
# In terminal, press Ctrl+C to stop Expo dev server
# OR run:
npx kill-port 8081 19000 19001 19002
```

### Step 2: Clear ALL Caches

```bash
cd C:\Users\zaid1\medical-learning-app

# Clear Expo cache
npx expo start --clear

# Stop it after it starts clearing (Ctrl+C)
```

### Step 3: Clear Browser Cache

1. Close ALL browser tabs
2. Open browser
3. Press `Ctrl + Shift + Delete`
4. Select:
   - ✅ Cached images and files
   - ✅ Cookies and site data (if you're OK logging in again)
   - Time range: **All time**
5. Click "Clear data"

### Step 4: Restart Dev Server

```bash
cd C:\Users\zaid1\medical-learning-app
npm run dev
```

### Step 5: Open in INCOGNITO Window

- Open a NEW incognito/private window
- Navigate to your app URL
- Login fresh

---

## PHASE 2: Test the Fix

### Expected Console Logs (IN ORDER):

When you start a simulation and reach 5 minutes, you MUST see:

1. ✅ `🚨🚨🚨 5-MINUTE MARK REACHED - MARKING AS COUNTED!`
2. ✅ `🚨 MARK SIMULATION RESULT:` (with the response object)
3. ✅ `✅✅✅ SIMULATION MARKED AS COUNTED IN DATABASE`
4. ✅ `🔄 Refreshing quota from backend...`
5. ✅ `✅✅✅ QUOTA COUNTER REFRESHED:`

**If you see ALL 5 logs** → Fix is working! ✅
**If logs stop after #1** → RPC call is hanging (Phase 3)

---

## PHASE 3: If Still Broken - Add Debugging

Run this script to add detailed RPC debugging:

```bash
node scripts/add-rpc-debugging.js
```

This will log exactly what the RPC is returning.

---

## PHASE 4: Alternative - Direct Database Fix

If the browser RPC keeps hanging, we can bypass it by:

1. Calling the RPC from a Node.js script when timer hits 5 min
2. Using a webhook/serverless function
3. Fixing RLS policies if there's a permissions issue

---

## CURRENT STATUS

✅ **Backend (Database):** WORKING (tested: 29 → 30)
❌ **Frontend (Browser):** NOT WORKING (RPC call hangs)

**Root Cause:** Likely cache or permissions issue preventing browser from calling the RPC.

**Success Criteria:** After Phase 1 restart, quota should increment from 30 → 31 when you complete a 5-minute simulation.
