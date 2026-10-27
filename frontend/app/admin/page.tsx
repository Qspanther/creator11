'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Trophy, Shield, Activity, DollarSign, Gift } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { apiGet } from '../lib/api';

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [liveStats, setLiveStats] = useState({
    totalUsers: 0,
    totalCreators: 0,
    totalTournaments: 0,
    activeMatches: 0,
    totalInvested: 0,
    totalPrizePool: 0,
  });

  useEffect(() => {
    if (token) {
      apiGet('/admin/stats', token)
        .then(data => {
          if (data && typeof data.totalUsers === 'number') {
            setLiveStats(data);
          }
        })
        .catch(console.error);
    }
  }, [token]);

  const stats = [
    { title: 'Total Users', value: liveStats.totalUsers.toString(), icon: Shield, color: 'text-neon-cyan', bg: 'bg-neon-cyan/20' },
    { title: 'Total Creators', value: liveStats.totalCreators.toString(), icon: Users, color: 'text-neon-gold', bg: 'bg-neon-gold/20' },
    { title: 'Tournaments', value: liveStats.totalTournaments.toString(), icon: Trophy, color: 'text-neon-purple', bg: 'bg-neon-purple/20' },
    { title: 'Active Matches', value: liveStats.activeMatches.toString(), icon: Activity, color: 'text-neon-green', bg: 'bg-neon-green/20' },
    { title: 'Total Invested', value: `${parseFloat(liveStats.totalInvested.toString()).toFixed(2)}`, icon: DollarSign, color: 'text-neon-cyan', bg: 'bg-neon-cyan/20' },
    { title: 'Total Prize Pool', value: `${parseFloat(liveStats.totalPrizePool.toString()).toFixed(2)}`, icon: Gift, color: 'text-neon-gold', bg: 'bg-neon-gold/20' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-text-secondary">Overview of platform metrics and controls</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
              <stat.icon size={24} className={stat.color} />
            </div>
            <div>
              <p className="text-text-muted text-sm">{stat.title}</p>
              <h3 className="text-2xl font-bold">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/tournaments">
          <div className="glass-card p-6 hover:border-neon-purple/50 transition-colors cursor-pointer group">
            <Trophy className="text-neon-purple mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2 group-hover:text-neon-purple transition-colors">Manage Tournaments</h3>
            <p className="text-text-secondary text-sm">Schedule and control all YouTube creator leagues.</p>
          </div>
        </Link>
        <Link href="/admin/creators">
          <div className="glass-card p-6 hover:border-neon-gold/50 transition-colors cursor-pointer group">
            <Users className="text-neon-gold mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2 group-hover:text-neon-gold transition-colors">Manage Creators</h3>
            <p className="text-text-secondary text-sm">Update creator links, photos, and mock stats data.</p>
          </div>
        </Link>
        <Link href="/admin/users">
          <div className="glass-card p-6 hover:border-neon-cyan/50 transition-colors cursor-pointer group">
            <Shield className="text-neon-cyan mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2 group-hover:text-neon-cyan transition-colors">Manage Users</h3>
            <p className="text-text-secondary text-sm">View user accounts, teams, and moderate the platform.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
