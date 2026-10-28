'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Trophy,
  Users,
  Zap,
  ArrowRight,
  Video,
  Star,
  TrendingUp,
  Shield,
  Sparkles,
  Flame,
  Crown
} from 'lucide-react';
import { useAuth } from './lib/auth-context';

const features = [
  { icon: Users, title: 'Draft Creators', desc: 'Pick your dream team of 11 creators across Gaming, Tech, Comedy, Vlogging & Lifestyle' },
  { icon: TrendingUp, title: 'Real Performance Delta', desc: 'Points calculated strictly on growth occurring during the contest window' },
  { icon: Trophy, title: 'Top 100 Payouts', desc: 'Top teams split the prize pool — up to 30,000 USDT per Creator Entertainment League' },
];

const trendingCreators = [
  { name: 'MrBeast Gaming', platform: 'youtube', category: 'Gaming', growth: '+18.7%' },
  { name: 'Techno Gamerz', platform: 'youtube', category: 'Gaming', growth: '+14.2%' },
  { name: 'Zhong', platform: 'youtube', category: 'Vlogging', growth: '+22.5%' },
  { name: 'CarryMinati', platform: 'youtube', category: 'Comedy', growth: '+12.1%' },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen relative bg-[#09090d] text-white overflow-hidden">
      {/* Nav Bar */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 border-b border-white/10"
        style={{ background: 'rgba(9, 9, 13, 0.75)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-gold via-amber-500 to-neon-purple flex items-center justify-center shadow-lg shadow-neon-gold/20">
            <Crown size={18} className="text-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-white leading-none">Creator11</span>
            <span className="text-[9px] text-neon-gold font-bold tracking-wider uppercase mt-0.5">Creator Entertainment League</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-xs text-text-secondary hidden sm:inline font-medium">Hello, {user?.name}</span>
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-2 text-xs sm:text-sm font-bold bg-gradient-to-r from-neon-gold to-amber-500 text-black rounded-xl cursor-pointer"
                >
                  Dashboard
                </motion.button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-xs sm:text-sm font-semibold text-text-secondary hover:text-white transition-colors">
                Log In
              </Link>
              <Link href="/signup">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-2 text-xs sm:text-sm font-bold bg-gradient-to-r from-neon-gold to-amber-500 text-black rounded-xl cursor-pointer"
                >
                  Get Started
                </motion.button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 pt-24 pb-16 text-center">
        {/* Top Announcement Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-gold/10 border border-neon-gold/30 mb-8 shadow-lg shadow-neon-gold/10"
        >
          <Sparkles size={14} className="text-neon-gold" />
          <span className="text-[11px] font-black text-neon-gold tracking-widest uppercase">
            Official Creator Entertainment League
          </span>
        </motion.div>

        {/* ★★★ MASSIVE "NEVER LOSE" HERO BANNER ★★★ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="w-full max-w-5xl mx-auto mb-12"
        >
          <div className="relative overflow-hidden rounded-3xl p-8 sm:p-14 md:p-16 border border-neon-gold/40 bg-gradient-to-br from-[#180e2b] via-[#0d0d17] to-[#0a1524] shadow-[0_0_80px_rgba(251,191,36,0.18)]">
            {/* Ambient Lighting Orbs */}
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-neon-gold/20 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-neon-purple/25 blur-[100px] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Header Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/80 text-[11px] font-bold tracking-wider uppercase mb-3">
                <Flame size={13} className="text-amber-400" />
                <span>CHAMPIONS MENTALITY</span>
              </div>

              {/* 🏆 ULTRA-IMPACT "NEVER LOSE" TITLE */}
              <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-neon-gold drop-shadow-[0_15px_40px_rgba(250,204,21,0.45)] leading-none my-2 font-mono select-none">
                NEVER LOSE
              </h1>

              {/* Subtitle */}
              <p className="text-lg sm:text-2xl font-extrabold text-white max-w-2xl mt-4 tracking-tight">
                Where Content Creators Become Your Champions
              </p>
              <p className="text-xs sm:text-base text-text-secondary max-w-xl mx-auto mt-2 leading-relaxed">
                Draft top YouTube icons across Gaming, Tech, Comedy, and Vlogging. Track exact real-time delta growth, climb the Top 100 leaderboard, and win instant USDT payouts.
              </p>

              {/* Highlight Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mt-8 text-left">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-gold/15 flex items-center justify-center text-neon-gold shrink-0">
                    <Trophy size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Top 100 Cash Pool</p>
                    <p className="text-[10px] text-text-muted">Rank 1 wins up to 3,000 USDT</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-cyan/15 flex items-center justify-center text-neon-cyan shrink-0">
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Strict Delta Engine</p>
                    <p className="text-[10px] text-text-muted">1k Views = 1pt • 500 Likes = 1pt</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-purple/15 flex items-center justify-center text-neon-purple shrink-0">
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Fair Winner Rotation</p>
                    <p className="text-[10px] text-text-muted">300+ competitors, zero monopoly</p>
                  </div>
                </div>
              </div>

              {/* Hero Call to Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-8">
                {isAuthenticated ? (
                  <Link href="/dashboard">
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: '0 0 35px rgba(251, 191, 36, 0.45)' }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 text-sm sm:text-base font-black bg-gradient-to-r from-neon-gold via-amber-400 to-yellow-500 text-black rounded-2xl flex items-center gap-2.5 shadow-xl shadow-neon-gold/20 cursor-pointer"
                    >
                      <Trophy size={18} /> Enter Battle League <ArrowRight size={18} />
                    </motion.button>
                  </Link>
                ) : (
                  <>
                    <Link href="/signup">
                      <motion.button
                        whileHover={{ scale: 1.05, boxShadow: '0 0 35px rgba(251, 191, 36, 0.45)' }}
                        whileTap={{ scale: 0.95 }}
                        className="px-8 py-4 text-sm sm:text-base font-black bg-gradient-to-r from-neon-gold via-amber-400 to-yellow-500 text-black rounded-2xl flex items-center gap-2.5 shadow-xl shadow-neon-gold/20 cursor-pointer"
                      >
                        Start Playing Now <ArrowRight size={18} />
                      </motion.button>
                    </Link>
                    <Link href="/tournaments">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-7 py-4 text-sm sm:text-base font-bold bg-white/[0.05] hover:bg-white/[0.1] text-white rounded-2xl border border-white/15 flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <Trophy size={18} className="text-neon-gold" /> View Tournaments
                      </motion.button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Platform Tag */}
        <div className="flex items-center gap-3 glass px-5 py-2.5 rounded-2xl border border-white/10 text-xs text-text-secondary">
          <Video size={18} className="text-red-500" />
          <span>Official <strong>YouTube Creator Entertainment League</strong> Division Active</span>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-20 px-6 relative z-10 border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[10px] font-black uppercase tracking-widest text-neon-gold">Gameplay Mechanics</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
              How the <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-gold to-amber-400">League Works</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -5 }}
                className="glass-card p-6 rounded-2xl border border-white/10"
              >
                <div className="w-12 h-12 mb-4 rounded-xl bg-neon-gold/10 border border-neon-gold/20 flex items-center justify-center text-neon-gold">
                  <f.icon size={22} />
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">{f.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Creators */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[10px] font-black uppercase tracking-widest text-neon-cyan">Scouting Hub</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
              Trending <span className="text-neon-cyan">Creators</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {trendingCreators.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="glass-card p-5 rounded-2xl border border-white/10"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-gold/20 to-neon-cyan/20 flex items-center justify-center text-sm font-bold border border-white/10">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    <p className="text-[11px] text-text-muted flex items-center gap-1">
                      <Video size={10} className="text-red-500" />
                      {c.category}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                  <span className="text-text-muted uppercase text-[10px] font-bold">24h Delta</span>
                  <span className="font-extrabold text-success">{c.growth}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card p-10 sm:p-14 rounded-3xl border border-neon-gold/30 bg-gradient-to-br from-neon-gold/10 via-transparent to-neon-purple/10">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Ready to Dominate?</h2>
            <p className="text-sm text-text-secondary max-w-md mx-auto mb-8">
              Join the Creator Entertainment League. Build your dream roster and rise to the Top 100 leaderboard.
            </p>
            <Link href={isAuthenticated ? "/tournaments" : "/signup"}>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 35px rgba(251, 191, 36, 0.4)' }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-4 text-base font-black bg-gradient-to-r from-neon-gold via-amber-400 to-yellow-500 text-black rounded-2xl shadow-xl shadow-neon-gold/20 cursor-pointer"
              >
                {isAuthenticated ? "Enter Tournaments" : "Join Creator Entertainment League"}
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5 relative z-10 text-xs text-text-muted">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Creator11. Official Creator Entertainment League.</p>
          <div className="flex items-center gap-6">
            <Link href="/tournaments" className="hover:text-white transition-colors">Tournaments</Link>
            <Link href="/creators" className="hover:text-white transition-colors">Creators</Link>
            <Link href="/wallet" className="hover:text-white transition-colors">Wallet</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
