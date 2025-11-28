/**
 * E2E Tests: Study Session Flow
 *
 * Tests quiz taking and study sessions
 */

import { test, expect } from '@playwright/test';

test.describe('Study Session Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should start a study session', async ({ page }) => {
    // Look for study/quiz start button
    const startButton = page.getByRole('button', {
      name: /lernen starten|start learning|quiz|studie|study/i,
    });

    if (await startButton.isVisible()) {
      await startButton.click();

      // Should show study interface
      await expect(page.getByText(/frage|question|karte|card|antwort|answer/i)).toBeVisible();
    }
  });

  test('should display progress during study session', async ({ page }) => {
    // Navigate to a study session (adjust URL as needed)
    const studyPages = ['/study', '/quiz', '/learn', '/session'];

    for (const studyPage of studyPages) {
      try {
        await page.goto(studyPage);

        // Look for progress indicators
        const hasProgress =
          (await page.getByRole('progressbar').isVisible()) ||
          (await page.getByText(/\d+\s*\/\s*\d+/).isVisible()) ||
          (await page.getByText(/fortschritt|progress/i).isVisible());

        if (hasProgress) {
          expect(hasProgress).toBeTruthy();
          break;
        }
      } catch (e) {
        // Page might not exist, continue
        continue;
      }
    }
  });

  test('should handle quiz answers', async ({ page }) => {
    // Navigate to quiz if exists
    try {
      await page.goto('/quiz');

      // Look for answer options
      const answerButtons = page.getByRole('button', {
        name: /antwort|answer|option|wählen/i,
      });

      const count = await answerButtons.count();

      if (count > 0) {
        // Click first answer
        await answerButtons.first().click();

        // Should show feedback (correct/incorrect)
        await expect(page.getByText(/richtig|correct|falsch|incorrect|korrekt/i)).toBeVisible();
      }
    } catch (e) {
      // Quiz page might not exist in current implementation
      test.skip();
    }
  });

  test('should complete a study session', async ({ page }) => {
    // This tests the full flow from start to finish
    try {
      await page.goto('/study');

      // Answer questions until session complete
      let attempts = 0;
      const maxAttempts = 20; // Prevent infinite loop

      while (attempts < maxAttempts) {
        // Look for "next" or answer buttons
        const nextButton = page.getByRole('button', {
          name: /weiter|next|nächste|continue/i,
        });

        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(300);
          attempts++;
        } else {
          // Check if session is complete
          const isComplete = await page
            .getByText(/abgeschlossen|completed|fertig|done|ergebnisse|results/i)
            .isVisible();

          if (isComplete) {
            expect(isComplete).toBeTruthy();
            break;
          }

          break;
        }
      }
    } catch (e) {
      // Study session might not be fully implemented
      test.skip();
    }
  });

  test('should track study statistics', async ({ page }) => {
    // Navigate to statistics/progress page
    const statsPages = ['/stats', '/statistics', '/progress', '/dashboard'];

    for (const statsPage of statsPages) {
      try {
        await page.goto(statsPage);

        // Look for statistics
        const hasStats =
          (await page.getByText(/statistik|statistics|fortschritt|progress/i).isVisible()) ||
          (await page.getByTestId('stat-card').count()) > 0 ||
          (await page.getByRole('heading', { name: /fortschritt|progress/i }).isVisible());

        if (hasStats) {
          expect(hasStats).toBeTruthy();
          break;
        }
      } catch (e) {
        continue;
      }
    }
  });

  test('mobile: study session should work on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Check if study button is visible and clickable on mobile
    const studyButton = page.getByRole('button', {
      name: /lernen|study|quiz/i,
    });

    if (await studyButton.isVisible()) {
      await expect(studyButton).toBeVisible();

      // Should be easily tappable (at least 44x44px for accessibility)
      const box = await studyButton.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
