import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// GET /api/admin/seo/index-stats - Get indexing statistics
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const [
      [{ totalEntries }],
      [{ totalRecipes }],
      [{ totalVendors }],
      [{ totalPages }],
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) as totalEntries FROM dictionary_entries WHERE status = 'active'`).then((r: any) => r[0]),
      pool.query(`SELECT COUNT(*) as totalRecipes FROM recipes WHERE is_approved = 1`).then((r: any) => r[0]).catch(() => [{ totalRecipes: 0 }]),
      pool.query(`SELECT COUNT(*) as totalVendors FROM marketplace_vendors WHERE status = 'active'`).then((r: any) => r[0]).catch(() => [{ totalVendors: 0 }]),
      Promise.resolve([{ totalPages: 5 }]), // Static pages count
    ]) as any;

    return NextResponse.json({
      staticPages: totalPages,
      dictionaryEntries: totalEntries,
      recipes: totalRecipes,
      vendors: totalVendors,
      totalUrls: totalPages + totalEntries + totalRecipes + totalVendors,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Index stats error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת סטטיסטיקות' }, { status: 500 });
  }
}
