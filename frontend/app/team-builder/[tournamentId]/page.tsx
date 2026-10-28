'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet, apiPost } from '../../lib/api';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Crown, Star, Check, X, Search,
  Coins, Users, ArrowRight, Info, ExternalLink,
  Flame, Sparkles, TrendingUp, Eye, Heart, Tv, Camera, Lock as LockIcon
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

interface AppConfig {
  categories: string[];
  creatorsPerCategory: number;
  totalTeamSize: number;
  totalCredits: number;
  captainMultiplier: number;
  viceCaptainMultiplier: number;
}

export default function TeamBuilderPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = use(params);
  const { token } = useAuth();
  const router = useRouter();

  const [creators, setCreators] = useState<Creator[]>([]);
  const [tournament, setTournament] = useState<{ name: string; platform: string; entry_fee: string; prize_pool: string; duration_type?: string } | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'cost_desc' | 'cost_asc' | 'name'>('cost_desc');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingTeam, setExistingTeam] = useState<string | null>(null);

  // Profile modal state
  const [modalCreator, setModalCreator] = useState<Creator | null>(null);

  useEffect(() => {
    if (!token) return;

    Promise.all([
      apiGet(`/tournaments/${tournamentId}`, token),
      apiGet('/api/config'),
      apiGet(`/teams/tournament/${tournamentId}`, token).catch(() => null),
    ]).then(([t, c, team]) => {
      setTournament(t);
      setConfig(c);

      apiGet(`/creators?platform=${t.platform}&sort=${sortBy}`, token)
        .then(data => setCreators(data))
        .finally(() => setLoading(false));

      if (team && team.id) {
        setExistingTeam(team.id);
        const ids = new Set<string>(team.teamCreators.map((tc: { creator_id: string }) => tc.creator_id));
        setSelected(ids);
        if (team.captain_creator_id) setCaptainId(team.captain_creator_id);
        if (team.vice_captain_creator_id) setViceCaptainId(team.vice_captain_creator_id);
      }
    }).catch(() => setLoading(false));
  }, [token, tournamentId, sortBy]);

  const creatorsById = useMemo(() => {
    const map: Record<string, Creator> = {};
    creators.forEach(c => { map[c.id] = c; });
    return map;
  }, [creators]);

  const selectedCreators = useMemo(() =>
    Array.from(selected).map(id => creatorsById[id]).filter(Boolean),
    [selected, creatorsById]
  );

  const creditsUsed = useMemo(() =>
    selectedCreators.reduce((sum, c) => sum + parseFloat(c.credit_cost), 0),
    [selectedCreators]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedCreators.forEach(c => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, [selectedCreators]);

  const maxCredits = config?.totalCredits || 125;
  const totalRequired = config?.totalTeamSize || 11;

  // Category with 3 players check (only ONE category can have 3)
  const categoryWithThree = useMemo(() => {
    return Object.keys(categoryCounts).find(cat => (categoryCounts[cat] || 0) >= 3) || null;
  }, [categoryCounts]);

  // Dynamic max allowed for each category:
  // - If a category already has 3: that category max = 3, other categories max = 2
  // - If no category has 3 yet: any category can reach up to 3
  const getCategoryMax = (cat: string) => {
    if (categoryWithThree) {
      return categoryWithThree === cat ? 3 : 2;
    }
    return 3;
  };

  const filteredCreators = useMemo(() => {
    let list = [...creators];

    if (activeCategory !== 'All') {
      list = list.filter(c => c.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
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
    if (!isReadyToSave) return;
    setSaving(true);
    setError('');

    try {
      if (existingTeam) {
        const res = await fetch(`/api-backend/teams/${existingTeam}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            creatorIds: Array.from(selected),
            captainId,
            viceCaptainId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Update failed');
      } else {
        await apiPost('/teams', {
          tournamentId,
          creatorIds: Array.from(selected),
          captainId,
          viceCaptainId,
        }, token);
      }
      router.push('/my-teams');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save team');
    } finally {
      setSaving(false);
    }
  };

  const categories = ['All', ...(config?.categories || ['Gaming', 'Vlogging', 'Comedy', 'Tech', 'Lifestyle'])];

  // Helper fallback portrait generator
  const getPortraitUrl = (creator: Creator) => {
    if (creator.profile_image_url && creator.profile_image_url.startsWith('http')) {
      return creator.profile_image_url;
    }
    return `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="widescreen-container py-4">
      {/* Top Banner / Match Info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 mb-8 border border-white/10"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30">
                Battle Lineup Formation
              </span>
              <span className="text-xs text-text-muted capitalize">
                {tournament?.platform} • {tournament?.duration_type || '24h'} Battle
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Shield size={28} className="text-neon-cyan" />
              {tournament?.name}
            </h1>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-6 bg-black/40 px-5 py-3 rounded-2xl border border-white/5">
            <div>
              <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase">Entry Fee</p>
              <p className="text-base font-extrabold text-neon-cyan">{tournament?.entry_fee} USDT</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase">Prize Pool</p>
              <p className="text-base font-extrabold text-neon-gold">{tournament?.prize_pool} USDT</p>
            </div>
          </div>
        </div>

        {/* Global Progress Bar Bar */}
        <div className="mt-6 pt-5 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="label-upper">Credits Left</span>
              <Coins size={14} className="text-neon-gold" />
            </div>
            <p className={`text-lg font-black ${creditsUsed > maxCredits ? 'text-danger' : 'text-neon-gold'}`}>
              {(maxCredits - creditsUsed).toFixed(1)} <span className="text-xs text-text-muted font-normal">/ {maxCredits}</span>
            </p>
          </div>

          <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="label-upper">Selected Lineup</span>
              <Users size={14} className="text-neon-cyan" />
            </div>
            <p className="text-lg font-black text-text-primary">
              {selected.size} <span className="text-xs text-text-muted font-normal">/ {totalRequired}</span>
            </p>
          </div>

          <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="label-upper">Captain (2.0x)</span>
              <Crown size={14} className="text-neon-gold" />
            </div>
            <p className="text-xs font-bold text-text-primary truncate">
              {captainId ? creatorsById[captainId]?.name : <span className="text-text-muted font-normal">Not chosen</span>}
            </p>
          </div>

          <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="label-upper">Vice-Capt (1.5x)</span>
              <Star size={14} className="text-neon-cyan" />
            </div>
            <p className="text-xs font-bold text-text-primary truncate">
              {viceCaptainId ? creatorsById[viceCaptainId]?.name : <span className="text-text-muted font-normal">Not chosen</span>}
            </p>
          </div>
        </div>
      </motion.div>

      {/* 2-COLUMN SPLIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Filters & Creators Roster (60%) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          
          {/* Controls: Categories, Search, Sort */}
          <div className="glass-card p-5 space-y-4">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => {
                if (cat === 'All') {
                  const isActive = activeCategory === 'All';
                  return (
                    <button
                      key="All"
                      onClick={() => setActiveCategory('All')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-neon-cyan text-black shadow-lg shadow-neon-cyan/25 font-black scale-105'
                          : 'bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      <span>All</span>
                    </button>
                  );
                }
                const count = categoryCounts[cat] || 0;
                const catMax = getCategoryMax(cat);
                const isLocked = count >= catMax;
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-neon-cyan text-black shadow-lg shadow-neon-cyan/25 font-black scale-105'
                        : isLocked
                          ? 'bg-white/[0.06] text-white/90 border border-white/10'
                          : 'bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive 
                        ? 'bg-black/30 text-black' 
                        : isLocked 
                          ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40' 
                          : 'bg-white/10 text-text-muted'
                    }`}>
                      {count}/{catMax} {isLocked ? '??' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search and Sort */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search creators by name, channel, or niche..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full !pl-10 !py-2.5 !text-sm"
                />
              </div>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="!py-2.5 !px-3 !text-xs !w-full sm:!w-44 shrink-0"
              >
                <option value="cost_desc">Credits: High to Low</option>
                <option value="cost_asc">Credits: Low to High</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* Lineup Rule Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-neon-cyan/[0.08] to-blue-500/[0.04] border border-neon-cyan/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-base">?</span>
              <p className="text-text-secondary leading-snug">
                <strong className="text-white">11-Player Lineup Rule:</strong> Pick <strong className="text-neon-cyan">3 creators from only 1 category</strong>, and <strong className="text-neon-cyan">2 creators from each of the other 4 categories</strong> (3 + 2 + 2 + 2 + 2 = 11).
              </p>
            </div>
            {categoryWithThree ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-neon-cyan text-black shrink-0 shadow-sm shadow-neon-cyan/30">
                ? 3rd Player: {categoryWithThree}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/10 text-white/80 shrink-0">
                3-Player Slot Open
              </span>
            )}
          </div>

          {/* Roster Cards List */}
          <div className="space-y-3">
            {filteredCreators.length === 0 ? (
              <div className="glass-card p-12 text-center text-text-muted">
                <Users size={36} className="mx-auto mb-3 opacity-40" />
                <p>No creators match your active filter.</p>
              </div>
            ) : (
              filteredCreators.map(creator => {
                const isSelected = selected.has(creator.id);
                const isCaptain = captainId === creator.id;
                const isVc = viceCaptainId === creator.id;
                const count = categoryCounts[creator.category] || 0;
                const catMax = getCategoryMax(creator.category);
                const isCategoryLocked = count >= catMax;
                const canPick = isSelected || (
                  selected.size < totalRequired &&
                  creditsUsed + parseFloat(creator.credit_cost) <= maxCredits &&
                  !isCategoryLocked
                );
                const portrait = getPortraitUrl(creator);

                return (
                  <motion.div
                    key={creator.id}
                    layout
                    whileHover={{ scale: 1.01 }}
                    className={`p-4 rounded-2xl transition-all duration-200 border ${
                      isSelected
                        ? 'bg-neon-cyan/[0.07] border-neon-cyan/40 shadow-lg shadow-neon-cyan/10'
                        : canPick
                          ? 'glass-card border-white/5 hover:border-white/15'
                          : 'glass-card border-white/5 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Portrait Thumbnail with Info Trigger */}
                      <div className="relative group/avatar shrink-0">
                        <div
                          onClick={() => setModalCreator(creator)}
                          className="w-14 h-14 rounded-2xl overflow-hidden cursor-pointer border border-white/10 group-hover/avatar:border-neon-cyan transition-all relative"
                          title="Click to view full player profile card"
                        >
                          <img
                            src={portrait}
                            alt={creator.name}
                            className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                            <Info size={18} className="text-white" />
                          </div>
                        </div>

                        {/* Platform indicator badge */}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black/80 flex items-center justify-center border border-white/10">
                          {creator.platform === 'youtube' ? (
                            <Tv size={10} className="text-red-500" />
                          ) : (
                            <Camera size={10} className="text-pink-500" />
                          )}
                        </div>
                      </div>

                      {/* Creator Details */}
                      <div className="flex-1 min-w-0" onClick={() => canPick && toggleCreator(creator)}>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base font-bold text-text-primary truncate cursor-pointer hover:text-neon-cyan transition-colors">
                            {creator.name}
                          </h4>
                          {isCaptain && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-neon-gold text-black">
                              2x CAPTAIN
                            </span>
                          )}
                          {isVc && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-neon-cyan text-black">
                              1.5x VC
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-text-secondary font-medium">
                            {creator.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye size={12} className="text-neon-cyan" />
                            {((creator.base_views || 1200000) / 1000000).toFixed(1)}M Views
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp size={12} className="text-success" />
                            {(Math.floor(Math.random() * 30) + 70)}% Picked
                          </span>
                        </div>
                      </div>

                      {/* Right side: Credit Cost & Action Button */}
                      <div className="text-right flex items-center gap-3 shrink-0">
                        <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
                          <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Credits</p>
                          <p className="text-base font-extrabold text-neon-gold">
                            {parseFloat(creator.credit_cost).toFixed(1)}
                          </p>
                        </div>

                        <button
                          onClick={() => canPick && toggleCreator(creator)}
                          disabled={!canPick && !isSelected}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-neon-cyan text-black shadow-md shadow-neon-cyan/25'
                              : canPick
                                ? 'bg-white/[0.06] text-white hover:bg-neon-cyan hover:text-black'
                                : 'bg-white/[0.02] text-text-muted cursor-not-allowed opacity-50'
                          }`}
                        >
                          {isSelected ? <Check size={18} /> : isCategoryLocked ? <LockIcon size={14} className="text-text-muted" /> : '+'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Holographic Studio Stage (40% Sticky) */}
        <div className="lg:col-span-5 xl:col-span-5 sticky top-20 space-y-4">
          <div className="studio-stage p-6">
            
            {/* Stage Grid Overlay */}
            <div className="absolute inset-0 studio-grid-lines pointer-events-none opacity-40" />

            {/* Stage Header */}
            <div className="relative z-10 flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 border border-neon-cyan flex items-center justify-center">
                  <Sparkles size={16} className="text-neon-cyan" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Live Studio Stage</h3>
                  <p className="text-[10px] text-neon-cyan/80">Holographic 11-Creator Lineup</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-white bg-black/50 px-3 py-1 rounded-full border border-neon-cyan/30">
                  {selected.size} / {totalRequired} Slotted
                </span>
              </div>
            </div>

            {/* Tactical Lineup Formation Grid (11 Slots) */}
            <div className="relative z-10 grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-6">
              {Array.from({ length: totalRequired }).map((_, index) => {
                const player = selectedCreators[index];
                const isCapt = player && captainId === player.id;
                const isViceCapt = player && viceCaptainId === player.id;

                if (!player) {
                  return (
                    <div
                      key={index}
                      className="h-28 rounded-2xl border-2 border-dashed border-white/15 bg-black/30 flex flex-col items-center justify-center text-center p-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-text-muted mb-1">
                        {index + 1}
                      </div>
                      <span className="text-[9px] text-text-muted uppercase tracking-wider font-bold">Open Slot</span>
                    </div>
                  );
                }

                return (
                  <motion.div
                    key={player.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`h-28 rounded-2xl p-2 relative flex flex-col items-center justify-between hologram-pedestal border ${
                      isCapt
                        ? 'border-neon-gold bg-neon-gold/[0.1]'
                        : isViceCapt
                          ? 'border-neon-cyan bg-neon-cyan/[0.1]'
                          : 'border-white/20 bg-white/[0.04]'
                    }`}
                  >
                    {/* Role Badges */}
                    <div className="absolute top-1.5 left-1.5 flex gap-1 z-10">
                      {isCapt && (
                        <span className="w-5 h-5 rounded-md bg-neon-gold text-black flex items-center justify-center text-[10px] font-black shadow-md">
                          C
                        </span>
                      )}
                      {isViceCapt && (
                        <span className="w-5 h-5 rounded-md bg-neon-cyan text-black flex items-center justify-center text-[10px] font-black shadow-md">
                          VC
                        </span>
                      )}
                    </div>

                    {/* Quick remove button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCreator(player); }}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-black/60 hover:bg-danger text-text-muted hover:text-white flex items-center justify-center text-xs z-10 transition-colors"
                    >
                      <X size={10} />
                    </button>

                    {/* Portrait Photo */}
                    <div
                      onClick={() => setModalCreator(player)}
                      className="w-12 h-12 rounded-xl overflow-hidden mt-1 cursor-pointer border border-white/20"
                    >
                      <img
                        src={getPortraitUrl(player)}
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="w-full text-center">
                      <p className="text-[11px] font-bold text-white truncate px-1">{player.name}</p>
                      <p className="text-[9px] text-text-muted">{player.category} • {parseFloat(player.credit_cost).toFixed(1)}cr</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Captain & Vice-Captain Selectors */}
            {selectedCreators.length > 0 && (
              <div className="relative z-10 p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3 mb-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neon-cyan flex items-center gap-1.5">
                  <Crown size={14} className="text-neon-gold" />
                  Assign Captain (2x) & Vice-Captain (1.5x)
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-text-muted uppercase font-bold block mb-1">👑 Captain (2x)</label>
                    <select
                      value={captainId || ''}
                      onChange={e => {
                        setCaptainId(e.target.value);
                        if (e.target.value === viceCaptainId) setViceCaptainId(null);
                      }}
                      className="!w-full !py-2 !text-xs !bg-black/60"
                    >
                      <option value="">Select Captain</option>
                      {selectedCreators.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-text-muted uppercase font-bold block mb-1">⭐ Vice-Captain (1.5x)</label>
                    <select
                      value={viceCaptainId || ''}
                      onChange={e => setViceCaptainId(e.target.value)}
                      className="!w-full !py-2 !text-xs !bg-black/60"
                    >
                      <option value="">Select Vice-Capt</option>
                      {selectedCreators.filter(c => c.id !== captainId).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="relative z-10 p-3 rounded-xl bg-danger/15 border border-danger/30 text-xs text-danger mb-4">
                {error}
              </div>
            )}

            {/* Save Team CTA */}
            <motion.button
              whileHover={isReadyToSave ? { scale: 1.02 } : {}}
              whileTap={isReadyToSave ? { scale: 0.98 } : {}}
              onClick={handleSave}
              disabled={!isReadyToSave || saving}
              className={`relative z-10 w-full py-4 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 ${
                isReadyToSave
                  ? 'bg-gradient-to-r from-neon-cyan via-blue-500 to-neon-purple text-black font-black shadow-xl shadow-neon-cyan/25'
                  : 'bg-white/5 text-text-muted cursor-not-allowed border border-white/10'
              }`}
            >
              {saving ? 'Registering Battle Team...' : (
                <>
                  <span>{existingTeam ? 'Update Battle Lineup' : 'Lock & Enter Battle Team'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* CREATOR PROFILE CARD MODAL */}
      <AnimatePresence>
        {modalCreator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-lg glass-strong overflow-hidden border border-white/15 relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setModalCreator(null)}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>

              {/* Channel Banner */}
              <div className="h-32 bg-gradient-to-r from-purple-900 via-indigo-900 to-cyan-900 relative">
                <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" />
                <div className="absolute bottom-3 left-6 text-xs text-white/80 font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <Flame size={14} className="text-neon-gold" />
                  Official Creator Profile
                </div>
              </div>

              {/* Profile Header Details */}
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
                    {modalCreator.platform} Creator • {modalCreator.category} Category
                  </p>
                </div>

                {/* Performance & Channel Statistics */}
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

                {/* Fantasy Performance Breakdown */}
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

                {/* Direct Action */}
                <button
                  onClick={() => {
                    toggleCreator(modalCreator);
                    setModalCreator(null);
                  }}
                  className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    selected.has(modalCreator.id)
                      ? 'bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30'
                      : 'bg-neon-cyan text-black hover:bg-neon-cyan/90 shadow-lg shadow-neon-cyan/20'
                  }`}
                >
                  {selected.has(modalCreator.id) ? (
                    <>
                      <X size={16} />
                      <span>Remove from Current Lineup</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Add to Battle Lineup</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
