import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

// ---------------------------------------------------------------------------
// In-memory redirect cache (2-minute TTL)
// ---------------------------------------------------------------------------

interface RedirectEntry {
  to_path: string;
  status_code: number;
}

let redirectCache: Map<string, RedirectEntry> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

async function getRedirects(): Promise<Map<string, RedirectEntry>> {
  const now = Date.now();
  if (redirectCache && now - cacheTimestamp < CACHE_TTL) {
    return redirectCache;
  }

  try {
    const [rows] = await pool.query(
      `SELECT from_path, to_path, status_code FROM seo_redirects WHERE is_active = 1`
    ) as [any[], any];

    const map = new Map<string, RedirectEntry>();
    for (const row of rows) {
      map.set(row.from_path, {
        to_path: row.to_path,
        status_code: row.status_code || 301,
      });
    }

    redirectCache = map;
    cacheTimestamp = now;
    return map;
  } catch (error: any) {
    // Table doesn't exist yet — no redirects
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      redirectCache = new Map();
      cacheTimestamp = now;
      return redirectCache;
    }
    // On error, return empty map rather than crashing
    return new Map();
  }
}

// ---------------------------------------------------------------------------
// Middleware: apply DB-managed redirects + increment hit counter
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

  const redirects = await getRedirects();
  const match = redirects.get(pathname);

  if (match) {
    // Fire-and-forget hit counter update
    pool.query(
      `UPDATE seo_redirects SET hits = hits + 1 WHERE from_path = ?`,
      [pathname]
    ).catch(() => {});

    const url = request.nextUrl.clone();
    // Support both relative and absolute redirect targets
    if (match.to_path.startsWith('http')) {
      return NextResponse.redirect(match.to_path, match.status_code);
    }
    url.pathname = match.to_path;
    return NextResponse.redirect(url, match.status_code);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|images/|uploads/).*)',
  ],
};
