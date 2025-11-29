# Progressive Web App (PWA) Setup

Complete PWA implementation with offline support, caching strategies, and optimal performance.

## Features Implemented

### ✅ 1. Web App Manifest

**File:** `public/manifest.json`

Defines app metadata for installation:

- App name and description (German)
- Theme colors (#B15740)
- Icons (192x192, 512x512)
- Standalone display mode
- Shortcuts to KP and FSP simulations
- Screenshots for app stores

**Result:** Users can install the app to their home screen

### ✅ 2. Service Worker

**File:** `public/service-worker.js`

Implements 3 caching strategies:

**Cache-First** (Static Assets):

- JavaScript bundles
- CSS files
- Fonts (woff, woff2, ttf)
- Images (png, jpg, webp, svg)
- Expo static assets

**Network-First** (API Calls):

- Supabase API requests
- PostHog analytics
- All /api/\* endpoints

**Stale-While-Revalidate** (HTML Pages):

- HTML pages
- Returns cached version immediately
- Updates cache in background

**Cache Limits:**

- Static cache: Unlimited (immutable assets)
- Dynamic cache: 50 entries max
- API cache: 100 entries max

### ✅ 3. Netlify Configuration

**File:** `netlify.toml`

**Compression:**

- Brotli compression (primary)
- Gzip fallback
- Automatic minification (CSS, JS, HTML)
- Image compression

**Caching Headers:**

- Static assets: 1 year (immutable)
- Service worker: No cache (always fresh)
- HTML: Stale-while-revalidate (24 hours)
- Fonts: 1 year with CORS

**Security Headers:**

- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### ✅ 4. Service Worker Registration

**File:** `utils/serviceWorkerRegistration.ts`

Features:

- Automatic registration in production
- Update detection and notification
- Online/offline event handling
- Cache management utilities
- PWA install prompt handling

Registered in: `app/_layout.tsx`

## Installation Instructions

### For Users

**Desktop:**

1. Visit https://splendid-swan-dade5c.netlify.app
2. Click install icon in address bar (Chrome/Edge)
3. Or: Menu → Install KP MED

**Mobile:**

1. Visit https://splendid-swan-dade5c.netlify.app
2. Tap "Add to Home Screen"
3. App launches in standalone mode

### For Developers

**Test Locally:**

```bash
# Build production version
npm run build:web

# Serve locally
npx serve dist

# Test in Chrome DevTools → Application → Service Workers
```

**Test PWA Features:**

```bash
# Chrome DevTools → Lighthouse → PWA audit
# Should show 100/100 PWA score
```

## Caching Strategy Details

### What Gets Cached

**Immediately (on install):**

- `/` (home page)
- `/manifest.json`
- `/robots.txt`

**On first visit (cache-first):**

- JavaScript bundles
- CSS files
- Font files
- Images
- Expo static assets

**On demand (network-first):**

- API responses
- User data
- Dynamic content

**Background updates (stale-while-revalidate):**

- HTML pages
- Navigation routes

### Cache Invalidation

**Automatic:**

- Service worker updates invalidate old caches
- Cache limits automatically remove oldest entries

**Manual:**

```typescript
import { clearServiceWorkerCaches } from '@/utils/serviceWorkerRegistration';

// Clear all caches
await clearServiceWorkerCaches();
```

## Offline Support

### What Works Offline

✅ **Previously visited pages** - Cached and available
✅ **Static assets** - All JS, CSS, fonts, images
✅ **API responses** - If previously fetched and cached
✅ **Navigation** - Between cached routes

❌ **What Doesn't Work Offline**

- First-time page visits (not yet cached)
- Real-time data updates
- New API requests
- Authentication flows

### Offline Indicator

App automatically detects online/offline status:

```typescript
// In app/_layout.tsx
onOffline: () => {
  logger.warn('📴 App is offline');
  // Show offline banner to user
},
onOnline: () => {
  logger.info('🌐 App is online');
  // Hide offline banner
}
```

## Update Strategy

### When New Version Available

**Automatic Detection:**

1. Service worker detects new version
2. Logs: "🔄 New app version available"
3. Optionally show notification to user

**User Action:**

```typescript
import { skipWaitingAndReload } from '@/utils/serviceWorkerRegistration';

// Reload app with new version
await skipWaitingAndReload();
```

**Force Check for Updates:**

```typescript
import { checkForAppUpdate } from '@/utils/serviceWorkerRegistration';

const hasUpdate = await checkForAppUpdate();
if (hasUpdate) {
  // Show update banner
}
```

## Performance Impact

### Before PWA

- **Cold Load:** All assets downloaded (1.07 MB)
- **Repeat Visit:** Re-download (no caching)
- **Offline:** App doesn't work

### After PWA

- **Cold Load:** 1.07 MB downloaded, then cached
- **Repeat Visit:** ~50 KB (only HTML, rest from cache)
- **Offline:** App works with cached content
- **Subsequent Loads:** Near-instant (from cache)

### Lighthouse Scores (Expected)

- **Performance:** 38 → 55+ (+17 points from caching)
- **PWA:** 0 → 100 (+100 points)
- **Best Practices:** 100 (maintained)
- **Accessibility:** 93 (maintained)
- **SEO:** 100 (maintained)

## Testing

### Manual Testing

**1. Test Installation:**

```bash
# Visit in Chrome
# DevTools → Application → Manifest
# Should show all manifest properties
```

**2. Test Service Worker:**

```bash
# DevTools → Application → Service Workers
# Should show "activated and running"
```

**3. Test Caching:**

```bash
# DevTools → Application → Cache Storage
# Should show 3 caches: static, dynamic, api
```

**4. Test Offline:**

```bash
# DevTools → Network → Offline
# Navigate app - should work with cached pages
```

### Automated Testing

```bash
# Run Lighthouse PWA audit
npm run lighthouse:prod

# Should show:
# - PWA: 100/100
# - Installable: Pass
# - Service Worker: Registered
# - Manifest: Valid
```

## Troubleshooting

### Service Worker Not Registering

**Problem:** Console shows "Service Worker not supported"
**Solution:** Only works in production, on HTTPS, or localhost

### Caches Not Clearing

**Problem:** Old assets still loading
**Solution:**

```typescript
await clearServiceWorkerCaches();
// Then hard refresh (Ctrl+Shift+R)
```

### Install Prompt Not Showing

**Problem:** No "Add to Home Screen" button
**Solution:**

- Must visit site multiple times
- Must have manifest.json
- Must have icons
- Must be on HTTPS

### Offline Mode Not Working

**Problem:** App breaks when offline
**Solution:**

- Check DevTools → Application → Service Workers
- Verify caches exist
- Check if page was visited before going offline

## Best Practices

### ✅ Do's

- Test offline mode regularly
- Monitor cache sizes
- Update service worker version when deploying
- Provide offline UI indicators
- Handle failed API requests gracefully

### ❌ Don'ts

- Don't cache sensitive user data
- Don't cache too aggressively (storage limits)
- Don't forget to invalidate old caches
- Don't ignore service worker errors
- Don't register service worker in development

## Future Improvements

### Planned

1. **Background Sync**
   - Queue failed API requests
   - Sync when back online

2. **Push Notifications**
   - Notify users of new content
   - Remind study sessions

3. **Periodic Background Sync**
   - Update content in background
   - Pre-cache new lessons

4. **Advanced Caching**
   - Predictive prefetching
   - ML-based cache prioritization

### Not Planned

- Full offline editing (complex state sync)
- Offline video streaming (too large)

## Maintenance

### When to Update Service Worker

1. **Major features added** - Update cache version
2. **Critical bug fixes** - Force update users
3. **New static assets** - Add to precache list
4. **API changes** - Update network-first routes

### How to Update

1. Edit `public/service-worker.js`
2. Change `CACHE_VERSION` (e.g., 'kp-med-v2')
3. Test locally
4. Deploy to production
5. Users auto-update on next visit

## Related Documentation

- [Performance Optimization](./PERFORMANCE_FIXES.md)
- [Lighthouse Guide](./LIGHTHOUSE.md)
- [Deployment](./DEPLOYMENT.md)

## Resources

- [MDN: Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web.dev: PWA](https://web.dev/progressive-web-apps/)
- [Workbox](https://developers.google.com/web/tools/workbox)
