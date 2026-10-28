'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiGet } from '../lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Video, Trophy, Users, TrendingUp, Wallet, Flame, ArrowRight, Sparkles, Shield, Zap } from 'lucide-react';

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
      title: 'YouTube Creator League',
      icon: Video,
      color: 'from-red-600 to-red-500',
      glowColor: 'rgba(239, 68, 68, 0.2)',
      description: 'Compete with 25 verified YouTube icons across Gaming, Tech, Vlogging, Comedy & Lifestyle.',
      creators: '25 Creators',
      activeCount: 'Active Battles',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-2">
      {/* ★★★ NEVER LOSE — CREATOR ENTERTAINMENT LEAGUE HERO BANNER ★★★ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-10 mb-8 border border-neon-gold/40 bg-gradient-to-br from-[#1b1030] via-[#0e0e18] to-[#091522] shadow-[0_0_60px_rgba(251,191,36,0.18)]"
      >
        {/* Ambient Lighting Orbs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-neon-gold/20 blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-neon-purple/25 blur-[90px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* League Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neon-gold/15 border border-neon-gold/40 text-neon-gold text-[10px] font-black uppercase tracking-widest mb-3 shadow-md">
            <Sparkles size={12} className="text-neon-gold" />
            <span>Creator Entertainment League</span>
          </div>

          {/* Massive NEVER LOSE Title */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-neon-gold drop-shadow-[0_12px_35px_rgba(250,204,21,0.45)] leading-none my-1 font-mono select-none">
            NEVER LOSE
          </h1>

          <p className="text-base sm:text-xl font-bold text-white max-w-xl mt-2 tracking-tight">
            Where Content Creators Become Your Champions
          </p>
          <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto mt-1 leading-relaxed">
            Welcome, <strong>{user?.name}</strong>. Draft the biggest icons, track live delta points, and rise to the Top 100 leaderboard.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link href="/tournaments">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(251, 191, 36, 0.4)' }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 text-xs sm:text-sm font-black bg-gradient-to-r from-neon-gold via-amber-400 to-yellow-500 text-black rounded-xl flex items-center gap-2 shadow-lg shadow-neon-gold/20 cursor-pointer"
              >
                <Trophy size={16} /> Enter Battle League <ArrowRight size={16} />
              </motion.button>
            </Link>
            <Link href="/creators">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-5 py-3 text-xs sm:text-sm font-bold bg-white/[0.05] hover:bg-white/[0.1] text-white rounded-xl border border-white/15 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Users size={16} className="text-neon-cyan" /> Scout Creators
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Wallet Balance', value: `₹${balance.toLocaleString('en-IN')}`, icon: Wallet, color: 'text-neon-gold' },
          { label: 'Your Active Teams', value: stats.totalTeams.toString(), icon: Users, color: 'text-neon-purple' },
          { label: 'League Competitors', value: '300+ Active', icon: TrendingUp, color: 'text-neon-cyan' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-5 rounded-2xl border border-white/10 flex items-center gap-4"
          >
            <div className={`w-11 h-11 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center ${s.color}`}>
              <s.icon size={22} />
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">{s.label}</p>
              <p className="text-xl font-black text-white">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Department Cards */}
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
        <Trophy size={20} className="text-neon-gold" /> Active Battle Divisions
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-1 max-w-2xl gap-6">
        {departments.map((dept, i) => (
          <Link key={dept.platform} href={`/platform/${dept.platform}`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.15 }}
              whileHover={{ y: -6, boxShadow: `0 0 40px ${dept.glowColor}` }}
              className="glass-card p-8 rounded-3xl border border-white/10 cursor-pointer group hover:border-red-500/40 transition-all"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${dept.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-red-500/20`}>
                <dept.icon size={28} className="text-white" />
              </div>
              <h3 className="text-2xl font-black mb-2 text-white">{dept.title}</h3>
              <p className="text-sm text-text-secondary mb-4">{dept.description}</p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted glass px-3 py-1 rounded-full border border-white/5">{dept.creators}</span>
                <span className="text-xs text-success glass px-3 py-1 rounded-full border border-success/20 flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
                  Live Battles In Progress
                </span>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
