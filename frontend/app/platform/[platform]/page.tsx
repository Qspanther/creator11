'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet } from '../../lib/api';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, Camera, Plus, X, ArrowRight, Trophy, Clock, Coins,
  Flame, ExternalLink, Sparkles, Eye, TrendingUp, Info
} from 'lucide-react';
import Link from 'next/link';

interface Creator {
  id: string;
  name: string;
  platform: string;
  category: string;
  credit_cost: string;
  base_views: number;
  base_likes: number;
  base_followers: number;
  profile_image_url?: string;
  profile_url?: string;
  external_channel_id?: string;
}

interface Tournament {
  id: string;
  name: string;
  duration_type: string;
  entry_fee: string;
  prize_pool: string;
  status: string;
}

export default function PlatformLobbyPage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = use(params);
  const { token } = useAuth();
  const router = useRouter();

  const [creators, setCreators] = useState<Creator[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalCreator, setModalCreator] = useState<Creator | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet(`/creators?platform=${platform}`, token),
      token ? apiGet(`/tournaments?platform=${platform}`, token) : Promise.resolve([])
    ])
    .then(([creatorsData, tournamentsData]) => {
      setCreators(creatorsData || []);
      setTournaments(tournamentsData || []);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [platform, token]);

  const groupedCreators = creators.reduce((acc, creator) => {
    if (!acc[creator.category]) acc[creator.category] = [];
    acc[creator.category].push(creator);
    return acc;
  }, {} as Record<string, Creator[]>);

  const categories = Object.keys(groupedCreators).sort();
  const PlatformIcon = platform === 'youtube' ? Video : Camera;
  const platformName = platform === 'youtube' ? 'YouTube' : 'Instagram';

  // Standby notice if Instagram league is accessed while frozen
  if (platform === 'instagram') {
    return (
      <div className="widescreen-container py-20 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card max-w-lg p-10 border border-white/10 rounded-3xl text-center glow-purple"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-6 text-neon-gold">
            <Clock size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">Instagram League Frozen</h2>
          <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold mb-4 uppercase tracking-wider">
            Temporarily Inactive / Standby
          </div>
          <p className="text-sm text-text-secondary leading-relaxed mb-8">
            The Instagram battle division has been temporarily frozen by administration. All active fantasy tournaments and creator lineups are running on the YouTube League.
          </p>
          <Link href="/platform/youtube">
            <button className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 mx-auto hover:opacity-95 transition-all cursor-pointer shadow-lg shadow-red-500/20">
              <Video size={18} />
              <span>Enter YouTube Battle Lobby</span>
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const durationLabels: Record<string, string> = {
    '6h': 'Flash Blitz (6-Hour)',
    '24h': 'Daily Battle (24-Hour)',
    '48h': 'Weekend Clash (48-Hour)',
    '72h': 'Weekly Showdown (72-Hour)',
    '2d': 'Weekend Clash (48-Hour)',
    '3d': 'Weekly Showdown (72-Hour)',
  };

  const getPortraitUrl = (creator: any) => {
    const rawUrl = typeof creator === 'string' ? creator : creator?.profile_image_url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
    }
    if (rawUrl.includes('localhost:5000/uploads/') || rawUrl.includes('127.0.0.1:5000/uploads/')) {
      return rawUrl.replace(/^https?:\/\/(localhost|127\.0\.0\.1):5000\/uploads\//, '/api-backend/uploads/');
    }
    if (rawUrl.startsWith('/api-backend/') || rawUrl.startsWith('/uploads/')) {
      return rawUrl;
    }
    if (rawUrl.startsWith('https://') || rawUrl.startsWith('http://')) {
      return rawUrl;
    }
    return `/api-backend/uploads/${rawUrl.replace(/^\/+/, '')}`;
  };

  return (
    <div className="widescreen-container py-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 mb-8 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              platform === 'youtube' ? 'bg-red-500/15 text-red-500' : 'bg-pink-500/15 text-pink-500'
            }`}>
              <PlatformIcon size={24} />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{platformName} Battle Lobby</h1>
          </div>
          <p className="text-xs text-text-secondary">
            Select a Battle League or inspect creator metrics to craft your fantasy dream team
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            if (!token) {
              router.push('/login');
            } else {
              setShowModal(true);
            }
          }}
          className="px-6 py-3.5 text-xs font-black uppercase tracking-wider bg-gradient-to-r from-neon-cyan to-blue-500 text-black rounded-2xl flex items-center gap-2 justify-center shadow-lg shadow-neon-cyan/25 cursor-pointer"
        >
          <Plus size={16} /> Choose Battle League
        </motion.button>
      </motion.div>

      {/* Creators List Grouped By Category */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-10">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2.5 h-6 bg-neon-cyan rounded-full" />
                <h2 className="text-xl font-extrabold text-white">{cat} Creators</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupedCreators[cat].map((creator) => {
                  const portrait = getPortraitUrl(creator);
                  return (
                    <div
                      key={creator.id}
                      onClick={() => setModalCreator(creator)}
                      className="glass-card p-4 border border-white/5 hover:border-neon-cyan/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 group-hover:border-neon-cyan transition-colors relative">
                          <img
                            src={portrait}
                            alt={creator.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-white truncate group-hover:text-neon-cyan transition-colors">
                            {creator.name}
                          </h4>
                          <span className="text-[10px] text-text-muted">{creator.category}</span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="px-2.5 py-1 rounded-lg bg-neon-gold/15 text-neon-gold font-extrabold text-xs">
                            {parseFloat(creator.credit_cost).toFixed(1)} CR
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] border-t border-white/5 pt-2.5">
                        <div>
                          <p className="text-text-muted">Followers</p>
                          <p className="font-bold text-white">{(creator.base_followers || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-text-muted">Avg Views</p>
                          <p className="font-bold text-white">{(creator.base_views || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-text-muted">Avg Likes</p>
                          <p className="font-bold text-white">{(creator.base_likes || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tournament Selection Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl glass-strong p-8 border border-white/15"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-2 text-text-muted hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-8">
                <Trophy size={40} className="mx-auto text-neon-gold mb-3" />
                <h2 className="text-2xl font-black text-white mb-1">Choose Battle League</h2>
                <p className="text-xs text-text-secondary">Select your duration and entry level to begin drafting</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {tournaments.filter(t => t.status === 'upcoming' || t.status === 'live').map((t) => (
                  <div
                    key={t.id}
                    onClick={() => router.push(`/team-builder/${t.id}`)}
                    className="p-5 rounded-2xl border border-white/10 hover:border-neon-cyan bg-white/[0.02] hover:bg-neon-cyan/[0.08] transition-all cursor-pointer group text-center"
                  >
                    <h3 className="font-extrabold text-sm mb-1 group-hover:text-neon-cyan transition-colors text-white">
                      {t.name}
                    </h3>
                    <p className="text-[10px] font-bold text-neon-cyan uppercase mb-4">
                      {durationLabels[t.duration_type] || t.duration_type}
                    </p>

                    <div className="space-y-1.5 text-xs pb-4 border-b border-white/5">
                      <div className="flex justify-between items-center text-text-muted">
                        <span>Entry:</span>
                        <span className="font-extrabold text-white">₹{parseFloat(t.entry_fee).toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-text-muted">
                        <span>Prize:</span>
                        <span className="font-extrabold text-neon-gold">₹{parseFloat(t.prize_pool).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-black text-neon-cyan">
                      <span>Draft Lineup</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Creator Profile Modal */}
      <AnimatePresence>
        {modalCreator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg glass-strong overflow-hidden border border-white/15 relative"
            >
              <button
                onClick={() => setModalCreator(null)}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="h-28 bg-gradient-to-r from-purple-900 via-indigo-900 to-cyan-900 relative">
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute bottom-3 left-6 text-xs text-white/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Flame size={14} className="text-neon-gold" />
                  Official Creator Profile
                </div>
              </div>

              <div className="p-6 pt-0 relative">
                <div className="flex items-end justify-between -mt-10 mb-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-black shadow-2xl relative">
                    <img
                      src={getPortraitUrl(modalCreator)}
                      alt={modalCreator.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {modalCreator.profile_url && (
                    <a
                      href={modalCreator.profile_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
                    >
                      <span>Channel</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    {modalCreator.name}
                    <span className="w-4 h-4 rounded-full bg-neon-cyan/20 text-neon-cyan flex items-center justify-center text-[10px]">✓</span>
                  </h3>
                  <p className="text-xs text-text-secondary capitalize">
                    {modalCreator.platform} Creator • {modalCreator.category} Category
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <p className="text-[10px] text-text-muted font-bold uppercase">Followers</p>
                    <p className="text-sm font-black text-neon-cyan">
                      {(modalCreator.base_followers || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <p className="text-[10px] text-text-muted font-bold uppercase">Views</p>
                    <p className="text-sm font-black text-neon-gold">
                      {(modalCreator.base_views || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <p className="text-[10px] text-text-muted font-bold uppercase">Cost</p>
                    <p className="text-sm font-black text-success">
                      {modalCreator.credit_cost} CR
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setModalCreator(null);
                    setShowModal(true);
                  }}
                  className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider bg-neon-cyan text-black hover:bg-neon-cyan/90 cursor-pointer shadow-lg shadow-neon-cyan/20"
                >
                  Join Battle League with this Creator
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
