import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { loadUsers, saveUsers } from '@/lib/userData';
import { requireLogin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('avatar') as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const key = `avatars/${user.id}`;
    await put(key, file, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: file.type,
    });

    const users = await loadUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].profilePicKey = key;
      await saveUsers(users);
    }

    return NextResponse.json({ success: true, profilePicKey: key });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
