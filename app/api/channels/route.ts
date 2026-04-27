import { NextResponse } from 'next/server';
import { loadChannels, saveChannels, Channel } from '@/lib/channelData';
import { requireLogin, requireAdmin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const channels = await loadChannels();
  return NextResponse.json(channels, { headers: noCacheHeaders() });
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const channels = await loadChannels();
    if (channels.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json({ error: 'Channel already exists' }, { status: 409 });
    }

    const newChannel: Channel = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    };
    channels.push(newChannel);
    await saveChannels(channels);

    return NextResponse.json(newChannel, { status: 201 });
  } catch (err) {
    console.error('Create channel error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
