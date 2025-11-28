# Lighthouse Performance Auditing Guide

Complete guide to running Lighthouse audits and optimizing app performance.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Running Audits](#running-audits)
4. [Understanding Results](#understanding-results)
5. [Core Web Vitals](#core-web-vitals)
6. [Performance Budgets](#performance-budgets)
7. [Optimization Strategies](#optimization-strategies)
8. [CI/CD Integration](#cicd-integration)
9. [Troubleshooting](#troubleshooting)

## Overview

Lighthouse is an automated tool for improving web app quality. It audits:

- ⚡ **Performance** - Load speed, interactivity
- ♿ **Accessibility** - WCAG compliance, screen readers
- 🎯 **Best Practices** - Security, modern standards
- 🔍 **SEO** - Search engine optimization

**Our Performance Targets:**

- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

## Quick Start

### 1. Run Your First Audit

```bash
# Start development server
npm run dev

# In another terminal, run Lighthouse
npm run lighthouse
```

### 2. View Results

The script will:

- Run a complete audit
- Display scores in terminal
- Save HTML/JSON reports to `lighthouse-reports/`
- Check performance budgets

**Output:**

```
╔════════════════════════════════════════╗
║     Lighthouse Performance Audit       ║
╚════════════════════════════════════════╝

📊 Audit Results:

  ✅ Performance: 92 (Budget: 90)
  ✅ Accessibility: 95 (Budget: 90)
  ✅ Best Practices: 100 (Budget: 90)
  ✅ SEO: 92 (Budget: 90)

🎯 Core Web Vitals:

  ✅ Largest Contentful Paint: 1.8s
  ✅ Cumulative Layout Shift: 0.05
  ✅ First Contentful Paint: 1.2s
  ✅ Total Blocking Time: 150ms
  ✅ Speed Index: 2.8s
```

## Running Audits

### Local Development

```bash
# Mobile audit (default)
npm run lighthouse

# Desktop audit
npm run lighthouse:desktop

# Specific device
npm run lighthouse -- --mobile
npm run lighthouse -- --desktop
```

### Production URL

```bash
# Audit production site
npm run lighthouse:prod

# Custom URL
npm run lighthouse -- --url=https://your-site.com
```

### Multiple Audits

```bash
# Run both mobile and desktop
npm run lighthouse:mobile && npm run lighthouse:desktop

# Compare before/after optimizations
npm run lighthouse > before.txt
# ... make optimizations ...
npm run lighthouse > after.txt
diff before.txt after.txt
```

## Understanding Results

### Category Scores

| Score  | Rating               | Action     |
| ------ | -------------------- | ---------- |
| 90-100 | ✅ Good              | Maintain   |
| 50-89  | ⚠️ Needs Improvement | Optimize   |
| 0-49   | ❌ Poor              | Urgent fix |

### What Each Category Measures

**Performance (90+ target):**

- Load speed (FCP, LCP)
- Interactivity (TBT, TTI)
- Visual stability (CLS)
- Resource optimization

**Accessibility (90+ target):**

- Color contrast
- ARIA labels
- Keyboard navigation
- Screen reader compatibility

**Best Practices (90+ target):**

- HTTPS usage
- Console errors
- Image optimization
- Security headers

**SEO (90+ target):**

- Meta tags
- Crawlability
- Mobile-friendliness
- Structured data

## Core Web Vitals

Google's key metrics for user experience:

### 1. Largest Contentful Paint (LCP)

**What:** Time until largest element is rendered
**Target:** < 2.5 seconds (Good)

**How to Improve:**

```typescript
// Preload critical images
<link rel="preload" as="image" href="/hero.jpg" />

// Use OptimizedImage component
import { OptimizedImage } from '@/components/OptimizedImage';

<OptimizedImage
  source={require('@/assets/hero.jpg')}
  priority="high"  // Loads eagerly
  lazy={false}
/>

// Lazy load below-the-fold images
<OptimizedImage
  source={require('@/assets/gallery.jpg')}
  lazy={true}
  priority="low"
/>
```

**Common Issues:**

- Large images not optimized
- Web fonts blocking render
- Slow server response
- Render-blocking JavaScript

### 2. Cumulative Layout Shift (CLS)

**What:** Visual stability during page load
**Target:** < 0.1 (Good)

**How to Improve:**

```typescript
// Always specify image dimensions
<OptimizedImage
  source={require('@/assets/photo.jpg')}
  width={800}
  height={600}  // Prevents layout shift
/>

// Reserve space for dynamic content
<View style={{ minHeight: 200 }}>
  {isLoading ? <Skeleton /> : <Content />}
</View>

// Use CSS aspect-ratio
const styles = StyleSheet.create({
  imageContainer: {
    aspectRatio: 16 / 9,  // Maintains space
  },
});
```

**Common Issues:**

- Images without dimensions
- Dynamic content injections
- Web fonts loading late
- Ads shifting content

### 3. First Contentful Paint (FCP)

**What:** Time until first content appears
**Target:** < 1.8 seconds (Good)

**How to Improve:**

```typescript
// Minimize critical CSS
// Defer non-critical CSS
<link rel="stylesheet" href="critical.css" />
<link rel="stylesheet" href="non-critical.css" media="print" onload="this.media='all'" />

// Inline critical CSS for above-the-fold
<style>{criticalCSS}</style>

// Preconnect to external domains
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://analytics.google.com" />
```

### 4. Total Blocking Time (TBT)

**What:** Time main thread is blocked
**Target:** < 200ms (Good)

**How to Improve:**

```typescript
// Code splitting
const HeavyComponent = lazyLoad(() => import('./HeavyComponent'));

// Break up long tasks
async function processLargeList(items) {
  const CHUNK_SIZE = 100;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    await processChunk(chunk);
    // Yield to main thread
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

// Use web workers for heavy computation
const worker = new Worker('heavy-computation.worker.js');
```

### 5. Speed Index

**What:** How quickly content is visually displayed
**Target:** < 3.4 seconds (Good)

**How to Improve:**

- Optimize critical rendering path
- Reduce render-blocking resources
- Prioritize visible content
- Use lazy loading

## Performance Budgets

Our budgets are defined in `scripts/lighthouse-audit.js`:

```javascript
const PERFORMANCE_BUDGETS = {
  performance: 90,
  accessibility: 90,
  'best-practices': 90,
  seo: 90,
  'largest-contentful-paint': 2500, // ms
  'cumulative-layout-shift': 0.1,
  'total-blocking-time': 200, // ms
  'first-contentful-paint': 1800, // ms
  'speed-index': 3400, // ms
};
```

### Budget Violations

When budgets are exceeded:

```
⚠️  Performance Budget Violations:
  • Performance: 85 (Budget: 90, -5)
  • Largest Contentful Paint: 2800ms (Budget: 2500ms, +300ms)
```

**Action:** Fix violations before deploying to production.

## Optimization Strategies

### 1. Image Optimization

**Already Implemented:** ✅

- OptimizedImage component with lazy loading
- WebP format support
- Responsive images
- Image compression script

**Usage:**

```typescript
import { OptimizedImage } from '@/components/OptimizedImage';

<OptimizedImage
  source={require('@/assets/photo.jpg')}
  alt="Description"
  lazy={true}
  placeholder="blur"
  width={800}
  height={600}
/>
```

### 2. Code Splitting

**Already Implemented:** ✅

- Lazy loading for routes
- Simulation screens split
- Admin panels split

**Add More:**

```typescript
// Lazy load heavy libraries
const ChartComponent = lazy(() => import('react-chartjs-2'));

// Dynamic imports
const loadHeavyLib = async () => {
  const lib = await import('heavy-library');
  return lib.default;
};
```

### 3. Resource Hints

**Add to index.html:**

```html
<head>
  <!-- Preconnect to critical origins -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://supabase.com" />

  <!-- DNS prefetch for non-critical origins -->
  <link rel="dns-prefetch" href="https://analytics.google.com" />

  <!-- Preload critical resources -->
  <link rel="preload" as="font" href="/fonts/Inter-Regular.woff2" crossorigin />
  <link rel="preload" as="image" href="/hero.jpg" />
</head>
```

### 4. Caching Strategy

**Service Worker:**

```javascript
// Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll(['/', '/index.html', '/styles.css', '/bundle.js', '/logo.png']);
    })
  );
});

// Serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

### 5. Minification & Compression

**Already Handled by Expo:** ✅

- JavaScript minification
- CSS minification
- Tree shaking

**Add gzip/brotli compression:**

Netlify automatically handles this, but verify:

```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Encoding = "br, gzip"
```

### 6. Reduce JavaScript Execution Time

**Strategies:**

```typescript
// 1. Debounce/throttle expensive operations
import { useDebounce } from '@/utils/performanceOptimization';

const debouncedSearch = useDebounce(searchQuery, 300);

// 2. Virtualize long lists
import { FlatList } from 'react-native';

<FlatList
  data={items}
  renderItem={renderItem}
  windowSize={5}  // Render only visible + 2 screens
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
/>

// 3. Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

### 7. Accessibility Improvements

**Common Fixes:**

```typescript
// Add ARIA labels
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Open menu"
  accessibilityHint="Opens the navigation menu"
  accessibilityRole="button"
>
  <Icon name="menu" />
</TouchableOpacity>

// Ensure color contrast (4.5:1 minimum)
const styles = StyleSheet.create({
  text: {
    color: '#000000',  // Black on white = 21:1 ✅
    backgroundColor: '#FFFFFF',
  },
  lowContrast: {
    color: '#CCCCCC',  // Light gray on white = 1.6:1 ❌
    // Fix: use darker color
  },
});

// Add alternative text
<Image source={logo} alt="Company Logo" />

// Support keyboard navigation
<View
  accessible={true}
  focusable={true}
  onFocus={() => setFocused(true)}
>
  <Text>Focusable content</Text>
</View>
```

### 8. SEO Optimization

**Meta Tags:**

```html
<head>
  <!-- Title (55-60 characters) -->
  <title>Medical Learning App - KP & FSP Simulations</title>

  <!-- Description (150-160 characters) -->
  <meta
    name="description"
    content="Practice KP and FSP medical simulations with comprehensive learning materials and progress tracking."
  />

  <!-- Open Graph -->
  <meta property="og:title" content="Medical Learning App" />
  <meta property="og:description" content="Practice medical simulations" />
  <meta property="og:image" content="/og-image.jpg" />
  <meta property="og:url" content="https://your-site.com" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Medical Learning App" />

  <!-- Viewport -->
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- Canonical URL -->
  <link rel="canonical" href="https://your-site.com" />
</head>
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/lighthouse.yml`:

```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build:web

      - name: Start server
        run: npx serve dist -p 8080 &

      - name: Run Lighthouse
        run: npm run lighthouse -- --url=http://localhost:8080

      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: lighthouse-reports
          path: lighthouse-reports/
```

### Netlify Deploy Previews

Add to `netlify.toml`:

```toml
[build.environment]
  NODE_VERSION = "18"

[[plugins]]
  package = "@netlify/plugin-lighthouse"

  [plugins.inputs]
    output_path = "lighthouse-reports"

  [plugins.inputs.thresholds]
    performance = 0.9
    accessibility = 0.9
    best-practices = 0.9
    seo = 0.9
```

### Pre-commit Hook

```bash
# .husky/pre-push
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run Lighthouse on production before push
npm run lighthouse:prod || {
  echo "⚠️  Lighthouse audit failed!"
  echo "Fix performance issues before pushing."
  exit 1
}
```

## Troubleshooting

### Audit Fails to Run

**Problem:** "Chrome did not launch"

**Solutions:**

1. Install Chrome/Chromium
2. Add `--no-sandbox` flag (already included)
3. Run with sudo (Linux)

```bash
# Check Chrome installation
which google-chrome
which chromium

# Install Chrome (Ubuntu/Debian)
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
```

### Low Performance Score

**Problem:** Performance < 90

**Debug:**

1. Check Network tab (large resources)
2. Check Performance tab (long tasks)
3. Run bundle analyzer
4. Check for render-blocking resources

```bash
# Analyze bundle size
npm run analyze:bundle

# Check for large dependencies
npm run analyze:metro

# Optimize images
npm run optimize:images
```

### Accessibility Issues

**Problem:** Accessibility < 90

**Common Issues:**

- Missing alt text on images
- Low color contrast
- Missing ARIA labels
- No keyboard navigation

**Tools:**

- axe DevTools browser extension
- WAVE browser extension
- Screen reader testing (NVDA, JAWS)

### Inconsistent Results

**Problem:** Scores vary between runs

**Causes:**

- Network conditions
- Background processes
- Cache state

**Solution:** Run multiple audits and average:

```bash
# Run 5 audits
for i in {1..5}; do
  npm run lighthouse >> results-$i.txt
done

# Average the scores
```

## Best Practices

### 1. Regular Auditing

- **Daily:** During active development
- **Weekly:** For stable projects
- **Before Deploy:** Always audit before production

### 2. Track Progress

```bash
# Save audit results with dates
npm run lighthouse > audits/2024-01-15.txt

# Track in git
git add audits/
git commit -m "chore: Add lighthouse audit results"
```

### 3. Set Realistic Goals

**Phase 1: Foundation (Months 1-2)**

- Performance: 70+
- Accessibility: 80+
- Best Practices: 90+
- SEO: 80+

**Phase 2: Optimization (Months 3-4)**

- Performance: 85+
- Accessibility: 90+
- Best Practices: 95+
- SEO: 90+

**Phase 3: Excellence (Months 5+)**

- All categories: 90+
- Core Web Vitals: All green
- Zero budget violations

### 4. Monitor Production

```bash
# Weekly production audits
0 0 * * 0 cd /path/to/app && npm run lighthouse:prod >> audits/prod-$(date +\%Y-\%m-\%d).txt
```

### 5. Document Issues

When audits fail:

1. Screenshot the report
2. Note the failing audits
3. Create GitHub issues
4. Link to Lighthouse report

## Related Documentation

- [Image Optimization](./IMAGE_OPTIMIZATION.md)
- [Lazy Loading](./LAZY_LOADING.md)
- [Performance Monitoring](./MONITORING.md)
- [Deployment Guide](./DEPLOYMENT.md)

## Resources

- [Web.dev Performance](https://web.dev/performance/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Core Web Vitals](https://web.dev/vitals/)
- [WebPageTest](https://www.webpagetest.org/)
