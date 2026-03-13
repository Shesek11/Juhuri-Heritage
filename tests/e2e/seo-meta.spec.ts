import { test, expect } from '@playwright/test';

test.describe('SEO meta tags — common requirements', () => {
  const staticPages = ['/', '/dictionary', '/recipes', '/marketplace'];

  for (const path of staticPages) {
    test(`${path} — html lang="he" dir="rtl"`, async ({ page }) => {
      await page.goto(path);
      const html = page.locator('html');
      await expect(html).toHaveAttribute('lang', 'he');
      await expect(html).toHaveAttribute('dir', 'rtl');
    });

    test(`${path} — has title, description, and OG tags`, async ({ page }) => {
      await page.goto(path);
      // <title> is non-empty
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);

      // meta description
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute('content', /.+/);

      // Open Graph tags
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveAttribute('content', /.+/);

      const ogDescription = page.locator('meta[property="og:description"]');
      await expect(ogDescription).toHaveAttribute('content', /.+/);

      const ogType = page.locator('meta[property="og:type"]');
      await expect(ogType).toHaveAttribute('content', /.+/);
    });

    test(`${path} — canonical URL is absolute without trailing slash`, async ({
      page,
    }) => {
      await page.goto(path);
      const canonical = page.locator('link[rel="canonical"]');
      const href = await canonical.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toMatch(/^https?:\/\//);
      // Root "/" is allowed, but other paths must not end with slash
      if (path !== '/') {
        expect(href).not.toMatch(/\/$/);
      }
    });
  }
});

test.describe('SEO meta tags — dynamic pages', () => {
  test('/word/{term} — title contains the word term', async ({
    page,
    request,
  }) => {
    // Fetch a real word from the API to test with
    const searchRes = await request.get('/api/dictionary/search?q=a&limit=1');
    const searchData = await searchRes.json();
    const entries = searchData.results || searchData.entries || searchData;
    if (!Array.isArray(entries) || entries.length === 0) {
      test.skip(true, 'No dictionary entries available');
      return;
    }
    const term = entries[0].term || entries[0].word;

    await page.goto(`/word/${encodeURIComponent(term)}`);
    const title = await page.title();
    expect(title.toLowerCase()).toContain(term.toLowerCase());
  });

  test('/recipes/{id} — title contains recipe name', async ({
    page,
    request,
  }) => {
    const recipesRes = await request.get('/api/recipes?limit=1');
    const recipesData = await recipesRes.json();
    const recipes = recipesData.recipes || recipesData;
    if (!Array.isArray(recipes) || recipes.length === 0) {
      test.skip(true, 'No recipes available');
      return;
    }
    const recipe = recipes[0];
    const id = recipe.id;
    const name = recipe.title || recipe.name;

    await page.goto(`/recipes/${id}`);
    const title = await page.title();
    // Title should contain at least part of the recipe name
    expect(title).toContain(name);
  });

  test('/marketplace/{slug} — title contains vendor name', async ({
    page,
    request,
  }) => {
    const vendorsRes = await request.get('/api/marketplace/vendors?limit=1');
    const vendorsData = await vendorsRes.json();
    const vendors = vendorsData.vendors || vendorsData;
    if (!Array.isArray(vendors) || vendors.length === 0) {
      test.skip(true, 'No marketplace vendors available');
      return;
    }
    const vendor = vendors[0];
    const slug = vendor.slug;
    const name = vendor.business_name || vendor.name;

    await page.goto(`/marketplace/${slug}`);
    const title = await page.title();
    expect(title).toContain(name);
  });
});
