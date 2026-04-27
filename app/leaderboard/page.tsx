'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, authFetch } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

interface Team {
  id: string;
  name: string;
  iconKey: string | null;
}

const FAKE_SCORES: Record<string, { visits: number; training: number; sales: number; promo: number; total: number }> = {
  Lions:     { visits: 245, training: 98, sales: 187, promo: 92, total: 622 },
  Pumas:     { visits: 231, training: 95, sales: 172, promo: 88, total: 586 },
  Sharks:    { visits: 218, training: 91, sales: 165, promo: 85, total: 559 },
  Cheetahs:  { visits: 205, training: 88, sales: 158, promo: 82, total: 533 },
  Blitz1:    { visits: 198, training: 85, sales: 145, promo: 79, total: 507 },
  Elephants: { visits: 190, training: 82, sales: 138, promo: 76, total: 486 },
  Blitz2:    { visits: 175, training: 78, sales: 132, promo: 73, total: 458 },
  Botswana:  { visits: 142, training: 65, sales: 98,  promo: 61, total: 366 },
  Namibia:   { visits: 128, training: 58, sales: 85,  promo: 54, total: 325 },
};

function rankBadge(rank: number) {
  if (rank === 1) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-white text-xs font-bold">1</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-300 text-white text-xs font-bold">2</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white text-xs font-bold">3</span>;
  return <span className="inline-flex items-center justify-center w-7 h-7 text-sm text-gray-500 font-medium">{rank}</span>;
}

export default function LeaderboardPage() {
  const { session, loading, logout } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!session) return;
    authFetch('/api/teams', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        setTeams(Array.isArray(data) ? data : []);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, [session]);

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  // Build ranked rows: match team names to fake scores, sort by total desc
  const rows = teams
    .map(t => {
      const scores = FAKE_SCORES[t.name];
      return scores ? { team: t, ...scores } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.total - a!.total)
    .map((row, i) => ({ ...row!, rank: i + 1 }));

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">Team Leaderboard</h1>

        <div className="relative">
          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {fetching ? (
              <div className="text-center text-gray-400 py-12">Loading teams...</div>
            ) : rows.length === 0 ? (
              <div className="text-center text-gray-400 py-12">No teams found</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-navy)] text-white text-left">
                    <th className="px-4 py-3 font-semibold w-16">Rank</th>
                    <th className="px-4 py-3 font-semibold">Team</th>
                    <th className="px-4 py-3 font-semibold text-right">Visits</th>
                    <th className="px-4 py-3 font-semibold text-right">Training</th>
                    <th className="px-4 py-3 font-semibold text-right">Sales</th>
                    <th className="px-4 py-3 font-semibold text-right">Promo Compliance</th>
                    <th className="px-4 py-3 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.team.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3">{rankBadge(row.rank)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {row.team.iconKey ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/api/teams/${row.team.id}/icon`} alt={row.team.name} className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] text-[var(--color-navy)] flex items-center justify-center font-bold text-xs">
                              {row.team.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-[var(--color-navy)]">{row.team.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{row.visits}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{row.training}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{row.sales}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{row.promo}</td>
                      <td className="px-4 py-3 text-right font-bold text-[var(--color-navy)]">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Frosted overlay */}
          <div className="absolute inset-0 backdrop-blur-sm bg-white/60 rounded-xl flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-[var(--color-navy)]/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[var(--color-navy)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--color-navy)] mb-2">Unlock Team Leaderboard</h2>
            <p className="text-gray-600 max-w-md mb-6">
              See live team rankings, track points across visits, training, sales and promo compliance. Motivate your teams with real-time competition.
            </p>
            <Link
              href="/pro"
              className="px-6 py-3 bg-[var(--color-navy)] text-white rounded-lg font-semibold hover:bg-[var(--color-navy-light)] transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
