'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Crown, Zap, ExternalLink, TrendingUp, Users, ThumbsUp, Eye, Shield, Clock } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { apiGet } from '../lib/api';

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
  teamId: string | null;
  onClose: () => void;
}

export default function ScorecardModal({ teamId, onClose }: ScorecardModalProps) {
  const { token } = useAuth();
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId || !token) return;
    setLoading(true);
    setError(null);

    apiGet(`/teams/${teamId}/score`, token)
      .then(res => {
        setData(res);
      })
      .catch(err => {
        setError(err.message || 'Unable to fetch team scorecard');
      })
      .finally(() => setLoading(false));
  }, [teamId, token]);

  const getPortraitUrl = (rawUrl?: string) => {
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!teamId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0e0e14]/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-purple/40 to-neon-cyan/40 border border-white/10 flex items-center justify-center text-lg font-black text-white shadow-lg">
                {data?.userName ? data.userName.charAt(0) : <Shield size={22} className="text-neon-cyan" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-white">{data?.userName || 'Team Scorecard'}</h2>
                  {data && (
                    data.tournament.status === 'completed' && (data.tournament as any).rankingsFinalized !== false ? (
                      <>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                          data.rank === 1
                            ? 'bg-neon-gold/20 text-neon-gold border border-neon-gold/40'
                            : data.rank <= 3
                              ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40'
                              : 'bg-white/10 text-text-secondary'
                        }`}>
                          {data.rank === 1 ? '👑 Rank #1 Winner' : `Rank #${data.rank}`}
                        </span>
                        {data.prizeWon > 0 && (
                          data.prizeWon > 99 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-neon-gold text-black shadow-md shadow-neon-gold/20">
                              🏆 +₹{data.prizeWon.toLocaleString('en-IN')} Won
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              🛡️ ₹99.00 100% Refunded
                            </span>
                          )
                        )}
                      </>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-success/20 text-success border border-success/40 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        LIVE SCORECARD • RANKS HIDDEN UNTIL END
                      </span>
                    )
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  {data?.tournament.name} • {data?.tournament.status?.toUpperCase()}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 text-text-secondary hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {loading ? (
              <div className="py-24 text-center">
                <div className="w-10 h-10 border-3 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm font-semibold text-text-secondary">Computing live delta score breakdown...</p>
              </div>
            ) : error ? (
              <div className="py-16 text-center text-danger">
                <p className="text-base font-bold mb-2">Failed to load scorecard</p>
                <p className="text-xs text-text-muted">{error}</p>
              </div>
            ) : data ? (
              <>
                {/* Tournament Time Window & Rule Banner */}
                <div className="glass-card p-4 rounded-2xl border border-white/5 bg-gradient-to-r from-neon-purple/10 via-neon-cyan/10 to-transparent">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Clock size={15} className="text-neon-cyan" />
                      <span className="font-semibold text-white">Contest Window:</span>
                      <span>{formatDate(data.tournament.startTime)}</span>
                      <span>➔</span>
                      <span>{formatDate(data.tournament.endTime)}</span>
                    </div>
                    <div className="text-right font-black text-neon-gold text-sm sm:text-base">
                      Total Points: <span className="text-white text-lg sm:text-xl font-black">{data.totalTeamPoints.toFixed(4)}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-[11px] text-text-muted">
                    <span className="flex items-center gap-1.5 font-bold text-white">
                      <TrendingUp size={13} className="text-neon-gold" />
                      Points Formula: 1,000 Views = 1 pt • 500 Likes = 1 pt • 100 Subs = 1 pt
                    </span>
                    <span className="text-neon-cyan font-medium">
                      🛡️ Only growth during contest window is scored
                    </span>
                  </div>
                </div>

                {/* 11 Players Transparent Score Table */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                    <Users size={16} className="text-neon-cyan" />
                    Lineup Breakdown ({data.creators.length} Creators)
                  </h3>

                  <div className="space-y-3">
                    {data.creators.map(c => {
                      const portrait = getPortraitUrl(c.profileImageUrl);
                      const isCaptain = c.role === 'captain';
                      const isVc = c.role === 'vice_captain';

                      return (
                        <div
                          key={c.creatorId}
                          className={`p-4 rounded-2xl border transition-all ${
                            isCaptain
                              ? 'bg-neon-gold/[0.04] border-neon-gold/30 glow-gold'
                              : isVc
                                ? 'bg-neon-cyan/[0.04] border-neon-cyan/30'
                                : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                          }`}
                        >
                          {/* Row Top: Avatar + Name + Role + Points */}
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10">
                                  <img src={portrait} alt={c.name} className="w-full h-full object-cover" />
                                </div>
                                {isCaptain && (
                                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neon-gold text-black flex items-center justify-center text-[10px] font-black shadow-md">
                                    C
                                  </div>
                                )}
                                {isVc && (
                                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neon-cyan text-black flex items-center justify-center text-[10px] font-black shadow-md">
                                    V
                                  </div>
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-extrabold text-white">{c.name}</h4>
                                  {isCaptain && (
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-neon-gold/20 text-neon-gold border border-neon-gold/40 flex items-center gap-1">
                                      <Crown size={10} /> Captain 2.0x
                                    </span>
                                  )}
                                  {isVc && (
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 flex items-center gap-1">
                                      <Zap size={10} /> Vice-Captain 1.5x
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-text-muted mt-0.5">
                                  {c.category} • {c.creditCost} Credits
                                </p>
                              </div>
                            </div>

                            {/* Total Points Contributed */}
                            <div className="text-right shrink-0">
                              <p className="text-lg font-black text-neon-gold">
                                {c.points.finalPoints.toFixed(4)}
                              </p>
                              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                                {c.multiplier > 1 ? `(${c.points.rawTotalPoints.toFixed(2)} × ${c.multiplier}x)` : 'Points'}
                              </p>
                            </div>
                          </div>

                          {/* Tracked Long Video Box */}
                          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 mb-3 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-red-500 font-bold shrink-0">▶</span>
                              <span className="text-white font-medium truncate" title={c.video.title}>
                                {c.video.title}
                              </span>
                              {c.video.url && (
                                <a
                                  href={c.video.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-text-muted hover:text-neon-cyan shrink-0 transition-colors"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              c.video.isPreContest
                                ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30'
                                : 'bg-success/15 text-success border border-success/30'
                            }`}>
                              {c.video.statusLabel}
                            </span>
                          </div>

                          {/* 3 Metric Columns: Subs, Views, Likes */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            {/* Subscribers */}
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                              <div className="flex items-center justify-between text-text-muted text-[10px] mb-1 font-bold">
                                <span className="flex items-center gap-1"><Users size={11} className="text-neon-purple" /> Subscribers</span>
                                <span className="text-neon-purple font-black">+{c.points.subsPoints.toFixed(4)} pts</span>
                              </div>
                              <div className="flex items-baseline justify-between">
                                <span className="text-text-muted text-[11px]">{c.baselineStart.subscribers.toLocaleString()}</span>
                                <span className="text-text-muted text-[10px]">➔</span>
                                <span className="text-white font-bold">{c.currentStats.subscribers.toLocaleString()}</span>
                              </div>
                              <div className="text-[10px] text-success font-black text-right mt-0.5">
                                +{c.growth.deltaSubscribers.toLocaleString()} gained
                              </div>
                            </div>

                            {/* Views */}
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                              <div className="flex items-center justify-between text-text-muted text-[10px] mb-1 font-bold">
                                <span className="flex items-center gap-1"><Eye size={11} className="text-neon-cyan" /> Video Views</span>
                                <span className="text-neon-cyan font-black">+{c.points.viewsPoints.toFixed(4)} pts</span>
                              </div>
                              <div className="flex items-baseline justify-between">
                                <span className="text-text-muted text-[11px]">{c.baselineStart.views.toLocaleString()}</span>
                                <span className="text-text-muted text-[10px]">➔</span>
                                <span className="text-white font-bold">{c.currentStats.views.toLocaleString()}</span>
                              </div>
                              <div className="text-[10px] text-success font-black text-right mt-0.5">
                                +{c.growth.deltaViews.toLocaleString()} gained
                              </div>
                            </div>

                            {/* Likes */}
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                              <div className="flex items-center justify-between text-text-muted text-[10px] mb-1 font-bold">
                                <span className="flex items-center gap-1"><ThumbsUp size={11} className="text-neon-gold" /> Video Likes</span>
                                <span className="text-neon-gold font-black">+{c.points.likesPoints.toFixed(4)} pts</span>
                              </div>
                              <div className="flex items-baseline justify-between">
                                <span className="text-text-muted text-[11px]">{c.baselineStart.likes.toLocaleString()}</span>
                                <span className="text-text-muted text-[10px]">➔</span>
                                <span className="text-white font-bold">{c.currentStats.likes.toLocaleString()}</span>
                              </div>
                              <div className="text-[10px] text-success font-black text-right mt-0.5">
                                +{c.growth.deltaLikes.toLocaleString()} gained
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
