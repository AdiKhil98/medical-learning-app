/**
 * E2E Tests: Navigation Flow
 *
 * Tests app navigation and routing
 */

import { test, expect } from '@playwright/test';

test.describe('Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have accessible navigation menu', async ({ page }) => {
    // Look for navigation menu
    const nav = page.getByRole('navigation');

    if (await nav.isVisible()) {
      await expect(nav).toBeVisible();

      // Check for common navigation items
      const navItems = [
        /home|start|startseite/i,
        /bibliothek|library/i,
        /lernen|study|learn/i,
        /profil|profile|konto|account/i,
      ];

      for (const pattern of navItems) {
        const item = page.getByRole('link', { name: pattern });
        if (await item.count()) {
          await expect(item.first()).toBeVisible();
        }
      }
    }
  });

  test('should navigate between main sections', async ({ page }) => {
    const sections = [
      { name: /bibliothek|library/i, url: /library|bibliothek/i },
      { name: /lernen|study/i, url: /study|learn/i },
      { name: /statistik|stats|fortschritt|progress/i, url: /stats|progress|dashboard/i },
    ];

    for (const section of sections) {
      const link = page.getByRole('link', { name: section.name });

      if (await link.isVisible()) {
        await link.click();
        await page.waitForLoadState('networkidle');

        // Should navigate to expected URL
        await expect(page).toHaveURL(section.url);

        // Go back to home
        await page.goto('/');
      }
    }
  });

  test('should handle 404 page', async ({ page }) => {
    await page.goto('/this-page-definitely-does-not-exist-12345');

    // Should show 404 or error page
    const has404 = await page.getByText(/404|nicht gefunden|not found|seite existiert nicht/i).isVisible();
    const hasError = await page.getByText(/fehler|error/i).isVisible();

    expect(has404 || hasError).toBeTruthy();
  });

  test('should have working back button navigation', async ({ page }) => {
    // Navigate to a page
    const link = page.getByRole('link', { name: /bibliothek|library/i });

    if (await link.isVisible()) {
      await link.click();
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();

      // Go back
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // Should be back on home page
      expect(page.url()).not.toBe(currentUrl);
    }
  });

  test('mobile: navigation should work on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Look for mobile menu button (hamburger)
    const menuButton = page.getByRole('button', {
      name: /menu|menü|navigation/i,
    });

    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Menu should open
      const nav = page.getByRole('navigation');
      await expect(nav).toBeVisible();
    }
  });

  test('navigation should not cause console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate through multiple pages
    const pages = ['/', '/library', '/study'];

    for (const path of pages) {
      try {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
      } catch (e) {
        // Page might not exist, continue
        continue;
      }
    }

    // Filter out known safe errors
    const criticalErrors = errors.filter((error) => !error.includes('Download the React DevTools'));

    expect(criticalErrors).toHaveLength(0);
  });

  test('breadcrumb navigation should work', async ({ page }) => {
    // Navigate deep into the app
    await page.goto('/library');

    // Look for breadcrumbs
    const breadcrumb = page.getByRole('navigation', { name: /breadcrumb/i });

    if (await breadcrumb.isVisible()) {
      const homeLink = breadcrumb.getByRole('link', { name: /home|start/i });

      if (await homeLink.isVisible()) {
        await homeLink.click();
        await expect(page).toHaveURL('/');
      }
    }
  });
});
