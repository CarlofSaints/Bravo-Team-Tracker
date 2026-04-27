import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export const dynamic = 'force-dynamic';

/**
 * GET /api/teams/[id]/icon — stream team icon from private Blob.
 * No auth header required (<img src> can't send custom headers).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = `team-icons/${id}`;

  try {
    const result = await get(key, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const contentType =
      result.headers.get('content-type') ?? 'image/png';
    return new Response(result.stream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
