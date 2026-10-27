'use client';

import { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { motion } from 'framer-motion';
import { Settings, User, Mail, Shield, LogOut, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiPut } from '../lib/api';

export default function SettingsPage() {
  const { user, token, logout, login } = useAuth();
  const router = useRouter();

  const [emailForm, setEmailForm] = useState({ newEmail: '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '' });
  
  const [emailLoading, setEmailLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  
  const [emailMsg, setEmailMsg] = useState({ type: '', text: '' });
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailMsg({ type: '', text: '' });
    try {
      await apiPut('/auth/change-email', emailForm, token);
      setEmailMsg({ type: 'success', text: 'Email updated successfully!' });
      // Update local context
      if (user) {
        login(token!, { ...user, email: emailForm.newEmail });
      }
      setEmailForm({ newEmail: '' });
    } catch (err: any) {
      setEmailMsg({ type: 'error', text: err.message || 'Failed to update email' });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassLoading(true);
    setPassMsg({ type: '', text: '' });
    try {
      await apiPut('/auth/change-password', passForm, token);
      setPassMsg({ type: 'success', text: 'Password changed successfully!' });
      setPassForm({ currentPassword: '', newPassword: '' });
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings size={28} className="text-text-secondary" /> Settings
        </h1>
      </motion.div>

      {/* Account Info */}
      <div className="glass p-6">
        <h3 className="text-lg font-bold mb-4 text-neon-cyan">Account Information</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
            <User size={16} className="text-text-muted" />
            <div>
              <p className="text-xs text-text-muted">Name</p>
              <p className="text-sm font-medium">{user?.name || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
            <Mail size={16} className="text-text-muted" />
            <div>
              <p className="text-xs text-text-muted">Current Email</p>
              <p className="text-sm font-medium">{user?.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
            <Shield size={16} className="text-text-muted" />
            <div>
              <p className="text-xs text-text-muted">KYC Status</p>
              <p className="text-sm font-medium capitalize">{user?.kycStatus || 'none'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Change Email */}
      <div className="glass p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Mail size={18}/> Change Email</h3>
        {emailMsg.text && <div className={`mb-4 p-3 rounded-xl text-sm ${emailMsg.type === 'error' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>{emailMsg.text}</div>}
        <form onSubmit={handleChangeEmail} className="space-y-4">
          <input
            type="email"
            placeholder="New Email Address"
            value={emailForm.newEmail}
            onChange={e => setEmailForm({ newEmail: e.target.value })}
            required
            className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-cyan"
          />
          <button type="submit" disabled={emailLoading} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors disabled:opacity-50">
            {emailLoading ? 'Updating...' : 'Update Email'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="glass p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><KeyRound size={18}/> Change Password</h3>
        {passMsg.text && <div className={`mb-4 p-3 rounded-xl text-sm ${passMsg.type === 'error' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>{passMsg.text}</div>}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <input
            type="password"
            placeholder="Current Password"
            value={passForm.currentPassword}
            onChange={e => setPassForm({ ...passForm, currentPassword: e.target.value })}
            required
            className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-cyan"
          />
          <input
            type="password"
            placeholder="New Password"
            value={passForm.newPassword}
            onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })}
            required
            className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-cyan"
          />
          <button type="submit" disabled={passLoading} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors disabled:opacity-50">
            {passLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleLogout}
        className="w-full py-4 glass rounded-xl text-danger font-bold flex items-center justify-center gap-2 hover:bg-danger/10 transition-colors"
      >
        <LogOut size={18} /> Sign Out
      </motion.button>
    </div>
  );
}
