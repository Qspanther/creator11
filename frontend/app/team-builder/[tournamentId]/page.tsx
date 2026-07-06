'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet, apiPost } from '../../lib/api';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Crown, Star, Check, X, ChevronDown,
  Search, SortAsc, Coins, Users, ArrowRight
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
  const [tournament, setTournament] = useState<{ name: string; platform: string; entry_fee: string } | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'cost_desc' | 'cost_asc' | 'name'>('cost_desc');
  const [showCaptainPicker, setShowCaptainPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingTeam, setExistingTeam] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    Promise.all([
      apiGet(`/tournaments/${tournamentId}`, token),
      apiGet('/api/config'),
      apiGet(`/teams/tournament/${tournamentId}`, token).catch(() => null),
    ]).then(([t, c, team]) => {
      setTournament(t);
      setConfig(c);

      // Fetch creators for this tournament's platform
      apiGet(`/creators?platform=${t.platform}&sort=${sortBy}`, token)
        .then(data => setCreators(data))
        .finally(() => setLoading(false));

      // If user already has a team, load it
      if (team && team.id) {
        setExistingTeam(team.id);
        const ids = new Set<string>(team.teamCreators.map((tc: { creator_id: string }) => tc.creator_id));
        setSelected(ids);
        if (team.captain_creator_id) setCaptainId(team.captain_creator_id);
        if (team.vice_captain_creator_id) setViceCaptainId(team.vice_captain_creator_id);
      }
    }).catch(() => setLoading(false));
  }, [token, tournamentId, sortBy]);

  // Computed values
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
    if (config) config.categories.forEach(cat => { counts[cat] = 0; });
    selectedCreators.forEach(c => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, [selectedCreators, config]);

  const maxPerCategory = config?.creatorsPerCategory || 2;
  const maxCredits = config?.totalCredits || 100;
  const totalRequired = config?.totalTeamSize || 10;

  const isTeamComplete = selected.size === totalRequired && creditsUsed <= maxCredits;
  const isReadyToSave = isTeamComplete && captainId && viceCaptainId && captainId !== viceCaptainId;

  // Filter & sort creators
  const filteredCreators = useMemo(() => {
    let list = creators;
    if (activeCategory !== 'All') {
      list = list.filter(c => c.category === activeCategory);
    }
    if (searchQuery) {
      list = list.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list;
  }, [creators, activeCategory, searchQuery]);

  const toggleCreator = (creator: Creator) => {
    const next = new Set(selected);
    if (next.has(creator.id)) {
      next.delete(creator.id);
      if (captainId === creator.id) setCaptainId(null);
      if (viceCaptainId === creator.id) setViceCaptainId(null);
    } else {
      // Check constraints
      if (next.size >= totalRequired) return;
      if ((categoryCounts[creator.category] || 0) >= maxPerCategory) return;
      if (creditsUsed + parseFloat(creator.credit_cost) > maxCredits) return;
      next.add(creator.id);
    }
    setSelected(next);
  };

  const canSelect = (creator: Creator) => {
    if (selected.has(creator.id)) return true; // Can always deselect
    if (selected.size >= totalRequired) return false;
    if ((categoryCounts[creator.category] || 0) >= maxPerCategory) return false;
    if (creditsUsed + parseFloat(creator.credit_cost) > maxCredits) return false;
    return true;
  };

  const handleSave = async () => {
    if (!isReadyToSave) return;
    setSaving(true);
    setError('');
    try {
      if (existingTeam) {
        await apiGet(`/teams/${existingTeam}`, token); // Check it exists
        // Use PUT to update
        // ASSUMPTION: We use a direct fetch because apiPut might not be imported
        const res = await fetch(`http://localhost:5000/teams/${existingTeam}`, {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold mb-1">
          <Shield size={24} className="inline text-neon-purple mr-2" />
          Team Builder
        </h1>
        <p className="text-sm text-text-secondary">{tournament?.name}</p>
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass p-4 mb-6 flex items-center gap-6 flex-wrap"
      >
        {/* Credits */}
        <div className="flex items-center gap-2">
          <Coins size={16} className="text-neon-gold" />
          <span className="label-upper">Credits</span>
          <span className={`text-lg font-bold ${creditsUsed > maxCredits ? 'text-danger' : 'text-text-primary'}`}>
            {creditsUsed.toFixed(1)}/{maxCredits}
          </span>
        </div>
        <div className="w-px h-8 bg-white/10" />
        {/* Players selected */}
        <div className="flex items-center gap-2">
          <Users size={16} className="text-neon-cyan" />
          <span className="label-upper">Selected</span>
          <span className="text-lg font-bold">{selected.size}/{totalRequired}</span>
        </div>
        <div className="w-px h-8 bg-white/10" />
        {/* Category counts */}
        {config?.categories.map(cat => {
          const count = categoryCounts[cat] || 0;
          const full = count >= maxPerCategory;
          return (
            <div key={cat} className="flex items-center gap-1">
              <span className={`text-xs font-medium ${full ? 'text-success' : 'text-text-muted'}`}>
                {cat}: {count}/{maxPerCategory}
              </span>
              {full && <Check size={12} className="text-success" />}
            </div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creator List (Left 2/3) */}
        <div className="lg:col-span-2">
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search creators..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full !pl-9 !py-2 !text-sm"
              />
            </div>
            <div className="flex gap-1.5">
              {['All', ...(config?.categories || [])].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeCategory === cat
                      ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'cost_desc' | 'cost_asc' | 'name')}
              className="!py-2 !text-xs !w-auto"
            >
              <option value="cost_desc">Cost: High → Low</option>
              <option value="cost_asc">Cost: Low → High</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>

          {/* Creator Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {filteredCreators.map((creator) => {
                const isSelected = selected.has(creator.id);
                const canPick = canSelect(creator);
                const isCaptain = captainId === creator.id;
                const isVc = viceCaptainId === creator.id;

                return (
                  <motion.div
                    key={creator.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={canPick ? { y: -2 } : {}}
                    onClick={() => canPick && toggleCreator(creator)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-neon-purple/10 border border-neon-purple/30 glow-purple'
                        : canPick
                          ? 'glass hover:bg-white/[0.04]'
                          : 'glass opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                        isSelected
                          ? 'bg-neon-purple/30 text-neon-purple'
                          : 'bg-white/[0.05] text-text-secondary'
                      }`}>
                        {isSelected ? <Check size={18} /> : creator.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">{creator.name}</p>
                          {isCaptain && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-gold/20 text-neon-gold font-bold">C</span>
                          )}
                          {isVc && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan font-bold">VC</span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted">{creator.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-neon-gold">{parseFloat(creator.credit_cost).toFixed(1)}</p>
                        <p className="text-[10px] text-text-muted">CREDITS</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Selected Team Panel (Right 1/3) */}
        <div className="lg:col-span-1">
          <div className="glass p-5 sticky top-24">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Shield size={18} className="text-neon-purple" /> Your Team
            </h3>

            {selectedCreators.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">Select 10 creators to build your team</p>
            ) : (
              <div className="space-y-2 mb-4">
                {selectedCreators.map(c => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03]"
                  >
                    <div className="w-7 h-7 rounded-lg bg-neon-purple/10 flex items-center justify-center text-xs font-bold text-neon-purple">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{c.name}</p>
                      <p className="text-[10px] text-text-muted">{c.category} • {parseFloat(c.credit_cost).toFixed(1)} cr</p>
                    </div>
                    {captainId === c.id && (
                      <Crown size={14} className="text-neon-gold" />
                    )}
                    {viceCaptainId === c.id && (
                      <Star size={14} className="text-neon-cyan" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCreator(c); }}
                      className="p-1 hover:bg-danger/10 rounded-lg"
                    >
                      <X size={12} className="text-text-muted" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Captain/VC Picker */}
            {isTeamComplete && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-xl bg-neon-purple/5 border border-neon-purple/20"
              >
                <p className="text-xs font-bold text-neon-purple mb-3 uppercase tracking-wider">Assign Captain & Vice-Captain</p>
                
                <div className="space-y-2 mb-3">
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Captain (2x points)</label>
                    <select
                      value={captainId || ''}
                      onChange={e => {
                        setCaptainId(e.target.value);
                        if (e.target.value === viceCaptainId) setViceCaptainId(null);
                      }}
                      className="!w-full !py-2 !text-xs"
                    >
                      <option value="">Select Captain</option>
                      {selectedCreators.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Vice-Captain (1.5x points)</label>
                    <select
                      value={viceCaptainId || ''}
                      onChange={e => setViceCaptainId(e.target.value)}
                      className="!w-full !py-2 !text-xs"
                    >
                      <option value="">Select Vice-Captain</option>
                      {selectedCreators.filter(c => c.id !== captainId).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-3 p-3 rounded-xl bg-danger/10 border border-danger/20 text-xs text-danger">
                {error}
              </div>
            )}

            {/* Save Button */}
            <motion.button
              whileHover={isReadyToSave ? { scale: 1.02 } : {}}
              whileTap={isReadyToSave ? { scale: 0.98 } : {}}
              onClick={handleSave}
              disabled={!isReadyToSave || saving}
              className="w-full mt-4 py-3 text-sm font-bold bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : existingTeam ? 'Update Team' : 'Save Team'}
              {!saving && <ArrowRight size={16} />}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
