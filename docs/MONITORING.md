# Comprehensive Monitoring Guide

Complete guide to the app's monitoring infrastructure including error tracking, performance monitoring, and health dashboards.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Error Boundaries](#error-boundaries)
4. [Performance Tracking](#performance-tracking)
5. [Monitoring Dashboard](#monitoring-dashboard)
6. [Performance Budgets](#performance-budgets)
7. [Integration Guide](#integration-guide)
8. [Best Practices](#best-practices)

## Overview

The monitoring infrastructure provides:

- **Error Tracking**: Screen-level error boundaries with automatic retry
- **Performance Monitoring**: Automatic tracking of screen loads, API calls, and renders
- **Health Dashboard**: Real-time visualization of app health and metrics
- **Performance Budgets**: Automatic alerts when performance thresholds are exceeded
- **PostHog Integration**: All metrics tracked to PostHog for analysis

## Quick Start

### Add Monitoring to a Screen

The easiest way to add full monitoring to a screen:

```typescript
import { withMonitoring } from '@/components/withMonitoring';

function MyScreen() {
  // Your screen code
}

export default withMonitoring(MyScreen, 'My Screen');
```

This automatically adds:
- Error boundary with retry logic
- Screen load time tracking
- Render performance tracking
- Error reporting to PostHog

### Track API Calls

Replace `fetch` with `trackedFetch`:

```typescript
import { trackedFetch } from '@/utils/trackedFetch';

// Use exactly like fetch
const response = await trackedFetch('/api/users', {
  method: 'GET',
});
```

For Supabase:

```typescript
import { trackedSupabaseFetch } from '@/utils/trackedFetch';

const result = await trackedSupabaseFetch(
  'users',
  'select',
  () => supabase.from('users').select('*')
);
```

### View Monitoring Dashboard

Admin users can access the monitoring dashboard at:

```
/admin/monitoring
```

## Error Boundaries

### Screen-Level Error Boundaries

Automatically added with `withMonitoring`, or use separately:

```typescript
import { withErrorBoundary } from '@/components/withErrorBoundary';

export default withErrorBoundary(MyScreen, 'My Screen');
```

**Features:**
- Catches all React errors in the screen
- Automatic retry with exponential backoff (3 attempts)
- Tracks errors to PostHog with screen context
- Stores errors for monitoring dashboard
- Doesn't crash entire app, only the screen

**Manual Usage:**

```typescript
import { ScreenErrorBoundary } from '@/components/ScreenErrorBoundary';

<ScreenErrorBoundary
  screenName="Custom Screen"
  onError={(error, errorInfo) => {
    // Custom error handling
  }}
>
  <YourComponent />
</ScreenErrorBoundary>
```

### Root-Level Error Boundary

Already configured in `app/_layout.tsx`. Catches errors that escape screen-level boundaries.

## Performance Tracking

### Automatic Screen Load Tracking

Added automatically with `withMonitoring` or `withPerformanceTracking`:

```typescript
import { withPerformanceTracking } from '@/components/withPerformanceTracking';

export default withPerformanceTracking(MyScreen, 'My Screen');
```

**Manual Tracking:**

```typescript
import { performanceTracker } from '@/utils/performanceTracking';

const tracker = performanceTracker.startScreenLoad('My Screen');
// ... screen loads
await tracker.end();
```

**React Hook:**

```typescript
import { useScreenLoadPerformance } from '@/components/withPerformanceTracking';

function MyScreen() {
  useScreenLoadPerformance('My Screen');
  // ... rest of component
}
```

### Render Performance Tracking

**Automatic (with HOC):**

```typescript
export default withPerformanceTracking(MyComponent, {
  name: 'MyComponent',
  trackRender: true,
});
```

**Manual Tracking:**

```typescript
import { performanceTracker } from '@/utils/performanceTracking';

await performanceTracker.trackRender('MyComponent', duration);
```

**React Hook:**

```typescript
import { useRenderPerformance } from '@/components/withPerformanceTracking';

function MyComponent() {
  useRenderPerformance('MyComponent');
  // ... rest of component
}
```

### API Call Tracking

**Fetch Wrapper:**

```typescript
import { trackedFetch } from '@/utils/trackedFetch';

const response = await trackedFetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

**Supabase Wrapper:**

```typescript
import { trackedSupabaseFetch } from '@/utils/trackedFetch';

const result = await trackedSupabaseFetch(
  'evaluations',
  'insert',
  () => supabase.from('evaluations').insert(data)
);
```

**Manual Tracking:**

```typescript
import { performanceTracker } from '@/utils/performanceTracking';

const start = Date.now();
const response = await myApiCall();
const duration = Date.now() - start;

await performanceTracker.trackApiCall(
  '/api/endpoint',
  'GET',
  duration,
  response.status
);
```

## Monitoring Dashboard

### Access

Admin-only dashboard at `/admin/monitoring`

### Features

**Health Status Card:**
- Overall system health (Healthy/Warning/Critical)
- Automatic status based on error rates and performance
- Last checked timestamp

**Error Metrics:**
- Errors in last 24 hours
- Error rate (errors per hour)
- Total errors tracked
- Most frequent error screen
- Trend indicator (up/down/stable)

**Performance Metrics:**
- Average screen load time
- Average API response time
- P95 load time
- Slowest screen

**PostHog Integration:**
- Direct link to PostHog dashboard
- All metrics tracked to PostHog for deeper analysis

### Health Status Criteria

**Healthy (Green):**
- Error rate < 2 errors/hour
- Average screen load < 3 seconds
- Trend stable or down

**Warning (Orange):**
- Error rate 2-5 errors/hour
- Average screen load 3-5 seconds
- Trend going up

**Critical (Red):**
- Error rate > 5 errors/hour
- Average screen load > 5 seconds
- Immediate attention required

## Performance Budgets

### Default Budgets

**Screen Load Times:**
- Good: < 1 second
- Acceptable: < 2.5 seconds
- Poor: > 5 seconds

**API Calls:**
- Good: < 500ms
- Acceptable: < 1.5 seconds
- Poor: > 3 seconds

**Render Times:**
- Good: < 16ms (60 FPS)
- Acceptable: < 33ms (30 FPS)
- Poor: > 100ms

### Budget Violations

When a metric exceeds the "poor" threshold:
1. Warning logged to console (dev mode)
2. Violation stored for dashboard
3. Alert sent to PostHog analytics
4. Visible in monitoring dashboard

### Custom Budgets

```typescript
import { PERFORMANCE_BUDGETS } from '@/utils/performanceTracking';

// View current budgets
console.log(PERFORMANCE_BUDGETS);

// Budgets are configurable in performanceTracking.ts
```

## Integration Guide

### Add Monitoring to Existing Screen

1. **Simple (Recommended):**

```typescript
// Before
export default function MyScreen() { ... }

// After
import { withMonitoring } from '@/components/withMonitoring';

function MyScreen() { ... }

export default withMonitoring(MyScreen, 'My Screen');
```

2. **Separate Error & Performance:**

```typescript
import { withErrorBoundary } from '@/components/withErrorBoundary';
import { withPerformanceTracking } from '@/components/withPerformanceTracking';

export default withErrorBoundary(
  withPerformanceTracking(MyScreen, 'My Screen'),
  'My Screen'
);
```

3. **Manual Control:**

```typescript
import { ScreenErrorBoundary } from '@/components/ScreenErrorBoundary';
import { useScreenLoadPerformance } from '@/components/withPerformanceTracking';

function MyScreen() {
  useScreenLoadPerformance('My Screen');

  return (
    <ScreenErrorBoundary screenName="My Screen">
      {/* Your screen content */}
    </ScreenErrorBoundary>
  );
}
```

### Migrate API Calls

**Before:**
```typescript
const response = await fetch('/api/users');
const data = await supabase.from('users').select('*');
```

**After:**
```typescript
import { trackedFetch, trackedSupabaseFetch } from '@/utils/trackedFetch';

const response = await trackedFetch('/api/users');

const data = await trackedSupabaseFetch('users', 'select', () =>
  supabase.from('users').select('*')
);
```

## Best Practices

### 1. Always Add Monitoring to New Screens

```typescript
// ✅ GOOD
export default withMonitoring(NewScreen, 'New Feature');

// ❌ BAD
export default function NewScreen() { ... }
```

### 2. Use Tracked Fetch for All API Calls

```typescript
// ✅ GOOD
import { trackedFetch } from '@/utils/trackedFetch';
const response = await trackedFetch('/api/endpoint');

// ❌ BAD
const response = await fetch('/api/endpoint');
```

### 3. Name Screens Consistently

```typescript
// ✅ GOOD - Clear, specific names
withMonitoring(KPSimulation, 'KP Simulation')
withMonitoring(FSPSimulation, 'FSP Simulation')

// ❌ BAD - Generic names
withMonitoring(Screen1, 'Screen')
withMonitoring(Page, 'Page')
```

### 4. Check Monitoring Dashboard Regularly

- Daily check of error rates
- Weekly review of performance trends
- Monthly analysis of budget violations

### 5. Set Up PostHog Alerts

In PostHog dashboard:
1. Go to Alerts
2. Create alert for `ERROR_OCCURRED` event
3. Set threshold (e.g., > 10 errors/hour)
4. Configure notifications (email, Slack, etc.)

### 6. Clean Up Old Metrics

Metrics are automatically trimmed to last 1000 entries. For manual cleanup:

```typescript
import { performanceTracker } from '@/utils/performanceTracking';

await performanceTracker.clearMetrics();
```

### 7. Disable in Tests

```typescript
import { performanceTracker } from '@/utils/performanceTracking';

// In test setup
performanceTracker.setEnabled(false);
```

## Troubleshooting

### Dashboard Shows No Data

**Cause:** No metrics collected yet
**Solution:** Use the app for a few minutes, then refresh dashboard

### Performance Tracking Not Working

**Check:**
1. Screen wrapped with `withMonitoring` or `withPerformanceTracking`
2. `performanceTracker.setEnabled(true)`
3. No errors in console
4. AsyncStorage permissions granted

### Error Boundary Not Catching Errors

**Check:**
1. Error occurs inside component tree
2. Component wrapped with `withErrorBoundary` or `withMonitoring`
3. Not an async error (use try/catch for those)
4. Not in event handler (wrap event handler logic in try/catch)

### API Tracking Not Recording

**Check:**
1. Using `trackedFetch` instead of `fetch`
2. API call completing successfully
3. No network errors blocking AsyncStorage

## Migration Checklist

- [ ] All screens wrapped with `withMonitoring`
- [ ] All `fetch` calls replaced with `trackedFetch`
- [ ] All Supabase calls wrapped with `trackedSupabaseFetch`
- [ ] Monitoring dashboard accessible to admins
- [ ] PostHog alerts configured
- [ ] Team trained on monitoring features
- [ ] Performance budgets reviewed and approved
- [ ] Documentation shared with team

## Support

For issues or questions:
1. Check console logs for errors
2. Review monitoring dashboard for patterns
3. Check PostHog for detailed analytics
4. Review this documentation

## Related Documentation

- [Analytics Guide](./ANALYTICS.md) - PostHog integration
- [Deployment Guide](./DEPLOYMENT.md) - Production monitoring setup
- [Architecture](./ARCHITECTURE.md) - System design overview
