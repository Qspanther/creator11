'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, Phone, Calendar, Search, X, Wallet, Trophy, Activity, CheckCircle, Clock } from 'lucide-react';

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Profile Modal State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (token) {
      apiGet('/admin/users', token)
        .then(data => setUsers(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleUserClick = async (userId: string) => {
    setSelectedUserId(userId);
    setProfileLoading(true);
    try {
      const data = await apiGet(`/admin/users/${userId}`, token);
      setProfileData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfile = () => {
    setSelectedUserId(null);
    setProfileData(null);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div>Loading users...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield size={28} className="text-neon-cyan" />
            <h1 className="text-3xl font-bold">Manage Users</h1>
          </div>
          <p className="text-text-secondary">View all {users.length} registered accounts</p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-dark-bg border border-white/10 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-neon-cyan transition-colors"
          />
        </div>
      </motion.div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-4 font-semibold text-text-secondary">Name</th>
              <th className="p-4 font-semibold text-text-secondary">Email</th>
              <th className="p-4 font-semibold text-text-secondary">Role</th>
              <th className="p-4 font-semibold text-text-secondary">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr 
                key={u.id} 
                onClick={() => handleUserClick(u.id)}
                className="border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <td className="p-4 font-medium">{u.name}</td>
                <td className="p-4 text-text-secondary flex items-center gap-2">
                  <Mail size={14} />
                  {u.email}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-neon-cyan/20 text-neon-cyan font-bold' : 'bg-white/10'}`}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-text-secondary">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-text-muted">No users found matching "{searchQuery}"</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* User Profile Modal */}
      <AnimatePresence>
        {selectedUserId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-dark-bg border border-neon-cyan/30 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-start bg-white/5">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {profileData?.user?.name || 'Loading...'}
                    {profileData?.user?.role === 'admin' && <span className="text-xs bg-neon-cyan text-black px-2 py-0.5 rounded uppercase font-bold">Admin</span>}
                  </h2>
                  <p className="text-text-muted flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1"><Mail size={14}/> {profileData?.user?.email}</span>
                    <span className="flex items-center gap-1"><Calendar size={14}/> Joined {profileData ? new Date(profileData.user.createdAt).toLocaleDateString() : ''}</span>
                  </p>
                </div>
                <button onClick={closeProfile} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                {profileLoading ? (
                  <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : profileData ? (
                  <div className="space-y-8">
                    
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="glass p-5 rounded-xl border border-neon-gold/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={64}/></div>
                        <p className="text-text-muted text-sm mb-1">Wallet Balance</p>
                        <p className="text-3xl font-bold text-neon-gold">{parseFloat(profileData.wallet?.balance || '0').toFixed(2)} USDT</p>
                      </div>
                      <div className="glass p-5 rounded-xl border border-neon-purple/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={64}/></div>
                        <p className="text-text-muted text-sm mb-1">Teams Created</p>
                        <p className="text-3xl font-bold text-neon-purple">{profileData.teams?.length || 0}</p>
                      </div>
                      <div className="glass p-5 rounded-xl border border-neon-cyan/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Shield size={64}/></div>
                        <p className="text-text-muted text-sm mb-1">KYC Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          {profileData.user.kyc_status === 'verified' ? (
                            <><CheckCircle size={24} className="text-neon-cyan" /><span className="text-xl font-bold text-neon-cyan">Verified</span></>
                          ) : profileData.user.kyc_status === 'pending' ? (
                            <><Clock size={24} className="text-neon-gold" /><span className="text-xl font-bold text-neon-gold">Pending</span></>
                          ) : (
                            <><X size={24} className="text-red-500" /><span className="text-xl font-bold text-red-500">Unverified</span></>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Transactions */}
                      <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity size={18} className="text-neon-cyan"/> Recent Transactions</h3>
                        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                          {profileData.transactions && profileData.transactions.length > 0 ? (
                            <div className="max-h-[300px] overflow-y-auto">
                              {profileData.transactions.map((tx: any) => (
                                <div key={tx.id} className="p-3 border-b border-white/5 flex justify-between items-center hover:bg-white/5">
                                  <div>
                                    <p className="text-sm font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                                    <p className="text-xs text-text-muted">{new Date(tx.createdAt).toLocaleString()}</p>
                                  </div>
                                  <p className={`font-bold ${['deposit', 'prize'].includes(tx.type) ? 'text-neon-green' : 'text-red-400'}`}>
                                    {['deposit', 'prize'].includes(tx.type) ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)} USDT
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 text-center text-text-muted">No transactions found</div>
                          )}
                        </div>
                      </div>

                      {/* Teams */}
                      <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Trophy size={18} className="text-neon-purple"/> Fantasy Teams</h3>
                        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                          {profileData.teams && profileData.teams.length > 0 ? (
                            <div className="max-h-[300px] overflow-y-auto">
                              {profileData.teams.map((team: any) => (
                                <div key={team.id} className="p-3 border-b border-white/5 hover:bg-white/5">
                                  <div className="flex justify-between items-center mb-1">
                                    <p className="text-sm font-bold text-neon-purple">{team.name}</p>
                                    <p className="text-xs font-mono text-neon-gold">Score: {team.total_score}</p>
                                  </div>
                                  <p className="text-xs text-text-secondary">{team.Tournament?.name}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 text-center text-text-muted">No teams created yet</div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-20 text-text-muted">Failed to load profile data</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
