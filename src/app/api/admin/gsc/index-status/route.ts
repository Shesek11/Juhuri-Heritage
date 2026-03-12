import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/auth';
import { getSearchConsole, SITE_URL } from '../_lib/gsc-client';

// GET /api/admin/gsc/index-status - Index status (sitemaps info)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const sc = getSearchConsole();
    const response = await sc.sitemaps.list({ siteUrl: SITE_URL });

    return NextResponse.json({
      sitemaps: (response.data.sitemap || []).map((s: any) => ({
        path: s.path,
        lastSubmitted: s.lastSubmitted,
        lastDownloaded: s.lastDownloaded,
        isPending: s.isPending,
        warnings: s.warnings,
        errors: s.errors,
        contents: s.contents,
      })),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('GSC index status error:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
