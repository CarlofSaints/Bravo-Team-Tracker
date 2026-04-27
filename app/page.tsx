'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth, authFetch, Session } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

interface StoreRow {
  id: string;
  name: string;
  area: string;
  channelId: string;
  regionId: string;
  teamId: string;
  repUserId: string | null;
  perigeeStoreCode: string;
  perigeeStoreName: string;
}

interface TeamRow { id: string; name: string }
interface RegionRow { id: string; name: string }
interface ChannelRow { id: string; name: string }
interface UserRow { id: string; name: string; surname: string; teamId: string | null }

export default function DashboardPage() {
  const { session, loading, logout } = useAuth();

  const [stores, setStores] = useState<StoreRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [fetching, setFetching] = useState(true);

  // Filters
  const [filterChannel, setFilterChannel] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!session) return;
    Promise.all([
      authFetch('/api/stores', { cache: 'no-store' }).then(r => r.json()),
      authFetch('/api/teams', { cache: 'no-store' }).then(r => r.json()),
      authFetch('/api/regions', { cache: 'no-store' }).then(r => r.json()),
      authFetch('/api/channels', { cache: 'no-store' }).then(r => r.json()),
      session.role === 'admin'
        ? authFetch('/api/users', { cache: 'no-store' }).then(r => r.json())
        : Promise.resolve([]),
    ]).then(([s, t, r, c, u]) => {
      setStores(Array.isArray(s) ? s : []);
      setTeams(Array.isArray(t) ? t : []);
      setRegions(Array.isArray(r) ? r : []);
      setChannels(Array.isArray(c) ? c : []);
      setUsers(Array.isArray(u) ? u : []);
      setFetching(false);
    }).catch(() => setFetching(false));
  }, [session]);

  const nameMap = useMemo(() => {
    const m: Record<string, string> = {};
    teams.forEach(t => { m[`team:${t.id}`] = t.name; });
    regions.forEach(r => { m[`region:${r.id}`] = r.name; });
    channels.forEach(c => { m[`channel:${c.id}`] = c.name; });
    users.forEach(u => { m[`user:${u.id}`] = `${u.name} ${u.surname}`.trim(); });
    return m;
  }, [teams, regions, channels, users]);

  const filtered = useMemo(() => {
    return stores.filter(s => {
      if (filterChannel && s.channelId !== filterChannel) return false;
      if (filterTeam && s.teamId !== filterTeam) return false;
      if (filterRegion && s.regionId !== filterRegion) return false;
      if (filterUser && s.repUserId !== filterUser) return false;
      if (search) {
        const q = search.toLowerCase();
        const sName = s.name.toLowerCase();
        const cName = (nameMap[`channel:${s.channelId}`] || '').toLowerCase();
        const tName = (nameMap[`team:${s.teamId}`] || '').toLowerCase();
        if (!sName.includes(q) && !cName.includes(q) && !tName.includes(q) && !s.perigeeStoreCode.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [stores, filterChannel, filterTeam, filterRegion, filterUser, search, nameMap]);

  const mapped = stores.filter(s => s.perigeeStoreCode !== 'Not Mapped').length;

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">Dashboard</h1>

        {/* Top cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card label="Total Stores" value={stores.length} icon="store" />
          <Card label="Mapped Stores" value={mapped} icon="check" color={mapped === stores.length ? 'green' : 'amber'} />
          <Card label="Unmapped" value={stores.length - mapped} icon="alert" color="red" />
          <Card label="Total Visits" value={0} icon="visit" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
          <FilterSelect label="Channel" value={filterChannel} onChange={setFilterChannel} options={channels.map(c => ({ value: c.id, label: c.name }))} />
          <FilterSelect label="Team" value={filterTeam} onChange={setFilterTeam} options={teams.map(t => ({ value: t.id, label: t.name }))} />
          <FilterSelect label="Region" value={filterRegion} onChange={setFilterRegion} options={regions.map(r => ({ value: r.id, label: r.name }))} />
          {users.length > 0 && (
            <FilterSelect label="Rep" value={filterUser} onChange={setFilterUser} options={users.filter(u => u.teamId).map(u => ({ value: u.id, label: `${u.name} ${u.surname}` }))} />
          )}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Store name, code..."
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
            />
          </div>
        </div>

        {/* Grid */}
        {fetching ? (
          <div className="text-center text-gray-400 py-12">Loading stores...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-navy)] text-white text-left">
                    <th className="px-3 py-2 font-medium">Store Name</th>
                    <th className="px-3 py-2 font-medium">Area</th>
                    <th className="px-3 py-2 font-medium">Channel</th>
                    <th className="px-3 py-2 font-medium">Team</th>
                    <th className="px-3 py-2 font-medium">Region</th>
                    <th className="px-3 py-2 font-medium">Perigee Code</th>
                    <th className="px-3 py-2 font-medium">Rep</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">No stores found</td></tr>
                  ) : (
                    filtered.slice(0, 200).map(s => (
                      <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{s.name}</td>
                        <td className="px-3 py-2 text-gray-600">{s.area}</td>
                        <td className="px-3 py-2">{nameMap[`channel:${s.channelId}`] || '—'}</td>
                        <td className="px-3 py-2">{nameMap[`team:${s.teamId}`] || '—'}</td>
                        <td className="px-3 py-2">{nameMap[`region:${s.regionId}`] || '—'}</td>
                        <td className={`px-3 py-2 ${s.perigeeStoreCode === 'Not Mapped' ? 'text-red-500 font-medium' : ''}`}>
                          {s.perigeeStoreCode}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{s.repUserId ? (nameMap[`user:${s.repUserId}`] || '—') : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > 200 && (
              <div className="px-3 py-2 text-xs text-gray-400 border-t">Showing 200 of {filtered.length} stores</div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

function Card({ label, value, icon, color }: { label: string; value: number; icon: string; color?: string }) {
  const bg = color === 'green' ? 'bg-green-50 text-green-700' : color === 'red' ? 'bg-red-50 text-red-700' : color === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700';
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bg}`}>
        {icon === 'store' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" /></svg>}
        {icon === 'check' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        {icon === 'alert' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
        {icon === 'visit' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="min-w-[150px]">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
      >
        <option value="">All</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
