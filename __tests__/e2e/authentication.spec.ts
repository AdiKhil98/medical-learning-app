/**
 * E2E Tests: User Authentication Flow
 *
 * Tests critical user authentication journeys
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage without errors', async ({ page }) => {
    await expect(page).toHaveTitle(/MedMeister/i);

    // Check for no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('should navigate to sign up page', async ({ page }) => {
    // Look for sign up link/button
    const signUpButton = page.getByRole('link', { name: /registrieren|sign up|anmelden/i });
    await signUpButton.click();

    // Should navigate to sign up page
    await expect(page).toHaveURL(/signup|register/i);
  });

  test('should show validation errors for invalid sign up', async ({ page }) => {
    await page.goto('/signup');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /registrieren|sign up/i });
    await submitButton.click();

    // Should show validation errors
    await expect(page.getByText(/erforderlich|required|pflichtfeld/i).first()).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    const loginButton = page.getByRole('link', { name: /anmelden|login|einloggen/i });
    await loginButton.click();

    await expect(page).toHaveURL(/login|signin/i);
  });

  test('homepage should be accessible', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
