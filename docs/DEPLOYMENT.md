# Production Deployment Guide

Complete guide to deploying your Medical Learning App to production.

## 📋 Prerequisites

Before deploying, ensure you have:

- [ ] GitHub repository set up and pushed
- [ ] Supabase project created
- [ ] Sentry account created (optional but recommended)
- [ ] Analytics platform account (PostHog recommended)
- [ ] Domain name (optional)

---

## 🚀 Deployment Options

### Option 1: Vercel (Recommended for Web)

**Why Vercel?**

- Zero configuration for Next.js/Expo web
- Automatic HTTPS
- Global CDN
- Preview deployments for PRs
- Free tier available

#### Steps:

1. **Sign up for Vercel**

   ```bash
   # Install Vercel CLI
   npm install -g vercel
   ```

2. **Connect Your Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Select "medical-learning-app"

3. **Configure Build Settings**

   ```
   Framework Preset: Other
   Build Command: npm run build:web
   Output Directory: dist
   Install Command: npm install
   ```

4. **Add Environment Variables** (see Environment Variables section below)

5. **Deploy**

   ```bash
   # Deploy from CLI
   vercel

   # Or click "Deploy" in Vercel dashboard
   ```

6. **Custom Domain (Optional)**
   - In Vercel dashboard → Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

---

### Option 2: Netlify

**Why Netlify?**

- Simple static site hosting
- Built-in forms
- Edge functions
- Free SSL

#### Steps:

1. **Sign up for Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Connect GitHub account

2. **New Site from Git**
   - Select your repository
   - Build settings:
     ```
     Build command: npm run build:web
     Publish directory: dist
     ```

3. **Environment Variables**
   - Site Settings → Build & Deploy → Environment
   - Add all required variables

4. **Deploy**
   - Click "Deploy site"
   - Netlify will build and deploy automatically

---

## 🔐 Environment Variables Setup

### Required Variables

Create a `.env.production` file (don't commit this!):

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Sentry Configuration (Error Monitoring)
EXPO_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name

# Analytics Configuration (PostHog)
EXPO_PUBLIC_POSTHOG_API_KEY=phc_your_api_key
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Application Configuration
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_API_URL=https://your-api.com
```

### How to Get Each Variable:

#### 1. Supabase Variables

```bash
# 1. Go to https://supabase.com/dashboard
# 2. Select your project
# 3. Settings → API
# 4. Copy:
#    - Project URL (EXPO_PUBLIC_SUPABASE_URL)
#    - anon/public key (EXPO_PUBLIC_SUPABASE_ANON_KEY)
```

#### 2. Sentry Variables

```bash
# 1. Go to https://sentry.io
# 2. Create account / Sign in
# 3. Create new project → select "React"
# 4. Copy DSN from Project Settings
# 5. Create Auth Token:
#    - Settings → Account → API → Auth Tokens
#    - Create New Token with "project:write" scope
```

#### 3. PostHog Variables

```bash
# 1. Go to https://posthog.com
# 2. Create account / Sign in
# 3. Create new project
# 4. Copy API Key from Project Settings
# 5. For self-hosted, use your PostHog instance URL
```

---

## 📱 Mobile App Deployment

### iOS App Store

1. **Prerequisites**
   - Apple Developer Account ($99/year)
   - Mac computer with Xcode

2. **Build iOS App**

   ```bash
   # Configure credentials
   eas build:configure

   # Build for iOS
   eas build --platform ios
   ```

3. **Submit to App Store**
   ```bash
   eas submit --platform ios
   ```

### Google Play Store

1. **Prerequisites**
   - Google Play Developer Account ($25 one-time)

2. **Build Android App**

   ```bash
   # Build for Android
   eas build --platform android
   ```

3. **Submit to Play Store**
   ```bash
   eas submit --platform android
   ```

---

## 🔧 Post-Deployment Configuration

### 1. Initialize Analytics

Add to your `app/_layout.tsx`:

```typescript
import { analytics } from '@/utils/analytics';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    // Initialize analytics
    analytics.initialize({
      apiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
      apiHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
      enabled: process.env.EXPO_PUBLIC_APP_ENV === 'production',
      debug: false,
      capturePageViews: true,
    });
  }, []);

  // ... rest of your layout
}
```

### 2. Initialize Sentry

Already set up in `utils/sentry.ts`, but verify:

```typescript
import { initializeSentry } from '@/utils/sentry';

// In app/_layout.tsx
useEffect(() => {
  initializeSentry();
}, []);
```

### 3. Enable Performance Monitoring

The performance monitor auto-initializes. Verify it's working:

```typescript
import { performanceMonitor } from '@/utils/performanceMonitoring';

// Check metrics in console (development only)
console.log(performanceMonitor.getSummary());
```

---

## 🧪 Pre-Deployment Checklist

Before going live, verify:

- [ ] **Tests Pass**

  ```bash
  npm run test:ci
  ```

- [ ] **Linting Passes**

  ```bash
  npm run lint
  ```

- [ ] **Build Succeeds**

  ```bash
  npm run build:web
  ```

- [ ] **TypeScript Check**

  ```bash
  npx tsc --noEmit
  ```

- [ ] **Environment Variables Set**
  - All production variables configured
  - No secrets in code

- [ ] **Error Monitoring Active**
  - Sentry DSN configured
  - Test error reporting works

- [ ] **Analytics Configured**
  - PostHog API key set
  - Events tracking correctly

- [ ] **Database Migrations Applied**
  ```bash
  # Run Supabase migrations
  npx supabase db push
  ```

---

## 📊 Monitoring Your Deployment

### 1. Sentry Dashboard

- https://sentry.io/organizations/your-org/issues/
- Monitor errors in real-time
- Set up alerts for critical errors

### 2. PostHog Analytics

- https://app.posthog.com/
- Track user behavior
- Monitor feature adoption
- Analyze user flows

### 3. Vercel Analytics

- Vercel Dashboard → Analytics
- Page load times
- Core Web Vitals
- Geographic distribution

### 4. Supabase Dashboard

- https://supabase.com/dashboard
- Monitor database performance
- Check API usage
- Review logs

---

## 🚨 Troubleshooting

### Build Fails

**Error: Missing environment variables**

```bash
# Solution: Add all required env vars to Vercel/Netlify
# Check: Settings → Environment Variables
```

**Error: Out of memory**

```bash
# Solution: Increase Node memory
# In package.json:
"build:web": "NODE_OPTIONS=--max-old-space-size=4096 expo export --platform web"
```

### Runtime Errors

**Error: Supabase connection failed**

```bash
# Check:
1. EXPO_PUBLIC_SUPABASE_URL is correct
2. EXPO_PUBLIC_SUPABASE_ANON_KEY is correct
3. Supabase project is not paused
```

**Error: Analytics not tracking**

```bash
# Check:
1. EXPO_PUBLIC_POSTHOG_API_KEY is set
2. PostHog project is active
3. Check browser console for errors
```

### Performance Issues

**Slow page loads**

```bash
# Solutions:
1. Enable Vercel Edge Caching
2. Optimize images (use Next.js Image component)
3. Code splitting with dynamic imports
4. Check Lighthouse report
```

---

## 🔄 Continuous Deployment

### Automatic Deployments

Vercel/Netlify automatically deploy on push to `main`:

1. **Push to Main**

   ```bash
   git push origin main
   ```

2. **Deployment Pipeline**
   - CI/CD runs tests
   - Build succeeds
   - Deploy to production
   - Preview URL generated

3. **Preview Deployments**
   - Every PR gets a preview URL
   - Test before merging
   - Share with team for review

### Manual Deployments

```bash
# Vercel
vercel --prod

# Or trigger from Vercel dashboard
# Deployments → Redeploy
```

---

## 📈 Performance Optimization

### After Deployment

1. **Run Lighthouse Audit**

   ```bash
   # Install Lighthouse
   npm install -g lighthouse

   # Run audit
   lighthouse https://your-app.com --view
   ```

2. **Check Core Web Vitals**
   - Use Google PageSpeed Insights
   - Target: All metrics "Good" (green)

3. **Monitor Bundle Size**

   ```bash
   # Analyze bundle
   npm run build:web
   npx expo export:embed --platform web --analyze
   ```

4. **Set up Performance Budgets**
   ```json
   // In package.json
   "performance": {
     "maxBundleSize": "500kb",
     "maxInitialLoad": "2s"
   }
   ```

---

## 🎯 Success Metrics

After 1 week of production:

- [ ] **Error Rate**: < 1%
- [ ] **Load Time**: < 3s (LCP)
- [ ] **Core Web Vitals**: All "Good"
- [ ] **Uptime**: > 99.9%
- [ ] **User Satisfaction**: Track NPS/feedback

---

## 🆘 Support

If you encounter issues:

1. **Check Logs**
   - Vercel: Dashboard → Deployments → View Logs
   - Sentry: Error reports
   - Browser Console: Client-side errors

2. **Review Documentation**
   - [Vercel Docs](https://vercel.com/docs)
   - [Expo Docs](https://docs.expo.dev)
   - [Supabase Docs](https://supabase.com/docs)

3. **Community Help**
   - Expo Forums
   - Stack Overflow
   - GitHub Issues

---

## 🎉 Next Steps

After successful deployment:

1. **Add Custom Domain**
2. **Set Up Email Notifications** (Sentry alerts)
3. **Enable Automated Backups** (Supabase)
4. **Create Staging Environment**
5. **Set Up Monitoring Dashboards**
6. **Plan Feature Rollouts**

---

**Congratulations! Your app is now live! 🚀**
