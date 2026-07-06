'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet } from '../../lib/api';
import { motion } from 'framer-motion';
import { Trophy, Medal, TrendingUp, User } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  teamId: string;
  userId: string;
  userName: string;
  totalPoints: number;
  isCurrentUser: boolean;
}

export default function LeaderboardPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = use(params);
  const { token } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchLeaderboard = () => {
      apiGet(`/leaderboard/${tournamentId}`, token)
        .then(data => {
          setEntries(data.entries);
          setUserRank(data.userRank);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    fetchLeaderboard();
    // Poll every 5 seconds
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [token, tournamentId]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={18} className="text-neon-gold" />;
    if (rank === 2) return <Medal size={18} className="text-gray-300" />;
    if (rank === 3) return <Medal size={18} className="text-amber-600" />;
    return <span className="text-sm font-bold text-text-muted w-[18px] text-center">#{rank}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Trophy size={28} className="text-neon-gold" /> Leaderboard
        </h1>
        <p className="text-sm text-text-secondary mt-1">Live rankings • Auto-updates every 5 seconds</p>
      </motion.div>

      {/* User's rank banner */}
      {userRank && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-5 mb-6 glow-purple flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-neon-purple" />
            <span className="text-sm font-medium">Your Rank</span>
          </div>
          <span className="text-2xl font-black text-neon-purple">#{userRank}</span>
        </motion.div>
      )}

      {entries.length === 0 ? (
        <div className="glass p-12 text-center">
          <Trophy size={40} className="mx-auto text-text-muted mb-4" />
          <p className="text-text-secondary">No scores yet. Leaderboard updates when the tournament goes live.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.teamId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                entry.isCurrentUser
                  ? 'bg-neon-purple/10 border border-neon-purple/30 glow-purple'
                  : 'glass'
              }`}
            >
              <div className="w-8 flex justify-center">{getRankIcon(entry.rank)}</div>
              <div className="flex items-center gap-2 flex-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple/30 to-neon-cyan/30 flex items-center justify-center text-xs font-bold">
                  {entry.userName.charAt(0)}
                </div>
                <span className="text-sm font-medium">
                  {entry.userName}
                  {entry.isCurrentUser && <span className="text-xs text-neon-purple ml-2">(You)</span>}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{entry.totalPoints.toFixed(4)}</p>
                <p className="text-[10px] text-text-muted">POINTS</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
