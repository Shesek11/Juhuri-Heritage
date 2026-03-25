import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// ---------------------------------------------------------------------------
// Admin route protection (JWT-based)
// ---------------------------------------------------------------------------

// Pages accessible to both admin and approver:
// /admin/dictionary, /admin/dictionary/pending, /admin/dictionary/ai, /admin/family
// Everything else requires admin role specifically
const APPROVER_ALLOWED = new Set([
  '/admin',
  '/admin/dictionary',
  '/admin/dictionary/pending',
  '/admin/dictionary/ai',
  '/admin/family',
]);

async function handleAdminAuth(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith('/admin')) {
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

    // Only admin and approver roles may access /admin/*
    if (role !== 'admin' && role !== 'approver') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Approvers can only access specific pages; everything else requires admin
    // Normalize trailing slash to prevent bypass (e.g. /admin/users/ vs /admin/users)
    const normalizedPath = pathname.replace(/\/$/, '') || '/admin';
    if (role === 'approver' && !APPROVER_ALLOWED.has(normalizedPath)) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/dictionary';
      return NextResponse.redirect(url);
    }

    return null; // authenticated — continue
  } catch {
    // Invalid / expired token
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
}

// ---------------------------------------------------------------------------
// In-memory redirect cache (2-minute TTL)
// Middleware runs on Edge Runtime — cannot import mysql2 directly.
// Instead we fetch redirects from our own API route.
// ---------------------------------------------------------------------------

interface RedirectEntry {
  from_path: string;
  to_path: string;
  status_code: number;
}

let redirectCache: Map<string, RedirectEntry> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

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
    // On error, return existing cache or empty map
    return redirectCache || new Map();
  }
}

// ---------------------------------------------------------------------------
// Middleware: apply DB-managed redirects
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip API routes, static files, Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/uploads/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // --- Admin route protection (before redirect logic) ---
  const adminResponse = await handleAdminAuth(request);
  if (adminResponse) {
    return adminResponse;
  }

  const origin = request.nextUrl.origin;
  const redirects = await getRedirects(origin);
  const match = redirects.get(pathname);

  if (match) {
    const url = request.nextUrl.clone();
    // Support both relative and absolute redirect targets
    if (match.to_path.startsWith('http')) {
      return NextResponse.redirect(match.to_path, match.status_code || 301);
    }
    url.pathname = match.to_path;
    return NextResponse.redirect(url, match.status_code || 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|images/|uploads/).*)',
  ],
};
