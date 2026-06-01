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

test('mobile header logo and hamburger menu work at Galaxy width', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const header = page.locator('header').first();
  await expect(header.getByRole('link', { name: /Go to home page/i })).toBeVisible();
  const headerLogo = header.locator('> div').first();
  await expect(headerLogo.getByText('RentNinja')).toBeVisible();
  await expect(headerLogo.getByText('AI')).toBeVisible();

  const menuButton = header.locator('summary[aria-controls="mobile-site-menu"]');
  await expect(menuButton).toHaveAttribute('aria-label', /Open menu|Close menu/);
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await menuButton.click();

  const menu = page.getByRole('dialog', { name: /Mobile navigation/i });
  await expect(menu).toBeVisible();
  for (const label of ['About', 'Contact', 'Sign in', 'Get started']) {
    await expect(menu.getByRole('link', { name: label })).toBeVisible();
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await menu.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/\/about$/);
});
