'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Medal,
  TrendingUp,
  Users,
  Clock,
  Shield,
  Eye,
  ArrowLeft,
  Search,
  X,
  Radio,
  Sparkles,
  Video,
  ThumbsUp,
  ExternalLink,
  Flame,
  Coins,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import ScorecardModal from '../../components/ScorecardModal';

interface LeaderboardEntry {
  rank: number;
  teamId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  totalPoints: number;
  prizeAmount: number;
  refundAmount?: number;
  isRefund: boolean;
  platformFee: number;
  isCurrentUser: boolean;
  canViewTeam: boolean;
}

interface TournamentMeta {
  id: string;
  name: string;
  platform: string;
  status: string;
  startTime: string;
  endTime: string;
  lockTime: string;
  prizePool: number;
  entryFee: number;
  currentParticipants: number;
  rankingsFinalized?: boolean;
}

interface CreatorPerformance {
  creatorId: string;
  name: string;
  channelHandle?: string;
  category: string;
  profileImageUrl?: string;
  creditCost: number;
  video: {
    title: string;
    url: string;
    isPreContest?: boolean;
  };
  baseline: {
    views: number;
    likes: number;
    subscribers: number;
  };
  current: {
    views: number;
    likes: number;
    subscribers: number;
  };
  gains: {
    views: number;
    likes: number;
    subscribers: number;
  };
  points: {
    viewsPoints: number;
    likesPoints: number;
    subsPoints: number;
    totalPoints: number;
    captainPoints: number;
    viceCaptainPoints: number;
  };
}

function formatIndianNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return Number(num).toLocaleString('en-IN');
}

export default function LeaderboardPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = use(params);
  const { token } = useAuth();
  const [tournament, setTournament] = useState<TournamentMeta | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [creatorsPerformance, setCreatorsPerformance] = useState<CreatorPerformance[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [userPrize, setUserPrize] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Creators panel states
  const [creatorSearch, setCreatorSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'points' | 'views' | 'likes' | 'subs'>('points');
  const [activeTab, setActiveTab] = useState<'standings' | 'creators'>('standings');

  useEffect(() => {
    if (!token) return;
    const fetchLeaderboard = () => {
      apiGet(`/leaderboard/${tournamentId}`, token)
        .then(data => {
          if (data.tournament) setTournament(data.tournament);
          setEntries(data.entries || []);
          if (Array.isArray(data.creatorsPerformance)) {
            setCreatorsPerformance(data.creatorsPerformance);
          }
          setUserRank(data.userRank);
          setUserPoints(data.userPoints);
          setUserPrize(data.userPrize);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [token, tournamentId]);

  // Determine if official rankings should be displayed
  const showRankings = tournament?.status === 'completed' && tournament?.rankingsFinalized !== false;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={20} className="text-neon-gold drop-shadow-md" />;
    if (rank === 2) return <Medal size={20} className="text-gray-300 drop-shadow-sm" />;
    if (rank === 3) return <Medal size={20} className="text-amber-600 drop-shadow-sm" />;
    return <span className="text-xs font-black text-text-muted w-6 text-center">#{rank}</span>;
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

  // Filter entries based on search query
  const filteredEntries = entries.filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = e.userName?.toLowerCase().includes(q);
    const emailMatch = e.userEmail?.toLowerCase().includes(q);
    return nameMatch || emailMatch;
  });

  // Filter and sort creators
  const categories = ['all', 'Gaming', 'Comedy', 'Vlogging', 'Tech', 'Lifestyle'];
  const filteredCreators = creatorsPerformance
    .filter(c => {
      if (categoryFilter !== 'all' && c.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (!creatorSearch.trim()) return true;
      const q = creatorSearch.toLowerCase().trim();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.channelHandle && c.channelHandle.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'views') return (b.gains?.views || 0) - (a.gains?.views || 0);
      if (sortBy === 'likes') return (b.gains?.likes || 0) - (a.gains?.likes || 0);
      if (sortBy === 'subs') return (b.gains?.subscribers || 0) - (a.gains?.subscribers || 0);
      return (b.points?.totalPoints || 0) - (a.points?.totalPoints || 0);
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-10 h-10 border-3 border-neon-cyan border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-text-muted">Loading league dashboard & creator metrics...</p>
      </div>
    );
  }

  const defaultRefund = Math.max(0, (tournament?.entryFee || 99) - 2);

  return (
    <div className="max-w-7xl mx-auto py-2 px-3 sm:px-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/tournaments" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back to Tournaments
        </Link>

        {/* Mobile Tab Switcher */}
        <div className="flex lg:hidden bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('standings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'standings' ? 'bg-neon-cyan text-black shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            🏆 Standings ({entries.length})
          </button>
          <button
            onClick={() => setActiveTab('creators')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'creators' ? 'bg-neon-purple text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            ⭐ Creators Live ({creatorsPerformance.length})
          </button>
        </div>
      </div>

      {/* Header & Tournament Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                tournament?.status === 'live'
                  ? 'bg-success/15 text-success border border-success/30'
                  : tournament?.status === 'completed'
                    ? 'bg-neon-gold/15 text-neon-gold border border-neon-gold/30'
                    : 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30'
              }`}>
                {tournament?.status === 'live' && <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
                {tournament?.status?.toUpperCase()} BATTLE
              </span>
              <span className="text-xs text-text-muted font-medium">
                {tournament?.platform?.toUpperCase()} LEAGUE
              </span>
              {!showRankings && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">
                  ⚡ Live Points Mode (Rankings reveal at contest end)
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              {showRankings ? (
                <Trophy size={28} className="text-neon-gold" />
              ) : (
                <Radio size={28} className="text-success animate-pulse" />
              )}
              {tournament?.name || 'Tournament Leaderboard'}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              Live league dashboard • Monitor creator delta metrics, participant standings, and verified score multipliers.
            </p>
          </div>

          {tournament && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="glass-card px-4 py-2.5 rounded-2xl border border-white/10 text-right">
                <p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Entry Fee</p>
                <p className="text-lg font-black text-neon-cyan">₹{tournament.entryFee}</p>
              </div>
              <div className="glass-card px-4 py-2.5 rounded-2xl border border-white/10 text-right">
                <p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Prize Pool</p>
                <p className="text-xl font-black text-neon-gold">₹{tournament.prizePool.toLocaleString('en-IN')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Time Window Details */}
        {tournament && (
          <div className="mt-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-neon-cyan" />
              <span className="font-semibold text-white">Contest Window:</span>
              <span>{formatDate(tournament.startTime)}</span>
              <span>➔</span>
              <span>{formatDate(tournament.endTime)}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-neon-purple" />
                <span>{tournament?.currentParticipants || entries.length} Competitors</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-neon-cyan" />
                <span>{creatorsPerformance.length} Verified Creators Tracked</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Main 2-Column Split: Standings on Left, Creators on Right */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* ─── LEFT COLUMN: User Standing + Standings Table ─── */}
        <div className={`lg:col-span-7 space-y-6 ${activeTab === 'creators' ? 'hidden lg:block' : 'block'}`}>
          {/* User's Current Standing Banner */}
          {userPoints !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`glass-card p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                showRankings
                  ? 'border-neon-purple/40 bg-gradient-to-r from-neon-purple/15 to-transparent'
                  : 'border-success/40 bg-gradient-to-r from-success/10 to-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  showRankings ? 'bg-neon-purple/20 text-neon-purple' : 'bg-success/20 text-success'
                }`}>
                  {showRankings ? <TrendingUp size={22} /> : <Radio size={22} className="animate-pulse" />}
                </div>
                <div>
                  <p className="text-xs text-text-muted font-medium">
                    {showRankings ? 'Your Official Battle Rank' : 'Your Live Battle Score'}
                  </p>
                  <div className="flex items-baseline gap-2">
                    {showRankings && userRank ? (
                      <h3 className="text-2xl font-black text-white">#{userRank}</h3>
                    ) : (
                      <h3 className="text-2xl font-black text-white">{userPoints.toFixed(4)} pts</h3>
                    )}
                    {!showRankings && (
                      <span className="text-[10px] font-bold text-success flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" /> Live
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                {showRankings ? (
                  <>
                    <p className="text-xs text-text-muted font-medium">Total Team Score</p>
                    <p className="text-xl font-black text-neon-gold">{userPoints.toFixed(4)} pts</p>
                    {userPrize && userPrize >= 100 ? (
                      <span className="inline-block mt-0.5 text-xs font-bold text-neon-gold">
                        🏆 +₹{userPrize.toLocaleString('en-IN')} Prize Won
                      </span>
                    ) : (
                      <span className="inline-block mt-0.5 text-xs font-bold text-emerald-400">
                        🛡️ ₹{defaultRefund} Refunded • ₹2 fee deducted
                      </span>
                    )}
                  </>
                ) : (
                  <div className="max-w-xs text-xs text-text-secondary">
                    <span className="font-semibold text-white">Live Points Mode:</span> Rank is intentionally hidden until contest end so every user can track scores fairly!
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Search Bar */}
          <div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={17} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search competitor by Name or Email address..."
                className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-text-muted text-sm focus:outline-none focus:border-neon-cyan focus:bg-white/[0.06] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {searchQuery && (
              <div className="flex items-center justify-between text-xs text-text-secondary mt-2 px-1">
                <span>
                  Showing <strong>{filteredEntries.length}</strong> matching player(s)
                </span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-neon-cyan hover:underline font-medium cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>

          {/* Leaderboard Entries List */}
          {entries.length === 0 ? (
            <div className="glass-card p-10 text-center border border-white/5 rounded-3xl">
              <Trophy size={40} className="mx-auto text-text-muted mb-3 opacity-40" />
              <p className="text-text-secondary font-medium">No participants tracked in this league yet.</p>
              <p className="text-xs text-text-muted mt-1">Enter a team via Team Builder to compete and claim your ranking!</p>
              <Link
                href={`/team-builder/${tournamentId}`}
                className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-cyan text-white text-xs font-bold shadow-lg hover:opacity-95 transition"
              >
                ⚡ Enter Team Now
              </Link>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="glass-card p-8 text-center border border-white/5 rounded-3xl">
              <Search size={30} className="mx-auto text-text-muted mb-2 opacity-40" />
              <p className="text-white font-bold">No participants found</p>
              <p className="text-xs text-text-muted mt-1">
                No player found matching &ldquo;{searchQuery}&rdquo;. Try another name.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-text-muted px-3 pb-1">
                <span>Competitor & Status</span>
                <span>Points / Inspect</span>
              </div>
              {filteredEntries.map((entry, i) => {
                const isWinner = showRankings && entry.rank === 1;
                const isPodium = showRankings && entry.rank <= 3;
                const refundAmt = entry.refundAmount || defaultRefund;

                return (
                  <motion.div
                    key={entry.teamId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.015, 0.3) }}
                    onClick={() => entry.canViewTeam && setSelectedTeamId(entry.teamId)}
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl transition-all cursor-pointer ${
                      entry.isCurrentUser
                        ? 'bg-neon-purple/15 border border-neon-purple/50 shadow-lg shadow-neon-purple/10'
                        : isWinner
                          ? 'bg-neon-gold/[0.08] border border-neon-gold/40 hover:bg-neon-gold/15'
                          : isPodium
                            ? 'bg-white/[0.04] border border-white/10 hover:border-white/20'
                            : 'bg-white/[0.02] border border-white/5 hover:border-white/15'
                    }`}
                  >
                    {/* Left: Rank/Status + Avatar + Name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {showRankings ? (
                        <div className="w-7 flex justify-center shrink-0">
                          {getRankIcon(entry.rank)}
                        </div>
                      ) : (
                        <div className="w-7 flex justify-center shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-success/80 animate-pulse" title="Live Participant" />
                        </div>
                      )}

                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-purple/30 to-neon-cyan/30 flex items-center justify-center text-xs font-bold text-white shrink-0 border border-white/10">
                        {entry.userName.charAt(0)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-white truncate">
                            {entry.userName}
                          </span>
                          {entry.isCurrentUser && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-neon-purple/30 text-neon-purple border border-neon-purple/50">
                              YOU
                            </span>
                          )}
                          {isWinner && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-neon-gold text-black">
                              👑 WINNER
                            </span>
                          )}
                        </div>

                        {showRankings && (
                          entry.prizeAmount >= 100 ? (
                            <p className="text-[11px] font-bold text-neon-gold mt-0.5">
                              🏆 +₹{entry.prizeAmount.toLocaleString('en-IN')} Prize Won
                            </p>
                          ) : (
                            <p className="text-[11px] font-semibold text-emerald-400 mt-0.5">
                              🛡️ ₹{refundAmt} Refunded • <span className="text-text-muted">₹2 fee</span>
                            </p>
                          )
                        )}
                      </div>
                    </div>

                    {/* Right: Live Points + View Scorecard action */}
                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <p className="text-base font-extrabold text-white">
                          {entry.totalPoints.toFixed(4)}
                        </p>
                        <p className="text-[9px] text-text-muted uppercase tracking-wider font-semibold">
                          {showRankings ? 'Final Pts' : tournament?.status === 'upcoming' ? 'Drafted' : 'Live Pts'}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTeamId(entry.teamId);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-neon-cyan hover:text-black text-neon-cyan transition-all border border-white/10 cursor-pointer"
                      >
                        <Eye size={12} />
                        <span className="hidden sm:inline">Scorecard</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── RIGHT COLUMN: All Creators Live Performance in this League ─── */}
        <div className={`lg:col-span-5 space-y-4 ${activeTab === 'standings' ? 'hidden lg:block' : 'block'}`}>
          <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Flame size={18} className="text-amber-400" />
                  <h2 className="text-lg font-black text-white">League Creators Performance</h2>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Metric surges & points generated strictly during this league window
                </p>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 shrink-0">
                {creatorsPerformance.length} Stars
              </span>
            </div>

            {/* Controls: Search, Category Filter, and Sorting */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                <input
                  type="text"
                  value={creatorSearch}
                  onChange={(e) => setCreatorSearch(e.target.value)}
                  placeholder="Filter creator in this league..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-text-muted text-xs focus:outline-none focus:border-neon-purple transition-all"
                />
                {creatorSearch && (
                  <button
                    onClick={() => setCreatorSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider shrink-0 transition-all ${
                      categoryFilter === cat
                        ? 'bg-neon-purple text-white shadow-[0_0_10px_rgba(176,38,255,0.4)]'
                        : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Sort by Metric */}
              <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                <span className="text-[11px]">Sort By:</span>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    onClick={() => setSortBy('points')}
                    className={`px-2 py-0.5 rounded-md font-bold transition ${
                      sortBy === 'points' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' : 'hover:text-white'
                    }`}
                  >
                    Pts
                  </button>
                  <button
                    onClick={() => setSortBy('views')}
                    className={`px-2 py-0.5 rounded-md font-bold transition ${
                      sortBy === 'views' ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40' : 'hover:text-white'
                    }`}
                  >
                    Views
                  </button>
                  <button
                    onClick={() => setSortBy('likes')}
                    className={`px-2 py-0.5 rounded-md font-bold transition ${
                      sortBy === 'likes' ? 'bg-rose-400/20 text-rose-300 border border-rose-400/40' : 'hover:text-white'
                    }`}
                  >
                    Likes
                  </button>
                  <button
                    onClick={() => setSortBy('subs')}
                    className={`px-2 py-0.5 rounded-md font-bold transition ${
                      sortBy === 'subs' ? 'bg-purple-400/20 text-purple-300 border border-purple-400/40' : 'hover:text-white'
                    }`}
                  >
                    Subs
                  </button>
                </div>
              </div>
            </div>

            {/* Creators Scrollable List */}
            <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
              {filteredCreators.length === 0 ? (
                <div className="p-8 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
                  <p className="text-xs text-text-muted">No creator matches this filter.</p>
                </div>
              ) : (
                filteredCreators.map((c) => {
                  const viewsGain = c.gains?.views || 0;
                  const likesGain = c.gains?.likes || 0;
                  const subsGain = c.gains?.subscribers || 0;
                  const totalPts = c.points?.totalPoints || 0;
                  const captainPts = c.points?.captainPoints || (totalPts * 2.0);
                  const vcPts = c.points?.viceCaptainPoints || (totalPts * 1.5);

                  return (
                    <motion.div
                      key={c.creatorId}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-all space-y-3"
                    >
                      {/* Top Creator Info & Points */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {c.profileImageUrl ? (
                            <img
                              src={c.profileImageUrl}
                              alt={c.name}
                              className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                              {c.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white truncate">{c.name}</h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                              <span className="text-purple-300 font-semibold">{c.category}</span>
                              <span>•</span>
                              <span>{c.creditCost} CR</span>
                            </div>
                          </div>
                        </div>

                        {/* Glowing Points Contributed Badge */}
                        <div className="text-right shrink-0">
                          <div className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40 text-amber-300 text-xs font-black shadow-sm">
                            +{totalPts.toFixed(4)} Pts
                          </div>
                          <p className="text-[9px] text-text-muted mt-0.5">
                            C: +{captainPts.toFixed(2)} • VC: +{vcPts.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* 3 Metric Deltas: Views, Likes, Subscribers */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                        <div>
                          <p className="text-[10px] text-text-muted flex items-center justify-center gap-1">
                            <Eye size={11} className="text-cyan-400" /> Views
                          </p>
                          <p className="text-xs font-extrabold text-cyan-300 font-mono mt-0.5">
                            +{formatIndianNumber(viewsGain)}
                          </p>
                          <p className="text-[9px] text-text-muted">
                            +{(c.points?.viewsPoints || 0).toFixed(2)} pts
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-text-muted flex items-center justify-center gap-1">
                            <ThumbsUp size={11} className="text-rose-400" /> Likes
                          </p>
                          <p className="text-xs font-extrabold text-rose-300 font-mono mt-0.5">
                            +{formatIndianNumber(likesGain)}
                          </p>
                          <p className="text-[9px] text-text-muted">
                            +{(c.points?.likesPoints || 0).toFixed(2)} pts
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-text-muted flex items-center justify-center gap-1">
                            <Users size={11} className="text-purple-400" /> Subs
                          </p>
                          <p className="text-xs font-extrabold text-purple-300 font-mono mt-0.5">
                            +{formatIndianNumber(subsGain)}
                          </p>
                          <p className="text-[9px] text-text-muted">
                            +{(c.points?.subsPoints || 0).toFixed(2)} pts
                          </p>
                        </div>
                      </div>

                      {/* Video Title & Watch Link if available */}
                      {c.video?.title && (
                        <div className="flex items-center justify-between text-[11px] text-text-muted px-1 gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <Video size={12} className="text-neon-cyan shrink-0" />
                            <span className="truncate">{c.video.title}</span>
                          </div>
                          {c.video.url && (
                            <a
                              href={c.video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-neon-cyan hover:underline flex items-center gap-0.5 shrink-0"
                            >
                              <span>Watch</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Transparent Scorecard Modal */}
      <ScorecardModal
        teamId={selectedTeamId}
        onClose={() => setSelectedTeamId(null)}
      />
    </div>
  );
}
