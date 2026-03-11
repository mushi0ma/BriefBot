import { test, expect } from '@playwright/test';

/**
 * E2E Smoke Tests — validates that TMA loads correctly
 * and critical paths work without crashing.
 *
 * Runs in CI before every deploy.
 * Outside Telegram context, API calls return 401 — this is expected.
 */

test.describe('Smoke Tests', () => {
  test('page loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BriefBot/);
  });

  test('main layout renders with tabs', async ({ page }) => {
    await page.goto('/');

    // Wait for hydration
    await page.waitForLoadState('networkidle');

    // Tab bar should render
    const tabs = page.locator('text=История, text=Настройки, text=Шаблоны');
    await expect(page.getByText('История')).toBeVisible();
    await expect(page.getByText('Настройки')).toBeVisible();
    await expect(page.getByText('Шаблоны')).toBeVisible();
  });

  test('no hydration errors in console', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hydrationErrors = errors.filter(
      (e) =>
        e.includes('Hydration') ||
        e.includes('hydration') ||
        e.includes('did not match')
    );
    expect(hydrationErrors).toHaveLength(0);
  });

  test('no CORS errors', async ({ page }) => {
    const corsErrors: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        (msg.text().includes('CORS') || msg.text().includes('cross-origin'))
      ) {
        corsErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(corsErrors).toHaveLength(0);
  });

  test('no 404 on static assets', async ({ page }) => {
    const notFound: string[] = [];
    page.on('response', (response) => {
      if (response.status() === 404) {
        const url = response.url();
        // Ignore API 404s (expected without auth), check only assets
        if (url.includes('/_next/') || url.includes('/favicon')) {
          notFound.push(url);
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(notFound).toHaveLength(0);
  });

  test('API routes return 401 without auth (expected)', async ({ page }) => {
    const apiResponses: { url: string; status: number }[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // All API calls should return 401 (no Telegram initData)
    for (const res of apiResponses) {
      expect(res.status).toBe(401);
    }
  });

  test('tab navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click "Настройки" tab
    await page.getByText('Настройки').click();
    await page.waitForTimeout(500);

    // Click "Шаблоны" tab
    await page.getByText('Шаблоны').click();
    await page.waitForTimeout(500);

    // Click back to "История"
    await page.getByText('История').click();
    await page.waitForTimeout(500);

    // Page should still be functional (no crash)
    await expect(page.getByText('История')).toBeVisible();
  });
});
