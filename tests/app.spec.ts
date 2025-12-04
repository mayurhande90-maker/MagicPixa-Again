import { test, expect } from '@playwright/test';

test.describe('MagicPixa Sanity Checks', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Homepage loads with correct title', async ({ page }) => {
    // Check for the main hero text
    await expect(page.getByText('Create Stunning Visuals')).toBeVisible();
    
    // Check for the CTA button
    const ctaButton = page.getByRole('button', { name: /Start Creating/i });
    await expect(ctaButton).toBeVisible();
  });

  test('Feature Grid renders critical tools', async ({ page }) => {
    // Scroll down to features (optional, but good for visibility in UI mode)
    await page.getByText('Everything You Need to Create').scrollIntoViewIfNeeded();

    // Check if "Pixa Product Shots" card exists
    await expect(page.getByText('Pixa Product Shots')).toBeVisible();
    
    // Check if "Pixa AdMaker" card exists
    await expect(page.getByText('Pixa AdMaker')).toBeVisible();
  });

  test('Pricing Section is visible', async ({ page }) => {
    // Navigate using the header link
    await page.getByRole('button', { name: 'Pricing' }).first().click();
    
    // Check for a specific pack
    await expect(page.getByText('Creator Pack')).toBeVisible();
    await expect(page.getByText('Recharge Your Creative Energy')).toBeVisible();
  });

  test('Auth Modal opens on CTA click', async ({ page }) => {
    // Click the main CTA since we aren't logged in
    await page.getByRole('button', { name: /Start Creating/i }).first().click();
    
    // The auth modal should appear
    await expect(page.getByText('Sign In to Continue')).toBeVisible();
    await expect(page.getByText('Sign In with Google')).toBeVisible();
  });

});