'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Crown, Zap, ExternalLink, TrendingUp, Users, ThumbsUp, Eye, Shield, Clock } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { apiGet } from '../lib/api';
import TiltCard3D from './ui/TiltCard3D';

interface CreatorBreakdown {
  creatorId: string;
  name: string;
  category: string;
  profileImageUrl?: string;
  creditCost: number;
  role: 'captain' | 'vice_captain' | 'player';
  multiplier: number;
  video: {
    title: string;
    url: string;
    isPreContest: boolean;
    statusLabel: string;
  };
  baselineStart: {
    views: number;
    likes: number;
    subscribers: number;
  };
  currentStats: {
    views: number;
    likes: number;
    subscribers: number;
  };
  growth: {
    deltaViews: number;
    deltaLikes: number;
    deltaSubscribers: number;
  };
  points: {
    viewsPoints: number;
    likesPoints: number;
    subsPoints: number;
    rawTotalPoints: number;
    finalPoints: number;
  };
}

interface ScorecardData {
  teamId: string;
  userId: string;
  userName: string;
  tournament: {
    id: string;
    name: string;
    platform: string;
    status: string;
    startTime: string;
    endTime: string;
    lockTime: string;
    prizePool: number;
  };
  totalCreditsUsed: number;
  totalTeamPoints: number;
  rank: number;
  prizeWon: number;
  creatorsCount: number;
  creators: CreatorBreakdown[];
}

interface ScorecardModalProps {
  teamId?: string | null;
  isOpen?: boolean;
  onClose: () => void;
  team?: any;
}

export default function ScorecardModal({ teamId, isOpen, onClose, team }: ScorecardModalProps) {
  const { token } = useAuth();
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveTeamId = teamId || team?.id;

  useEffect(() => {
    if (!effectiveTeamId || !token) return;
    setLoading(true);
    setError(null);

    apiGet(`/teams/${effectiveTeamId}/score`, token)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        if (team) {
          // Fallback to team prop if /score endpoint has an issue
          setData({
            teamId: team.id,
            userId: team.user_id || '',
            userName: team.name || '3D Cyber Squad',
            tournament: {
              id: team.tournament_id || '',
              name: team.Tournament?.name || team.tournamentName || 'Creator Cup',
              platform: team.Tournament?.platform || 'youtube',
              status: team.Tournament?.status || 'live',
              startTime: '',
              endTime: '',
              lockTime: '',
              prizePool: team.Tournament?.prize_pool || 50000,
            },
            totalCreditsUsed: 100,
            totalTeamPoints: Number(team.total_score || 0),
            rank: team.rank || 1,
            prizeWon: 0,
            creatorsCount: (team.Creators || team.creators || []).length,
            creators: (team.Creators || team.creators || []).map((c: any) => {
              const isC = c.id === (team.captain_creator_id || team.captainId);
              const isVC = c.id === (team.vice_captain_creator_id || team.viceCaptainId);
              return {
                creatorId: c.id,
                name: c.name,
                category: c.category || 'Creator',
                creditCost: Number(c.credit_cost || 10),
                role: isC ? 'captain' : isVC ? 'vice_captain' : 'player',
                multiplier: isC ? 2.0 : isVC ? 1.5 : 1.0,
                video: {
                  title: 'Latest Content',
                  url: '',
                  isPreContest: false,
                  statusLabel: 'Active',
                },
                baselineStart: { views: 0, likes: 0, subscribers: 0 },
                currentStats: { views: c.base_views || 0, likes: c.base_likes || 0, subscribers: c.base_followers || 0 },
                growth: { deltaViews: 0, deltaLikes: 0, deltaSubscribers: 0 },
                points: {
                  viewsPoints: 0,
                  likesPoints: 0,
                  subsPoints: 0,
                  rawTotalPoints: c.pts || 380,
                  finalPoints: Math.round((c.pts || 380) * (isC ? 2.0 : isVC ? 1.5 : 1.0)),
                },
              };
            }),
          });
        } else {
          setError(err.message || 'Unable to fetch team scorecard');
        }
      })
      .finally(() => setLoading(false));
  }, [effectiveTeamId, token, team]);

  if (isOpen === false) return null;
  if (!effectiveTeamId && !team) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <TiltCard3D intensity={4} className="relative w-full max-w-4xl max-h-[92vh] flex flex-col p-0 border border-cyan-400/40 shadow-2xl overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/20 text-slate-950 font-black text-xl">
              <Trophy className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                  3D LIVE ENTERTAINMENT SCORECARD
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  REAL-TIME DELTAS
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {data?.userName || team?.name || '3D Creator Squad'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400 font-mono">Fetching 3D Score telemetry...</p>
            </div>
          ) : error && !data ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Summary Stats Slabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-center">
                  <div className="text-[10px] uppercase font-bold text-amber-200">Contest Rank</div>
                  <div className="text-2xl font-black text-amber-300 font-mono mt-0.5">
                    #{data.rank || 1}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-200">Total 3D Points</div>
                  <div className="text-2xl font-black text-emerald-300 font-mono mt-0.5">
                    {data.totalTeamPoints.toFixed(2)} pts
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 text-center">
                  <div className="text-[10px] uppercase font-bold text-cyan-200">Lineup Cap</div>
                  <div className="text-2xl font-black text-cyan-300 font-mono mt-0.5">
                    {data.creatorsCount || 11} / 11
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-500/15 border border-purple-400/40 text-center">
                  <div className="text-[10px] uppercase font-bold text-purple-200">Prize Won</div>
                  <div className="text-2xl font-black text-purple-300 font-mono mt-0.5">
                    {data.prizeWon > 0 ? `₹${data.prizeWon.toLocaleString('en-IN')}` : 'Live'}
                  </div>
                </div>
              </div>

              {/* Creators Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Individual Creator Points & Growth Breakdown
                </h3>

                <div className="space-y-2.5">
                  {data.creators.map((c) => {
                    const isCap = c.role === 'captain';
                    const isVC = c.role === 'vice_captain';

                    return (
                      <div
                        key={c.creatorId}
                        className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCap
                            ? 'bg-amber-950/20 border-amber-400/40'
                            : isVC
                              ? 'bg-purple-950/20 border-purple-400/40'
                              : 'bg-black/45 border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center font-black text-slate-950 text-xs">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{c.name}</span>
                              {isCap && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950">
                                  👑 C 2.0x
                                </span>
                              )}
                              {isVC && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-400 text-slate-950">
                                  ⚡ VC 1.5x
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {c.category} • {c.creditCost} Credits
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <div className="text-base font-black text-cyan-300 font-mono">
                              {c.points.finalPoints.toFixed(2)} pts
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Base: {c.points.rawTotalPoints.toFixed(1)} × {c.multiplier}x
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </TiltCard3D>
    </div>
  );
}
