import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';
import { logEvent } from '@/src/lib/logEvent';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApprover(request);
    const { id } = await params;

    // Get suggestion details before updating
    const [suggestions] = await pool.query('SELECT * FROM translation_suggestions WHERE id = ?', [id]) as any[];
    const suggestion = suggestions[0];

    await pool.query(
      'UPDATE translation_suggestions SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      ['rejected', user.id, id]
    );

    // Email the contributor
    if (suggestion?.user_id) {
      const [contributors] = await pool.query('SELECT email, name FROM users WHERE id = ?', [suggestion.user_id]) as any[];
      const [entries] = await pool.query('SELECT hebrew_script FROM dictionary_entries WHERE id = ?', [suggestion.entry_id]) as any[];
      if (contributors[0]?.email) {
        fireEventEmail('suggestion-rejected', {
          to: contributors[0].email,
          variables: { userName: contributors[0].name || '', term: entries[0]?.hebrew_script || '' },
        });
      }
    }

    await logEvent('DICTIONARY_SUGGESTION_REJECTED', `Suggestion ${id} rejected`, user, { suggestionId: id, entryId: suggestion?.entry_id }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Reject suggestion error:', error);
    return NextResponse.json({ error: 'שגיאה בדחיית הצעה' }, { status: 500 });
  }
}
