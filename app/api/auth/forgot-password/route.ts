import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { loadUsers, saveUsers } from '@/lib/userData';
import { sendPasswordResetEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const users = await loadUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Always return success to avoid revealing whether email exists
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 hex chars
    const hashed = await bcrypt.hash(tempPassword, 10);

    user.password = hashed;
    user.forcePasswordChange = true;
    await saveUsers(users);

    sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      username: user.username,
      password: tempPassword,
    }).catch(err => console.error('Reset email failed:', err));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
