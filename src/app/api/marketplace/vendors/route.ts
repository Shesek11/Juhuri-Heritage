import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import { haversineDistance } from '../_shared';

// GET /api/marketplace/vendors
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius_km = parseFloat(searchParams.get('radius_km') || '50');
    const search = searchParams.get('search');
    const status = searchParams.get('status') || 'active';

    let query = `
      SELECT v.id, v.slug, v.name, v.logo_url, v.cover_url,
             v.about_text, v.city, v.specialty, v.category,
             v.delivery_available, v.kosher_certified,
             v.latitude, v.longitude,
             COALESCE(vs.average_rating, 0) as avg_rating,
             COALESCE(vs.total_reviews, 0) as review_count
      FROM marketplace_vendors v
      LEFT JOIN marketplace_vendor_stats vs ON v.id = vs.vendor_id
      WHERE v.is_active = 1
    `;
    const params: any[] = [];

    if (status !== 'all') {
      query += ' AND v.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (v.name LIKE ? OR v.about_text LIKE ? OR v.city LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [vendors] = await pool.query(query, params) as any[];

    let results = vendors;
    if (lat && lng) {
      results = vendors
        .map((v: any) => {
          if (!v.latitude || !v.longitude) return null;
          const dist = haversineDistance(parseFloat(lat), parseFloat(lng), v.latitude, v.longitude);
          return { ...v, distance_km: dist };
        })
        .filter((v: any) => v && v.distance_km <= radius_km)
        .sort((a: any, b: any) => a.distance_km - b.distance_km);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת החנויות' }, { status: 500 });
  }
}

// POST /api/marketplace/vendors
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const {
      name, slug, logo_url, about_text, about_image_url,
      phone, email, website,
      address, city, latitude, longitude
    } = await request.json();

    const [existing] = await pool.query(
      'SELECT id FROM marketplace_vendors WHERE user_id = ?',
      [user.id]
    ) as any[];

    if (existing.length > 0) {
      return NextResponse.json({ error: 'כבר קיימת חנות למשתמש זה' }, { status: 400 });
    }

    const [slugCheck] = await pool.query(
      'SELECT id FROM marketplace_vendors WHERE slug = ?',
      [slug]
    ) as any[];

    if (slugCheck.length > 0) {
      return NextResponse.json({ error: 'כתובת זו כבר בשימוש' }, { status: 400 });
    }

    const [result] = await pool.query(`
      INSERT INTO marketplace_vendors
      (user_id, name, slug, logo_url, about_text, about_image_url,
       phone, email, website, address, city, latitude, longitude, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      user.id, name, slug, logo_url, about_text, about_image_url,
      phone, email, website, address, city, latitude, longitude
    ]) as any[];

    await pool.query('CALL create_default_hours(?)', [result.insertId]);

    return NextResponse.json({ success: true, vendor_id: result.insertId }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error creating vendor:', error);
    return NextResponse.json({ error: 'שגיאה ביצירת החנות' }, { status: 500 });
  }
}
