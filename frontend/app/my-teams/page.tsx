'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiGet } from '../lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Shield, Crown, Star, Trophy, Clock, Edit, BarChart } from 'lucide-react';

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

  return <span>{timeLeft}</span>;
}

interface TeamItem {
  id: string;
  tournament_id: string;
  captain_creator_id: string;
  vice_captain_creator_id: string;
  is_locked: boolean;
  total_credits_used: string;
  Tournament: {
    name: string;
    platform: string;
    status: string;
    lock_time: string;
    start_time: string;
  };
  teamCreators: Array<{
    creator_id: string;
    creator: {
      id: string;
      name: string;
      category: string;
      credit_cost: string;
      profile_image_url?: string;
    };
  }>;
}

export default function MyTeamsPage() {
  const { token } = useAuth();
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiGet('/teams', token)
      .then(data => setTeams(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const getPortraitUrl = (profileUrl?: string) => {
    if (profileUrl && profileUrl.startsWith('http')) return profileUrl;
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="widescreen-container py-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <Shield size={32} className="text-neon-cyan" />
          My Fantasy Battle Teams
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Track, modify lineups before lock time, or view live standings in battle leagues
        </p>
      </motion.div>

      {teams.length === 0 ? (
        <div className="glass-card p-16 text-center border border-white/5">
          <Shield size={48} className="mx-auto text-text-muted mb-4 opacity-40" />
          <h3 className="text-lg font-bold text-white mb-2">No Teams Formed Yet</h3>
          <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
            Join one of the 4 active Battle Leagues (6h, 24h, 48h, 72h) and pick your 11 creator lineup to win USDT prize pools!
          </p>
          <Link href="/tournaments">
            <motion.button
              whileHover={{ scale: 1.03 }}
              className="px-6 py-3 bg-gradient-to-r from-neon-cyan to-blue-500 text-black rounded-xl font-black text-sm cursor-pointer shadow-lg shadow-neon-cyan/20"
            >
              Explore Battle Leagues
            </motion.button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {teams.map((team, i) => {
            const isEditable = team.Tournament.status === 'upcoming' && !team.is_locked;
            const isLive = team.Tournament.status === 'live';

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-6 border border-white/5"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
                  <div>
                    <h2 className="text-xl font-extrabold text-white mb-1">{team.Tournament.name}</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        team.Tournament.status === 'upcoming' ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30' :
                        team.Tournament.status === 'live' ? 'bg-success/15 text-success border border-success/30' :
                        team.Tournament.status === 'completed' ? 'bg-neon-gold/15 text-neon-gold border border-neon-gold/30' :
                        'bg-white/10 text-text-muted'
                      }`}>
                        {team.Tournament.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-text-muted">
                        Credits: {parseFloat(team.total_credits_used).toFixed(1)} / 110
                      </span>
                      {isEditable && (
                        <span className="text-xs text-neon-gold flex items-center gap-1 font-bold">
                          <Clock size={12} /> Locks in: <CountdownTimer targetDate={team.Tournament.lock_time} />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditable && (
                      <Link href={`/team-builder/${team.tournament_id}`}>
                        <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-white/[0.05] hover:bg-neon-cyan hover:text-black rounded-xl text-neon-cyan transition-colors cursor-pointer border border-white/10">
                          <Edit size={12} /> Edit Lineup
                        </button>
                      </Link>
                    )}
                    {isLive && (
                      <Link href={`/leaderboard/${team.tournament_id}`}>
                        <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-neon-gold/10 hover:bg-neon-gold hover:text-black rounded-xl text-neon-gold transition-colors cursor-pointer border border-neon-gold/30">
                          <BarChart size={12} /> Live Leaderboard
                        </button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Team members with real high-res portraits */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {team.teamCreators.map(tc => {
                    const isCaptain = team.captain_creator_id === tc.creator_id;
                    const isVc = team.vice_captain_creator_id === tc.creator_id;
                    const portrait = getPortraitUrl(tc.creator.profile_image_url);

                    return (
                      <div
                        key={tc.creator_id}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all ${
                          isCaptain
                            ? 'bg-neon-gold/[0.08] border-neon-gold/30'
                            : isVc
                              ? 'bg-neon-cyan/[0.08] border-neon-cyan/30'
                              : 'bg-white/[0.02] border-white/5'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
                            <img src={portrait} alt={tc.creator.name} className="w-full h-full object-cover" />
                          </div>
                          {isCaptain && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neon-gold text-black flex items-center justify-center text-[9px] font-black">
                              C
                            </div>
                          )}
                          {isVc && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neon-cyan text-black flex items-center justify-center text-[9px] font-black">
                              V
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{tc.creator.name}</p>
                          <p className="text-[10px] text-text-muted">{tc.creator.category} • {parseFloat(tc.creator.credit_cost).toFixed(1)}cr</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
