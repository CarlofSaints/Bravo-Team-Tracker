import { NextResponse } from 'next/server';
import { loadUsers, saveUsers } from '@/lib/userData';
import { requireLogin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { password: _pw, ...safe } = user;
  return NextResponse.json(safe, { headers: noCacheHeaders() });
}

export async function PUT(req: Request) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const users = await loadUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (body.username !== undefined) {
      // Check unique
      if (users.some(u => u.id !== user.id && u.username.toLowerCase() === body.username.toLowerCase())) {
        return NextResponse.json({ error: 'Username taken' }, { status: 409 });
      }
      users[idx].username = body.username;
    }
    if (body.name !== undefined) users[idx].name = body.name;
    if (body.surname !== undefined) users[idx].surname = body.surname;
    if (body.email !== undefined) users[idx].email = body.email;

    await saveUsers(users);
    const { password: _pw, ...safe } = users[idx];
    return NextResponse.json(safe, { headers: noCacheHeaders() });
  } catch (err) {
    console.error('Account update error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
