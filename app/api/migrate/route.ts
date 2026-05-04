import { NextResponse } from 'next/server';
import { loadUsers, saveUsers } from '@/lib/userData';
import { loadTeams, saveTeams } from '@/lib/teamData';
import { noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/migrate
 * Migrates users from legacy `teamId: string | null` to `teamIds: string[]`.
 * Also rebuilds team.members arrays to match.
 * Safe to run multiple times — idempotent.
 */
export async function POST(req: Request) {
  try {
    const { secret } = await req.json();
    if (secret !== 'bravo-seed-2026') {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    const users = await loadUsers();
    const teams = await loadTeams();

    let migrated = 0;

    for (const user of users) {
      // If user still has legacy teamId field but no teamIds array
      const legacy = (user as unknown as Record<string, unknown>);
      if (!Array.isArray(user.teamIds)) {
        const oldTeamId = legacy.teamId as string | null | undefined;
        user.teamIds = oldTeamId ? [oldTeamId] : [];
        delete legacy.teamId;
        migrated++;
      }
    }

    // Rebuild team members arrays from user.teamIds (source of truth)
    for (const team of teams) {
      team.members = users.filter(u => u.teamIds.includes(team.id)).map(u => u.id);
    }

    await saveUsers(users);
    await saveTeams(teams);

    return NextResponse.json({
      success: true,
      migrated,
      totalUsers: users.length,
      teamMemberships: teams.map(t => ({ name: t.name, members: t.members.length })),
    }, { headers: noCacheHeaders() });
  } catch (err) {
    console.error('Migration error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
