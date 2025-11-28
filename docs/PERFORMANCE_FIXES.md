# Performance Optimization Fixes

## Quick Wins Implementation Summary

Based on Lighthouse audit results showing Performance: 38/100.

## Issues Identified

### 1. Single Bundle Problem 🔥

- **Issue:** Entire app bundled into one 6.15 MB file
- **Impact:** 692 KB unused JavaScript, slow LCP (8.2s)
- **Root Cause:** Expo web builds don't automatically code-split

### 2. Icon Font Loading 🔥

- **Issue:** 4.8 MB of icon fonts loaded upfront
- **Fonts:** All 19 @expo/vector-icons families loaded
- **Actually Used:** Only MaterialCommunityIcons and Ionicons

### 3. Console Logs

- **Issue:** Console statements in production
- **Impact:** Increased bundle size, potential performance leak

## Fixes Implemented

### ✅ 1. Metro Config Optimization

**File:** `metro.config.js`

**Changes:**

- Aggressive tree shaking enabled
- Console.log removal in production
- Minifier configuration optimized
- Drop debugger statements

**Expected Impact:**

- Smaller bundle size (~5-10% reduction)
- No console overhead
- Better dead code elimination

### ✅ 2. Icon Font Lazy Loading

**File:** `utils/iconLoader.ts`

**Changes:**

- Created selective icon loader
- Only load MaterialCommunityIcons + Ionicons
- Removed 17 unused icon families
- Lazy load additional families on demand

**Expected Impact:**

- **-4 MB** from initial bundle
- Faster initial load
- Icons load only when needed

### ✅ 3. App Config Optimization

**File:** `app.config.js`

**Changes:**

- Explicit font loading configuration
- Only include used fonts
- Web-specific optimizations
- Asset bundle pattern optimization

**Expected Impact:**

- Reduced font loading overhead
- Better build optimization
- Improved tree shaking

## Recommendations for Further Optimization

### High Priority

**1. Lazy Load Heavy Libraries**

```typescript
// charts (victory, react-native-chart-kit)
const ChartComponent = lazy(() => import('./ChartComponent'));

// Lottie animations
const LottiePlayer = lazy(() => import('@dotlottie/react-player'));

// Framer Motion (if used)
const AnimatedComponent = lazy(() => import('./AnimatedComponent'));
```

**2. Remove Duplicate Dependencies**

- Both `victory` and `react-native-chart-kit` for charts
- Choose one, remove the other
- Estimated savings: ~500 KB

**3. Optimize Images**

- Run `npm run optimize:images`
- Convert to WebP where possible
- Implement lazy loading (already have OptimizedImage component)

### Medium Priority

**4. Code Splitting by Route**
While Expo Router has `lazy: true`, it doesn't create separate bundles on web.
Need to implement manual splitting:

```typescript
// Heavy simulation screens
const KPSimulation = lazy(() => import('./(tabs)/simulation/kp'));
const FSPSimulation = lazy(() => import('./(tabs)/simulation/fsp'));
```

**5. Vendor Bundle Splitting**
Configure webpack to split vendor code:

- React + React Native bundle
- Expo SDK bundle
- Third-party libraries bundle
- App code bundle

**6. Preload Critical Resources**
Add to `index.html`:

```html
<link rel="preconnect" href="https://supabase.com" />
<link rel="preconnect" href="https://posthog.com" />
<link rel="dns-prefetch" href="https://fonts.googleapis.com" />
```

### Low Priority

**7. Service Worker Caching**

- Cache static assets
- Cache API responses
- Offline support

**8. Compression**

- Enable Brotli compression on Netlify (likely already enabled)
- Verify gzip fallback

## Color Contrast Fix

**Issue:** One element has insufficient contrast (Accessibility: 93)

**Action Needed:**

1. Run axe DevTools in browser
2. Identify low-contrast element
3. Update color to meet WCAG AA standard (4.5:1)

**Common culprits:**

- Light gray text on white background
- Secondary button colors
- Placeholder text
- Disabled state colors

## Actual Results After Phase 1

### Before (Baseline: 2025-11-28 18:38)

- Performance: **38/100**
- Bundle Size: 6.15 MB (single file)
- Icon Fonts: 4.8 MB (all 19 families)
- LCP: 8.2s
- TBT: 3,740ms
- Unused JS: 692 KB

### After Phase 1 (2025-11-28 19:08)

- Performance: **39/100** (+1 point ❌ minimal improvement)
- Bundle Size: **1.07 MB** (-83% ✅ HUGE improvement!)
- Icon Fonts: Still bundled (optimization didn't work due to Expo limitations)
- LCP: **7.8s** (-400ms ⚠️ slight improvement)
- TBT: **3,380ms** (-360ms ⚠️ slight improvement)
- Unused JS: **652 KB** (-40 KB ⚠️ minimal improvement)

### Analysis

✅ **What worked:**

- Metro minification and tree shaking reduced bundle from 6.15 MB to 1.07 MB (-83%)
- Console.log removal helped reduce bundle size

❌ **What didn't work:**

- Icon font optimization (Expo bundles all fonts regardless of configuration)
- Performance score barely changed despite 83% bundle reduction
- Core Web Vitals still failing

🔍 **Root cause:**

- Problem is **JavaScript execution time**, not just bundle download size
- 652 KB of unused JavaScript is still being **executed** (blocking main thread)
- Need to actually remove/lazy-load unused code, not just minify it

## Testing Plan

1. **Rebuild and test:**

```bash
npm run build:web
npm run lighthouse:prod
```

2. **Compare results:**

- Before lighthouse report: `lighthouse-reports/lighthouse-mobile-2025-11-28T18-38-11-039Z.html`
- After lighthouse report: (new)

3. **Verify functionality:**

- Icons load correctly
- No console errors
- All features work

4. **Monitor production:**

- Track bundle size over time
- Monitor performance metrics
- Watch for regressions

## Phase 2: Reduce JavaScript Execution Time

Based on Phase 1 results, we need to focus on **execution time**, not just bundle size.

### Priority 1: Code Splitting & Lazy Loading

**Problem:** 652 KB of unused JavaScript executing on initial load

**Solutions:**

1. **Lazy load simulation screens** (heaviest pages):

```typescript
// app/(tabs)/simulation/_layout.tsx
import { lazy, Suspense } from 'react';

const KPSimulation = lazy(() => import('./kp'));
const FSPSimulation = lazy(() => import('./fsp'));

// Wrap with Suspense and loading indicator
```

**Expected Impact:** -2s TBT, -3s LCP

2. **Lazy load chart libraries:**

```typescript
// Only load charts when needed
const ChartComponent = lazy(() => import('@/components/charts/PerformanceChart'));
```

**Expected Impact:** -500ms TBT

3. **Lazy load Voiceflow integration:**

```typescript
// Load Voiceflow script only on simulation pages
useEffect(() => {
  if (isSimulationPage) {
    import('@/utils/voiceflowIntegration').then(({ initializeVoiceflow }) => {
      initializeVoiceflow();
    });
  }
}, [isSimulationPage]);
```

**Expected Impact:** -1s TBT

### Priority 2: Remove Duplicate Dependencies

**Problem:** Both `victory` and `react-native-chart-kit` installed

```bash
# Check bundle impact
npm uninstall react-native-chart-kit
# Keep victory (more features, better tree shaking)
```

**Expected Impact:** -300 KB, -500ms TBT

### Priority 3: Defer Non-Critical Scripts

**Problem:** PostHog, analytics loading on app init

```typescript
// Defer analytics initialization
useEffect(() => {
  setTimeout(() => {
    import('@/utils/analytics').then(({ initAnalytics }) => {
      initAnalytics();
    });
  }, 3000); // Load after 3s
}, []);
```

**Expected Impact:** -800ms TBT

### Priority 4: Icon Font Optimization (Complex)

**Problem:** Expo bundles all 19 icon fonts (still 4.8 MB in bundle)

**Solutions:**

Option A: Use `react-icons` for web only:

```typescript
// components/Icon.tsx
import { Platform } from 'react-native';

export const Icon = Platform.select({
  web: () => require('react-icons').IoMdHome, // Tree-shakeable
  default: () => require('@expo/vector-icons').Ionicons, // Expo icons
});
```

Option B: Create custom Babel plugin to strip unused fonts

Option C: Accept current state (lowest priority)

**Expected Impact:** -4 MB bundle, -2s LCP (if Option A implemented)

### Expected Results After Phase 2

- Performance: **70-80/100** (+31-41 points)
- Bundle Size: **< 500 KB** (if icon fonts fixed)
- LCP: **< 3s** (-4.8s improvement)
- TBT: **< 500ms** (-2.9s improvement)
- Unused JS: **< 200 KB** (-450 KB)

## Implementation Status

### Phase 1: Bundle Optimization ✅

- [x] Metro config optimization
- [x] Icon font lazy loading attempt (didn't work)
- [x] App config optimization
- [x] Rebuild and test
- [x] Re-run Lighthouse audit
- [x] Analyze results

### Phase 2: Execution Time Optimization (TODO)

- [ ] Lazy load simulation screens (kp.tsx, fsp.tsx)
- [ ] Lazy load chart libraries
- [ ] Lazy load Voiceflow integration
- [ ] Remove duplicate chart dependency
- [ ] Defer analytics initialization
- [ ] Fix color contrast issue
- [ ] (Optional) Switch to react-icons for web
- [ ] Re-run Lighthouse audit
- [ ] Deploy and verify

## Related Documentation

- [Lighthouse Guide](./LIGHTHOUSE.md)
- [Image Optimization](./IMAGE_OPTIMIZATION.md)
- [Lazy Loading](./LAZY_LOADING.md)
- [Bundle Analysis](./LAZY_LOADING.md#bundle-analysis)
