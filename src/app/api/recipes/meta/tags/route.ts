import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

// GET /api/recipes/meta/tags - Get all tags (public)
export async function GET(request: NextRequest) {
  try {
    const [tags] = await pool.query('SELECT * FROM recipe_tags ORDER BY category, name_hebrew');
    return NextResponse.json(tags);
  } catch (err) {
    console.error('Error fetching tags:', err);
    return NextResponse.json({ error: 'שגיאה בטעינת התגיות' }, { status: 500 });
  }
}
