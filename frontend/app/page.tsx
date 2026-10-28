'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Users,
  Zap,
  ArrowRight,
  Video,
  TrendingUp,
  Shield,
  Sparkles,
  Flame,
  Crown,
  Clock,
  Radio,
  Coins,
  ChevronRight,
  LogIn,
  UserPlus
} from 'lucide-react';
import { useAuth } from './lib/auth-context';
import { apiGet } from './lib/api';

interface Tournament {
  id: string;
  name: string;
  platform: string;
  duration_type: string;
  entry_fee: string | number;
  prize_pool: string | number;
  lock_time: string;
  start_time: string;
  end_time: string;
  status: string;
  current_participants: number;
  max_participants: number;
}

const durationLabels: Record<string, string> = {
  '6h': '6-Hour Flash Blitz',
  '24h': '24-Hour Sprint',
  '2d': '2-Day Challenge',
  '48h': '48-Hour Weekend Clash',
  '3d': '3-Day Marathon',
  '72h': '72-Hour Weekly Showdown',
};

function CountdownTimer({ targetDate, prefix = 'Starts in' }: { targetDate: string; prefix?: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Live Now');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${prefix} ${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate, prefix]);

  return <span>{timeLeft}</span>;
}

const features = [
  { icon: Users, title: 'Draft Creators', desc: 'Pick your dream team of 11 creators across Gaming, Tech, Comedy, Vlogging & Lifestyle' },
  { icon: TrendingUp, title: 'Real Performance Delta', desc: 'Points calculated strictly on growth occurring during the contest window' },
  { icon: Trophy, title: 'Top 100 Payouts', desc: 'Top teams split the prize pool — up to ₹3,00,000 per Creator Entertainment League' },
];

const trendingCreators = [
  { name: 'MrBeast Gaming', platform: 'youtube', category: 'Gaming', growth: '+18.7%' },
  { name: 'Techno Gamerz', platform: 'youtube', category: 'Gaming', growth: '+14.2%' },
  { name: 'Zhong', platform: 'youtube', category: 'Vlogging', growth: '+22.5%' },
  { name: 'CarryMinati', platform: 'youtube', category: 'Comedy', growth: '+12.1%' },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch public tournaments (works without token)
    apiGet('/tournaments')
      .then(data => {
        if (Array.isArray(data)) {
          setTournaments(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Universal redirect logic: Any button/card clicked by guest redirects to /login
  const handleProtectedAction = (destinationUrl: string = '/tournaments') => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      router.push(destinationUrl);
    }
  };

  const liveTournaments = tournaments.filter(t => t.status === 'live');
  const upcomingTournaments = tournaments.filter(t => t.status === 'upcoming');

  return (
    <div className="min-h-screen relative bg-[#09090d] text-white overflow-hidden pb-20">
      {/* ─── TOP NAVIGATION BAR ─── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 md:px-12 py-3.5 border-b border-white/10"
        style={{ background: 'rgba(9, 9, 13, 0.85)', backdropFilter: 'blur(24px)' }}
      >
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-gold via-amber-500 to-neon-purple flex items-center justify-center shadow-lg shadow-neon-gold/20 group-hover:scale-105 transition-transform">
            <Crown size={20} className="text-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-white leading-none">Creator11</span>
            <span className="text-[9px] text-neon-gold font-extrabold tracking-wider uppercase mt-1">Creator Entertainment League</span>
          </div>
        </Link>

        {/* Top-Right Action Buttons: Log In & Sign Up */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-xs text-text-secondary hidden md:inline font-semibold">
                Welcome, <strong className="text-white">{user?.name}</strong>
              </span>
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-2 text-xs sm:text-sm font-black bg-gradient-to-r from-neon-gold to-amber-500 text-black rounded-xl shadow-md shadow-neon-gold/20 cursor-pointer"
                >
                  Dashboard
                </motion.button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white hover:text-neon-gold border border-white/20 hover:border-neon-gold/50 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer bg-white/[0.04]"
                >
                  <LogIn size={15} className="text-neon-gold" />
                  <span>Log In</span>
                </motion.button>
              </Link>
              <Link href="/signup">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(251, 191, 36, 0.45)' }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 sm:px-6 py-2 text-xs sm:text-sm font-black bg-gradient-to-r from-neon-gold via-amber-400 to-yellow-500 text-black rounded-xl shadow-lg shadow-neon-gold/25 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus size={15} />
                  <span>Sign Up</span>
                </motion.button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-28 pb-10 text-center">
        {/* Top Announcement Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-gold/10 border border-neon-gold/30 mb-6 shadow-lg shadow-neon-gold/10"
        >
          <Sparkles size={14} className="text-neon-gold" />
          <span className="text-[11px] font-black text-neon-gold tracking-widest uppercase">
            Official Creator Entertainment League
          </span>
        </motion.div>

        {/* ★★★ MASSIVE "NEVER LOSE" HERO BANNER ★★★ */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="w-full max-w-5xl mx-auto mb-10"
        >
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-12 md:p-16 border border-neon-gold/40 bg-gradient-to-br from-[#180e2b] via-[#0d0d17] to-[#0a1524] shadow-[0_0_80px_rgba(251,191,36,0.18)]">
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
                Draft top YouTube icons across Gaming, Tech, Comedy, and Vlogging. Track exact real-time delta growth, climb the Top 100 leaderboard, and win instant ₹ (INR) cash payouts.
              </p>

              {/* Highlight Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mt-8 text-left">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-gold/15 flex items-center justify-center text-neon-gold shrink-0">
                    <Trophy size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Top 100 Cash Pool</p>
                    <p className="text-[10px] text-text-muted">Rank 1 wins up to ₹30,000</p>
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

              {/* Hero Call to Action Buttons — All protected */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-8">
                <motion.button
                  onClick={() => handleProtectedAction('/tournaments')}
                  whileHover={{ scale: 1.05, boxShadow: '0 0 35px rgba(251, 191, 36, 0.45)' }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3.5 text-sm sm:text-base font-black bg-gradient-to-r from-neon-gold via-amber-400 to-yellow-500 text-black rounded-2xl flex items-center gap-2.5 shadow-xl shadow-neon-gold/20 cursor-pointer"
                >
                  <Trophy size={18} /> Enter Battle League <ArrowRight size={18} />
                </motion.button>
                <motion.button
                  onClick={() => handleProtectedAction('/tournaments')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-7 py-3.5 text-sm sm:text-base font-bold bg-white/[0.05] hover:bg-white/[0.1] text-white rounded-2xl border border-white/15 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Flame size={18} className="text-neon-gold" /> Explore Contests
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Division Tag */}
        <div className="flex items-center gap-3 glass px-5 py-2.5 rounded-2xl border border-white/10 text-xs text-text-secondary">
          <Video size={18} className="text-red-500" />
          <span>Official <strong>YouTube Creator Entertainment League</strong> Division Active</span>
        </div>
      </section>

      {/* ─── TOURNAMENTS SECTION: LIVE & UPCOMING ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 relative z-10">
        {/* 🔴 1. LIVE TOURNAMENTS */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
              </span>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                  Live Tournaments <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-widest">LIVE</span>
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">Battles actively running in real-time. Track creator delta scores!</p>
              </div>
            </div>

            <motion.button
              onClick={() => handleProtectedAction('/tournaments')}
              className="text-xs font-bold text-neon-gold hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View All</span> <ChevronRight size={14} />
            </motion.button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-neon-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : liveTournaments.length === 0 ? (
            <div className="glass p-8 rounded-3xl border border-white/10 text-center">
              <Clock size={32} className="text-text-muted mx-auto mb-2" />
              <p className="text-sm font-bold text-white">No tournaments currently live</p>
              <p className="text-xs text-text-muted mt-1">Upcoming battles are scheduled below!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveTournaments.map(t => (
                <motion.div
                  key={t.id}
                  whileHover={{ y: -6, borderColor: 'rgba(239, 68, 68, 0.6)' }}
                  onClick={() => handleProtectedAction(`/leaderboard/${t.id}`)}
                  className="relative glass rounded-3xl p-6 border border-red-500/40 bg-gradient-to-b from-red-950/20 via-black/40 to-black/60 shadow-lg shadow-red-950/20 flex flex-col justify-between cursor-pointer group transition-all"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                        <Radio size={12} className="animate-pulse" /> Live Arena
                      </span>
                      <span className="text-[10px] font-bold text-white/70 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                        {durationLabels[t.duration_type] || t.duration_type}
                      </span>
                    </div>

                    {/* Tournament Title */}
                    <h3 className="text-lg font-black text-white group-hover:text-neon-gold transition-colors leading-snug">
                      {t.name}
                    </h3>

                    {/* Timer */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 mt-2">
                      <Clock size={14} />
                      <CountdownTimer targetDate={t.end_time} prefix="Ends in" />
                    </div>

                    {/* Prize Pool & Participants Grid */}
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
                      <div>
                        <p className="text-[10px] text-text-muted uppercase font-bold">Prize Pool</p>
                        <p className="text-base font-black text-neon-gold flex items-center gap-1">
                          <Coins size={14} /> ₹{Number(t.prize_pool).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-muted uppercase font-bold">Participants</p>
                        <p className="text-base font-black text-white flex items-center gap-1">
                          <Users size={14} className="text-neon-cyan" /> {t.current_participants || 0} Joined
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Button */}
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProtectedAction(`/leaderboard/${t.id}`);
                    }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-5 w-full py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-red-600 to-amber-600 text-white flex items-center justify-center gap-2 shadow-md shadow-red-900/30 group-hover:shadow-red-600/30 cursor-pointer transition-all"
                  >
                    <span>Enter Live League</span>
                    <ArrowRight size={14} />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* ⏳ 2. UPCOMING TOURNAMENTS */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-neon-cyan/80 flex items-center justify-center shadow-lg shadow-neon-cyan/40">
                <Clock size={10} className="text-black" />
              </span>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                  Upcoming Tournaments <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 uppercase tracking-widest">SOON</span>
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">Register early, draft your squad of 11, and get ready to climb the Top 100.</p>
              </div>
            </div>

            <motion.button
              onClick={() => handleProtectedAction('/tournaments')}
              className="text-xs font-bold text-neon-cyan hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View All</span> <ChevronRight size={14} />
            </motion.button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : upcomingTournaments.length === 0 ? (
            <div className="glass p-8 rounded-3xl border border-white/10 text-center">
              <p className="text-sm font-bold text-white">New tournaments loading soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingTournaments.slice(0, 6).map(t => (
                <motion.div
                  key={t.id}
                  whileHover={{ y: -6, borderColor: 'rgba(56, 189, 248, 0.5)' }}
                  onClick={() => handleProtectedAction(`/tournaments`)}
                  className="relative glass rounded-3xl p-6 border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/60 shadow-lg flex flex-col justify-between cursor-pointer group transition-all"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 flex items-center gap-1">
                        <Clock size={11} /> Registration Open
                      </span>
                      <span className="text-[10px] font-bold text-white/70 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                        {durationLabels[t.duration_type] || t.duration_type}
                      </span>
                    </div>

                    {/* Tournament Title */}
                    <h3 className="text-lg font-black text-white group-hover:text-neon-cyan transition-colors leading-snug">
                      {t.name}
                    </h3>

                    {/* Timer */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neon-cyan mt-2">
                      <Clock size={14} />
                      <CountdownTimer targetDate={t.start_time} prefix="Starts in" />
                    </div>

                    {/* Prize Pool & Entry Fee Grid */}
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
                      <div>
                        <p className="text-[10px] text-text-muted uppercase font-bold">Prize Pool</p>
                        <p className="text-base font-black text-neon-gold flex items-center gap-1">
                          <Coins size={14} /> ₹{Number(t.prize_pool).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-muted uppercase font-bold">Entry Fee</p>
                        <p className="text-base font-black text-white">
                          {Number(t.entry_fee) === 0 ? (
                            <span className="text-success font-black">FREE ENTRY</span>
                          ) : (
                            `₹${t.entry_fee}`
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProtectedAction(`/tournaments`);
                    }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-5 w-full py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-neon-gold via-amber-400 to-yellow-500 text-black flex items-center justify-center gap-2 shadow-md shadow-neon-gold/20 group-hover:shadow-neon-gold/40 cursor-pointer transition-all"
                  >
                    <span>Draft Squad & Join</span>
                    <ArrowRight size={14} />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── HOW IT WORKS SECTION ─── */}
      <section className="py-16 px-6 relative z-10 border-t border-white/5 bg-white/[0.01]">
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

      {/* ─── TRENDING CREATORS ─── */}
      <section className="py-16 px-6 relative z-10">
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
                onClick={() => handleProtectedAction('/creators')}
                className="glass-card p-5 rounded-2xl border border-white/10 cursor-pointer"
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

      {/* ─── FINAL CALL TO ACTION ─── */}
      <section className="py-16 px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card p-10 sm:p-14 rounded-3xl border border-neon-gold/30 bg-gradient-to-br from-neon-gold/10 via-transparent to-neon-purple/10">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Ready to Dominate?</h2>
            <p className="text-sm text-text-secondary max-w-md mx-auto mb-8">
              Join the Creator Entertainment League. Build your dream roster and rise to the Top 100 leaderboard.
            </p>
            <motion.button
              onClick={() => handleProtectedAction('/tournaments')}
              whileHover={{ scale: 1.05, boxShadow: '0 0 35px rgba(251, 191, 36, 0.4)' }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 text-sm sm:text-base font-black bg-gradient-to-r from-neon-gold via-amber-400 to-yellow-500 text-black rounded-2xl flex items-center gap-2 mx-auto cursor-pointer shadow-lg shadow-neon-gold/20"
            >
              <Trophy size={18} />
              <span>Enter Creator League</span>
              <ArrowRight size={18} />
            </motion.button>
          </div>
        </div>
      </section>
    </div>
  );
}
