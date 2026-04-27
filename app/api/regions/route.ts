import { NextResponse } from 'next/server';
import { loadRegions, saveRegions, Region } from '@/lib/regionData';
import { requireLogin, requireAdmin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const regions = await loadRegions();
  return NextResponse.json(regions, { headers: noCacheHeaders() });
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { name, teamIds } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const regions = await loadRegions();
    const newRegion: Region = {
      id: crypto.randomUUID(),
      name,
      teamIds: teamIds || [],
      createdAt: new Date().toISOString(),
    };
    regions.push(newRegion);
    await saveRegions(regions);

    return NextResponse.json(newRegion, { status: 201 });
  } catch (err) {
    console.error('Create region error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
