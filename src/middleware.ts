import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// ---------------------------------------------------------------------------
// next-intl locale middleware
// ---------------------------------------------------------------------------

const intlMiddleware = createIntlMiddleware(routing);

// ---------------------------------------------------------------------------
// Admin route protection (JWT-based)
// ---------------------------------------------------------------------------

// Pages accessible to both admin and approver:
const APPROVER_ALLOWED = new Set([
  '/admin',
  '/admin/dictionary',
  '/admin/dictionary/pending',
  '/admin/dictionary/ai',
  '/admin/family',
]);

async function handleAdminAuth(request: NextRequest, pathnameWithoutLocale: string): Promise<NextResponse | null> {
  if (!pathnameWithoutLocale.startsWith('/admin')) {
    return null; // not an admin route — skip
  }

  const token = request.cookies.get('token')?.value;

  if (!token || !process.env.JWT_SECRET) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string | undefined;

    if (role !== 'admin' && role !== 'approver') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    const normalizedPath = pathnameWithoutLocale.replace(/\/$/, '') || '/admin';
    if (role === 'approver' && !APPROVER_ALLOWED.has(normalizedPath)) {
      const url = request.nextUrl.clone();
      // Redirect to admin dictionary under the current locale
      const locale = extractLocale(request.nextUrl.pathname);
      url.pathname = `/${locale}/admin/dictionary`;
      return NextResponse.redirect(url);
    }

    return null; // authenticated — continue
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
}

// ---------------------------------------------------------------------------
// In-memory redirect cache (2-minute TTL)
// ---------------------------------------------------------------------------

interface RedirectEntry {
  from_path: string;
  to_path: string;
  status_code: number;
}

let redirectCache: Map<string, RedirectEntry> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 2 * 60 * 1000;

async function getRedirects(origin: string): Promise<Map<string, RedirectEntry>> {
  const now = Date.now();
  if (redirectCache && now - cacheTimestamp < CACHE_TTL) {
    return redirectCache;
  }

  try {
    const res = await fetch(`${origin}/api/seo/redirects`, {
      headers: { 'x-middleware-secret': process.env.MIDDLEWARE_SECRET || '__internal__' },
    });
    if (!res.ok) {
      return redirectCache || new Map();
    }
    const rows: RedirectEntry[] = await res.json();

    const map = new Map<string, RedirectEntry>();
    for (const row of rows) {
      map.set(row.from_path, row);
    }

    redirectCache = map;
    cacheTimestamp = now;
    return map;
  } catch {
    return redirectCache || new Map();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first && (routing.locales as readonly string[]).includes(first)) {
    return first;
  }
  return routing.defaultLocale;
}

function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first && (routing.locales as readonly string[]).includes(first)) {
    return '/' + segments.slice(1).join('/') || '/';
  }
  return pathname;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip API routes, static files, Next.js internals, and SEO files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/uploads/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    /\.(?:ico|png|jpg|jpeg|svg|webp|gif|css|js|woff|woff2|ttf|map)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // --- Sitemap redirect to API handler ---
  if (pathname === '/sitemap.xml') {
    const url = request.nextUrl.clone();
    url.pathname = '/api/sitemap';
    return NextResponse.rewrite(url);
  }

  // --- DB-managed redirects (check BEFORE locale rewrite) ---
  const pathnameWithoutLocale = stripLocalePrefix(pathname);
  const origin = request.nextUrl.origin;
  const redirects = await getRedirects(origin);
  const match = redirects.get(pathnameWithoutLocale);

  if (match) {
    if (match.to_path.startsWith('http')) {
      return NextResponse.redirect(match.to_path, match.status_code || 301);
    }
    // Redirect target should include locale
    const locale = extractLocale(pathname);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${match.to_path}`;
    return NextResponse.redirect(url, match.status_code || 301);
  }

  // --- Admin route protection (before locale middleware) ---
  const adminResponse = await handleAdminAuth(request, pathnameWithoutLocale);
  if (adminResponse) {
    return adminResponse;
  }

  // --- next-intl locale handling ---
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|images/|uploads/|api/).*)',
  ],
};
