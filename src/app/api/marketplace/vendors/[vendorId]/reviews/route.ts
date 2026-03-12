import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params;
    const [reviews] = await pool.query(`
      SELECT r.*, u.name as user_name
      FROM marketplace_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.vendor_id = ? AND r.is_hidden = 0
      ORDER BY r.created_at DESC
    `, [vendorId]) as any[];
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת תגובות' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { vendorId } = await params;
    const { rating, comment } = await request.json();

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'דירוג חייב להיות בין 1 ל-5' }, { status: 400 });
    }

    await pool.query(`
      INSERT INTO marketplace_reviews (vendor_id, user_id, rating, comment)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE rating = ?, comment = ?
    `, [vendorId, user.id, rating, comment, rating, comment]);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error adding review:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת תגובה' }, { status: 500 });
  }
}
