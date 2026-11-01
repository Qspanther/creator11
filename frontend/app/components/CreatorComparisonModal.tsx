'use client';

import React, { useState } from 'react';
import { X, ArrowRightLeft, Sparkles, TrendingUp, Eye, ThumbsUp, Users, Award } from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  platform: string;
  category: string;
  credit_cost: string | number;
  base_views: number;
  base_likes: number;
  base_followers: number;
  profile_image_url?: string;
}

interface CreatorComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  creators: Creator[];
  initialCreatorA?: Creator | null;
  initialCreatorB?: Creator | null;
}

function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return Number(num).toLocaleString('en-IN');
}

export default function CreatorComparisonModal({
  isOpen,
  onClose,
  creators,
  initialCreatorA,
  initialCreatorB,
}: CreatorComparisonModalProps) {
  const [creatorAId, setCreatorAId] = useState<string>(initialCreatorA?.id || creators[0]?.id || '');
  const [creatorBId, setCreatorBId] = useState<string>(
    initialCreatorB?.id || creators[1]?.id || creators[0]?.id || ''
  );

  if (!isOpen) return null;

  const creatorA = creators.find((c) => c.id === creatorAId) || creators[0];
  const creatorB = creators.find((c) => c.id === creatorBId) || creators[1] || creators[0];

  const viewsA = Number(creatorA?.base_views || 0);
  const viewsB = Number(creatorB?.base_views || 0);
  const totalViews = viewsA + viewsB || 1;
  const pctViewsA = Math.round((viewsA / totalViews) * 100);
  const pctViewsB = 100 - pctViewsA;

  const likesA = Number(creatorA?.base_likes || 0);
  const likesB = Number(creatorB?.base_likes || 0);
  const totalLikes = likesA + likesB || 1;
  const pctLikesA = Math.round((likesA / totalLikes) * 100);
  const pctLikesB = 100 - pctLikesA;

  const subsA = Number(creatorA?.base_followers || 0);
  const subsB = Number(creatorB?.base_followers || 0);
  const totalSubs = subsA + subsB || 1;
  const pctSubsA = Math.round((subsA / totalSubs) * 100);
  const pctSubsB = 100 - pctSubsA;

  const costA = Number(creatorA?.credit_cost || 10);
  const costB = Number(creatorB?.credit_cost || 10);
  const valPerCreditA = Math.round(viewsA / costA);
  const valPerCreditB = Math.round(viewsB / costB);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0c101d] border border-neon-cyan/40 shadow-[0_0_50px_rgba(0,240,255,0.2)] overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center text-neon-purple">
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Creator Comparison Matrix
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/30">
                  HEAD-TO-HEAD
                </span>
              </h2>
              <p className="text-xs text-text-muted">Compare stats, metrics & credit efficiency before drafting your squad</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition font-bold"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Creator Selector Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Creator A Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-cyan-950/20 to-transparent border border-cyan-400/40 space-y-3">
              <label className="text-[10px] uppercase font-bold text-cyan-300 tracking-wider">Candidate A</label>
              <select
                value={creatorAId}
                onChange={(e) => setCreatorAId(e.target.value)}
                className="w-full bg-[#131728] border border-white/15 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-bold outline-none focus:border-cyan-400"
              >
                {creators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.credit_cost} CR)
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-3 pt-1">
                {creatorA?.profile_image_url ? (
                  <img src={creatorA.profile_image_url} alt={creatorA.name} className="w-12 h-12 rounded-xl object-cover border border-cyan-400/30 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center font-black text-sm shrink-0">
                    {creatorA?.name?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-black text-white truncate">{creatorA?.name}</div>
                  <div className="text-[11px] text-text-muted">{creatorA?.category} • {creatorA?.platform}</div>
                  <div className="text-xs font-mono font-bold text-amber-300 mt-0.5">{creatorA?.credit_cost} Credits</div>
                </div>
              </div>
            </div>

            {/* Creator B Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-950/20 to-transparent border border-purple-400/40 space-y-3">
              <label className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">Candidate B</label>
              <select
                value={creatorBId}
                onChange={(e) => setCreatorBId(e.target.value)}
                className="w-full bg-[#131728] border border-white/15 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-bold outline-none focus:border-purple-400"
              >
                {creators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.credit_cost} CR)
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-3 pt-1">
                {creatorB?.profile_image_url ? (
                  <img src={creatorB.profile_image_url} alt={creatorB.name} className="w-12 h-12 rounded-xl object-cover border border-purple-400/30 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/40 flex items-center justify-center font-black text-sm shrink-0">
                    {creatorB?.name?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-black text-white truncate">{creatorB?.name}</div>
                  <div className="text-[11px] text-text-muted">{creatorB?.category} • {creatorB?.platform}</div>
                  <div className="text-xs font-mono font-bold text-amber-300 mt-0.5">{creatorB?.credit_cost} Credits</div>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Comparison Bars */}
          <div className="space-y-4">
            {/* 1. Base Views */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <Eye size={13} /> {formatNumber(viewsA)}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-text-muted font-mono">Base Views</span>
                <span className="flex items-center gap-1.5 text-purple-300">
                  {formatNumber(viewsB)} <Eye size={13} />
                </span>
              </div>
              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex">
                <div style={{ width: `${pctViewsA}%` }} className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500" />
                <div style={{ width: `${pctViewsB}%` }} className="h-full bg-gradient-to-r from-purple-400 to-purple-500 transition-all duration-500" />
              </div>
              <div className="flex justify-between text-[10px] text-text-muted font-mono">
                <span>{pctViewsA}%</span>
                <span>{pctViewsB}%</span>
              </div>
            </div>

            {/* 2. Base Likes */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <ThumbsUp size={13} /> {formatNumber(likesA)}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-text-muted font-mono">Base Likes</span>
                <span className="flex items-center gap-1.5 text-purple-300">
                  {formatNumber(likesB)} <ThumbsUp size={13} />
                </span>
              </div>
              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex">
                <div style={{ width: `${pctLikesA}%` }} className="h-full bg-cyan-400 transition-all duration-500" />
                <div style={{ width: `${pctLikesB}%` }} className="h-full bg-purple-400 transition-all duration-500" />
              </div>
              <div className="flex justify-between text-[10px] text-text-muted font-mono">
                <span>{pctLikesA}%</span>
                <span>{pctLikesB}%</span>
              </div>
            </div>

            {/* 3. Base Followers / Subscribers */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <Users size={13} /> {formatNumber(subsA)}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-text-muted font-mono">Subscribers</span>
                <span className="flex items-center gap-1.5 text-purple-300">
                  {formatNumber(subsB)} <Users size={13} />
                </span>
              </div>
              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex">
                <div style={{ width: `${pctSubsA}%` }} className="h-full bg-cyan-400 transition-all duration-500" />
                <div style={{ width: `${pctSubsB}%` }} className="h-full bg-purple-400 transition-all duration-500" />
              </div>
              <div className="flex justify-between text-[10px] text-text-muted font-mono">
                <span>{pctSubsA}%</span>
                <span>{pctSubsB}%</span>
              </div>
            </div>

            {/* 4. Value Efficiency Score (Views / Credit Cost) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-white/[0.02] to-amber-500/10 border border-amber-400/30 flex items-center justify-between">
              <div className="text-left">
                <div className="text-xs font-mono font-bold text-cyan-300">{formatNumber(valPerCreditA)} Views / CR</div>
                <div className="text-[10px] text-text-muted mt-0.5">{creatorA?.name}</div>
              </div>
              <div className="text-center px-3">
                <span className="text-[10px] uppercase font-bold text-amber-300 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/40">
                  Credit Efficiency
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-purple-300">{formatNumber(valPerCreditB)} Views / CR</div>
                <div className="text-[10px] text-text-muted mt-0.5">{creatorB?.name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-white/10 bg-white/[0.02] text-center">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}

