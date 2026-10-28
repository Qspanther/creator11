'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiGet } from '../lib/api';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Clock, Users, Coins, ArrowRight, Video, BarChart, Medal } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  platform: string;
  duration_type: string;
  entry_fee: string;
  prize_pool: string;
  lock_time: string;
  start_time: string;
  end_time: string;
  status: string;
  current_participants: number;
  max_participants: number;
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Started');
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

export default function TournamentListPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      apiGet(`/tournaments`, token)
        .then(data => setTournaments(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [token]);

  const durationLabels: Record<string, string> = {
    '6h': '6-Hour Flash Blitz',
    '24h': '24-Hour Sprint',
    '2d': '2-Day Challenge',
    '48h': '48-Hour Weekend Clash',
    '3d': '3-Day Marathon',
    '72h': '72-Hour Weekly Showdown',
  };

  return (
    <div className="max-w-6xl mx-auto py-2">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Trophy size={32} className="text-neon-gold" />
          <h1 className="text-3xl font-extrabold text-white">Fantasy Battle Leagues</h1>
        </div>
        <p className="text-sm text-text-secondary">
          Compete in live delta-growth tournaments, inspect real-time scorecards, and win ₹ (INR) cash prize pools!
        </p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tournaments.map((t, i) => {
            const isLive = t.status === 'live';
            const isCompleted = t.status === 'completed';
            const isUpcoming = t.status === 'upcoming';

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className={`glass p-6 rounded-3xl flex flex-col transition-all border ${
                  isLive
                    ? 'border-success/40 bg-success/[0.03] shadow-lg shadow-success/10'
                    : isCompleted
                      ? 'border-neon-gold/30 bg-neon-gold/[0.02]'
                      : 'border-white/5 hover:border-white/15'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-neon-cyan">
                    {durationLabels[t.duration_type] || t.duration_type}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    isUpcoming ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30' :
                    isLive ? 'bg-success/20 text-success border border-success/40' :
                    isCompleted ? 'bg-neon-gold/20 text-neon-gold border border-neon-gold/40' :
                    'bg-text-muted/10 text-text-muted'
                  }`}>
                    {t.status.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2 line-clamp-1">
                  <Video size={18} className="text-red-500 shrink-0" />
                  {t.name}
                </h3>

                {/* Stats */}
                <div className="space-y-3 mb-6 flex-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary flex items-center gap-2">
                      <Coins size={14} className="text-neon-gold" /> Entry Fee
                    </span>
                    <span className="font-extrabold text-white">₹{parseFloat(t.entry_fee).toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary flex items-center gap-2">
                      <Trophy size={14} className="text-neon-cyan" /> Prize Pool
                    </span>
                    <span className="font-black text-neon-gold text-base">₹{parseFloat(t.prize_pool).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary flex items-center gap-2">
                      <Users size={14} className="text-neon-purple" /> Participants
                    </span>
                    <span className="font-bold text-white">{t.current_participants}/{t.max_participants}</span>
                  </div>
                  {isUpcoming && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary flex items-center gap-2">
                        <Clock size={14} className="text-warning" /> Locks In
                      </span>
                      <span className="font-bold text-warning text-xs">
                        <CountdownTimer targetDate={t.lock_time} />
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {isUpcoming && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push(`/team-builder/${t.id}`)}
                    className="w-full py-3 text-sm font-black bg-gradient-to-r from-neon-cyan to-blue-500 text-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-neon-cyan/20 cursor-pointer"
                  >
                    Join Contest <ArrowRight size={16} />
                  </motion.button>
                )}

                {isLive && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push(`/leaderboard/${t.id}`)}
                    className="w-full py-3 text-sm font-black bg-gradient-to-r from-success to-emerald-600 text-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-success/20 cursor-pointer"
                  >
                    <BarChart size={16} /> Live Leaderboard & Standings
                  </motion.button>
                )}

                {isCompleted && (
                  t.rankings_finalized !== false && t.rankings_finalized !== 0 ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => router.push(`/leaderboard/${t.id}`)}
                      className="w-full py-3 text-sm font-black bg-gradient-to-r from-neon-gold to-amber-500 text-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-neon-gold/20 cursor-pointer"
                    >
                      <Medal size={16} /> View Top 100 Winners
                    </motion.button>
                  ) : (
                    <div className="w-full py-3 px-3 text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      Auditing Results & Finalizing Ranks (Ready in 1 min)...
                    </div>
                  )
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
