'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet, apiPost, apiPut } from '../../lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Crown, Star, Check, X, Search,
  Coins, Users, ArrowRight, Sparkles, TrendingUp, Eye, Heart, Video,
  AlertCircle, ShieldCheck
} from 'lucide-react';
import TiltCard3D from '../../components/ui/TiltCard3D';
import { playSpatialSFX } from '../../components/ui/StageControls3D';

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

interface AppConfig {
  categories: string[];
  creatorsPerCategory: number;
  totalTeamSize: number;
  totalCredits: number;
  captainMultiplier: number;
  viceCaptainMultiplier: number;
}

export default function TeamBuilder3DPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = use(params);
  const { token } = useAuth();
  const router = useRouter();

    const [creators, setCreators] = useState<Creator[]>([]);
  const [tournament, setTournament] = useState<{ id?: string; name: string; platform: string; entry_fee: string; prize_pool: string; duration_type?: string; status?: string; lock_time?: string; start_time?: string } | null>(null);
  const [insufficientModal, setInsufficientModal] = useState<{ isOpen: boolean; required: number; balance: number; needed: number }>({ isOpen: false, required: 0, balance: 0, needed: 0 });

  const isLocked = useMemo(() => {
    if (!tournament) return false;
    if (['locked', 'live', 'completed'].includes((tournament as any).status || '')) return true;
    if ((tournament as any).lock_time && new Date((tournament as any).lock_time).getTime() <= Date.now()) return true;
    return false;
  }, [tournament]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'cost_desc' | 'cost_asc' | 'name'>('cost_desc');
  const [pitchTilt, setPitchTilt] = useState<number>(22);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingTeam, setExistingTeam] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [hasActivePass, setHasActivePass] = useState<boolean | null>(null);
  const [modalCreator, setModalCreator] = useState<Creator | null>(null);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('creator11:camera-preset', { detail: 'stadium' }));
    if (!token) return;

    Promise.all([
      apiGet(`/tournaments/${tournamentId}`, token),
      apiGet('/api/config'),
      apiGet(`/teams/tournament/${tournamentId}`, token).catch(() => null),
    ]).then(([t, c, team]) => {
      setTournament(t);
      setConfig(c);

      apiGet(`/creators?platform=youtube&sort=${sortBy}`, token)
        .then((data) => setCreators(data))
        .finally(() => setLoading(false));

      if (team && team.id) {
        setExistingTeam(team.id);
        const ids = new Set<string>(team.teamCreators.map((tc: { creator_id: string }) => tc.creator_id));
        setSelected(ids);
        if (team.captain_creator_id) setCaptainId(team.captain_creator_id);
        if (team.vice_captain_creator_id) setViceCaptainId(team.vice_captain_creator_id);
      }

      apiGet('/wallet/balance', token)
        .then((wb) => {
          if (wb && wb.balance !== undefined) {
            setWalletBalance(parseFloat(wb.balance));
          }
        })
        .catch(() => {});

      apiGet('/auth/me', token)
        .then((u) => {
          if (u) {
            setHasActivePass(Boolean(u.hasActiveSubscription));
          }
        })
        .catch(() => {});
    }).catch(() => setLoading(false));
  }, [token, tournamentId, sortBy]);

  const creatorsById = useMemo(() => {
    const map: Record<string, Creator> = {};
    creators.forEach((c) => { map[c.id] = c; });
    return map;
  }, [creators]);

  const selectedCreators = useMemo(() =>
    Array.from(selected).map((id) => creatorsById[id]).filter(Boolean),
    [selected, creatorsById]
  );

  const creditsUsed = useMemo(() =>
    selectedCreators.reduce((sum, c) => sum + parseFloat(c.credit_cost), 0),
    [selectedCreators]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedCreators.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, [selectedCreators]);

  const maxCredits = config?.totalCredits || 125;
  const totalRequired = config?.totalTeamSize || 11;

  const categoryWithThree = useMemo(() => {
    return Object.keys(categoryCounts).find((cat) => (categoryCounts[cat] || 0) >= 3) || null;
  }, [categoryCounts]);

  const getCategoryMax = (cat: string) => {
    if (categoryWithThree) {
      return categoryWithThree === cat ? 3 : 2;
    }
    return 3;
  };

  const filteredCreators = useMemo(() => {
    let list = [...creators];
    if (activeCategory !== 'All') {
      list = list.filter((c) => c.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.external_channel_id && c.external_channel_id.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'cost_desc') list.sort((a, b) => parseFloat(b.credit_cost) - parseFloat(a.credit_cost));
    else if (sortBy === 'cost_asc') list.sort((a, b) => parseFloat(a.credit_cost) - parseFloat(b.credit_cost));
    else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [creators, activeCategory, searchQuery, sortBy]);

  const toggleCreator = (creator: Creator) => {
    playSpatialSFX('click');
    const isSelected = selected.has(creator.id);

    if (isSelected) {
      const next = new Set(selected);
      next.delete(creator.id);
      setSelected(next);
      if (captainId === creator.id) setCaptainId(null);
      if (viceCaptainId === creator.id) setViceCaptainId(null);
      setError('');
    } else {
      if (selected.size >= totalRequired) {
        setError(`Maximum team size is ${totalRequired} creators.`);
        return;
      }

      const cost = parseFloat(creator.credit_cost);
      if (creditsUsed + cost > maxCredits) {
        setError(`Exceeds credit limit! Remaining: ${(maxCredits - creditsUsed).toFixed(1)} cr`);
        return;
      }

      const count = categoryCounts[creator.category] || 0;
      const catMax = getCategoryMax(creator.category);
      if (count >= catMax) {
        if (catMax === 2 && categoryWithThree) {
          setError(`Category "${creator.category}" is locked at 2. Category "${categoryWithThree}" already has 3 players.`);
        } else {
          setError(`Category "${creator.category}" is locked (maximum ${catMax} reached).`);
        }
        return;
      }

      const next = new Set(selected);
      next.add(creator.id);
      setSelected(next);
      setError('');

      if (!captainId) setCaptainId(creator.id);
      else if (!viceCaptainId && captainId !== creator.id) setViceCaptainId(creator.id);
    }
  };

  const autoDraftSmart11 = () => {
    playSpatialSFX('power');
    const cats = config?.categories || ['Gaming', 'Vlogging', 'Comedy', 'Tech', 'Lifestyle'];
    const byCat: Record<string, Creator[]> = {};
    cats.forEach((c) => {
      byCat[c] = creators
        .filter((item) => item.category === c)
        .sort((a, b) => parseFloat(a.credit_cost) - parseFloat(b.credit_cost));
    });

    const pickedIds = new Set<string>();
    const firstCat = cats[0];
    byCat[firstCat]?.slice(0, 3).forEach((c) => pickedIds.add(c.id));
    cats.slice(1).forEach((c) => {
      byCat[c]?.slice(0, 2).forEach((item) => pickedIds.add(item.id));
    });

    if (pickedIds.size === 11) {
      setSelected(pickedIds);
      const arr = Array.from(pickedIds);
      setCaptainId(arr[0]);
      setViceCaptainId(arr[1]);
      setError('🤖 Smart AI Auto-Drafted compliant 11-Creator Lineup!');
    }
  };

  const isCategoryDistributionValid = useMemo(() => {
    if (selected.size !== totalRequired) return false;
    let withThree = 0;
    const allCats = config?.categories || ['Gaming', 'Vlogging', 'Comedy', 'Tech', 'Lifestyle'];
    for (const cat of allCats) {
      const c = categoryCounts[cat] || 0;
      if (c === 3) withThree++;
      else if (c !== 2) return false;
    }
    return withThree === 1;
  }, [selected.size, totalRequired, categoryCounts, config?.categories]);

  const isTeamComplete = selected.size === totalRequired && isCategoryDistributionValid;
  const isReadyToSave = isTeamComplete && captainId && viceCaptainId && captainId !== viceCaptainId && creditsUsed <= maxCredits;

  const handleSave = async () => {
    if (!isReadyToSave) {
      if (selected.size !== 11) setError('Please select exactly 11 creators.');
      else if (!isCategoryDistributionValid) setError('Category rule: exactly 1 category with 3, and 4 categories with 2 creators.');
      else if (!captainId || !viceCaptainId) setError('Please assign both Captain (2.0x) and Vice-Captain (1.5x).');
      return;
    }

    if (!existingTeam && hasActivePass === false) {
      setError('Active Monthly Subscription or Referral Pass is required to enter tournaments. Redirecting...');
      setTimeout(() => {
        router.push(`/subscription?reason=tournament_access&tournamentId=${tournamentId}`);
      }, 1000);
      return;
    }

        if (isLocked) {
      setError('This contest is locked. New team entries or edits are closed.');
      return;
    }

    if (!existingTeam) {
      const entryFee = parseFloat(tournament?.entry_fee || '99');
      if (walletBalance !== null && walletBalance < entryFee) {
        setInsufficientModal({
          isOpen: true,
          required: entryFee,
          balance: walletBalance,
          needed: Math.max(0, entryFee - walletBalance)
        });
        return;
      }
    }

    playSpatialSFX('power');
    setSaving(true);
    setError('');

    try {
      if (existingTeam) {
        await apiPut(
          `/teams/${existingTeam}`,
          {
            creatorIds: Array.from(selected),
            captainId,
            viceCaptainId,
          },
          token
        );
      } else {
        await apiPost(
          '/teams',
          {
            tournamentId,
            creatorIds: Array.from(selected),
            captainId,
            viceCaptainId,
          },
          token
        );
      }
      router.push('/my-teams');
        } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to save team';
      if (errMsg.toLowerCase().includes('insufficient wallet balance')) {
        const fee = parseFloat(tournament?.entry_fee || '99');
        setInsufficientModal({
          isOpen: true,
          required: fee,
          balance: walletBalance ?? 0,
          needed: Math.max(0, fee - (walletBalance ?? 0))
        });
      } else {
        setError(errMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  const formationRows = [[0], [1, 2], [3, 4, 5, 6], [7, 8, 9, 10]];
  const rowLabels = ['APEX CAPTAIN STAGE', 'FRONT VIRAL WINGS', 'MID ENGAGEMENT CORE', 'BASE LINE ANCHORS'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full space-y-6">
      {/* 3D Draft Controls Bar */}
      <TiltCard3D intensity={6} className="p-5 border border-cyan-400/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-cyan-400">3D HOLOGRAPHIC DRAFT</span>
              <span className="text-xs text-slate-400">• {tournament?.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1 text-white">Assemble Your 11-Creator 3D Lineup</h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Draft <strong className="text-cyan-300">11 YouTube Stars</strong> (3+2+2+2+2) within{' '}
              <strong className="text-amber-300">{maxCredits} Credits</strong>. Assign{' '}
              <strong className="text-amber-300">Captain (2.0x)</strong> & <strong className="text-purple-300">Vice-Captain (1.5x)</strong>.
            </p>
            {error && <p className="text-xs font-bold text-amber-300 mt-1">{error}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-black/50 border border-white/10 text-center">
              <div className="text-[10px] uppercase text-slate-400">Creators</div>
              <div className="text-base font-black font-mono text-cyan-300">{selected.size} / 11</div>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-black/50 border border-white/10 text-center">
              <div className="text-[10px] uppercase text-slate-400">Credits Left</div>
              <div className={`text-base font-black font-mono ${creditsUsed > maxCredits ? 'text-rose-400' : 'text-emerald-400'}`}>
                {(maxCredits - creditsUsed).toFixed(1)} CR
              </div>
            </div>
            <button
              type="button"
              onClick={autoDraftSmart11}
              className="px-3.5 py-2 rounded-xl font-bold text-xs bg-purple-600/40 border border-purple-400/50 text-purple-100 hover:bg-purple-600/60 transition cursor-pointer"
            >
              🤖 Smart Auto-Draft 11
            </button>
            <button
              type="button"
              onClick={() => {
                playSpatialSFX('click');
                setSelected(new Set());
                setCaptainId(null);
                setViceCaptainId(null);
              }}
              className="px-3 py-2 rounded-xl font-semibold text-xs bg-white/5 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer"
            >
              Reset
            </button>
                        {isLocked ? (
              <button
                type="button"
                disabled
                className="px-5 py-2 rounded-xl font-black text-xs sm:text-sm bg-white/10 text-slate-400 border border-white/10 cursor-not-allowed flex items-center gap-1.5"
              >
                🔒 Contest Locked
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`px-5 py-2 rounded-xl font-black text-xs sm:text-sm transition cursor-pointer ${
                  isReadyToSave
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-lg hover:opacity-95'
                    : 'bg-white/10 text-slate-400 border border-white/10'
                }`}
              >
                {saving ? 'Saving...' : existingTeam ? 'Update Team' : '🔒 Lock & Save 3D Team'}
              </button>
            )}
          </div>
        </div>
            </TiltCard3D>

      {isLocked && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400" />
            <div>
              <div className="font-black text-sm text-white">Contest Locked (Entries Closed)</div>
              <div className="text-xs text-amber-200/80">This tournament is locked or live. Roster drafting and edits are closed.</div>
            </div>
          </div>
          <Link
            href={`/leaderboard/${tournamentId}`}
            className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-amber-400 text-black hover:bg-amber-300 transition text-center whitespace-nowrap"
          >
            View Live Standings →
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: 3D Holographic Stadium Pitch */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-bold text-cyan-300">
              🏟️ 3D Holographic Arena Pitch <span className="text-slate-400 font-normal">(1-2-4-4 Tactical Formation)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">3D Tilt:</span>
              <input
                type="range"
                min={0}
                max={34}
                value={pitchTilt}
                onChange={(e) => setPitchTilt(Number(e.target.value))}
                className="w-24 accent-cyan-400"
              />
            </div>
          </div>

          <div className="stadium-pitch-wrapper py-2">
            <div
              style={{ ['--pitch-angle' as any]: `${pitchTilt}deg` }}
              className="stadium-pitch-surface rounded-3xl p-5 sm:p-7 min-h-[500px] flex flex-col justify-between relative overflow-hidden"
            >
              <div className="space-y-4 relative z-10">
                {formationRows.map((rowIndices, rIdx) => (
                  <div key={rIdx} className="space-y-1.5">
                    <div className="text-center text-[10px] font-mono uppercase tracking-widest text-cyan-300/70">
                      {rowLabels[rIdx]}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                      {rowIndices.map((slotIndex) => {
                        const player = selectedCreators[slotIndex];
                        if (!player) {
                          return (
                            <div
                              key={slotIndex}
                              className="pedestal-slot flex flex-col items-center justify-center p-2 rounded-2xl border border-dashed border-cyan-400/35 bg-slate-950/60 w-24 sm:w-28 h-26 text-center"
                            >
                              <div className="w-7 h-7 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-[11px] text-slate-400 font-mono">
                                #{slotIndex + 1}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">Open Slot</div>
                            </div>
                          );
                        }

                        const isCap = captainId === player.id;
                        const isVC = viceCaptainId === player.id;
                        const initials = player.name
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase();

                        return (
                          <div
                            key={slotIndex}
                            className={`pedestal-slot pedestal-ring flex flex-col items-center justify-between p-2 rounded-2xl bg-gradient-to-b from-slate-900/95 to-purple-950/85 border ${
                              isCap ? 'border-amber-400' : isVC ? 'border-purple-400' : 'border-cyan-400/50'
                            } w-24 sm:w-28 h-26 text-center relative group`}
                          >
                            <div className="flex items-center justify-between w-full">
                              {isCap ? (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-400 text-slate-950">
                                  👑 2x
                                </span>
                              ) : isVC ? (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-purple-400 text-slate-950">
                                  ⚡ 1.5x
                                </span>
                              ) : (
                                <span className="px-1 py-0.5 rounded text-[8px] font-mono bg-white/10 text-cyan-200">
                                  {player.credit_cost}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleCreator(player)}
                                className="text-slate-400 hover:text-rose-400 text-[10px] font-bold"
                              >
                                ✕
                              </button>
                            </div>

                            <div
                              onClick={() => setModalCreator(player)}
                              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center font-black text-xs text-slate-950 cursor-pointer shadow"
                            >
                              {initials}
                            </div>

                            <div className="w-full truncate text-[10px] font-bold text-white px-0.5">
                              {player.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Captain / VC Quick Assignment Bar */}
              {selectedCreators.length > 0 && (
                <div className="relative z-10 pt-3 border-t border-white/10 grid grid-cols-2 gap-3 bg-black/60 p-3 rounded-2xl backdrop-blur-md">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-amber-300 block mb-1">
                      👑 Captain (2.0x Boost)
                    </label>
                    <select
                      value={captainId || ''}
                      onChange={(e) => {
                        setCaptainId(e.target.value);
                        if (e.target.value === viceCaptainId) setViceCaptainId(null);
                      }}
                      aria-label="Assign Captain (2.0x Boost)"
                      className="w-full bg-slate-900 border border-white/20 rounded-xl px-2 py-1 text-xs text-white"
                    >
                      <option value="">Choose Captain</option>
                      {selectedCreators.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.credit_cost} CR)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-purple-300 block mb-1">
                      ⚡ Vice-Captain (1.5x Boost)
                    </label>
                    <select
                      value={viceCaptainId || ''}
                      onChange={(e) => {
                        setViceCaptainId(e.target.value);
                        if (e.target.value === captainId) setCaptainId(null);
                      }}
                      aria-label="Assign Vice-Captain (1.5x Boost)"
                      className="w-full bg-slate-900 border border-white/20 rounded-xl px-2 py-1 text-xs text-white"
                    >
                      <option value="">Choose Vice-Captain</option>
                      {selectedCreators.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.credit_cost} CR)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Filterable Creator Selection Pool */}
        <div className="lg:col-span-5 holo-card p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white">YouTube Draft Pool ({creators.length})</h2>
            <span className="text-xs font-mono text-cyan-300">Verified Stats</span>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search creator name or category..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['All', 'Gaming', 'Vlogging', 'Comedy', 'Tech', 'Lifestyle'].map((cat) => {
                const count = categoryCounts[cat] || 0;
                const catMax = getCategoryMax(cat);
                const isLocked = count >= catMax;
                const isActive = activeCategory === cat;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      playSpatialSFX('click');
                      setActiveCategory(cat);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/25 border border-cyan-400/50 text-cyan-200'
                        : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{cat}</span>
                    {cat !== 'All' && (
                      <span className="ml-1 text-[10px] opacity-75">
                        ({count}/{catMax})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredCreators.map((creator) => {
              const isSelected = selected.has(creator.id);
              const isCap = captainId === creator.id;
              const isVC = viceCaptainId === creator.id;

              return (
                <div
                  key={creator.id}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-purple-950/40 border-cyan-400/50'
                      : 'bg-black/40 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div
                    onClick={() => setModalCreator(creator)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center font-black text-slate-950 text-xs shrink-0">
                      {creator.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{creator.name}</span>
                        {isCap && <span className="text-[9px] px-1 bg-amber-400 text-slate-950 font-bold rounded">C</span>}
                        {isVC && <span className="text-[9px] px-1 bg-purple-400 text-slate-950 font-bold rounded">VC</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {creator.category} • {Number(creator.base_views || 0).toLocaleString('en-IN')} Views
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-black text-amber-300 bg-black/50 px-2 py-1 rounded-lg border border-white/10">
                      {creator.credit_cost} CR
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCreator(creator)}
                      className={`w-8 h-8 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'bg-cyan-400 text-slate-950'
                          : 'bg-white/10 text-white hover:bg-cyan-500 hover:text-slate-950'
                      }`}
                    >
                      {isSelected ? '✓' : '+'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>


      {/* Insufficient Balance Popup Modal */}
      {insufficientModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Insufficient Wallet Balance</h3>
                <p className="text-xs text-slate-400">Add funds to join this Battle League</p>
              </div>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Contest Entry Fee:</span>
                <span className="font-mono font-bold text-white">₹{insufficientModal.required.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Wallet Balance:</span>
                <span className="font-mono font-bold text-cyan-300">₹{insufficientModal.balance.toFixed(2)}</span>
              </div>
              <div className="h-px bg-white/10 my-1" />
              <div className="flex justify-between text-sm">
                <span className="text-amber-300 font-semibold">Amount Needed:</span>
                <span className="font-mono font-black text-amber-400">₹{insufficientModal.needed.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInsufficientModal(prev => ({ ...prev, isOpen: false }))}
                className="py-3 rounded-xl font-bold text-xs bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  router.push(`/wallet?required=${Math.ceil(insufficientModal.needed)}&reason=contest_entry&tournamentId=${tournamentId}`);
                }}
                className="py-3 rounded-xl font-black text-xs bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/20 hover:opacity-95 transition"
              >
                Add ₹{Math.ceil(insufficientModal.needed)} to Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Detail 3D Modal */}
      {modalCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <TiltCard3D intensity={8} className="max-w-md w-full p-6 border border-cyan-400/50 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-black text-white">{modalCreator.name}</h3>
              <button
                type="button"
                onClick={() => setModalCreator(null)}
                className="w-7 h-7 rounded-lg bg-white/10 text-slate-300 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-black/50 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase">Category</div>
                <div className="text-sm font-bold text-white mt-0.5">{modalCreator.category}</div>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase">Credit Cost</div>
                <div className="text-sm font-bold text-amber-300 mt-0.5">{modalCreator.credit_cost} CR</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                toggleCreator(modalCreator);
                setModalCreator(null);
              }}
              className="w-full py-2.5 rounded-xl font-extrabold text-xs bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
            >
              {selected.has(modalCreator.id) ? 'Remove from Squad' : 'Draft to 3D Lineup'}
            </button>
          </TiltCard3D>
        </div>
      )}
    </div>
  );
}
