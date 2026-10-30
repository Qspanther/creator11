'use client';

import React, { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import TiltCard3D from '../components/ui/TiltCard3D';
import { playSpatialSFX } from '../components/ui/StageControls3D';
import { Search, ExternalLink, Video, Eye, Heart, X, Sparkles } from 'lucide-react';

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
  latest_video_title?: string;
  latest_video_url?: string;
}

export default function CreatorsVaultPage3D() {
  const { token } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [modalCreator, setModalCreator] = useState<Creator | null>(null);

  useEffect(() => {
    if (!token) return;
    apiGet('/creators?platform=youtube', token)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.creators;
        if (Array.isArray(list)) setCreators(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = creators.filter((c) => {
    const cMatch = category === 'All' || c.category === category;
    const qMatch =
      !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    return cMatch && qMatch;
  });

  return (
    <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase text-cyan-400">VERIFIED ROSTER • /creators</div>
          <h1 className="text-3xl sm:text-4xl font-black mt-1">3D Holo-Creators Vault</h1>
          <p className="text-sm text-slate-400">
            Browse verified YouTube creators rendered as interactive 3D holographic cards. Hover to tilt in 3D space.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search creators..."
              className="pl-9 pr-3 py-2 bg-slate-900/90 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <select
            value={category}
            onChange={(e) => {
              playSpatialSFX('click');
              setCategory(e.target.value);
            }}
            aria-label="Filter creators by category"
            className="bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2 text-xs font-semibold text-cyan-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="All">All Categories</option>
            <option value="Gaming">Gaming</option>
            <option value="Vlogging">Vlogging</option>
            <option value="Comedy">Comedy</option>
            <option value="Tech">Tech</option>
            <option value="Lifestyle">Lifestyle</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((c) => {
            const initials = c.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <TiltCard3D
                key={c.id}
                onClick={() => {
                  playSpatialSFX('click');
                  setModalCreator(c);
                }}
                className="p-5 flex flex-col justify-between space-y-4 cursor-pointer hover:border-cyan-400/50"
              >
                <div className="space-y-3 depth-layer-10">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/20 text-red-300 border border-red-400/30">
                      YouTube • {c.category}
                    </span>
                    <span className="font-mono text-xs font-black text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                      {c.credit_cost} CR
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {c.profile_image_url ? (
                      <img
                        src={c.profile_image_url}
                        alt={c.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-white/15 shadow-md"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center font-black text-slate-950">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold text-white truncate">{c.name}</h3>
                      <div className="text-xs text-cyan-400 font-mono">
                        {c.external_channel_id ? `@${c.external_channel_id}` : c.category}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">Base Views</div>
                      <div className="font-bold text-white font-mono">
                        {((c.base_views || 950000) / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Base Likes</div>
                      <div className="font-bold text-cyan-300 font-mono">
                        {((c.base_likes || 82000) / 1000).toFixed(1)}K
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px] text-purple-300">Click for 3D Stats</span>
                  <span className="text-cyan-400 font-bold">Inspect →</span>
                </div>
              </TiltCard3D>
            );
          })}
        </div>
      )}

      {/* Creator Detail 3D Modal */}
      {modalCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <TiltCard3D intensity={8} className="max-w-lg w-full p-6 border border-cyan-400/50 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center font-black text-slate-950 text-lg">
                  {modalCreator.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{modalCreator.name}</h3>
                  <span className="text-xs text-cyan-300 font-mono">
                    {modalCreator.category} • {modalCreator.credit_cost} Credits
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCreator(null)}
                className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-black/50 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase">Subscribers</div>
                <div className="text-base font-black text-white font-mono mt-1">
                  {((modalCreator.base_followers || 500000) / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase">Total Views</div>
                <div className="text-base font-black text-emerald-400 font-mono mt-1">
                  {((modalCreator.base_views || 950000) / 1000000).toFixed(2)}M
                </div>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase">Total Likes</div>
                <div className="text-base font-black text-cyan-300 font-mono mt-1">
                  {((modalCreator.base_likes || 82000) / 1000).toFixed(1)}K
                </div>
              </div>
            </div>

            {modalCreator.latest_video_title && (
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-400/30 space-y-1">
                <div className="text-[10px] font-mono uppercase text-purple-300">Latest Tracked Video</div>
                <div className="text-xs font-semibold text-white truncate">{modalCreator.latest_video_title}</div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {modalCreator.profile_url && (
                <a
                  href={modalCreator.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl text-center text-xs font-bold bg-white/10 border border-white/20 text-white hover:bg-white/15 transition flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open YouTube Channel
                </a>
              )}
              <button
                type="button"
                onClick={() => setModalCreator(null)}
                className="flex-1 py-2.5 rounded-xl text-center text-xs font-extrabold bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
              >
                Done
              </button>
            </div>
          </TiltCard3D>
        </div>
      )}
    </div>
  );
}
