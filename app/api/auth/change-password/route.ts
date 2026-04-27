import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { loadUsers, saveUsers } from '@/lib/userData';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userId, currentPassword, newPassword } = await req.json();
    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const users = await loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[idx];

    // If not forced change, verify current password
    if (!user.forcePasswordChange) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password required' }, { status: 400 });
      }
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return NextResponse.json({ error: 'Current password incorrect' }, { status: 401 });
      }
    }

    users[idx] = {
      ...user,
      password: await bcrypt.hash(newPassword, 10),
      forcePasswordChange: false,
    };
    await saveUsers(users);

    return NextResponse.json({
      id: users[idx].id,
      username: users[idx].username,
      name: users[idx].name,
      surname: users[idx].surname,
      email: users[idx].email,
      role: users[idx].role,
      teamId: users[idx].teamId,
      forcePasswordChange: false,
      profilePicKey: users[idx].profilePicKey,
    });
  } catch (err) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
