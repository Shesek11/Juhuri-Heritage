import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';
import { fireEventEmail } from '@/src/lib/email';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApprover(request);
    const { id } = await params;

    await pool.query('UPDATE community_examples SET status = ? WHERE id = ?', ['approved', id]);

    // Re-run word linking
    const [examples] = await pool.query('SELECT * FROM community_examples WHERE id = ?', [id]) as any[];
    if (examples.length > 0) {
      const ex = examples[0];
      const words = ex.origin.split(/\s+/).filter((w: string) => w.length >= 2);
      if (words.length > 0) {
        const placeholders = words.map(() => '?').join(',');
        const [matchedEntries] = await pool.query(
          `SELECT id FROM dictionary_entries WHERE term IN (${placeholders}) AND status = 'active'`,
          words
        ) as any[];
        for (const matched of matchedEntries) {
          await pool.query(
            'INSERT IGNORE INTO example_word_links (example_id, entry_id) VALUES (?, ?)',
            [id, matched.id]
          );
        }
      }

      if (ex.user_id) {
        await pool.query('UPDATE users SET xp = xp + 30 WHERE id = ?', [ex.user_id]);
      }
    }

    await logEvent('EXAMPLE_APPROVED', `פתגם ${id} אושר`, user, { exampleId: id, entryId: examples[0]?.entry_id }, request);

    // Notify the example author
    if (examples[0]?.user_id) {
      const [authorRows] = await pool.query('SELECT email, name FROM users WHERE id = ?', [examples[0].user_id]) as any[];
      if (authorRows.length && authorRows[0].email) {
        fireEventEmail('example-approved', { to: authorRows[0].email, variables: { userName: authorRows[0].name || '' } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Approve example error:', error);
    return NextResponse.json({ error: 'שגיאה באישור פתגם' }, { status: 500 });
  }
}
