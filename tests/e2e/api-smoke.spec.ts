import { test, expect } from '@playwright/test';

test.describe('API smoke tests — public endpoints', () => {
  test('GET /api/dictionary/search?q=test — 200 + JSON', async ({
    request,
  }) => {
    const res = await request.get('/api/dictionary/search?q=test');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeTruthy();
    expect(typeof body).toBe('object');
  });

  test('GET /api/recipes — 200 + JSON', async ({ request }) => {
    const res = await request.get('/api/recipes');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeTruthy();
  });

  test('GET /api/marketplace/vendors — 200 + JSON', async ({ request }) => {
    const res = await request.get('/api/marketplace/vendors');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeTruthy();
  });

  test('GET /api/dialects — 200 + JSON', async ({ request }) => {
    const res = await request.get('/api/dialects');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeTruthy();
  });

  test('GET /api/admin/features/public — 200 + JSON', async ({ request }) => {
    const res = await request.get('/api/admin/features/public');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeTruthy();
  });
});

test.describe('API smoke tests — auth endpoints', () => {
  test('GET /api/auth/me (no cookie) — 401', async ({ request }) => {
    const res = await request.get('/api/auth/me');
    expect(res.status()).toBe(401);
  });

  test('POST /api/auth/login (bad credentials) — 401', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: {
        email: 'nonexistent@example.com',
        password: 'wrongpassword123',
      },
    });
    expect(res.status()).toBe(401);
  });
});
