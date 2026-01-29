import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  // Next.js default title usually contains "Create Next App" or similar if not changed.
  // We will just check that it loads without error for now.
  await expect(page).toHaveTitle(/Create Next App/);
});
