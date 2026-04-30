import { NextResponse } from 'next/server';
import { loadChannels, saveChannels } from '@/lib/channelData';
import { requireAdmin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    const body = await req.json();
    const channels = await loadChannels();
    const idx = channels.findIndex(c => c.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (body.name !== undefined) channels[idx].name = body.name;
    if (body.targetFrequency !== undefined) channels[idx].targetFrequency = body.targetFrequency || undefined;

    await saveChannels(channels);
    return NextResponse.json(channels[idx], { headers: noCacheHeaders() });
  } catch (err) {
    console.error('Update channel error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const channels = await loadChannels();
  const filtered = channels.filter(c => c.id !== id);
  if (filtered.length === channels.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await saveChannels(filtered);
  return NextResponse.json({ success: true });
}
