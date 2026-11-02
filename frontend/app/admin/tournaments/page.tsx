'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet, apiPut, apiPost, apiDelete } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Edit2, Check, X, Clock, Plus, LayoutDashboard, Trash2, Loader2, Bot, Users, Zap, Sparkles, Calendar, Timer } from 'lucide-react';
import DateTimePicker12h from '../../components/ui/DateTimePicker12h';

interface Tournament {
  id: string;
  name: string;
  status: string;
  start_time: string;
  lock_time: string;
  end_time: string;
  entry_fee: string | number;
  prize_pool: string | number;
  platform: string;
  duration_type: string;
  current_participants?: number;
  max_participants?: number;
}

export default function AdminTournamentsPage() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Tournament>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deployingBotId, setDeployingBotId] = useState<string | null>(null);
    const defaultStart = new Date(Date.now() + 2 * 3600000);
  const defaultLock = new Date(Date.now() + 1.5 * 3600000);

  const [addForm, setAddForm] = useState<{
    name: string;
    platform: string;
    entry_fee: number;
    prize_pool: number;
    start_time: string;
    lock_time: string;
    duration_hours: number;
    status: string;
  }>({
    name: '',
    platform: 'youtube',
    entry_fee: 99,
    prize_pool: 50000,
    start_time: defaultStart.toISOString(),
    lock_time: defaultLock.toISOString(),
    duration_hours: 6,
    status: 'upcoming'
  });

  const format12h = (dateStr?: string | Date) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return String(dateStr);
    }
  };

  const getCalculatedEndTime = () => {
    try {
      const s = addForm.start_time ? new Date(addForm.start_time) : new Date();
      const hrs = Number(addForm.duration_hours) || 6;
      return new Date(s.getTime() + hrs * 3600000);
    } catch {
      return new Date();
    }
  };

  const [showContestModal, setShowContestModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [contestForm, setContestForm] = useState({
    name: 'Mega Contest',
    type: 'mega',
    entry_fee: 49,
    prize_pool: 100000,
    max_participants: 10000
  });

  useEffect(() => {
    if (token) {
      fetchTournaments();
      const pollInterval = setInterval(() => {
        apiGet('/admin/tournaments', token).then(data => {
          if (Array.isArray(data)) setTournaments(data);
        }).catch(() => {});
      }, 4000);
      return () => clearInterval(pollInterval);
    }
  }, [token]);

  const fetchTournaments = () => {
    apiGet('/admin/tournaments', token)
      .then(data => setTournaments(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const toLocalInput = (iso?: string | Date) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleEdit = (t: Tournament) => {
    setEditingId(t.id);
    setEditForm({
      ...t,
      start_time: toLocalInput(t.start_time),
      lock_time: toLocalInput(t.lock_time),
      end_time: toLocalInput(t.end_time)
    } as any);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async (id: string) => {
    try {
      const payload: any = { ...editForm };
      if (payload.start_time) payload.start_time = new Date(payload.start_time).toISOString();
      if (payload.lock_time) payload.lock_time = new Date(payload.lock_time).toISOString();
      if (payload.end_time) payload.end_time = new Date(payload.end_time).toISOString();
      await apiPut(`/admin/tournaments/${id}`, payload, token);
      setEditingId(null);
      fetchTournaments();
    } catch (err) {
      console.error('Failed to update tournament', err);
    }
  };

    const handleAddLeague = async () => {
    if (isSubmitting) return;
    if (!addForm.name || !addForm.name.trim()) {
      alert('Please enter a league name');
      return;
    }
    setIsSubmitting(true);
    try {
      const durationHours = Number(addForm.duration_hours) || 6;
      const startDate = addForm.start_time ? new Date(addForm.start_time) : new Date(Date.now() + 2 * 3600000);
      const lockDate = addForm.lock_time ? new Date(addForm.lock_time) : new Date(startDate.getTime() - 30 * 60000);
      const calculatedEndDate = new Date(startDate.getTime() + durationHours * 3600000);

      const payload = {
        name: addForm.name.trim(),
        platform: addForm.platform,
        duration_type: `${durationHours}h`,
        duration_hours: durationHours,
        entry_fee: Number(addForm.entry_fee) || 99,
        prize_pool: Number(addForm.prize_pool) || 50000,
        start_time: startDate.toISOString(),
        lock_time: lockDate.toISOString(),
        end_time: calculatedEndDate.toISOString(),
        status: 'upcoming'
      };

      await apiPost('/admin/tournaments', payload, token);
      setShowAddModal(false);
      setAddForm({
        name: '',
        platform: 'youtube',
        entry_fee: 99,
        prize_pool: 50000,
        start_time: new Date(Date.now() + 2 * 3600000).toISOString(),
        lock_time: new Date(Date.now() + 1.5 * 3600000).toISOString(),
        duration_hours: 6,
        status: 'upcoming'
      });
      fetchTournaments();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to create tournament');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTournament = async (t: Tournament) => {
    if (!confirm(`Are you sure you want to delete league "${t.name}"?\nThis will permanently delete the league and all associated teams, contests, and scores.`)) {
      return;
    }
    setDeletingId(t.id);
    try {
      await apiDelete(`/admin/tournaments/${t.id}`, token);
      setTournaments(prev => prev.filter(item => item.id !== t.id));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete tournament');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeployBots = async (t: Tournament) => {
    setDeployingBotId(t.id);
    try {
      const res = await apiPost(`/admin/tournaments/${t.id}/deploy-bots`, {}, token);
      alert(res.message || '1100 Bots registered successfully!');
      fetchTournaments();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to deploy bots');
    } finally {
      setDeployingBotId(null);
    }
  };

  const handleCreateContest = async () => {
    if (!selectedTournament) return;
    try {
      await apiPost(`/admin/tournaments/${selectedTournament.id}/contests`, [contestForm], token);
      setShowContestModal(false);
      alert('Contest added successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to add contest');
    }
  };

  if (loading) return <div>Loading tournaments...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Trophy size={28} className="text-neon-purple" />
            <h1 className="text-3xl font-bold">Manage Tournaments</h1>
          </div>
          <p className="text-text-secondary">Control schedules, timings, and status for {tournaments.length} leagues</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-neon-purple text-white px-4 py-2 rounded-lg font-bold shadow-[0_0_15px_rgba(176,38,255,0.4)] hover:shadow-[0_0_25px_rgba(176,38,255,0.6)] transition-all"
        >
          <Plus size={18} /> Add League
        </button>
      </motion.div>

      {/* Add League Modal with 12h Clock & Auto-calculated End Time */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-[#0e1322] border border-neon-cyan/40 rounded-3xl p-5 sm:p-6 w-full max-w-xl shadow-[0_0_50px_rgba(0,240,255,0.15)] my-auto max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neon-cyan/15 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan">
                  <Trophy size={18} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Create Battle League</h2>
                  <p className="text-[11px] text-text-muted">12-Hour AM/PM schedule with automatic end time calculation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-text-muted hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* League Name & Platform */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">League Name</label>
                <input 
                  type="text" 
                  disabled={isSubmitting}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-neon-cyan transition-colors disabled:opacity-50" 
                  value={addForm.name} 
                  onChange={e => setAddForm({...addForm, name: e.target.value})} 
                  placeholder="e.g. YouTube 6-Hour Mega Blitz" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Platform</label>
                  <select 
                    disabled={isSubmitting}
                    className="w-full bg-[#121624] border border-white/10 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-neon-cyan disabled:opacity-50" 
                    value={addForm.platform} 
                    onChange={e => setAddForm({...addForm, platform: e.target.value})}
                  >
                    <option value="youtube">YouTube (Active League)</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Entry Fee (₹ INR)</label>
                  <input 
                    type="number" 
                    disabled={isSubmitting}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white font-mono outline-none focus:border-neon-cyan disabled:opacity-50" 
                    value={addForm.entry_fee} 
                    onChange={e => setAddForm({...addForm, entry_fee: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Prize Pool (₹ INR)</label>
                <input 
                  type="number" 
                  disabled={isSubmitting}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white font-mono outline-none focus:border-neon-cyan disabled:opacity-50" 
                  value={addForm.prize_pool} 
                  onChange={e => setAddForm({...addForm, prize_pool: Number(e.target.value)})} 
                />
              </div>

              {/* 12-Hour Start Time (FIRST) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <DateTimePicker12h
                  label="1. League Start Time (Match / Contest Begins & Live Scoring Starts)"
                  sublabel="12-Hour AM/PM format (Select exact start time, e.g. 11:30 AM)"
                  value={addForm.start_time}
                  disabled={isSubmitting}
                  onChange={(iso) => {
                    setAddForm(prev => {
                      // If lock_time is not yet set, default it to 30 mins before new start
                      const newStart = new Date(iso);
                      const currentLock = prev.lock_time ? new Date(prev.lock_time) : null;
                      if (!currentLock || currentLock.getTime() > newStart.getTime()) {
                        const newLock = new Date(newStart.getTime() - 30 * 60000);
                        return { ...prev, start_time: iso, lock_time: newLock.toISOString() };
                      }
                      return { ...prev, start_time: iso };
                    });
                  }}
                />
              </div>

              {/* 12-Hour Lock Time (SECOND) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <DateTimePicker12h
                  label="2. League Lock Time (Team Editing & New Entries Close)"
                  sublabel="12-Hour AM/PM format (e.g. 11:00 AM)"
                  value={addForm.lock_time}
                  disabled={isSubmitting}
                  onChange={(iso) => setAddForm(prev => ({ ...prev, lock_time: iso }))}
                />
                <div className="flex items-center gap-2 pt-1 text-[11px] text-text-muted">
                  <span>Quick Lock Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const start = new Date(addForm.start_time);
                      const lock = new Date(start.getTime() - 15 * 60000);
                      setAddForm(prev => ({ ...prev, lock_time: lock.toISOString() }));
                    }}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 font-medium"
                  >
                    15m Before Start
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const start = new Date(addForm.start_time);
                      const lock = new Date(start.getTime() - 30 * 60000);
                      setAddForm(prev => ({ ...prev, lock_time: lock.toISOString() }));
                    }}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 font-medium"
                  >
                    30m Before Start
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddForm(prev => ({ ...prev, lock_time: prev.start_time }));
                    }}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-amber-300 font-medium"
                  >
                    Same as Start
                  </button>
                </div>
              </div>

              {/* Duration in Hours (kitne ghante chalegi ye league) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                    <Timer size={14} className="text-amber-400" />
                    <span>3. League Duration (Kitne Ghante Chalegi Ye League?)</span>
                  </label>
                  <span className="text-xs font-black text-amber-300 font-mono">
                    {addForm.duration_hours} Hours
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="168"
                    disabled={isSubmitting}
                    value={addForm.duration_hours}
                    onChange={(e) => setAddForm(prev => ({ ...prev, duration_hours: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                    className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-amber-400 disabled:opacity-50"
                  />
                  <span className="text-xs text-text-muted">hours</span>

                  {/* Preset Duration Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                    {[6, 12, 24, 48, 72].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => setAddForm(prev => ({ ...prev, duration_hours: hrs }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          addForm.duration_hours === hrs
                            ? 'bg-amber-400 text-black shadow-md'
                            : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {hrs}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Auto-Calculated End Time Display (End time ka manual input khatam) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-transparent border border-emerald-400/40 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <Sparkles size={14} className="text-emerald-400" />
                  <span>Calculated League End Time (Auto-Calculated)</span>
                </div>
                <div className="text-base font-extrabold text-white">
                  {format12h(getCalculatedEndTime())}
                </div>
                <p className="text-[10px] text-text-muted">
                  ✓ End time is computed automatically as <strong>Start Time + {addForm.duration_hours} Hours</strong>. You do not need to enter end time manually.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                type="button"
                disabled={isSubmitting} 
                onClick={() => setShowAddModal(false)} 
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors disabled:opacity-50 text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={isSubmitting} 
                onClick={handleAddLeague} 
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-bold shadow-[0_0_20px_rgba(176,38,255,0.4)] hover:shadow-[0_0_30px_rgba(176,38,255,0.6)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Creating League...
                  </>
                ) : (
                  'Create League Now'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Contest Modal */}
      {showContestModal && selectedTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-dark-bg border border-white/10 rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add Contest to {selectedTournament.name}</h2>
              <button onClick={() => setShowContestModal(false)} className="text-text-muted hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1">Contest Name</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-neon-purple" value={contestForm.name} onChange={e => setContestForm({...contestForm, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Type</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" value={contestForm.type} onChange={e => setContestForm({...contestForm, type: e.target.value})}>
                    <option value="mega">Mega</option>
                    <option value="h2h">Head-to-Head</option>
                    <option value="mini">Mini</option>
                    <option value="winner_takes_all">Winner Takes All</option>
                    <option value="practice">Practice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Entry Fee (₹ INR)</label>
                  <input type="number" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-neon-purple" value={contestForm.entry_fee} onChange={e => setContestForm({...contestForm, entry_fee: Number(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Prize Pool (₹ INR)</label>
                  <input type="number" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-neon-purple" value={contestForm.prize_pool} onChange={e => setContestForm({...contestForm, prize_pool: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Max Users</label>
                  <input type="number" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-neon-purple" value={contestForm.max_participants} onChange={e => setContestForm({...contestForm, max_participants: Number(e.target.value)})} />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowContestModal(false)} className="flex-1 py-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors">Cancel</button>
              <button onClick={handleCreateContest} className="flex-1 py-2 rounded-lg bg-neon-cyan text-black font-bold hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all">Add Contest</button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-4 font-semibold text-text-secondary">Name</th>
              <th className="p-4 font-semibold text-text-secondary">Status</th>
              <th className="p-4 font-semibold text-text-secondary">Teams / Bots</th>
              <th className="p-4 font-semibold text-text-secondary">Start Time</th>
              <th className="p-4 font-semibold text-text-secondary">Fee / Prize</th>
              <th className="p-4 font-semibold text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 font-medium">
                  <div>{t.name}</div>
                  <div className="text-[11px] text-text-muted uppercase">{t.platform} • {t.duration_type || '24h'}</div>
                </td>
                <td className="p-4">
                  {editingId === t.id ? (
                    <select
                      value={editForm.status}
                      onChange={e => setEditForm({...editForm, status: e.target.value as any})}
                      className="bg-dark-bg border border-white/20 rounded px-2 py-1 outline-none"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live</option>
                      <option value="completed">Completed</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs ${t.status === 'live' ? 'bg-neon-green/20 text-neon-green' : t.status === 'completed' ? 'bg-white/10' : 'bg-neon-gold/20 text-neon-gold'}`}>
                      {t.status.toUpperCase()}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-neon-cyan text-sm">
                      {t.current_participants ?? 0}
                    </span>
                    <span className="text-xs text-text-muted">/ 1100</span>
                    {(t.current_participants ?? 0) < 1100 && (
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" title="Bots actively joining in real time" />
                    )}
                  </div>
                </td>
                <td className="p-4">
                  {editingId === t.id ? (
                    <input 
                      type="datetime-local" 
                      value={(editForm as any).start_time || ''} 
                      onChange={e => setEditForm({...editForm, start_time: e.target.value} as any)}
                      className="bg-dark-bg border border-white/20 rounded px-2 py-1 text-sm outline-none"
                    />
                  ) : (
                    <span className="text-sm flex items-center gap-2"><Clock size={14} className="text-text-muted"/> {format12h(t.start_time)}</span>
                  )}
                </td>
                <td className="p-4">
                  {editingId === t.id ? (
                    <div className="flex flex-col gap-2">
                      <input 
                        type="number" 
                        placeholder="Fee"
                        value={(editForm as any).entry_fee || ''} 
                        onChange={e => setEditForm({...editForm, entry_fee: e.target.value} as any)}
                        className="bg-dark-bg border border-white/20 rounded px-2 py-1 text-sm outline-none w-24"
                      />
                      <input 
                        type="number" 
                        placeholder="Prize"
                        value={(editForm as any).prize_pool || ''} 
                        onChange={e => setEditForm({...editForm, prize_pool: e.target.value} as any)}
                        className="bg-dark-bg border border-white/20 rounded px-2 py-1 text-sm outline-none w-24"
                      />
                    </div>
                  ) : (
                    <div className="text-sm">
                      <p className="text-text-primary">Fee: <span className="font-bold text-neon-cyan">₹{t.entry_fee}</span></p>
                      <p className="text-text-muted">Prize: <span className="font-bold text-neon-gold">₹{t.prize_pool}</span></p>
                    </div>
                  )}
                </td>
                <td className="p-4">
                  {editingId === t.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(t.id)} className="p-2 bg-neon-green/20 text-neon-green rounded hover:bg-neon-green/30" title="Save">
                        <Check size={16} />
                      </button>
                      <button onClick={handleCancel} className="p-2 bg-red-500/20 text-red-500 rounded hover:bg-red-500/30" title="Cancel">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        disabled={deployingBotId === t.id}
                        onClick={() => handleDeployBots(t)} 
                        className="p-2 bg-purple-500/20 text-purple-300 rounded hover:bg-purple-500/30 transition-colors disabled:opacity-50 flex items-center gap-1 text-xs font-bold" 
                        title="Instantly deploy remaining bots up to 1100"
                      >
                        {deployingBotId === t.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <Zap size={14} className="text-amber-400" />
                            <span>Fill Bots</span>
                          </>
                        )}
                      </button>
                      <button onClick={() => handleEdit(t)} className="p-2 bg-white/5 text-text-secondary rounded hover:bg-white/10 hover:text-white transition-colors" title="Edit League">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => { setSelectedTournament(t); setShowContestModal(true); }} className="p-2 bg-neon-cyan/10 text-neon-cyan rounded hover:bg-neon-cyan/20 transition-colors" title="Add Contest">
                        <Trophy size={16} />
                      </button>
                      <button 
                        disabled={deletingId === t.id}
                        onClick={() => handleDeleteTournament(t)} 
                        className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50" 
                        title="Delete League"
                      >
                        {deletingId === t.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
