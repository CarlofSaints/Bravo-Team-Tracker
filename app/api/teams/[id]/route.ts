import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { loadTeams, saveTeams } from '@/lib/teamData';
import { requireAdmin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    const contentType = req.headers.get('content-type') || '';

    const teams = await loadTeams();
    const idx = teams.findIndex(t => t.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (contentType.includes('multipart/form-data')) {
      // Icon upload
      const formData = await req.formData();
      const file = formData.get('icon') as File | null;
      const name = formData.get('name') as string | null;

      if (name) teams[idx].name = name;

      if (file && file.size > 0) {
        const key = `team-icons/${id}`;
        await put(key, file, {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: file.type,
        });
        teams[idx].iconKey = key;
      }
    } else {
      const body = await req.json();
      if (body.name !== undefined) teams[idx].name = body.name;
      if (body.members !== undefined) teams[idx].members = body.members;
    }

    await saveTeams(teams);
    return NextResponse.json(teams[idx], { headers: noCacheHeaders() });
  } catch (err) {
    console.error('Update team error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const teams = await loadTeams();
  const filtered = teams.filter(t => t.id !== id);
  if (filtered.length === teams.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await saveTeams(filtered);
  return NextResponse.json({ success: true });
}
