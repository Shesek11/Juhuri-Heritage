import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';
import { logEvent } from '@/src/lib/logEvent';
import { autoTranslateTitle } from '@/src/lib/autoTranslate';

// Build shared WHERE clause for recipe filters
function buildRecipeFilters(searchParams: URLSearchParams) {
  let where = '';
  const params: (string | number)[] = [];
  const region = searchParams.get('region');
  const tag = searchParams.get('tag');
  const tags = searchParams.get('tags');
  const search = searchParams.get('search');

  if (region) {
    where += ' AND r.region_id = ?';
    params.push(region);
  }

  if (search) {
    where += ' AND (r.title LIKE ? OR r.description LIKE ? OR r.title_juhuri LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (tags) {
    const tagIds = tags.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    if (tagIds.length > 0) {
      where += ` AND r.id IN (
        SELECT recipe_id
        FROM recipe_tag_map
        WHERE tag_id IN (${tagIds.map(() => '?').join(',')})
        GROUP BY recipe_id
        HAVING COUNT(DISTINCT tag_id) = ?
      )`;
      params.push(...tagIds, tagIds.length);
    }
  } else if (tag) {
    where += ` AND r.id IN (SELECT recipe_id FROM recipe_tag_map WHERE tag_id = ?)`;
    params.push(tag);
  }

  return { where, params };
}

// GET /api/recipes - Get all approved recipes (public)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '12') || 12, 100);
    const offset = (page - 1) * limit;

    const { where, params: filterParams } = buildRecipeFilters(searchParams);

    let query = `
      SELECT r.*,
             u.name as author_name,
             u.avatar as author_avatar,
             d.name as region_name,
             (SELECT url FROM recipe_photos WHERE recipe_id = r.id AND is_main = 1 LIMIT 1) as main_photo,
             (SELECT COUNT(*) FROM recipe_likes WHERE recipe_id = r.id) as like_count,
             (SELECT COUNT(*) FROM recipe_comments WHERE recipe_id = r.id) as comment_count
      FROM recipes r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN dialects d ON r.region_id = d.id
      WHERE r.is_approved = 1${where}
    `;

    const params: (string | number)[] = [...filterParams];

    // Sorting
    switch (sort) {
      case 'popular':
        query += ' ORDER BY r.view_count DESC';
        break;
      case 'likes':
        query += ' ORDER BY like_count DESC';
        break;
      case 'oldest':
        query += ' ORDER BY r.created_at ASC';
        break;
      default:
        query += ' ORDER BY r.created_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [recipes] = await pool.query(query, params) as [any[], any];

    // Parse JSON fields for all recipes
    recipes.forEach((recipe: any) => {
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
    });

    // Get total count using same filters
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM recipes r WHERE r.is_approved = 1${where}`,
      filterParams
    ) as [any[], any];

    return NextResponse.json({
      recipes,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (err) {
    console.error('Error fetching recipes:', err);
    return NextResponse.json({ error: 'שגיאה בטעינת המתכונים' }, { status: 500 });
  }
}

// POST /api/recipes - Create new recipe (authenticated)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
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

    if (!title || !ingredients || !instructions) {
      return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 });
    }

    const [result] = await pool.query(
      `INSERT INTO recipes
      (title, title_juhuri, description, story, ingredients, instructions,
       prep_time, cook_time, servings, difficulty, region_id, user_id, is_approved)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        user.id,
        user.role === 'admin' ? 1 : 0,
      ]
    ) as [any, any];

    const recipeId = result.insertId;

    // Add tags if provided
    if (tags && tags.length > 0) {
      const tagValues = tags.map((tagId: number) => [recipeId, tagId]);
      await pool.query(
        'INSERT INTO recipe_tag_map (recipe_id, tag_id) VALUES ?',
        [tagValues]
      );
    }

    if (user.role !== 'admin') {
      fireEventEmail('recipe-submitted', { variables: { userName: user.name, recipeTitle: title, recipeId: String(recipeId) } });
    }

    await logEvent('RECIPE_SUBMITTED', `Recipe submitted: ${title}`, user, { recipeId, title }, request);

    // Auto-translate title to EN + RU (non-blocking)
    autoTranslateTitle('recipe', String(recipeId), title).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        recipe_id: recipeId,
        message: user.role === 'admin' ? 'המתכון נוצר ואושר' : 'המתכון נשלח לאישור',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error creating recipe:', error);
    return NextResponse.json({ error: 'שגיאה ביצירת המתכון' }, { status: 500 });
  }
}
