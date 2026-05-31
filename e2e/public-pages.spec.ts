import { expect, test } from '@playwright/test';

test('landing page explains the RentNinja product promise', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/RentNinja AI/);
  await expect(
    page.getByRole('heading', { name: /Pick the strongest rental applicant faster/i }),
  ).toBeVisible();
  await expect(page.getByText(/turns messy applications, messages, and documents/i)).toBeVisible();
  await expect(page.getByText(/Why RentNinja AI is different/i)).toBeVisible();
});

test('pricing page loads premium plan cards without production credentials', async ({ page }) => {
  await page.goto('/pricing', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /Simple pricing/i })).toBeVisible();
  const pricing = page.locator('main');
  for (const plan of ['Starter', 'Pro', 'Business', 'Agency']) {
    await expect(pricing.getByText(plan, { exact: true }).first()).toBeVisible();
  }
});

test('about page uses the public brand shell', async ({ page }) => {
  await page.goto('/about');

  await expect(
    page.getByRole('heading', { name: /Built to help landlords sort through applicants faster/i }),
  ).toBeVisible();
  await expect(page.getByText(/landlords, property managers, and leasing/i)).toBeVisible();
});
