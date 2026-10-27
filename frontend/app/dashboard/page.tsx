'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiGet } from '../lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Video, Trophy, Users, TrendingUp, Wallet } from 'lucide-react';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [balance, setBalance] = useState(0);
  const [stats, setStats] = useState({ totalTeams: 0, activeTournaments: 0 });

  useEffect(() => {
    if (token) {
      apiGet('/wallet/balance', token).then(d => setBalance(d.balance)).catch(() => {});
      apiGet('/teams', token).then(d => setStats(prev => ({ ...prev, totalTeams: d.length }))).catch(() => {});
    }
  }, [token]);

  const departments = [
    {
      platform: 'youtube',
      title: 'YouTube League',
      icon: Video,
      color: 'from-red-600 to-red-500',
      glowColor: 'rgba(239, 68, 68, 0.15)',
      description: 'Compete with YouTube creators. Track views, subscribers, and growth.',
      creators: '25 Creators',
    },
    
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-1">Welcome back, <span className="text-neon-purple">{user?.name}</span></h1>
        <p className="text-text-secondary">Choose your league and start competing</p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Wallet Balance', value: `${balance.toLocaleString()}`, icon: Wallet, color: 'text-neon-gold' },
          { label: 'Your Teams', value: stats.totalTeams.toString(), icon: Users, color: 'text-neon-purple' },
          { label: 'Win Rate', value: '—', icon: TrendingUp, color: 'text-neon-cyan' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-5 flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="label-upper">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Department Cards */}
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Trophy size={20} className="text-neon-purple" /> Choose Your League
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-1 max-w-2xl gap-6">
        {departments.map((dept, i) => (
          <Link key={dept.platform} href={`/platform/${dept.platform}`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.15 }}
              whileHover={{ y: -6, boxShadow: `0 0 40px ${dept.glowColor}` }}
              className="glass p-8 cursor-pointer group"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${dept.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <dept.icon size={28} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{dept.title}</h3>
              <p className="text-sm text-text-secondary mb-4">{dept.description}</p>
              <div className="flex items-center gap-4">
                <span className="text-xs text-text-muted glass px-3 py-1 rounded-full">{dept.creators}</span>
                <span className="text-xs text-text-muted glass px-3 py-1 rounded-full">3 Contests Live</span>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
