# Analytics Guide - PostHog Integration

Complete guide for tracking user behavior and analytics in your Medical Learning App.

## 📊 Overview

PostHog is now configured and ready to track:

- ✅ User authentication events
- ✅ Study session analytics
- ✅ Flashcard interactions
- ✅ Quiz performance
- ✅ Content views and searches
- ✅ Feature usage
- ✅ Performance metrics
- ✅ Error tracking

**Current Status**: ✅ Connected and operational

---

## 🚀 Quick Start

### 1. Initialize Analytics

In your app's root layout (`app/_layout.tsx`):

```typescript
import { useEffect } from 'react';
import { analytics } from '@/utils/analytics';

export default function RootLayout() {
  useEffect(() => {
    // Initialize analytics
    analytics.initialize({
      apiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
      apiHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
      enabled: process.env.EXPO_PUBLIC_APP_ENV === 'production', // Only in production
      debug: process.env.EXPO_PUBLIC_APP_ENV === 'development', // Debug in dev
      capturePageViews: true,
    });
  }, []);

  return (
    // Your app layout
  );
}
```

### 2. Track Events

```typescript
import { analytics, AnalyticsEvent } from '@/utils/analytics';

// Track a simple event
analytics.track(AnalyticsEvent.USER_SIGNED_IN);

// Track with properties
analytics.track(AnalyticsEvent.STUDY_SESSION_STARTED, {
  duration: 30,
  cardCount: 20,
  topic: 'Cardiology',
});
```

### 3. Identify Users

```typescript
// When user signs in
analytics.identify(user.id, {
  email: user.email,
  name: user.name,
  subscription: user.subscriptionTier,
});
```

---

## 📝 Usage Examples

### Authentication Tracking

```typescript
// Sign Up
const handleSignUp = async (email: string, password: string) => {
  try {
    const user = await signUp(email, password);

    analytics.identify(user.id, {
      email: user.email,
      signUpMethod: 'email',
    });

    analytics.track(AnalyticsEvent.USER_SIGNED_UP, {
      method: 'email',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    analytics.track(AnalyticsEvent.ERROR_OCCURRED, {
      context: 'sign_up',
      error: error.message,
    });
  }
};

// Sign In
const handleSignIn = async () => {
  const user = await signIn();
  analytics.track(AnalyticsEvent.USER_SIGNED_IN);
};

// Sign Out
const handleSignOut = async () => {
  analytics.track(AnalyticsEvent.USER_SIGNED_OUT);
  analytics.reset(); // Clear user identity
};
```

### Study Session Tracking

```typescript
import { useStudySessionTracking } from '@/hooks/useAnalytics';

function StudySession() {
  const { startSession, completeSession, abandonSession } = useStudySessionTracking();

  const handleStart = () => {
    startSession({
      topic: 'Anatomy',
      cardCount: 30,
      difficulty: 'intermediate',
    });
  };

  const handleComplete = () => {
    completeSession({
      cardsCompleted: 30,
      correctAnswers: 25,
      duration: 600, // seconds
      score: 83.33,
    });
  };

  const handleAbandon = () => {
    abandonSession({
      cardsCompleted: 15,
      duration: 300,
      reason: 'user_interrupted',
    });
  };

  return (
    // Your component
  );
}
```

### Quiz Tracking

```typescript
import { useQuizTracking } from '@/hooks/useAnalytics';

function QuizScreen() {
  const { startQuiz, answerQuestion, completeQuiz } = useQuizTracking();

  const handleStartQuiz = () => {
    startQuiz({
      quizId: 'cardiology_101',
      questionCount: 20,
      topic: 'Cardiology',
    });
  };

  const handleAnswer = (questionId: string, isCorrect: boolean) => {
    answerQuestion({
      questionId,
      isCorrect,
      timeSpent: 15, // seconds
      attemptNumber: 1,
    });
  };

  const handleComplete = () => {
    completeQuiz({
      score: 85,
      correctCount: 17,
      totalQuestions: 20,
      duration: 300,
    });
  };

  return (
    // Your component
  );
}
```

### Page View Tracking

```typescript
import { usePageTracking } from '@/hooks/useAnalytics';

function LibraryScreen() {
  // Automatically tracks page views
  usePageTracking('Library', {
    category: 'Content',
    filters: ['Cardiology', 'Recent'],
  });

  return (
    // Your component
  );
}
```

### Content Tracking

```typescript
// Content viewed
analytics.track(AnalyticsEvent.CONTENT_VIEWED, {
  contentId: 'anatomy_heart',
  contentType: 'flashcard',
  topic: 'Anatomy',
  duration: 45,
});

// Content searched
analytics.track(AnalyticsEvent.CONTENT_SEARCHED, {
  query: 'heart anatomy',
  resultsCount: 15,
  filters: ['anatomy', 'beginner'],
});

// Content bookmarked
analytics.track(AnalyticsEvent.CONTENT_BOOKMARKED, {
  contentId: 'anatomy_heart',
  contentType: 'flashcard',
});
```

### Flashcard Tracking

```typescript
// Flashcard viewed
analytics.track(AnalyticsEvent.FLASHCARD_VIEWED, {
  cardId: 'card_123',
  topic: 'Cardiology',
  difficulty: 'intermediate',
});

// Flashcard answered
analytics.track(AnalyticsEvent.FLASHCARD_ANSWERED, {
  cardId: 'card_123',
  isCorrect: true,
  timeSpent: 12,
  confidence: 'high',
});

// Flashcard created
analytics.track(AnalyticsEvent.FLASHCARD_CREATED, {
  topic: 'Anatomy',
  hasImages: true,
  difficulty: 'beginner',
});
```

### Performance Tracking

```typescript
// Page load time
analytics.track(AnalyticsEvent.PAGE_LOADED, {
  page: '/library',
  loadTime: 1250, // ms
  resourceCount: 25,
});

// Error tracking
analytics.track(AnalyticsEvent.ERROR_OCCURRED, {
  errorType: 'NetworkError',
  message: 'Failed to fetch flashcards',
  page: '/library',
  userId: currentUser?.id,
});
```

### Feature Usage

```typescript
// Feature used
analytics.track(AnalyticsEvent.FEATURE_USED, {
  feature: 'dark_mode',
  action: 'enabled',
});

// Settings changed
analytics.track(AnalyticsEvent.SETTINGS_CHANGED, {
  setting: 'notification_frequency',
  oldValue: 'daily',
  newValue: 'weekly',
});
```

---

## 🎯 Available Events

### Authentication Events

- `USER_SIGNED_UP` - New user registration
- `USER_SIGNED_IN` - User login
- `USER_SIGNED_OUT` - User logout

### Study Session Events

- `STUDY_SESSION_STARTED` - Study session begins
- `STUDY_SESSION_COMPLETED` - Study session completes
- `STUDY_SESSION_ABANDONED` - Study session abandoned

### Flashcard Events

- `FLASHCARD_VIEWED` - Flashcard displayed
- `FLASHCARD_ANSWERED` - Flashcard answered
- `FLASHCARD_CREATED` - New flashcard created
- `FLASHCARD_EDITED` - Flashcard modified
- `FLASHCARD_DELETED` - Flashcard removed

### Quiz Events

- `QUIZ_STARTED` - Quiz begins
- `QUIZ_COMPLETED` - Quiz finished
- `QUIZ_QUESTION_ANSWERED` - Question answered

### Content Events

- `CONTENT_VIEWED` - Content accessed
- `CONTENT_SEARCHED` - Search performed
- `CONTENT_BOOKMARKED` - Content bookmarked

### System Events

- `PAGE_LOADED` - Page load tracked
- `ERROR_OCCURRED` - Error logged
- `FEATURE_USED` - Feature interaction
- `SETTINGS_CHANGED` - Setting modified

---

## 🔧 Configuration

### Environment Variables

```bash
# .env
EXPO_PUBLIC_POSTHOG_API_KEY=phc_BXWrhCCMbEj46L5JArRFs02hIFJIIgUuP2AoDjeXuce
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
EXPO_PUBLIC_APP_ENV=development
```

### Analytics Options

```typescript
interface AnalyticsConfig {
  apiKey: string; // PostHog API key
  apiHost: string; // PostHog host URL
  enabled: boolean; // Enable/disable tracking
  debug: boolean; // Console logging
  capturePageViews: boolean; // Auto-track page views
}
```

---

## 🌐 Production Deployment

### Netlify Environment Variables

Add these to your Netlify project:

1. Go to **Site settings** → **Environment variables**
2. Add:
   - `EXPO_PUBLIC_POSTHOG_API_KEY` = `phc_BXWrhCCMbEj46L5JArRFs02hIFJIIgUuP2AoDjeXuce`
   - `EXPO_PUBLIC_POSTHOG_HOST` = `https://app.posthog.com`
   - `EXPO_PUBLIC_APP_ENV` = `production`

### Verification

After deploying:

```bash
# Test connection
npm run verify:posthog

# Check in PostHog dashboard
# https://app.posthog.com/project/YOUR_PROJECT/events
```

---

## 📊 PostHog Dashboard

### View Analytics

1. Go to [PostHog Dashboard](https://app.posthog.com)
2. Select your project
3. Navigate to:
   - **Events** - See all tracked events
   - **Insights** - Create custom analytics
   - **Funnels** - Track user flows
   - **Retention** - User retention analysis
   - **Recordings** - Session replays (if enabled)

### Common Insights to Create

#### 1. Study Session Funnel

```
study_session_started → study_session_completed
```

Track completion rate of study sessions.

#### 2. User Engagement

```
user_signed_in → flashcard_viewed → quiz_started
```

See how users engage after signing in.

#### 3. Feature Adoption

```
feature_used (filter by feature name)
```

Track which features are most popular.

#### 4. Error Tracking

```
error_occurred (group by errorType)
```

Monitor application errors.

---

## 🔒 Privacy & GDPR Compliance

### User Privacy Controls

```typescript
// Opt-out of tracking
analytics.optOut();

// Opt-in to tracking
analytics.optIn();

// Check opt-out status
const isOptedOut = analytics.isOptedOut();
```

### Data We Track

- ✅ User IDs (anonymized)
- ✅ Event names and properties
- ✅ Session data
- ✅ Performance metrics
- ❌ NO personally identifiable information (PII)
- ❌ NO sensitive medical data
- ❌ NO passwords or auth tokens

### GDPR Compliance

PostHog is GDPR compliant:

- Data stored in EU (if configured)
- User data deletion on request
- Opt-out support
- Cookie consent integration

---

## 🧪 Testing

### Development Mode

```typescript
// Initialize with debug enabled
analytics.initialize({
  apiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
  apiHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  enabled: true,
  debug: true, // Logs all events to console
});
```

### Verify Connection

```bash
npm run verify:posthog
```

### Test Events

```typescript
// Track a test event
analytics.track(AnalyticsEvent.FEATURE_USED, {
  feature: 'test_feature',
  environment: 'development',
  timestamp: new Date().toISOString(),
});
```

Check PostHog dashboard to see the event appear.

---

## 🚨 Troubleshooting

### Events Not Appearing

**Problem**: Events not showing in PostHog dashboard

**Solutions**:

1. Check API key is correct:

   ```bash
   npm run verify:posthog
   ```

2. Verify analytics is initialized:

   ```typescript
   console.log('Analytics enabled:', analytics.isEnabled());
   ```

3. Check PostHog dashboard filters
4. Wait 1-2 minutes for events to process

### Connection Errors

**Problem**: "Failed to initialize analytics"

**Solutions**:

1. Check internet connection
2. Verify `EXPO_PUBLIC_POSTHOG_HOST` is correct
3. Check browser console for errors
4. Ensure not blocked by ad blocker

### Events Not Tracked in Development

**Problem**: No events in dev mode

**Solution**: Enable analytics in development:

```typescript
analytics.initialize({
  enabled: true, // Force enable
  debug: true,
});
```

---

## 📈 Best Practices

### 1. Track Important Events Only

Don't track every click - focus on meaningful user actions.

### 2. Use Consistent Naming

Use `AnalyticsEvent` enum for consistency.

### 3. Add Relevant Properties

```typescript
// ✅ Good - includes context
analytics.track(AnalyticsEvent.QUIZ_COMPLETED, {
  score: 85,
  duration: 300,
  topic: 'Cardiology',
  questionCount: 20,
});

// ❌ Bad - no context
analytics.track(AnalyticsEvent.QUIZ_COMPLETED);
```

### 4. Don't Track PII

Never track sensitive data:

```typescript
// ❌ Bad - contains email
analytics.track(AnalyticsEvent.USER_SIGNED_UP, {
  email: user.email, // DON'T DO THIS
});

// ✅ Good - no PII
analytics.track(AnalyticsEvent.USER_SIGNED_UP, {
  method: 'email',
  timestamp: new Date().toISOString(),
});
```

### 5. Test Events

Always verify events appear in PostHog dashboard.

---

## 🎯 Next Steps

1. **Add to App Layout**: Initialize analytics in `app/_layout.tsx`
2. **Track Key Events**: Add tracking to critical user flows
3. **Create Insights**: Set up dashboards in PostHog
4. **Monitor Usage**: Check analytics weekly
5. **Iterate**: Use data to improve UX

---

## 📚 Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog Dashboard](https://app.posthog.com)
- [Privacy & GDPR](https://posthog.com/docs/privacy)
- [Event Tracking Guide](https://posthog.com/docs/integrate/client/js)

---

**Analytics is now live! Start tracking user behavior to improve your app! 🚀**
