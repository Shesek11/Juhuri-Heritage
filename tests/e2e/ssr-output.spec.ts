import { test, expect } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test.describe('SSR content — JavaScript disabled', () => {
  test('/ — hero section contains Hebrew heritage text', async ({ page }) => {
    await page.goto('/');
    const html = await page.content();
    // The homepage should render heritage-related Hebrew text server-side
    const hasHeroText =
      html.includes('מורשת') ||
      html.includes("ג'והורי") ||
      html.includes('ג׳והורי') ||
      html.includes('יהודי');
    expect(hasHeroText).toBe(true);
  });

  test('/dictionary — page contains dictionary content', async ({ page }) => {
    await page.goto('/dictionary');
    const html = await page.content();
    const hasDictionaryContent =
      html.includes('מילון') ||
      html.includes('dictionary') ||
      html.includes('חיפוש') ||
      html.includes('מילה');
    expect(hasDictionaryContent).toBe(true);
  });

  test('/recipes — page contains recipe listing content', async ({ page }) => {
    await page.goto('/recipes');
    const html = await page.content();
    const hasRecipeContent =
      html.includes('מתכון') ||
      html.includes('recipe') ||
      html.includes('מטבח') ||
      html.includes('אוכל');
    expect(hasRecipeContent).toBe(true);
  });

  test('/marketplace — page contains marketplace content', async ({ page }) => {
    await page.goto('/marketplace');
    const html = await page.content();
    const hasMarketplaceContent =
      html.includes('שוק') ||
      html.includes('marketplace') ||
      html.includes('עסקים') ||
      html.includes('חנות');
    expect(hasMarketplaceContent).toBe(true);
  });
});
