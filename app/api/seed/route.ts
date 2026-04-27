import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { loadUsers, saveUsers, User } from '@/lib/userData';
import { loadTeams, saveTeams, Team } from '@/lib/teamData';
import { loadRegions, saveRegions, Region } from '@/lib/regionData';
import { loadChannels, saveChannels, Channel } from '@/lib/channelData';

export const dynamic = 'force-dynamic';

function uid() {
  return crypto.randomUUID();
}

const SEED_TEAMS = [
  'Blitz1', 'Blitz2', 'Cheetahs', 'Sharks', 'Elephants',
  'Pumas', 'Lions', 'Botswana', 'Namibia',
];

const SEED_CHANNELS = [
  'Beares', 'Bradlows', 'Lewis', 'Russells', 'OK Furniture',
  'Best Home Electric', 'Sleepmasters', 'House & Home', 'Dial A Bed',
  'Fair Price', 'Homecorp', 'Furnmart', 'UFO', 'Mojo Beds',
  'Rochester', 'Tafelberg', 'Nictus', 'Savells', 'Joshua Doore',
  'Electric Express', 'Unitrade', 'Price & Pride',
];

// Region name → team names
const SEED_REGIONS: Record<string, string[]> = {
  'NW & Free State': ['Cheetahs'],
  'NC & Lesotho': ['Cheetahs'],
  'KZN': ['Sharks'],
  'Eastern Cape': ['Elephants'],
  'Western Cape': ['Blitz1', 'Blitz2'],
  'Limpopo': ['Pumas'],
  'Mpumalanga/Eswatini': ['Pumas'],
  'Mpumalanga/Limpopo': ['Pumas'],
  'Gauteng': ['Lions'],
  'Botswana': ['Botswana'],
  'Namibia': ['Namibia'],
};

// Team name → rep names (name, surname)
const SEED_REPS: Record<string, Array<{ name: string; surname: string }>> = {
  'Blitz1': [{ name: 'Aadil', surname: 'Rep' }],
  'Blitz2': [{ name: 'Marli', surname: 'Rep' }, { name: 'Tamryn', surname: 'Rep' }],
  'Cheetahs': [{ name: 'Gerhard', surname: 'Rep' }, { name: 'Willem', surname: 'Rep' }],
  'Sharks': [{ name: 'Leon', surname: 'Rep' }, { name: 'Sibo', surname: 'Rep' }],
  'Elephants': [{ name: 'Margeaux', surname: 'Rep' }],
  'Pumas': [{ name: 'William', surname: 'Rep' }, { name: 'King', surname: 'Rep' }, { name: 'Kopane', surname: 'Rep' }],
  'Lions': [{ name: 'Riekie', surname: 'Rep' }, { name: 'Preyesh', surname: 'Rep' }, { name: 'Adele', surname: 'Rep' }, { name: 'Devika', surname: 'Rep' }],
  'Botswana': [{ name: 'Blessing', surname: 'Rep' }],
  'Namibia': [{ name: 'George', surname: 'Rep' }],
};

// OPS Support
const SEED_OPS: Array<{ name: string; surname: string; teams: string[] }> = [
  { name: 'Hannes', surname: 'Ops', teams: ['Botswana', 'Pumas', 'Lions'] },
  { name: 'Ricardo', surname: 'Ops', teams: ['Namibia', 'Cheetahs', 'Elephants', 'Pumas'] },
  { name: 'Kalavani', surname: 'Ops', teams: ['Sharks', 'Elephants', 'Blitz1', 'Blitz2'] },
];

export async function POST(req: Request) {
  try {
    const { secret } = await req.json();
    if (secret !== 'bravo-seed-2026') {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    const existingUsers = await loadUsers();
    if (existingUsers.length > 0) {
      return NextResponse.json({ error: 'Already seeded — delete users.json in Blob to re-seed' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const pwHash = await bcrypt.hash('bravo2026', 10);

    // 1. Create teams
    const teamMap: Record<string, string> = {};
    const teams: Team[] = SEED_TEAMS.map(name => {
      const id = uid();
      teamMap[name] = id;
      return { id, name, iconKey: null, members: [], createdAt: now };
    });

    // 2. Create channels
    const channels: Channel[] = SEED_CHANNELS.map(name => ({
      id: uid(),
      name,
      createdAt: now,
    }));

    // 3. Create regions
    const regions: Region[] = Object.entries(SEED_REGIONS).map(([name, teamNames]) => ({
      id: uid(),
      name,
      teamIds: teamNames.map(tn => teamMap[tn]).filter(Boolean),
      createdAt: now,
    }));

    // 4. Create admin user
    const adminId = uid();
    const users: User[] = [{
      id: adminId,
      username: 'carl',
      name: 'Carl',
      surname: 'Dos Santos',
      email: 'carl@outerjoin.co.za',
      password: pwHash,
      role: 'admin',
      teamId: null,
      forcePasswordChange: false,
      profilePicKey: null,
      createdAt: now,
    }];

    // 5. Create rep users + assign to teams
    for (const [teamName, reps] of Object.entries(SEED_REPS)) {
      const teamId = teamMap[teamName];
      for (const rep of reps) {
        const repId = uid();
        users.push({
          id: repId,
          username: rep.name.toLowerCase(),
          name: rep.name,
          surname: rep.surname,
          email: `${rep.name.toLowerCase()}@bravo.co.za`,
          password: pwHash,
          role: 'rep',
          teamId,
          forcePasswordChange: true,
          profilePicKey: null,
          createdAt: now,
        });
        const team = teams.find(t => t.id === teamId);
        if (team) team.members.push(repId);
      }
    }

    // 6. Create ops support users
    for (const ops of SEED_OPS) {
      const opsId = uid();
      users.push({
        id: opsId,
        username: ops.name.toLowerCase(),
        name: ops.name,
        surname: ops.surname,
        email: `${ops.name.toLowerCase()}@bravo.co.za`,
        password: pwHash,
        role: 'ops_support',
        teamId: null,
        forcePasswordChange: true,
        profilePicKey: null,
        createdAt: now,
      });
    }

    // 7. Create Tanya as team_manager
    const tanyaId = uid();
    users.push({
      id: tanyaId,
      username: 'tanya',
      name: 'Tanya',
      surname: 'Manager',
      email: 'tanya@bravo.co.za',
      password: pwHash,
      role: 'team_manager',
      teamId: null,
      forcePasswordChange: true,
      profilePicKey: null,
      createdAt: now,
    });

    await saveTeams(teams);
    await saveChannels(channels);
    await saveRegions(regions);
    await saveUsers(users);

    return NextResponse.json({
      success: true,
      counts: {
        teams: teams.length,
        channels: channels.length,
        regions: regions.length,
        users: users.length,
      },
      adminLogin: { username: 'carl', password: 'bravo2026' },
    });
  } catch (err) {
    console.error('Seed error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
