'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiGet } from '../lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Shield, Crown, Star, Trophy, Clock, Edit, Eye, BarChart } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield size={28} className="text-neon-purple" /> My Teams
        </h1>
      </motion.div>

      {teams.length === 0 ? (
        <div className="glass p-12 text-center">
          <Shield size={40} className="mx-auto text-text-muted mb-4" />
          <p className="text-text-secondary mb-4">You haven&apos;t created any teams yet</p>
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.03 }}
              className="px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl font-bold text-sm"
            >
              Browse Tournaments
            </motion.button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team, i) => {
            const isEditable = !team.is_locked && team.Tournament.status === 'upcoming';
            const isLive = team.Tournament.status === 'live';

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{team.Tournament.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        team.Tournament.status === 'upcoming' ? 'bg-success/10 text-success' :
                        team.Tournament.status === 'live' ? 'bg-neon-purple/10 text-neon-purple' :
                        team.Tournament.status === 'completed' ? 'bg-neon-gold/10 text-neon-gold' :
                        'bg-text-muted/10 text-text-muted'
                      }`}>
                        {team.Tournament.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-text-muted">
                        Credits: {parseFloat(team.total_credits_used).toFixed(1)}/100
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isEditable && (
                      <Link href={`/team-builder/${team.tournament_id}`}>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-medium glass rounded-xl text-neon-cyan"
                        >
                          <Edit size={12} /> Edit
                        </motion.button>
                      </Link>
                    )}
                    {isLive && (
                      <Link href={`/leaderboard/${team.tournament_id}`}>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-medium glass rounded-xl text-neon-gold"
                        >
                          <BarChart size={12} /> Leaderboard
                        </motion.button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Team members */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {team.teamCreators.map(tc => (
                    <div
                      key={tc.creator_id}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02]"
                    >
                      <div className="w-7 h-7 rounded-lg bg-neon-purple/10 flex items-center justify-center text-xs font-bold text-neon-purple">
                        {tc.creator.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{tc.creator.name}</p>
                        <p className="text-[10px] text-text-muted">{tc.creator.category}</p>
                      </div>
                      {tc.creator_id === team.captain_creator_id && (
                        <Crown size={12} className="text-neon-gold shrink-0" />
                      )}
                      {tc.creator_id === team.vice_captain_creator_id && (
                        <Star size={12} className="text-neon-cyan shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
