import { NextResponse } from 'next/server';
import { loadUsers, saveUsers } from '@/lib/userData';
import { loadVisits } from '@/lib/visitData';
import { requireAdmin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/users/bulk-email
 * Reads visit data from Blob, extracts unique email→name pairs,
 * matches to existing users by name (case-insensitive), and sets emails.
 * Only updates users who don't already have an email.
 */
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const visits = await loadVisits();
  const users = await loadUsers();

  // Build email → name map from visits
  const emailNames: Record<string, { first: string; last: string }> = {};
  for (const v of visits) {
    const email = v.repEmail.trim().toLowerCase();
    if (!email || emailNames[email]) continue;
    const parts = v.repName.trim().split(/\s+/);
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ') || '';
    emailNames[email] = { first, last };
  }

  const results: { email: string; userName: string; status: string }[] = [];

  for (const [email, { first, last }] of Object.entries(emailNames)) {
    // Find user by first+last name (case-insensitive)
    const match = users.find(u => {
      const uFirst = u.name.trim().toLowerCase();
      const uLast = u.surname.trim().toLowerCase();
      return uFirst === first.toLowerCase() && uLast === last.toLowerCase();
    });

    if (match) {
      if (!match.email || match.email.trim() === '') {
        match.email = email;
        results.push({ email, userName: `${match.name} ${match.surname}`, status: 'updated' });
      } else {
        results.push({ email, userName: `${match.name} ${match.surname}`, status: 'already_set' });
      }
    } else {
      results.push({ email, userName: `${first} ${last}`, status: 'no_match' });
    }
  }

  await saveUsers(users);

  return NextResponse.json({
    updated: results.filter(r => r.status === 'updated').length,
    alreadySet: results.filter(r => r.status === 'already_set').length,
    noMatch: results.filter(r => r.status === 'no_match').length,
    results,
  }, { headers: noCacheHeaders() });
}
