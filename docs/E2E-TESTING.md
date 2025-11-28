# E2E Testing Guide

Comprehensive guide for end-to-end testing with Playwright.

## 📋 Overview

We use **Playwright** for E2E testing, which provides:

- ✅ Multi-browser testing (Chrome, Firefox, Safari)
- ✅ Mobile device emulation
- ✅ Accessibility testing with axe-core
- ✅ Performance testing
- ✅ Visual debugging with screenshots/videos
- ✅ Automatic waiting and retry logic

---

## 🚀 Quick Start

### Install Playwright Browsers

```bash
# Install all browsers
npx playwright install

# Or install only Chromium (faster)
npx playwright install chromium
```

### Run E2E Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with UI mode (recommended for development)
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed

# View HTML report
npm run test:e2e:report
```

---

## 📁 Test Structure

```
__tests__/e2e/
├── authentication.spec.ts    # Auth flow tests
├── flashcards.spec.ts        # Flashcard functionality
├── study-session.spec.ts     # Study/quiz flow
├── navigation.spec.ts        # App navigation
└── performance.spec.ts       # Performance tests
```

Each test file follows this structure:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

---

## 🧪 Writing E2E Tests

### Basic Test Example

```typescript
test('should navigate to library', async ({ page }) => {
  // Navigate to homepage
  await page.goto('/');

  // Click library link
  await page.getByRole('link', { name: /bibliothek|library/i }).click();

  // Assert URL changed
  await expect(page).toHaveURL(/library|bibliothek/i);

  // Assert content is visible
  await expect(page.getByText(/bibliothek|library/i)).toBeVisible();
});
```

### Best Practices

#### 1. **Use Defensive Checks**

Since the app is still in development, tests should gracefully handle missing features:

```typescript
test('should display flashcards if they exist', async ({ page }) => {
  await page.goto('/library');

  // Check if feature exists before testing
  const flashcards = page.getByTestId('flashcard-item');
  const count = await flashcards.count();

  if (count > 0) {
    // Test flashcard functionality
    await expect(flashcards.first()).toBeVisible();
  } else {
    // Verify empty state
    await expect(page.getByText(/keine karten|no cards/i)).toBeVisible();
  }
});
```

#### 2. **Use Role-Based Selectors**

Prefer accessibility-based selectors over CSS classes:

```typescript
// ✅ Good - accessible and resilient
await page.getByRole('button', { name: /lernen starten/i });
await page.getByRole('link', { name: /bibliothek/i });
await page.getByPlaceholder(/suchen|search/i);

// ❌ Avoid - brittle and not accessible
await page.locator('.start-button');
await page.locator('#library-link');
```

#### 3. **Test German AND English**

Use regex patterns to match both languages:

```typescript
// Matches both German and English
const button = page.getByRole('button', {
  name: /lernen starten|start learning/i,
});
```

#### 4. **Wait for Content**

Always wait for network requests to complete:

```typescript
// Wait for page to fully load
await page.goto('/library');
await page.waitForLoadState('networkidle');

// Or wait for specific content
await page.waitForSelector('[data-testid="flashcard-item"]');
```

---

## 🎭 Advanced Features

### Accessibility Testing

We integrate **axe-core** for automated accessibility testing:

```typescript
import AxeBuilder from '@axe-core/playwright';

test('homepage should be accessible', async ({ page }) => {
  await page.goto('/');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Mobile Testing

Test on mobile viewports:

```typescript
test('mobile: should work on small screens', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto('/');

  // Test mobile-specific behavior
  const menuButton = page.getByRole('button', { name: /menu/i });
  await expect(menuButton).toBeVisible();
});
```

### Performance Testing

Test load times and performance:

```typescript
test('should load quickly', async ({ page }) => {
  const startTime = Date.now();

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const loadTime = Date.now() - startTime;

  // Should load in less than 3 seconds
  expect(loadTime).toBeLessThan(3000);
});
```

### Screenshot on Failure

Playwright automatically captures screenshots on failure, but you can also do it manually:

```typescript
test('should display correctly', async ({ page }) => {
  await page.goto('/library');

  // Take screenshot for visual comparison
  await page.screenshot({ path: 'screenshots/library-page.png' });
});
```

---

## 🔧 Configuration

### playwright.config.ts

Key configuration options:

```typescript
export default defineConfig({
  // Test directory
  testDir: './__tests__/e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Retry failed tests (only in CI)
  retries: process.env.CI ? 2 : 0,

  // Base URL for tests
  use: {
    baseURL: 'http://localhost:8081',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  // Test on multiple browsers
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],

  // Auto-start dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8081',
    timeout: 120 * 1000,
  },
});
```

---

## 🔄 CI/CD Integration

E2E tests run automatically in GitHub Actions:

```yaml
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: [test, quality]

  steps:
    - name: Install Playwright browsers
      run: npx playwright install --with-deps chromium

    - name: Run E2E tests
      run: npm run test:e2e:ci
```

View test results:

- **GitHub Actions** → Workflow run → Artifacts → `playwright-report`
- Download and extract, then open `index.html`

---

## 🐛 Debugging Tests

### UI Mode (Recommended)

```bash
npm run test:e2e:ui
```

Features:

- ✅ Visual test runner
- ✅ Time-travel debugging
- ✅ Watch mode
- ✅ Step through actions

### Headed Mode

```bash
npm run test:e2e:headed
```

See the browser while tests run.

### Debug Specific Test

```bash
npx playwright test --debug authentication.spec.ts
```

### View Trace

If a test fails in CI:

1. Download `playwright-report` artifact from GitHub Actions
2. Run: `npx playwright show-trace trace.zip`

---

## 📊 Test Reports

### HTML Report

After running tests:

```bash
npm run test:e2e:report
```

Opens an interactive HTML report showing:

- ✅ Pass/fail status
- ⏱️ Test duration
- 📸 Screenshots
- 📹 Videos (on failure)
- 🔍 Trace files

### JSON Report

For programmatic access:

```bash
npm run test:e2e:ci
```

Creates `test-results/e2e-results.json` with test data.

---

## 🧩 Common Patterns

### Testing Forms

```typescript
test('should submit form', async ({ page }) => {
  await page.goto('/signup');

  // Fill form
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/passwort|password/i).fill('SecurePass123!');

  // Submit
  await page.getByRole('button', { name: /registrieren|sign up/i }).click();

  // Assert success
  await expect(page.getByText(/erfolgreich|success/i)).toBeVisible();
});
```

### Testing Navigation

```typescript
test('should navigate between pages', async ({ page }) => {
  await page.goto('/');

  // Click navigation link
  await page.getByRole('link', { name: /bibliothek/i }).click();
  await expect(page).toHaveURL(/library/i);

  // Go back
  await page.goBack();
  await expect(page).toHaveURL('/');
});
```

### Testing Search

```typescript
test('should search flashcards', async ({ page }) => {
  await page.goto('/library');

  const searchInput = page.getByPlaceholder(/suchen|search/i);
  await searchInput.fill('herz');

  // Wait for debounce
  await page.waitForTimeout(500);

  // Check results
  const results = await page.getByTestId('flashcard-item').count();
  expect(results).toBeGreaterThan(0);
});
```

### Testing Modals

```typescript
test('should open and close modal', async ({ page }) => {
  await page.goto('/');

  // Open modal
  await page.getByRole('button', { name: /erstellen|create/i }).click();

  // Modal should be visible
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();

  // Close modal
  await page.getByRole('button', { name: /schließen|close/i }).click();
  await expect(modal).not.toBeVisible();
});
```

---

## 🚨 Troubleshooting

### Tests Timeout

**Problem:** Tests hang or timeout

**Solutions:**

```bash
# Increase timeout in playwright.config.ts
timeout: 30 * 1000, // 30 seconds per test

# Or increase globally
testTimeout: 60 * 1000, // 60 seconds
```

### Dev Server Not Starting

**Problem:** `webServer` fails to start

**Solutions:**

1. Check port 8081 is not in use
2. Increase timeout: `timeout: 120 * 1000`
3. Manually start dev server: `npm run dev`

### Element Not Found

**Problem:** Selector doesn't match any elements

**Solutions:**

```typescript
// Use more flexible selectors
await page.getByText(/partial text/i);

// Check if element exists first
const element = page.getByRole('button', { name: /submit/i });
if (await element.isVisible()) {
  await element.click();
}

// Use test IDs for critical elements
await page.getByTestId('submit-button').click();
```

### Flaky Tests

**Problem:** Tests pass sometimes, fail other times

**Solutions:**

1. Add explicit waits:

   ```typescript
   await page.waitForLoadState('networkidle');
   ```

2. Use auto-waiting assertions:

   ```typescript
   await expect(element).toBeVisible(); // Waits up to 5s
   ```

3. Avoid hard-coded timeouts:

   ```typescript
   // ❌ Bad - fragile
   await page.waitForTimeout(1000);

   // ✅ Good - waits for condition
   await page.waitForSelector('[data-loaded="true"]');
   ```

---

## 📈 Coverage

E2E tests cover:

- ✅ **Authentication flow** - Sign up, login, logout
- ✅ **Flashcard management** - View, create, search
- ✅ **Study sessions** - Start, progress, complete
- ✅ **Navigation** - All major routes
- ✅ **Performance** - Load times, bundle size
- ✅ **Accessibility** - WCAG compliance
- ✅ **Mobile** - Responsive design

---

## 🎯 Next Steps

### Add More Tests

1. **User Profile**
   - Edit profile
   - Change settings
   - View statistics

2. **Advanced Features**
   - Spaced repetition
   - Progress tracking
   - Gamification

3. **Edge Cases**
   - Offline mode
   - Slow connections
   - Error states

### Visual Regression Testing

Consider adding visual regression testing with:

- **Percy** - Visual testing platform
- **Playwright visual comparisons** - Built-in screenshot diffing

```bash
npm install -D @playwright/test
```

```typescript
// Visual regression test
test('should match screenshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot();
});
```

---

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Axe Accessibility Testing](https://www.deque.com/axe/)
- [Testing Library](https://testing-library.com/)

---

**Happy Testing! 🎉**
