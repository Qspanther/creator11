'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiGet } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Video, Sparkles,
  ExternalLink, TrendingUp, Eye, Heart, X, Flame
} from 'lucide-react';

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

export default function CreatorsPage() {
  const { token } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform] = useState<'youtube'>('youtube');
  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [modalCreator, setModalCreator] = useState<Creator | null>(null);

  useEffect(() => {
    if (!token) return;
    apiGet('/creators?platform=youtube', token)
      .then(data => setCreators(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, platform]);

  const categories = ['All', 'Gaming', 'Vlogging', 'Comedy', 'Tech', 'Lifestyle'];

  const filtered = creators.filter(c => {
    if (category !== 'All' && c.category !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.external_channel_id && c.external_channel_id.toLowerCase().includes(q));
    }
    return true;
  });

  const getPortraitUrl = (creator: Creator) => {
    if (creator.profile_image_url && creator.profile_image_url.startsWith('http')) {
      return creator.profile_image_url;
    }
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
  };

  return (
    <div className="widescreen-container py-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Users size={32} className="text-neon-cyan" />
              Creator Roster Directory
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Explore verified YouTube stars across Gaming, Tech, Comedy, Lifestyle & Vlogging for your fantasy lineups
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs font-black text-red-400">
            <Video size={14} className="text-red-500" />
            <span>YouTube League Active</span>
          </div>
        </div>
      </motion.div>

      {/* Filters Bar */}
      <div className="glass-card p-5 mb-8 space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                category === cat
                  ? 'bg-neon-cyan text-black font-black shadow-md shadow-neon-cyan/20'
                  : 'bg-white/[0.04] text-text-secondary hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search creator by name, handle, or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full !pl-10 !py-3 !text-sm"
          />
        </div>
      </div>

      {/* Creators Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((creator, i) => {
            const portrait = getPortraitUrl(creator);
            return (
              <motion.div
                key={creator.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                whileHover={{ y: -5 }}
                onClick={() => setModalCreator(creator)}
                className="glass-card p-5 cursor-pointer border border-white/5 hover:border-neon-cyan/30 transition-all group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-white/10 group-hover:border-neon-cyan transition-colors relative">
                    <img
                      src={portrait}
                      alt={creator.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black/80 flex items-center justify-center border border-white/10">
<Video size={10} className="text-red-500" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white truncate group-hover:text-neon-cyan transition-colors">
                      {creator.name}
                    </h3>
                    <p className="text-xs text-text-muted flex items-center gap-1.5 truncate">
                      <span className="text-neon-cyan/90 font-medium">{creator.category}</span>
                      {creator.external_channel_id && (
                        <>
                          <span className="opacity-40">•</span>
                          <span className="font-mono text-[10px] text-white/60">{creator.external_channel_id}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-base font-black text-neon-gold">
                      {parseFloat(creator.credit_cost).toFixed(1)}
                    </p>
                    <p className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Credits</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                  <div className="text-center p-2 rounded-xl bg-white/[0.02]">
                    <p className="text-[10px] text-text-muted font-bold uppercase">Views</p>
                    <p className="text-xs font-black text-white">{((creator.base_views || 1000000) / 1000000).toFixed(1)}M</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-white/[0.02]">
                    <p className="text-[10px] text-text-muted font-bold uppercase">Likes</p>
                    <p className="text-xs font-black text-white">{((creator.base_likes || 50000) / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-white/[0.02]">
                    <p className="text-[10px] text-text-muted font-bold uppercase">Followers</p>
                    <p className="text-xs font-black text-white">{((creator.base_followers || 400000) / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Creator Profile Modal */}
      <AnimatePresence>
        {modalCreator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-lg glass-strong overflow-hidden border border-white/15 relative"
            >
              <button
                onClick={() => setModalCreator(null)}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>

              <div className="h-32 bg-gradient-to-r from-purple-900 via-indigo-900 to-cyan-900 relative">
                <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" />
                <div className="absolute bottom-3 left-6 text-xs text-white/80 font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <Flame size={14} className="text-neon-gold" />
                  Official Creator Profile
                </div>
              </div>

              <div className="p-6 pt-0 relative">
                <div className="flex items-end justify-between -mt-12 mb-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-3 border-black shadow-2xl relative">
                    <img
                      src={getPortraitUrl(modalCreator)}
                      alt={modalCreator.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex gap-2">
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
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    {modalCreator.name}
                    <span className="w-4 h-4 rounded-full bg-neon-cyan/20 text-neon-cyan flex items-center justify-center text-[10px]">✓</span>
                  </h3>
                  <p className="text-xs text-text-secondary capitalize">
                    YouTube Creator • {modalCreator.category} Category
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <p className="text-[10px] text-text-muted font-bold uppercase">Followers</p>
                    <p className="text-base font-black text-neon-cyan">
                      {((modalCreator.base_followers || 850000) / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <p className="text-[10px] text-text-muted font-bold uppercase">Total Views</p>
                    <p className="text-base font-black text-neon-gold">
                      {((modalCreator.base_views || 2500000) / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <p className="text-[10px] text-text-muted font-bold uppercase">Selection %</p>
                    <p className="text-base font-black text-success">
                      78.4%
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 mb-6">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Fantasy Credit Cost:</span>
                    <span className="font-extrabold text-neon-gold">{modalCreator.credit_cost} Credits</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Avg Fantasy Points (Last 5):</span>
                    <span className="font-extrabold text-neon-cyan">142.8 Pts</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Scoring Multiplier Role:</span>
                    <span className="font-extrabold text-text-primary">Eligible for 2x Captain / 1.5x VC</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
