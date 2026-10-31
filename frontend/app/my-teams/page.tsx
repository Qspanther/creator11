'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import TiltCard3D from '../components/ui/TiltCard3D';
import ScorecardModal from '../components/ScorecardModal';
import { playSpatialSFX } from '../components/ui/StageControls3D';
import { Shield, Crown, Star, Trophy, Clock, Edit, BarChart3, Users } from 'lucide-react';

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Locked');
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

export default function MyTeamsPage3D() {
  const { token } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiGet('/teams', token)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.teams;
        if (Array.isArray(list)) setTeams(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase text-cyan-400">ROSTER TELEMETRY • /my-teams</div>
          <h1 className="text-3xl sm:text-4xl font-black mt-1">My 3D Creator Teams & Live Scorecards</h1>
          <p className="text-sm text-slate-400">
            Track real-time points, Captain (2x) & Vice-Captain (1.5x) multipliers, and live tournament standings.
          </p>
        </div>
        <Link
          href="/tournaments"
          onClick={() => playSpatialSFX('power')}
          className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-600/30 hover:opacity-90 transition self-start sm:self-auto"
        >
          + Draft Another Team
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <TiltCard3D className="p-12 text-center max-w-lg mx-auto space-y-4 border border-white/10">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center mx-auto text-2xl">
            🛡️
          </div>
          <h2 className="text-xl font-black text-white">No 3D Rosters Drafted Yet</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Select a Creator Tournament and assemble your 11-creator entertainment team on the 3D stadium pitch.
          </p>
          <Link
            href="/tournaments"
            onClick={() => playSpatialSFX('power')}
            className="inline-block px-6 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
          >
            Explore Active Leagues →
          </Link>
        </TiltCard3D>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {teams.map((t) => {
            const tournamentName = t.Tournament?.name || t.tournamentName || 'Creator Cup';
            const creators = t.teamCreators?.map((tc: any) => tc.creator) || t.creators || [];
            const cap = creators.find((c: any) => c.id === t.captain_creator_id || c.id === t.captainId);
            const vc = creators.find((c: any) => c.id === t.vice_captain_creator_id || c.id === t.viceCaptainId);
            const isLocked = t.is_locked || (t.Tournament?.status !== 'upcoming');

            return (
              <TiltCard3D key={t.id} className="p-6 border border-white/15 space-y-4">
                <div className="flex items-center justify-between depth-layer-10">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-cyan-400">
                      {t.Tournament?.platform || 'YouTube'} • {t.Tournament?.duration_type || '24h'}
                    </span>
                    <h3 className="text-xl font-black text-white mt-0.5">{t.name || '3D Cyber Squad'}</h3>
                    <div className="text-xs text-slate-400">{tournamentName}</div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        isLocked
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      }`}
                    >
                      {isLocked ? '🔒 Locked' : '🟢 Editable'}
                    </span>
                    <div className="text-xs text-slate-400 mt-1">
                      {t.Tournament?.lock_time ? (
                        <CountdownTimer targetDate={t.Tournament.lock_time} />
                      ) : (
                        <span className="text-slate-400">Active</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/45 border border-white/10 depth-layer-20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                      C
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-amber-300 font-bold uppercase">Captain (2.0x)</div>
                      <div className="text-xs font-bold text-white truncate">{cap?.name || 'Assigned'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                      VC
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-purple-300 font-bold uppercase">Vice-Cap (1.5x)</div>
                      <div className="text-xs font-bold text-white truncate">{vc?.name || 'Assigned'}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{creators.length || 11} Creators Drafted</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isLocked && (
                      <Link
                        href={`/team-builder/${t.tournament_id}`}
                        onClick={() => playSpatialSFX('click')}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" /> Edit
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        playSpatialSFX('power');
                        setSelectedTeam({
                          ...t,
                          Creators: creators,
                          total_score: t.total_score || 0,
                          rank: t.rank || '-',
                        });
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-extrabold shadow hover:opacity-90 transition flex items-center gap-1"
                    >
                      <BarChart3 className="w-3 h-3" /> Live Scorecard
                    </button>
                    <Link
                      href={`/leaderboard/${t.tournament_id}`}
                      onClick={() => playSpatialSFX('click')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-300 hover:bg-amber-500/25 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Trophy className="w-3 h-3" /> Standings
                    </Link>
                  </div>
                </div>
              </TiltCard3D>
            );
          })}
        </div>
      )}

      {selectedTeam && (
        <ScorecardModal
          isOpen={Boolean(selectedTeam)}
          onClose={() => setSelectedTeam(null)}
          team={selectedTeam}
        />
      )}
    </div>
  );
}
