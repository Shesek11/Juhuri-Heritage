import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

// GET /api/marketplace/vendors/:slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId: slug } = await params;

    const [vendors] = await pool.query(`
      SELECT v.id, v.slug, v.name, v.logo_url,
             v.about_text, v.address, v.city,
             v.phone, v.email, v.website,
             v.latitude, v.longitude,
             v.status, v.created_at,
             u.name as owner_name,
             COALESCE((SELECT AVG(rating) FROM marketplace_reviews WHERE vendor_id = v.id), 0) as avg_rating,
             COALESCE((SELECT COUNT(*) FROM marketplace_reviews WHERE vendor_id = v.id), 0) as review_count
      FROM marketplace_vendors v
      LEFT JOIN users u ON v.user_id = u.id
      WHERE v.slug = ? AND v.is_active = 1
    `, [slug]) as any[];

    if (vendors.length === 0) {
      return NextResponse.json({ error: 'חנות לא נמצאה' }, { status: 404 });
    }

    const vendor = vendors[0];

    const [menu] = await pool.query(`
      SELECT * FROM marketplace_menu_items
      WHERE vendor_id = ? AND is_available = 1
      ORDER BY category, display_order, name
    `, [vendor.id]) as any[];

    const [hours] = await pool.query(`
      SELECT * FROM marketplace_hours
      WHERE vendor_id = ?
      ORDER BY day_of_week
    `, [vendor.id]) as any[];

    const [updates] = await pool.query(`
      SELECT * FROM marketplace_updates
      WHERE vendor_id = ? AND is_active = 1
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 5
    `, [vendor.id]) as any[];

    const [reviews] = await pool.query(`
      SELECT r.*, u.name as user_name
      FROM marketplace_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.vendor_id = ? AND r.is_hidden = 0
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [vendor.id]) as any[];

    return NextResponse.json({
      ...vendor,
      menu,
      hours,
      updates,
      reviews
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת החנות' }, { status: 500 });
  }
}

// PUT /api/marketplace/vendors/:slug (uses id from body — the Express route used :id)
// Note: Express used :id for PUT/DELETE. We use [slug] for GET.
// For PUT/DELETE by id, we use the slug param but treat it as id.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { vendorId: id } = await params;

    const [vendor] = await pool.query(
      'SELECT user_id FROM marketplace_vendors WHERE id = ?',
      [id]
    ) as any[];

    if (!vendor.length) {
      return NextResponse.json({ error: 'חנות לא נמצאה' }, { status: 404 });
    }

    if (vendor[0].user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const queryParams: any[] = [];

    const fields = ['name', 'logo_url', 'about_text', 'about_image_url', 'phone', 'email', 'website', 'address', 'city', 'latitude', 'longitude'];
    for (const field of fields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        queryParams.push(body[field]);
      }
    }

    if (body.is_active !== undefined) {
      updates.push('is_active = ?');
      queryParams.push(body.is_active ? 1 : 0);
    }

    if (user.role === 'admin') {
      if (body.status !== undefined) { updates.push('status = ?'); queryParams.push(body.status); }
      if (body.is_verified !== undefined) { updates.push('is_verified = ?'); queryParams.push(body.is_verified ? 1 : 0); }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true });
    }

    queryParams.push(id);
    await pool.query(`UPDATE marketplace_vendors SET ${updates.join(', ')} WHERE id = ?`, queryParams);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating vendor:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון החנות' }, { status: 500 });
  }
}

// DELETE /api/marketplace/vendors/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { vendorId: id } = await params;

    const [vendor] = await pool.query(
      'SELECT user_id FROM marketplace_vendors WHERE id = ?',
      [id]
    ) as any[];

    if (!vendor.length) {
      return NextResponse.json({ error: 'חנות לא נמצאה' }, { status: 404 });
    }

    if (vendor[0].user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    await pool.query('DELETE FROM marketplace_vendors WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error deleting vendor:', error);
    return NextResponse.json({ error: 'שגיאה במחיקת החנות' }, { status: 500 });
  }
}
