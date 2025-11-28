/**
 * E2E Tests: Flashcard Flow
 *
 * Tests flashcard creation, viewing, and studying
 */

import { test, expect } from '@playwright/test';

test.describe('Flashcard Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Note: May need to handle authentication first
  });

  test('should navigate to flashcard library', async ({ page }) => {
    // Look for library/flashcards navigation
    const libraryLink = page.getByRole('link', {
      name: /bibliothek|library|flashcards|karten/i,
    });

    if (await libraryLink.isVisible()) {
      await libraryLink.click();
      await expect(page).toHaveURL(/library|flashcards|bibliothek/i);
    } else {
      // Alternative: Check if already on library page
      await expect(page.getByText(/bibliothek|library|flashcards/i)).toBeVisible();
    }
  });

  test('should display flashcards if any exist', async ({ page }) => {
    await page.goto('/library');

    // Wait for content to load
    await page.waitForLoadState('networkidle');

    // Either flashcards are shown, or empty state
    const hasFlashcards = await page.getByTestId('flashcard-item').count();
    const hasEmptyState = await page.getByText(/keine karten|no cards|leer|empty/i).isVisible();

    expect(hasFlashcards > 0 || hasEmptyState).toBeTruthy();
  });

  test('should be able to search flashcards', async ({ page }) => {
    await page.goto('/library');

    const searchInput = page.getByPlaceholder(/suchen|search/i);

    if (await searchInput.isVisible()) {
      await searchInput.fill('herz');
      await page.waitForTimeout(500); // Debounce

      // Should filter results or show no results message
      const results = await page.getByTestId('flashcard-item').count();
      const noResults = await page.getByText(/keine ergebnisse|no results/i).isVisible();

      expect(results > 0 || noResults).toBeTruthy();
    }
  });

  test('should navigate to create flashcard page', async ({ page }) => {
    const createButton = page.getByRole('button', {
      name: /erstellen|create|neue karte|new card/i,
    });

    if (await createButton.isVisible()) {
      await createButton.click();

      // Should be on create page or see create form
      await expect(page.getByRole('heading', { name: /erstellen|create|neue karte/i })).toBeVisible();
    }
  });

  test('flashcard page should load without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    // Filter out known safe errors (e.g., dev-only warnings)
    const criticalErrors = errors.filter((error) => !error.includes('Download the React DevTools'));

    expect(criticalErrors).toHaveLength(0);
  });

  test('should be able to view flashcard details', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    const firstCard = page.getByTestId('flashcard-item').first();

    if (await firstCard.isVisible()) {
      await firstCard.click();

      // Should show flashcard details or study view
      await expect(page.getByText(/vorderseite|front|rückseite|back/i)).toBeVisible();
    }
  });

  test('performance: flashcard list should load quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load in less than 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });
});
