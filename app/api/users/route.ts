import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { loadUsers, saveUsers, User } from '@/lib/userData';
import { loadTeams, saveTeams } from '@/lib/teamData';
import { requireAdmin, noCacheHeaders } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await loadUsers();
  const safe = users.map(({ password: _pw, ...rest }) => rest);
  return NextResponse.json(safe, { headers: noCacheHeaders() });
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { username, name, surname, email, password, role, teamId, forcePasswordChange } = body;

    if (!username || !name || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const users = await loadUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      username,
      name,
      surname: surname || '',
      email: email || '',
      password: await bcrypt.hash(password, 10),
      role,
      teamId: teamId || null,
      forcePasswordChange: forcePasswordChange ?? true,
      profilePicKey: null,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await saveUsers(users);

    // Add to team members if assigned
    if (newUser.teamId) {
      const teams = await loadTeams();
      const team = teams.find(t => t.id === newUser.teamId);
      if (team && !team.members.includes(newUser.id)) {
        team.members.push(newUser.id);
        await saveTeams(teams);
      }
    }

    // Send welcome email (non-blocking — don't fail user creation if email fails)
    if (newUser.email) {
      sendWelcomeEmail({
        to: newUser.email,
        name: newUser.name,
        username: newUser.username,
        password,
      }).catch(err => console.error('Welcome email failed:', err));
    }

    const { password: _pw, ...safe } = newUser;
    return NextResponse.json(safe, { status: 201 });
  } catch (err) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
