'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet, apiPut, apiPost } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Edit2, Check, X, Clock, Plus, LayoutDashboard } from 'lucide-react';

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
}

export default function AdminTournamentsPage() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Tournament>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<Partial<Tournament>>({
    name: '',
    platform: 'youtube',
    duration_type: '24h',
    entry_fee: 10,
    prize_pool: 1000,
    start_time: '',
    lock_time: '',
    end_time: '',
    status: 'upcoming'
  });

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
    }
  }, [token]);

  const fetchTournaments = () => {
    apiGet('/admin/tournaments', token)
      .then(data => setTournaments(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleEdit = (t: Tournament) => {
    setEditingId(t.id);
    setEditForm({
      ...t,
      start_time: new Date(t.start_time).toISOString().slice(0, 16), // datetime-local format
      lock_time: new Date(t.lock_time).toISOString().slice(0, 16),
      end_time: new Date(t.end_time).toISOString().slice(0, 16)
    } as any);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async (id: string) => {
    try {
      await apiPut(`/admin/tournaments/${id}`, editForm, token);
      setEditingId(null);
      fetchTournaments();
    } catch (err) {
      console.error('Failed to update tournament', err);
    }
  };

  const handleAddLeague = async () => {
    try {
      await apiPost('/admin/tournaments', addForm, token);
      setShowAddModal(false);
      fetchTournaments();
    } catch (err) {
      console.error(err);
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

      {/* Add League Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-dark-bg border border-neon-purple/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-white">Create New League</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1">League Name</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-neon-purple" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} placeholder="e.g. Creator Cup" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Platform</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-neon-purple" value={addForm.platform} onChange={e => setAddForm({...addForm, platform: e.target.value})}>
                    <option value="youtube">YouTube (Active League)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Duration</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-neon-purple" value={addForm.duration_type} onChange={e => setAddForm({...addForm, duration_type: e.target.value})}>
                    <option value="6h">Flash Blitz (6-Hour)</option>
                    <option value="24h">Daily Battle (24-Hour)</option>
                    <option value="48h">Weekend Clash (48-Hour)</option>
                    <option value="72h">Weekly Showdown (72-Hour)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Entry Fee (₹ INR)</label>
                  <input type="number" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-neon-purple" value={addForm.entry_fee} onChange={e => setAddForm({...addForm, entry_fee: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Prize Pool (₹ INR)</label>
                  <input type="number" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-neon-purple" value={addForm.prize_pool} onChange={e => setAddForm({...addForm, prize_pool: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Start Time</label>
                <input type="datetime-local" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-neon-purple" value={addForm.start_time} onChange={e => setAddForm({...addForm, start_time: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Lock Time</label>
                  <input type="datetime-local" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-neon-purple" value={addForm.lock_time} onChange={e => setAddForm({...addForm, lock_time: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">End Time</label>
                  <input type="datetime-local" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-neon-purple" value={addForm.end_time} onChange={e => setAddForm({...addForm, end_time: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors">Cancel</button>
              <button onClick={handleAddLeague} className="flex-1 py-2 rounded-lg bg-neon-purple text-white font-medium shadow-[0_0_15px_rgba(176,38,255,0.4)] hover:shadow-[0_0_25px_rgba(176,38,255,0.6)] transition-all">Create League</button>
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
              <th className="p-4 font-semibold text-text-secondary">Start Time</th>
              <th className="p-4 font-semibold text-text-secondary">Fee / Prize</th>
              <th className="p-4 font-semibold text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 font-medium">{t.name}</td>
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
                  {editingId === t.id ? (
                    <input 
                      type="datetime-local" 
                      value={(editForm as any).start_time || ''} 
                      onChange={e => setEditForm({...editForm, start_time: e.target.value} as any)}
                      className="bg-dark-bg border border-white/20 rounded px-2 py-1 text-sm outline-none"
                    />
                  ) : (
                    <span className="text-sm flex items-center gap-2"><Clock size={14} className="text-text-muted"/> {new Date(t.start_time).toLocaleString()}</span>
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
                      <p className="text-text-primary">Fee: <span className="font-bold text-neon-cyan">{t.entry_fee}</span></p>
                      <p className="text-text-muted">Prize: <span className="font-bold text-neon-gold">{t.prize_pool}</span></p>
                    </div>
                  )}
                </td>
                <td className="p-4">
                  {editingId === t.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(t.id)} className="p-2 bg-neon-green/20 text-neon-green rounded hover:bg-neon-green/30">
                        <Check size={16} />
                      </button>
                      <button onClick={handleCancel} className="p-2 bg-red-500/20 text-red-500 rounded hover:bg-red-500/30">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(t)} className="p-2 bg-white/5 text-text-secondary rounded hover:bg-white/10 hover:text-white transition-colors" title="Edit League">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => { setSelectedTournament(t); setShowContestModal(true); }} className="p-2 bg-neon-cyan/10 text-neon-cyan rounded hover:bg-neon-cyan/20 transition-colors" title="Add Contest">
                        <Trophy size={16} />
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

