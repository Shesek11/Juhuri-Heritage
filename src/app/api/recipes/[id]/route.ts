import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth, getAuthUser } from '@/src/lib/auth';

// GET /api/recipes/:id - Get single recipe by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser(request);

    // Get recipe details
    const [recipes] = await pool.query(
      `SELECT r.*,
             u.name as author_name,
             u.avatar as author_avatar,
             d.name as region_name
      FROM recipes r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN dialects d ON r.region_id = d.id
      WHERE r.id = ? AND (r.is_approved = 1 OR r.user_id = ?)`,
      [id, user?.id || 0]
    ) as [any[], any];

    if (!recipes.length) {
      return NextResponse.json({ error: 'מתכון לא נמצא' }, { status: 404 });
    }

    // Increment view count only after confirming recipe exists
    await pool.query('UPDATE recipes SET view_count = view_count + 1 WHERE id = ?', [id]);

    const recipe = recipes[0];

    // Parse JSON fields
    if (typeof recipe.ingredients === 'string') {
      try {
        recipe.ingredients = JSON.parse(recipe.ingredients);
      } catch (e) {
        recipe.ingredients = [];
      }
    }
    if (typeof recipe.instructions === 'string') {
      try {
        recipe.instructions = JSON.parse(recipe.instructions);
      } catch (e) {
        recipe.instructions = [];
      }
    }

    // Get photos
    const [photos] = await pool.query(
      'SELECT * FROM recipe_photos WHERE recipe_id = ? ORDER BY is_main DESC',
      [id]
    );

    // Get tags
    const [tags] = await pool.query(
      `SELECT t.* FROM recipe_tags t
      JOIN recipe_tag_map m ON t.id = m.tag_id
      WHERE m.recipe_id = ?`,
      [id]
    );

    // Get like count and check if current user liked
    const [likeData] = await pool.query(
      `SELECT
          COUNT(*) as count,
          SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as user_liked
      FROM recipe_likes WHERE recipe_id = ?`,
      [user?.id || 0, id]
    ) as [any[], any];

    // Get comments
    const [comments] = await pool.query(
      `SELECT c.*, u.name as author_name, u.avatar as author_avatar
      FROM recipe_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.recipe_id = ?
      ORDER BY c.created_at DESC
      LIMIT 10`,
      [id]
    );

    return NextResponse.json({
      ...recipe,
      photos,
      tags,
      likes: {
        count: likeData[0].count,
        userLiked: likeData[0].user_liked > 0,
      },
      comments,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching recipe:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת המתכון' }, { status: 500 });
  }
}

// PUT /api/recipes/:id - Update recipe (owner or admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    // Check ownership
    const [existing] = await pool.query(
      'SELECT user_id FROM recipes WHERE id = ?',
      [id]
    ) as [any[], any];

    if (!existing.length) {
      return NextResponse.json({ error: 'מתכון לא נמצא' }, { status: 404 });
    }

    if (existing[0].user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'אין הרשאה לערוך מתכון זה' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      title_juhuri,
      description,
      story,
      ingredients,
      instructions,
      prep_time,
      cook_time,
      servings,
      difficulty,
      region_id,
      tags,
    } = body;

    await pool.query(
      `UPDATE recipes SET
          title = ?,
          title_juhuri = ?,
          description = ?,
          story = ?,
          ingredients = ?,
          instructions = ?,
          prep_time = ?,
          cook_time = ?,
          servings = ?,
          difficulty = ?,
          region_id = ?
      WHERE id = ?`,
      [
        title,
        title_juhuri || null,
        description || null,
        story || null,
        JSON.stringify(ingredients),
        JSON.stringify(instructions),
        prep_time || null,
        cook_time || null,
        servings || null,
        difficulty || 'medium',
        region_id || null,
        id,
      ]
    );

    // Update tags
    if (tags) {
      await pool.query('DELETE FROM recipe_tag_map WHERE recipe_id = ?', [id]);
      if (tags.length > 0) {
        const tagValues = tags.map((tagId: number) => [id, tagId]);
        await pool.query(
          'INSERT INTO recipe_tag_map (recipe_id, tag_id) VALUES ?',
          [tagValues]
        );
      }
    }

    return NextResponse.json({ success: true, message: 'המתכון עודכן בהצלחה' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating recipe:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון המתכון' }, { status: 500 });
  }
}

// DELETE /api/recipes/:id - Delete recipe (owner or admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const [existing] = await pool.query(
      'SELECT user_id FROM recipes WHERE id = ?',
      [id]
    ) as [any[], any];

    if (!existing.length) {
      return NextResponse.json({ error: 'מתכון לא נמצא' }, { status: 404 });
    }

    if (existing[0].user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'אין הרשאה למחוק מתכון זה' }, { status: 403 });
    }

    await pool.query('DELETE FROM recipes WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'המתכון נמחק' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error deleting recipe:', error);
    return NextResponse.json({ error: 'שגיאה במחיקת המתכון' }, { status: 500 });
  }
}
