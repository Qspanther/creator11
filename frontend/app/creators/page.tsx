'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiGet } from '../lib/api';
import { motion } from 'framer-motion';
import { Users, Video, Camera, Search, SortAsc } from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  platform: string;
  category: string;
  credit_cost: string;
  base_views: number;
  base_likes: number;
  base_followers: number;
}

export default function CreatorsPage() {
  const { token } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [platform, setPlatform] = useState<'youtube' | 'instagram'>('youtube');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<{ categories: string[] }>({ categories: [] });

  useEffect(() => {
    apiGet('/api/config').then(d => setConfig(d)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ platform });
    if (category !== 'All') params.append('category', category);
    apiGet(`/creators?${params}`, token)
      .then(data => setCreators(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, platform, category]);

  const filtered = search
    ? creators.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : creators;

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users size={28} className="text-neon-cyan" /> Browse Creators
        </h1>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1.5 glass p-1 rounded-xl">
          <button
            onClick={() => setPlatform('youtube')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all ${
              platform === 'youtube' ? 'bg-red-500/10 text-red-500' : 'text-text-secondary'
            }`}
          >
            <Video size={14} /> YouTube
          </button>
          <button
            onClick={() => setPlatform('instagram')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all ${
              platform === 'instagram' ? 'bg-pink-500/10 text-pink-500' : 'text-text-secondary'
            }`}
          >
            <Camera size={14} /> Instagram
          </button>
        </div>

        <div className="flex gap-1.5">
          {['All', ...config.categories].map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 text-xs font-medium rounded-xl transition-all ${
                category === cat
                  ? 'bg-neon-purple/10 text-neon-purple border border-neon-purple/30'
                  : 'text-text-secondary hover:bg-white/[0.04]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search creators..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full !pl-9 !py-2 !text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((creator, i) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ y: -4 }}
              className="glass p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 flex items-center justify-center text-lg font-bold">
                  {creator.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold">{creator.name}</h3>
                  <p className="text-xs text-text-muted flex items-center gap-1">
                    {creator.platform === 'youtube' ? <Video size={10} className="text-red-500" /> : <Camera size={10} className="text-pink-500" />}
                    {creator.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-neon-gold">{parseFloat(creator.credit_cost).toFixed(1)}</p>
                  <p className="text-[9px] text-text-muted uppercase tracking-wider">Credits</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                  <p className="text-xs text-text-muted">Views</p>
                  <p className="text-sm font-bold">{(creator.base_views / 1000000).toFixed(1)}M</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                  <p className="text-xs text-text-muted">Likes</p>
                  <p className="text-sm font-bold">{(creator.base_likes / 1000).toFixed(0)}K</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                  <p className="text-xs text-text-muted">Followers</p>
                  <p className="text-sm font-bold">{(creator.base_followers / 1000).toFixed(0)}K</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
