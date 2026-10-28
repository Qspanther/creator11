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
  CheckCircle2,
  Sparkles
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

export default function LeaderboardPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = use(params);
  const { token } = useAuth();
  const [tournament, setTournament] = useState<TournamentMeta | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [userPrize, setUserPrize] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!token) return;
    const fetchLeaderboard = () => {
      apiGet(`/leaderboard/${tournamentId}`, token)
        .then(data => {
          if (data.tournament) setTournament(data.tournament);
          setEntries(data.entries || []);
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
  // Only show rankings when contest is completed AND bot manager setup is finalized!
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

  // Filter entries based on search query (by User Name OR Email ID)
  const filteredEntries = entries.filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = e.userName?.toLowerCase().includes(q);
    const emailMatch = e.userEmail?.toLowerCase().includes(q);
    return nameMatch || emailMatch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-10 h-10 border-3 border-neon-cyan border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-text-muted">Loading battle standings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-2">
      {/* Back button */}
      <div className="mb-4">
        <Link href="/tournaments" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back to Tournaments
        </Link>
      </div>

      {/* Header & Tournament Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
              {showRankings ? (
                'Official Final Standings • Click any participant to inspect their 11-player lineup & score breakdown'
              ) : (
                'Live Points Standings • Individual rankings will be calculated and unlocked once the contest completes'
              )}
            </p>
          </div>

          {tournament && (
            <div className="glass-card px-4 py-2.5 rounded-2xl border border-white/10 text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Prize Pool</p>
              <p className="text-xl font-black text-neon-gold">{tournament.prizePool.toLocaleString()} USDT</p>
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
            <div className="flex items-center gap-2">
              <Users size={14} className="text-neon-purple" />
              <span>{entries.length} Competitors Tracked</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* User's Current Standing Banner */}
      {userPoints !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`glass-card p-5 mb-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
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
                {userPrize && userPrize > 0 ? (
                  <span className="inline-block mt-0.5 text-xs font-bold text-success">
                    🏆 +{userPrize.toLocaleString()} USDT Won
                  </span>
                ) : null}
              </>
            ) : (
              <div className="max-w-xs text-xs text-text-secondary">
                <span className="font-semibold text-white">Live Points Mode:</span> Rank is intentionally hidden until contest end so every user can track scores fairly!
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 🔍 Search Bar — Search any competitor by Name or Email ID */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={17} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any player by Name or Email address to inspect team..."
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
              Showing <strong>{filteredEntries.length}</strong> matching player(s) for &ldquo;{searchQuery}&rdquo;
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
        <div className="glass-card p-12 text-center border border-white/5 rounded-3xl">
          <Trophy size={40} className="mx-auto text-text-muted mb-4 opacity-40" />
          <p className="text-text-secondary font-medium">No participants tracked yet.</p>
          <p className="text-xs text-text-muted mt-1">Participants and live scores will appear as soon as teams are entered.</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="glass-card p-10 text-center border border-white/5 rounded-3xl">
          <Search size={32} className="mx-auto text-text-muted mb-3 opacity-40" />
          <p className="text-white font-bold">No participants found</p>
          <p className="text-xs text-text-muted mt-1">
            No player found matching &ldquo;{searchQuery}&rdquo;. Try searching with another name or email address.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry, i) => {
            const isWinner = showRankings && entry.rank === 1;
            const isPodium = showRankings && entry.rank <= 3;

            return (
              <motion.div
                key={entry.teamId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.015, 0.3) }}
                onClick={() => entry.canViewTeam && setSelectedTeamId(entry.teamId)}
                className={`flex items-center justify-between gap-3 p-4 rounded-2xl transition-all cursor-pointer ${
                  entry.isCurrentUser
                    ? 'bg-neon-purple/15 border border-neon-purple/50 shadow-lg shadow-neon-purple/10'
                    : isWinner
                      ? 'bg-neon-gold/[0.08] border border-neon-gold/40 hover:bg-neon-gold/15'
                      : isPodium
                        ? 'bg-white/[0.04] border border-white/10 hover:border-white/20'
                        : 'bg-white/[0.02] border border-white/5 hover:border-white/15'
                }`}
              >
                {/* Left: Rank/Status + Avatar + Name + Email */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {showRankings ? (
                    <div className="w-8 flex justify-center shrink-0">
                      {getRankIcon(entry.rank)}
                    </div>
                  ) : (
                    <div className="w-8 flex justify-center shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-success/80 animate-pulse" title="Live Participant" />
                    </div>
                  )}

                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-purple/30 to-neon-cyan/30 flex items-center justify-center text-xs font-bold text-white shrink-0 border border-white/10">
                    {entry.userName.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white truncate">
                        {entry.userName}
                      </span>
                      {entry.isCurrentUser && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-neon-purple/30 text-neon-purple border border-neon-purple/50">
                          YOU
                        </span>
                      )}
                      {isWinner && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-neon-gold text-black">
                          👑 WINNER
                        </span>
                      )}
                    </div>

                    {showRankings && entry.prizeAmount > 0 && (
                      <p className="text-[11px] font-bold text-neon-gold mt-0.5">
                        +{entry.prizeAmount.toLocaleString()} USDT Won
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Live Points + View Scorecard action */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-base font-extrabold text-white">
                      {entry.totalPoints.toFixed(4)}
                    </p>
                    <p className="text-[9px] text-text-muted uppercase tracking-wider font-semibold">
                      {showRankings ? 'Final Points' : 'Live Points'}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTeamId(entry.teamId);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-neon-cyan hover:text-black text-neon-cyan transition-all border border-white/10 cursor-pointer"
                  >
                    <Eye size={13} />
                    <span className="hidden sm:inline">Scorecard</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Transparent Scorecard Modal */}
      <ScorecardModal
        teamId={selectedTeamId}
        onClose={() => setSelectedTeamId(null)}
      />
    </div>
  );
}
