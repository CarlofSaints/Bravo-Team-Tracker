import { NextResponse } from 'next/server';
import { loadTeams, saveTeams, Team } from '@/lib/teamData';
import { requireLogin, requireAdmin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const teams = await loadTeams();
  return NextResponse.json(teams, { headers: noCacheHeaders() });
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const teams = await loadTeams();
    if (teams.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json({ error: 'Team already exists' }, { status: 409 });
    }

    const newTeam: Team = {
      id: crypto.randomUUID(),
      name,
      iconKey: null,
      members: [],
      createdAt: new Date().toISOString(),
    };
    teams.push(newTeam);
    await saveTeams(teams);

    return NextResponse.json(newTeam, { status: 201 });
  } catch (err) {
    console.error('Create team error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
