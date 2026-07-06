'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Trophy, Users, Zap, ArrowRight, Video, Camera, Star, TrendingUp } from 'lucide-react';
import { useAuth } from './lib/auth-context';

const features = [
  { icon: Users, title: 'Draft Creators', desc: 'Pick your dream team of 10 creators across 5 categories' },
  { icon: TrendingUp, title: 'Real Performance', desc: 'Points based on actual 24h views, likes, and follower growth' },
  { icon: Trophy, title: 'Win Prizes', desc: 'Top teams split the prize pool — ₹5K to ₹30K per tournament' },
];

const trendingCreators = [
  { name: 'NovaBlade Gaming', platform: 'youtube', category: 'Gaming', growth: '+12.4%' },
  { name: 'MemeLordOfficial', platform: 'instagram', category: 'Comedy', growth: '+18.7%' },
  { name: 'ByteReview', platform: 'youtube', category: 'Tech', growth: '+9.2%' },
  { name: 'GlowUpDaily', platform: 'instagram', category: 'Lifestyle', growth: '+15.1%' },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  return (
    <div className="min-h-screen relative">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center">
        {/* Nav Bar */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
          style={{ background: 'rgba(10, 10, 15, 0.5)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold">Creator11</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-text-secondary hidden sm:inline">Hello, {user?.name}</span>
                <Link href="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl"
                  >
                    Dashboard
                  </motion.button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Log In</Link>
                <Link href="/signup">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl"
                  >
                    Get Started
                  </motion.button>
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Hero Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-3xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full mb-6"
          >
            <Star size={14} className="text-neon-gold" />
            <span className="text-xs font-medium text-neon-gold tracking-wider uppercase">Season 1 Now Live</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 bg-gradient-to-r from-white via-neon-purple to-neon-cyan bg-clip-text text-transparent animate-gradient">
            Fantasy Sports<br />for Creators
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto mb-8 leading-relaxed">
            Draft your dream team of YouTube & Instagram creators. Compete in tournaments where real creator performance determines your score.
          </p>

          <div className="flex items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3.5 text-base font-bold bg-gradient-to-r from-neon-purple to-neon-purple/80 text-white rounded-2xl flex items-center gap-2"
                >
                  Go to Dashboard <ArrowRight size={18} />
                </motion.button>
              </Link>
            ) : (
              <>
                <Link href="/signup">
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)' }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-3.5 text-base font-bold bg-gradient-to-r from-neon-purple to-neon-purple/80 text-white rounded-2xl flex items-center gap-2"
                  >
                    Start Playing <ArrowRight size={18} />
                  </motion.button>
                </Link>
                <Link href="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-3.5 text-base font-medium glass text-text-primary rounded-2xl border-glow-purple"
                  >
                    Explore
                  </motion.button>
                </Link>
              </>
            )}
          </div>
        </motion.div>

        {/* Platforms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex items-center gap-8 mt-16"
        >
          <div className="flex items-center gap-2 text-text-muted">
            <Video size={20} className="text-red-500" /> YouTube League
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-2 text-text-muted">
            <Camera size={20} className="text-pink-500" /> Instagram League
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It <span className="text-neon-purple">Works</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -5, boxShadow: '0 0 30px rgba(168, 85, 247, 0.1)' }}
                className="glass p-6 text-center"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                  <f.icon size={22} className="text-neon-purple" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-text-secondary">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Creators */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Trending <span className="text-neon-cyan">Creators</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {trendingCreators.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="glass p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple/30 to-neon-cyan/30 flex items-center justify-center text-sm font-bold">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-text-muted flex items-center gap-1">
                      {c.platform === 'youtube' ? <Video size={10} className="text-red-500" /> : <Camera size={10} className="text-pink-500" />}
                      {c.category}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="label-upper">24h Growth</span>
                  <span className="text-sm font-bold text-success">{c.growth}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="glass p-12 glow-purple"
          >
            <h2 className="text-3xl font-bold mb-4">Ready to Compete?</h2>
            <p className="text-text-secondary mb-8">Join thousands of fantasy managers. Build your team, climb the leaderboard.</p>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-10 py-4 text-lg font-bold bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl"
                >
                  Go to Dashboard
                </motion.button>
              </Link>
            ) : (
              <Link href="/signup">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-10 py-4 text-lg font-bold bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl"
                >
                  Create Free Account
                </motion.button>
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/[0.05] relative z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-sm text-text-muted">© 2025 Creator11. Fantasy Gaming Platform.</p>
          <div className="flex items-center gap-4 text-sm text-text-muted">
            <span>Terms</span>
            <span>Privacy</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
