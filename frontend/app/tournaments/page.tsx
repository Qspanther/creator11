'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiGet, apiPost } from '../lib/api';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Clock, Users, Coins, ArrowRight, Video } from 'lucide-react';

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

  const handleJoin = (tournamentId: string) => {
    router.push(`/team-builder/${tournamentId}`);
  };

  const durationLabels: Record<string, string> = {
    '24h': '24-Hour Sprint',
    '2d': '2-Day Challenge',
    '3d': '3-Day Marathon',
  };

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Trophy size={28} className="text-neon-gold" />
          <h1 className="text-3xl font-bold">YouTube Battle Leagues</h1>
        </div>
        <p className="text-text-secondary">Join an active YouTube tournament and build your fantasy creator team</p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tournaments.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6 }}
              className="glass p-6 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="label-upper text-neon-purple">{durationLabels[t.duration_type] || t.duration_type}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  t.status === 'upcoming' ? 'bg-success/10 text-success' :
                  t.status === 'live' ? 'bg-neon-purple/10 text-neon-purple' :
                  'bg-text-muted/10 text-text-muted'
                }`}>
                  {t.status.toUpperCase()}
                </span>
              </div>

              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Video size={18} className="text-red-500" />
                {t.name}
              </h3>

              {/* Stats */}
              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary flex items-center gap-2">
                    <Coins size={14} className="text-neon-gold" /> Entry Fee
                  </span>
                  <span className="text-sm font-bold">{parseFloat(t.entry_fee).toFixed(0)} USDT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary flex items-center gap-2">
                    <Trophy size={14} className="text-neon-cyan" /> Prize Pool
                  </span>
                  <span className="text-sm font-bold text-neon-cyan">{parseFloat(t.prize_pool).toLocaleString()} USDT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary flex items-center gap-2">
                    <Users size={14} /> Participants
                  </span>
                  <span className="text-sm font-bold">{t.current_participants}/{t.max_participants}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary flex items-center gap-2">
                    <Clock size={14} className="text-warning" /> Locks In
                  </span>
                  <span className="text-sm font-bold text-warning">
                    <CountdownTimer targetDate={t.lock_time} />
                  </span>
                </div>
              </div>

              {/* Join Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleJoin(t.id)}
                disabled={t.status !== 'upcoming'}
                className="w-full py-3 text-sm font-bold bg-gradient-to-r from-neon-purple to-neon-purple/80 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {t.status === 'upcoming' ? (
                  <>Join Contest <ArrowRight size={16} /></>
                ) : (
                  'Contest Locked'
                )}
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
