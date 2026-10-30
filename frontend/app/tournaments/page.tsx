'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import TiltCard3D from '../components/ui/TiltCard3D';
import { playSpatialSFX } from '../components/ui/StageControls3D';
import { Trophy, Clock, Users, ArrowRight, BarChart3, ShieldCheck } from 'lucide-react';

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Live Now');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return <span className="font-mono text-cyan-300">{timeLeft}</span>;
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
    return t.status === statusFilter;
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
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => {
            return (
              <TiltCard3D key={t.id} className="p-6 flex flex-col justify-between space-y-4 border border-white/10">
                <div className="space-y-3 depth-layer-10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-red-500/20 text-red-300 border border-red-400/30">
                      {t.platform} • {t.duration_type || '24h'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 uppercase">
                      ● {t.status}
                    </span>
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
                      {t.lock_time ? <CountdownTimer targetDate={t.lock_time} /> : <span>Lock in 30m</span>}
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Top 1000 Prize</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Link
                    href={`/team-builder/${t.id}`}
                    onClick={() => playSpatialSFX('power')}
                    className="w-full py-3 rounded-xl font-extrabold text-xs sm:text-sm text-center bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg hover:opacity-95 transition block"
                  >
                    ⚡ Enter & Draft in 3D Pitch
                  </Link>

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
