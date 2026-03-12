import { test, expect } from '@playwright/test';

/**
 * Extract and parse the first JSON-LD script block from the page.
 */
async function getJsonLd(page: import('@playwright/test').Page) {
  const scriptContent = await page
    .locator('script[type="application/ld+json"]')
    .first()
    .textContent();
  expect(scriptContent).toBeTruthy();
  return JSON.parse(scriptContent!);
}

/**
 * If the JSON-LD is a @graph wrapper, return the graph array.
 * Otherwise wrap the single object in an array for uniform handling.
 */
function getGraph(jsonLd: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(jsonLd['@graph'])) {
    return jsonLd['@graph'];
  }
  return [jsonLd];
}

test.describe('JSON-LD structured data — common', () => {
  const pages = ['/', '/dictionary', '/recipes', '/marketplace'];

  for (const path of pages) {
    test(`${path} — has valid JSON-LD with @context`, async ({ page }) => {
      await page.goto(path);
      const jsonLd = await getJsonLd(page);
      expect(jsonLd['@context']).toMatch(/schema\.org/);
    });

    test(`${path} — @graph contains WebSite with SearchAction`, async ({
      page,
    }) => {
      await page.goto(path);
      const jsonLd = await getJsonLd(page);
      const graph = getGraph(jsonLd);
      const webSite = graph.find(
        (node: Record<string, unknown>) => node['@type'] === 'WebSite',
      );
      expect(webSite).toBeTruthy();
      expect(webSite!['potentialAction']).toBeTruthy();
      const action = Array.isArray(webSite!['potentialAction'])
        ? webSite!['potentialAction'][0]
        : webSite!['potentialAction'];
      expect((action as Record<string, unknown>)['@type']).toBe(
        'SearchAction',
      );
    });

    test(`${path} — @graph contains Organization`, async ({ page }) => {
      await page.goto(path);
      const jsonLd = await getJsonLd(page);
      const graph = getGraph(jsonLd);
      const org = graph.find(
        (node: Record<string, unknown>) => node['@type'] === 'Organization',
      );
      expect(org).toBeTruthy();
    });
  }
});

test.describe('JSON-LD structured data — dynamic pages', () => {
  test('/word/{term} — has DefinedTerm in @graph', async ({
    page,
    request,
  }) => {
    const searchRes = await request.get('/api/dictionary/search?q=a&limit=1');
    const searchData = await searchRes.json();
    const entries = searchData.results || searchData.entries || searchData;
    if (!Array.isArray(entries) || entries.length === 0) {
      test.skip(true, 'No dictionary entries available');
      return;
    }
    const term = entries[0].term || entries[0].word;

    await page.goto(`/word/${encodeURIComponent(term)}`);
    const jsonLd = await getJsonLd(page);
    const graph = getGraph(jsonLd);
    const definedTerm = graph.find(
      (node: Record<string, unknown>) => node['@type'] === 'DefinedTerm',
    );
    expect(definedTerm).toBeTruthy();
    expect(definedTerm!['name']).toBeTruthy();
  });

  test('/recipes/{id} — has Recipe in @graph', async ({ page, request }) => {
    const recipesRes = await request.get('/api/recipes?limit=1');
    const recipesData = await recipesRes.json();
    const recipes = recipesData.recipes || recipesData;
    if (!Array.isArray(recipes) || recipes.length === 0) {
      test.skip(true, 'No recipes available');
      return;
    }
    const id = recipes[0].id;

    await page.goto(`/recipes/${id}`);
    const jsonLd = await getJsonLd(page);
    const graph = getGraph(jsonLd);
    const recipe = graph.find(
      (node: Record<string, unknown>) => node['@type'] === 'Recipe',
    );
    expect(recipe).toBeTruthy();
    expect(recipe!['name']).toBeTruthy();
  });

  test('/marketplace/{slug} — has LocalBusiness in @graph', async ({
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
    const slug = vendors[0].slug;

    await page.goto(`/marketplace/${slug}`);
    const jsonLd = await getJsonLd(page);
    const graph = getGraph(jsonLd);
    const business = graph.find(
      (node: Record<string, unknown>) =>
        node['@type'] === 'LocalBusiness' ||
        node['@type'] === 'Restaurant' ||
        node['@type'] === 'FoodEstablishment',
    );
    expect(business).toBeTruthy();
    expect(business!['name']).toBeTruthy();
  });
});
