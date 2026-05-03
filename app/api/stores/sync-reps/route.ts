import { NextResponse } from 'next/server';
import { loadStores, saveStores } from '@/lib/storeData';
import { loadUsers } from '@/lib/userData';
import { loadVisits } from '@/lib/visitData';
import { loadRegions } from '@/lib/regionData';
import { requireAdmin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/stores/sync-reps
 * Reads visit data, finds the most-frequent rep per store,
 * assigns repUserId + teamId (from user) + regionId (from region→teamIds).
 */
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [stores, users, visits, regions] = await Promise.all([
    loadStores(),
    loadUsers(),
    loadVisits(),
    loadRegions(),
  ]);

  // Build email→user lookup (case-insensitive)
  const emailToUser: Record<string, typeof users[0]> = {};
  for (const u of users) {
    if (u.email) emailToUser[u.email.trim().toLowerCase()] = u;
  }

  // Build teamId→regionId lookup
  const teamToRegion: Record<string, string> = {};
  for (const r of regions) {
    for (const tid of r.teamIds) {
      teamToRegion[tid] = r.id;
    }
  }

  // Count visits per store per rep email
  const storeRepCounts: Record<string, Record<string, number>> = {};
  for (const v of visits) {
    const code = v.storeCode;
    const email = v.repEmail.trim().toLowerCase();
    if (!code || !email) continue;
    if (!storeRepCounts[code]) storeRepCounts[code] = {};
    storeRepCounts[code][email] = (storeRepCounts[code][email] || 0) + 1;
  }

  let repAssigned = 0;
  let teamAssigned = 0;
  let regionAssigned = 0;
  let noVisits = 0;
  let noUser = 0;
  const details: { store: string; code: string; rep: string | null; team: string | null; region: string | null; status: string }[] = [];

  for (const store of stores) {
    const code = store.perigeeStoreCode;
    if (code === 'Not Mapped') continue;

    const repCounts = storeRepCounts[code];
    if (!repCounts || Object.keys(repCounts).length === 0) {
      noVisits++;
      continue;
    }

    // Find rep with most visits
    let topEmail = '';
    let topCount = 0;
    for (const [email, count] of Object.entries(repCounts)) {
      if (count > topCount) { topEmail = email; topCount = count; }
    }

    const user = emailToUser[topEmail];
    if (!user) {
      noUser++;
      details.push({ store: store.name, code, rep: topEmail, team: null, region: null, status: 'no_user' });
      continue;
    }

    let changed = false;
    const result: typeof details[0] = { store: store.name, code, rep: `${user.name} ${user.surname}`, team: null, region: null, status: 'ok' };

    // Assign rep
    if (store.repUserId !== user.id) {
      store.repUserId = user.id;
      repAssigned++;
      changed = true;
    }

    // Assign team from rep
    if (user.teamId && store.teamId !== user.teamId) {
      store.teamId = user.teamId;
      teamAssigned++;
      changed = true;
    }
    result.team = user.teamId || null;

    // Assign region from team
    const regionId = user.teamId ? teamToRegion[user.teamId] : undefined;
    if (regionId && store.regionId !== regionId) {
      store.regionId = regionId;
      regionAssigned++;
      changed = true;
    }
    result.region = regionId || null;

    if (changed) {
      details.push(result);
    }
  }

  await saveStores(stores);

  return NextResponse.json({
    repAssigned,
    teamAssigned,
    regionAssigned,
    noVisits,
    noUser,
    totalStores: stores.length,
    details,
  }, { headers: noCacheHeaders() });
}
