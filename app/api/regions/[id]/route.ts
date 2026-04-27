import { NextResponse } from 'next/server';
import { loadRegions, saveRegions } from '@/lib/regionData';
import { requireAdmin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    const body = await req.json();
    const regions = await loadRegions();
    const idx = regions.findIndex(r => r.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (body.name !== undefined) regions[idx].name = body.name;
    if (body.teamIds !== undefined) regions[idx].teamIds = body.teamIds;

    await saveRegions(regions);
    return NextResponse.json(regions[idx], { headers: noCacheHeaders() });
  } catch (err) {
    console.error('Update region error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const regions = await loadRegions();
  const filtered = regions.filter(r => r.id !== id);
  if (filtered.length === regions.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await saveRegions(filtered);
  return NextResponse.json({ success: true });
}
