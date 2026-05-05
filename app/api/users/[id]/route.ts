import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { loadUsers, saveUsers } from '@/lib/userData';
import { loadTeams, saveTeams } from '@/lib/teamData';
import { requireAdmin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    const body = await req.json();
    const users = await loadUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const user = users[idx];
    const oldTeamIds = [...user.teamIds];

    if (body.username !== undefined) user.username = body.username;
    if (body.name !== undefined) user.name = body.name;
    if (body.surname !== undefined) user.surname = body.surname;
    if (body.email !== undefined) user.email = body.email;
    if (body.role !== undefined) user.role = body.role;
    if (body.status !== undefined) user.status = body.status;
    if (body.teamIds !== undefined) user.teamIds = Array.isArray(body.teamIds) ? body.teamIds : [];
    else if (body.teamId !== undefined) user.teamIds = body.teamId ? [body.teamId] : [];
    // Exited users must not belong to any team
    if (user.status === 'exited') user.teamIds = [];
    if (body.forcePasswordChange !== undefined) user.forcePasswordChange = body.forcePasswordChange;
    if (body.password) user.password = await bcrypt.hash(body.password, 10);

    users[idx] = user;
    await saveUsers(users);

    // Update team membership if teams changed
    const added = user.teamIds.filter(t => !oldTeamIds.includes(t));
    const removed = oldTeamIds.filter(t => !user.teamIds.includes(t));
    if (added.length > 0 || removed.length > 0) {
      const teams = await loadTeams();
      for (const tid of removed) {
        const team = teams.find(t => t.id === tid);
        if (team) team.members = team.members.filter(m => m !== id);
      }
      for (const tid of added) {
        const team = teams.find(t => t.id === tid);
        if (team && !team.members.includes(id)) team.members.push(id);
      }
      await saveTeams(teams);
    }

    const { password: _pw, ...safe } = user;
    return NextResponse.json(safe, { headers: noCacheHeaders() });
  } catch (err) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const users = await loadUsers();
  const user = users.find(u => u.id === id);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const filtered = users.filter(u => u.id !== id);
  await saveUsers(filtered);

  // Remove from all teams
  if (user.teamIds.length > 0) {
    const teams = await loadTeams();
    let changed = false;
    for (const tid of user.teamIds) {
      const team = teams.find(t => t.id === tid);
      if (team) {
        team.members = team.members.filter(m => m !== id);
        changed = true;
      }
    }
    if (changed) await saveTeams(teams);
  }

  return NextResponse.json({ success: true });
}
