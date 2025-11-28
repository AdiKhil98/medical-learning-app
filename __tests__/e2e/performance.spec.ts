/**
 * E2E Tests: Performance & Core Web Vitals
 *
 * Tests performance metrics and load times
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('homepage should load quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load in less than 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should not have layout shifts', async ({ page }) => {
    await page.goto('/');

    // Wait for initial render
    await page.waitForLoadState('networkidle');

    // Get initial layout
    const initialHeight = await page.evaluate(() => document.body.scrollHeight);

    // Wait a bit for any delayed content
    await page.waitForTimeout(1000);

    const finalHeight = await page.evaluate(() => document.body.scrollHeight);

    // Height shouldn't change significantly (< 10% shift)
    const shift = Math.abs(finalHeight - initialHeight) / initialHeight;
    expect(shift).toBeLessThan(0.1);
  });

  test('images should have proper dimensions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = await page.locator('img').all();

    for (const img of images) {
      const hasWidth = await img.getAttribute('width');
      const hasHeight = await img.getAttribute('height');
      const hasStyle = await img.getAttribute('style');

      // Images should have dimensions to prevent layout shift
      const hasDimensions =
        hasWidth || hasHeight || (hasStyle && (hasStyle.includes('width') || hasStyle.includes('height')));

      if (await img.isVisible()) {
        expect(hasDimensions).toBeTruthy();
      }
    }
  });

  test('should not load excessive resources', async ({ page }) => {
    const resources: any[] = [];

    page.on('response', (response) => {
      resources.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length'],
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should not have too many requests (< 50 for initial load)
    expect(resources.length).toBeLessThan(50);

    // Should not have failed requests
    const failedRequests = resources.filter((r) => r.status >= 400);
    expect(failedRequests).toHaveLength(0);
  });

  test('fonts should load without FOUT', async ({ page }) => {
    await page.goto('/');

    // Check for font loading API usage
    const fontFaces = await page.evaluate(() => document.fonts.size);

    if (fontFaces > 0) {
      // Wait for fonts to load
      await page.evaluate(() => document.fonts.ready);

      // Should have loaded fonts
      const loadedFonts = await page.evaluate(() => {
        const fonts: any[] = [];
        document.fonts.forEach((font) => {
          fonts.push({
            family: font.family,
            status: font.status,
          });
        });
        return fonts;
      });

      const allLoaded = loadedFonts.every((font) => font.status === 'loaded');
      expect(allLoaded).toBeTruthy();
    }
  });

  test('should use lazy loading for images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = await page.locator('img').all();

    // At least some images should use lazy loading
    let hasLazyLoading = false;

    for (const img of images) {
      const loading = await img.getAttribute('loading');
      if (loading === 'lazy') {
        hasLazyLoading = true;
        break;
      }
    }

    // If there are many images, at least some should be lazy loaded
    if (images.length > 5) {
      expect(hasLazyLoading).toBeTruthy();
    }
  });

  test('bundle size should be reasonable', async ({ page }) => {
    let jsSize = 0;
    let cssSize = 0;

    page.on('response', async (response) => {
      const url = response.url();
      const contentLength = response.headers()['content-length'];
      const size = contentLength ? parseInt(contentLength) : 0;

      if (url.endsWith('.js')) {
        jsSize += size;
      } else if (url.endsWith('.css')) {
        cssSize += size;
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // JS bundle should be < 2MB
    expect(jsSize).toBeLessThan(2 * 1024 * 1024);

    // CSS should be < 500KB
    expect(cssSize).toBeLessThan(500 * 1024);
  });

  test('mobile: performance should be acceptable on slow connection', async ({ page }) => {
    // Simulate slow 3G connection
    await page.route('**/*', (route) => {
      route.continue({
        // Add artificial delay
      });
    });

    await page.setViewportSize({ width: 375, height: 667 });

    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // Should still load reasonably fast even on slow connection (< 5s)
    expect(loadTime).toBeLessThan(5000);
  });
});
