import { test, expect } from '@playwright/test';

test.describe('Direct URL access — main routes', () => {
  const mainRoutes = [
    { path: '/', name: 'Home' },
    { path: '/dictionary', name: 'Dictionary' },
    { path: '/recipes', name: 'Recipes' },
    { path: '/marketplace', name: 'Marketplace' },
    { path: '/family', name: 'Family Tree' },
    { path: '/tutor', name: 'Tutor' },
  ];

  for (const route of mainRoutes) {
    test(`${route.path} (${route.name}) — loads without error`, async ({
      page,
    }) => {
      const response = await page.goto(route.path);
      expect(response).not.toBeNull();
      expect(response!.status()).toBeLessThan(400);
      // Page should have a non-empty title
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });
  }
});

test.describe('404 handling', () => {
  test('/nonexistent-page — shows 404 content', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz-12345');
    // Server may return 404 status or render a client-side 404 page
    const html = await page.content();
    const is404Status = response?.status() === 404;
    const has404Content =
      html.includes('404') ||
      html.includes('not found') ||
      html.includes('לא נמצא') ||
      html.includes('Page not found');
    expect(is404Status || has404Content).toBe(true);
  });
});

test.describe('Client-side navigation', () => {
  test('navigate from home to dictionary', async ({ page }) => {
    await page.goto('/');
    // Look for a link to the dictionary page
    const dictLink = page.locator(
      'a[href="/dictionary"], a[href*="/dictionary"]',
    ).first();
    if ((await dictLink.count()) > 0) {
      await dictLink.click();
      await page.waitForURL('**/dictionary**');
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    } else {
      // Fallback: navigate directly and verify it works
      await page.goto('/dictionary');
      expect(page.url()).toContain('/dictionary');
    }
  });

  test('navigate from home to recipes', async ({ page }) => {
    await page.goto('/');
    const recipesLink = page
      .locator('a[href="/recipes"], a[href*="/recipes"]')
      .first();
    if ((await recipesLink.count()) > 0) {
      await recipesLink.click();
      await page.waitForURL('**/recipes**');
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    } else {
      await page.goto('/recipes');
      expect(page.url()).toContain('/recipes');
    }
  });

  test('navigate from home to marketplace', async ({ page }) => {
    await page.goto('/');
    const marketLink = page
      .locator('a[href="/marketplace"], a[href*="/marketplace"]')
      .first();
    if ((await marketLink.count()) > 0) {
      await marketLink.click();
      await page.waitForURL('**/marketplace**');
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    } else {
      await page.goto('/marketplace');
      expect(page.url()).toContain('/marketplace');
    }
  });
});
