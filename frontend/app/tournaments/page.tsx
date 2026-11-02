'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import TiltCard3D from '../components/ui/TiltCard3D';
import { playSpatialSFX } from '../components/ui/StageControls3D';
import { Trophy, Clock, Users, ArrowRight, BarChart3, ShieldCheck } from 'lucide-react';
import { CardSkeleton } from '../components/ui/Skeleton';

function MatchCountdownTimer({ lockTime, startTime, status }: { lockTime?: string; startTime: string; status: string }) {
  const [display, setDisplay] = useState({ label: 'Starts in', time: '' });

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const startMs = new Date(startTime).getTime();
      const lockMs = lockTime ? new Date(lockTime).getTime() : startMs;

      if (status === 'completed') {
        setDisplay({ label: 'Status', time: 'Completed' });
        return;
      }

      // Live only when start time has arrived
      if (status === 'live' || now >= startMs) {
        setDisplay({ label: 'Status', time: 'Live Now' });
        return;
      }

      // If lock time passed, count down until match start!
      if (now >= lockMs) {
        const diff = Math.max(0, startMs - now);
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setDisplay({
          label: 'Match Starts in',
          time: `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`,
        });
        return;
      }

      // Before lock time: count down until contest lock
      const diff = Math.max(0, lockMs - now);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay({
        label: 'Locks in',
        time: `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`,
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lockTime, startTime, status]);

  return (
    <span className="font-mono text-cyan-300">
      <span className="text-[11px] text-slate-400 font-sans mr-1">{display.label}:</span>
      {display.time}
    </span>
  );
}

export default function TournamentsPage3D() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/tournaments', token)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.tournaments;
        if (Array.isArray(list)) setTournaments(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = tournaments.filter((t) => {
    if (statusFilter === 'all') return true;
    const nowMs = Date.now();
    const startMs = new Date(t.start_time).getTime();
    const isLive = t.status === 'live' || (nowMs >= startMs && (!t.end_time || nowMs < new Date(t.end_time).getTime()));
    const isCompleted = t.status === 'completed' || (t.end_time && nowMs >= new Date(t.end_time).getTime());
    const isUpcoming = !isLive && !isCompleted;

    if (statusFilter === 'upcoming') return isUpcoming;
    if (statusFilter === 'live') return isLive && !isCompleted;
    if (statusFilter === 'completed') return isCompleted;
    return true;
  });

  return (
    <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase text-cyan-400">LEAGUE LOBBY • /tournaments</div>
          <h1 className="text-3xl sm:text-4xl font-black mt-1">3D Creator Tournaments</h1>
          <p className="text-sm text-slate-400">
            Compete in 24-Hour, 2-Day, and 3-Day Creator Cups with 1,000-Rank Smart Prize Pools and Never-Lose Guarantee.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {['all', 'live', 'upcoming', 'completed'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                playSpatialSFX('click');
                setStatusFilter(st);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition ${
                statusFilter === st
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => {
            const nowMs = Date.now();
            const startMs = new Date(t.start_time).getTime();
            const lockMs = t.lock_time ? new Date(t.lock_time).getTime() : startMs;

            const isCompleted = t.status === 'completed' || (t.end_time && nowMs >= new Date(t.end_time).getTime());
            const isActuallyLive = !isCompleted && (t.status === 'live' || nowMs >= startMs);
            const isLocked = !isCompleted && !isActuallyLive && (t.status === 'locked' || nowMs >= lockMs);

            return (
              <TiltCard3D key={t.id} className="p-6 flex flex-col justify-between space-y-4 border border-white/10">
                <div className="space-y-3 depth-layer-10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-red-500/20 text-red-300 border border-red-400/30">
                      {t.platform} • {t.duration_type || '24h'}
                    </span>
                    {isCompleted ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-slate-500/20 text-slate-300 border-slate-400/40">
                        ● COMPLETED
                      </span>
                    ) : isActuallyLive ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-emerald-500/20 text-emerald-300 border-emerald-400/40 animate-pulse">
                        ● LIVE
                      </span>
                    ) : isLocked ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/40 uppercase">
                        🔒 LOCKED
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-cyan-500/20 text-cyan-300 border-cyan-400/40">
                        ● UPCOMING
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-white">{t.name}</h3>

                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/45 border border-white/10">
                    <div>
                      <div className="text-[11px] text-slate-400">Prize Pool</div>
                      <div className="text-xl font-black text-amber-300 font-mono">
                        ₹{Number(t.prize_pool || 50000).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Entry Fee</div>
                      <div className="text-lg font-black text-cyan-300 font-mono">
                        ₹{Number(t.entry_fee || 99).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <MatchCountdownTimer lockTime={t.lock_time} startTime={t.start_time} status={t.status} />
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Top 1000 Prize</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {isActuallyLive ? (
                    <Link
                      href={`/leaderboard/${t.id}`}
                      onClick={() => playSpatialSFX('power')}
                      className="w-full py-3 rounded-xl font-extrabold text-xs sm:text-sm text-center bg-gradient-to-r from-emerald-600 to-cyan-500 text-white shadow-lg hover:opacity-95 transition block"
                    >
                      🔥 View Live Match & Standings
                    </Link>
                  ) : isLocked ? (
                    <div className="w-full py-3 rounded-xl font-extrabold text-xs sm:text-sm text-center bg-white/5 border border-amber-500/30 text-amber-300 flex items-center justify-center gap-2 cursor-not-allowed">
                      <span>🔒 Contest Locked (Match Starts Soon)</span>
                    </div>
                  ) : (
                    <Link
                      href={`/team-builder/${t.id}`}
                      onClick={() => playSpatialSFX('power')}
                      className="w-full py-3 rounded-xl font-extrabold text-xs sm:text-sm text-center bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg hover:opacity-95 transition block"
                    >
                      ⚡ Enter & Draft in 3D Pitch
                    </Link>
                  )}

                  <Link
                    href={`/leaderboard/${t.id}`}
                    onClick={() => playSpatialSFX('click')}
                    className="w-full py-2 rounded-xl font-semibold text-xs text-center bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition flex items-center justify-center gap-1.5"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-amber-300" />
                    <span>View Live Leaderboard & Prizes</span>
                  </Link>
                </div>
              </TiltCard3D>
            );
          })}
        </div>
      )}
    </div>
  );
}
