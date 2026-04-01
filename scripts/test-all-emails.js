const db = require('../server/config/db');
const { generateToken } = require('../server/middleware/auth');
const { sendTemplateEmail } = require('../server/services/emailService');

const BASE = 'http://localhost:5000';

async function post(url, body, token) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (token) headers['Cookie'] = 'token=' + token;
  const res = await fetch(BASE + url, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json();
}

async function put(url, body, token) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (token) headers['Cookie'] = 'token=' + token;
  const res = await fetch(BASE + url, { method: 'PUT', headers, body: JSON.stringify(body) });
  return res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const [users] = await db.query('SELECT * FROM users WHERE id IN (1, 4)');
  const admin = users.find(u => u.id === 1);
  const user = users.find(u => u.id === 4);

  const userToken = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  const adminToken = generateToken({ id: admin.id, email: admin.email, name: admin.name, role: admin.role });

  // Create test data
  await db.query("INSERT IGNORE INTO family_members (id, first_name, last_name, user_id) VALUES (100, 'שמעון', 'בדיקה', 4)");
  await db.query("INSERT IGNORE INTO recipes (id, title, description, ingredients, instructions, user_id, is_approved) VALUES (99, 'מתכון בדיקה', 'תיאור', '[]', '[]', 4, 0)");

  console.log('====== TESTING ALL TRIGGERS ======\n');

  // USER -> ADMIN (7)
  console.log('1. contact-form:', (await post('/api/feedback', { category: 'general', message: 'בדיקה סופית כולל כפתור אדמין', userName: 'שמעון שביט', userEmail: 'shimon.shavit@gmail.com', pageUrl: 'https://jun-juhuri.com/he' })).success ? 'OK' : 'FAIL');
  await sleep(1000);

  console.log('2. suggestion-submitted:', (await post('/api/dictionary/entries/10/suggest', { dialect: 'General', hebrew: 'בדיקה סופית', latin: 'b', cyrillic: '', reason: 'test' }, userToken)).success ? 'OK' : 'FAIL');
  await sleep(1000);

  console.log('3. comment-submitted:', (await post('/api/comments', { entryId: 10, content: 'תגובת בדיקה סופית', guestName: 'שמעון אורח' })).success ? 'OK' : 'FAIL');
  await sleep(1000);

  console.log('4. word-submitted:', (await post('/api/dictionary/entries/add-untranslated', { term: 'בדיקהסופית' }, userToken)).success ? 'OK' : 'FAIL');
  await sleep(1000);

  console.log('5. field-suggested:', (await post('/api/dictionary/entries/10/suggest-field', { fieldName: 'hebrewShort', currentValue: 'x', suggestedValue: 'בדיקה שדה', reason: 'test' }, userToken)).success ? 'OK' : 'FAIL');
  await sleep(1000);

  console.log('6. example-submitted:', (await post('/api/dictionary/entries/10/suggest-example', { origin: 'פתגם בדיקה סופי', translated: 'תרגום', transliteration: 'test' }, userToken)).success ? 'OK' : 'FAIL');
  await sleep(1000);

  console.log('7. merge-suggested:', (await post('/api/dictionary/duplicates/suggest', { entryIdA: 10, entryIdB: 11, reason: 'בדיקת מיזוג סופית' }, userToken)).success ? 'OK' : 'FAIL');
  await sleep(1500);

  // ADMIN -> USER (8)
  const uc1 = await post('/api/comments', { entryId: 10, content: 'תגובה לאישור' }, userToken);
  await db.query('UPDATE comments SET status = "pending" WHERE id = ?', [uc1.id]);
  console.log('8. comment-approved:', (await post('/api/comments/' + uc1.id + '/approve', {}, adminToken)).success ? 'OK' : 'FAIL');
  await sleep(1000);

  const uc2 = await post('/api/comments', { entryId: 10, content: 'תגובה לדחייה' }, userToken);
  await db.query('UPDATE comments SET status = "pending" WHERE id = ?', [uc2.id]);
  console.log('9. comment-rejected:', (await post('/api/comments/' + uc2.id + '/reject', {}, adminToken)).success ? 'OK' : 'FAIL');
  await sleep(1000);

  console.log('10. entry-approved:', (await put('/api/dictionary/entries/' + encodeURIComponent('בדיקהסופית') + '/approve', {}, adminToken)).success ? 'OK' : 'FAIL');
  await sleep(1000);

  const [exs] = await db.query('SELECT id FROM community_examples WHERE user_id = 4 AND status = "pending" ORDER BY id DESC LIMIT 1');
  console.log('11. example-approved:', exs.length ? (await put('/api/dictionary/examples/' + exs[0].id + '/approve', {}, adminToken)).success ? 'OK' : 'FAIL' : 'SKIP');
  await sleep(1000);

  await db.query('UPDATE recipes SET is_approved = 0 WHERE id = 99');
  console.log('12. recipe-approved:', (await post('/api/recipes/admin/99/approve', {}, adminToken)).success ? 'OK' : 'FAIL');
  await sleep(1000);

  const [sugs] = await db.query('SELECT id FROM translation_suggestions WHERE user_id = 4 AND status = "pending" ORDER BY id DESC LIMIT 1');
  console.log('13. suggestion-approved:', sugs.length ? (await put('/api/dictionary/suggestions/' + sugs[0].id + '/approve', {}, adminToken)).success ? 'OK' : 'FAIL' : 'SKIP');
  await sleep(1000);

  const [sugs2] = await db.query('SELECT id FROM translation_suggestions WHERE user_id = 4 AND status = "pending" ORDER BY id DESC LIMIT 1');
  console.log('14. suggestion-rejected:', sugs2.length ? (await put('/api/dictionary/suggestions/' + sugs2[0].id + '/reject', {}, adminToken)).success ? 'OK' : 'FAIL' : 'SKIP');
  await sleep(1000);

  // 15. recipe-rejected
  await db.query("INSERT IGNORE INTO recipes (id, title, description, ingredients, instructions, user_id, is_approved) VALUES (98, 'מתכון לדחייה', 'x', '[]', '[]', 4, 0)");
  console.log('15. recipe-rejected:', (await post('/api/recipes/admin/98/reject', { reason: 'בדיקה' }, adminToken)).success ? 'OK' : 'FAIL');
  await sleep(1000);

  // 16. role-changed
  console.log('16. role-changed:', (await put('/api/users/4/role', { role: 'approver' }, adminToken)).success ? 'OK' : 'FAIL');
  await sleep(500);
  await put('/api/users/4/role', { role: 'user' }, adminToken);
  await sleep(1000);

  // FAMILY (3)
  console.log('17. family-link-request:', (await post('/api/family/community/link-requests', { source_member_id: 100, target_member_id: 3, relationship_type: 'child' }, userToken)).success ? 'OK' : 'FAIL');
  await sleep(1000);

  const [lrs] = await db.query('SELECT id FROM family_link_requests WHERE status = "pending" ORDER BY id DESC LIMIT 1');
  console.log('18. family-link-approved:', lrs.length ? (await put('/api/family/community/link-requests/' + lrs[0].id, { status: 'approved' }, adminToken)).success ? 'OK' : 'FAIL' : 'SKIP');
  await sleep(500);

  await post('/api/family/community/link-requests', { source_member_id: 100, target_member_id: 4, relationship_type: 'spouse' }, userToken);
  await sleep(500);
  const [lrs2] = await db.query('SELECT id FROM family_link_requests WHERE status = "pending" ORDER BY id DESC LIMIT 1');
  console.log('19. family-link-rejected:', lrs2.length ? (await put('/api/family/community/link-requests/' + lrs2[0].id, { status: 'rejected' }, adminToken)).success ? 'OK' : 'FAIL' : 'SKIP');
  await sleep(1500);

  // DIRECT TEMPLATE SENDS (for recording triggers + templates that need specific data)
  console.log('20. recording-submitted:', await sendTemplateEmail('recording-submitted', { variables: { guestName: 'שמעון אורח', term: 'קיי', entryId: '1' } }).then(() => 'OK').catch(e => 'FAIL: ' + e.message));
  await sleep(1000);
  console.log('21. recording-approved:', await sendTemplateEmail('recording-approved', { to: 'shimon.shavit@gmail.com', variables: { userName: 'Shimon Yehonatan Shavit', term: 'קיי' } }).then(() => 'OK').catch(e => 'FAIL: ' + e.message));
  await sleep(1000);
  console.log('22. recording-rejected:', await sendTemplateEmail('recording-rejected', { to: 'shimon.shavit@gmail.com', variables: { userName: 'Shimon Yehonatan Shavit', term: 'קיי' } }).then(() => 'OK').catch(e => 'FAIL: ' + e.message));

  console.log('\n====== DONE ======');

  // Cleanup
  await db.query('DELETE FROM comments WHERE content LIKE "%בדיקה%"');
  await db.query('DELETE FROM community_examples WHERE origin LIKE "%בדיקה%"');
  await db.query('DELETE FROM translation_suggestions WHERE reason = "test"');
  await db.query('DELETE FROM merge_suggestions WHERE reason LIKE "%בדיקת%"');
  await db.query('DELETE FROM dictionary_entries WHERE hebrew_script = "בדיקהסופית"');
  await db.query('DELETE FROM recipes WHERE id IN (98, 99)');
  await db.query('DELETE FROM family_link_requests WHERE requester_id = 4');
  await db.query('DELETE FROM family_members WHERE id = 100');
  await db.query('DELETE FROM site_feedback WHERE message LIKE "%בדיקה%"');
  console.log('Test data cleaned up');

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
