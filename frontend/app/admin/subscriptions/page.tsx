'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet, apiPut } from '../../lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Crown, Users, Gift, Save, CheckCircle2, AlertCircle,
  RefreshCw, ArrowLeft, Shield, Zap, Calendar, IndianRupee, Sparkles,
  Share2, Clock, Check, X, Search
} from 'lucide-react';

interface SettingsData {
  subscription_enabled: string;
  subscription_free_mode: string;
  subscription_free_until: string;
  share_unlock_target: string;
  share_unlock_reward_days: string;
  subscription_monthly_price: string;
  subscription_duration_days: string;
}

interface StatsData {
  activeSubscribersCount: number;
  paidSubscribersCount: number;
  shareUnlockedUsersCount: number;
  totalSharesLogged: number;
  totalReferralsMade: number;
}

interface UserAudit {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  referralCode: string;
  subscriptionActiveUntil: string | null;
  subscriptionType: string;
  hasActivePass: boolean;
  isShareTargetMet: boolean;
  totalShares: number;
  totalReferrals: number;
  createdAt: string;
}

export default function AdminSubscriptionsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState<SettingsData>({
    subscription_enabled: 'true',
    subscription_free_mode: 'false',
    subscription_free_until: '',
    share_unlock_target: '3',
    share_unlock_reward_days: '30',
    subscription_monthly_price: '199',
    subscription_duration_days: '30',
  });

  const [stats, setStats] = useState<StatsData>({
    activeSubscribersCount: 0,
    paidSubscribersCount: 0,
    shareUnlockedUsersCount: 0,
    totalSharesLogged: 0,
    totalReferralsMade: 0,
  });

  const [users, setUsers] = useState<UserAudit[]>([]);

  const fetchSettings = () => {
    if (!token) return;
    setLoading(true);
    apiGet('/admin/subscription-settings', token)
      .then(res => {
        if (res && res.settings) {
          setForm(res.settings);
          if (res.stats) setStats(res.stats);
          if (res.users) setUsers(res.users);
        }
      })
      .catch(err => {
        console.error(err);
        setMessage({ type: 'error', text: 'Failed to load subscription settings' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await apiPut('/admin/subscription-settings', form, token);
      setMessage({ type: 'success', text: 'Subscription & Share Access policies saved successfully!' });
      fetchSettings();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.referralCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-gold/20 border border-neon-gold/40 flex items-center justify-center text-neon-gold">
              <Crown size={22} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                Subscription, Free Access &amp; Share Controls
              </h1>
              <p className="text-xs text-text-secondary">
                Configure when team creation is 100% free, when subscription is required, and minimum shares needed to unlock.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold border border-white/10 transition-all self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-semibold border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </motion.div>
      )}

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 border border-white/5">
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1.5">
            <Zap size={14} className="text-neon-cyan" /> Total Active Access
          </p>
          <p className="text-2xl font-black text-white">{stats.activeSubscribersCount}</p>
          <span className="text-[10px] text-text-muted">Users eligible to play</span>
        </div>

        <div className="glass-card p-4 border border-white/5">
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1.5">
            <Crown size={14} className="text-neon-gold" /> Paid VIP Pass
          </p>
          <p className="text-2xl font-black text-neon-gold">{stats.paidSubscribersCount}</p>
          <span className="text-[10px] text-text-muted">₹ Paid subscriptions</span>
        </div>

        <div className="glass-card p-4 border border-white/5">
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1.5">
            <Share2 size={14} className="text-emerald-400" /> Unlocked via Share
          </p>
          <p className="text-2xl font-black text-emerald-400">{stats.shareUnlockedUsersCount}</p>
          <span className="text-[10px] text-text-muted">Earned via invite</span>
        </div>

        <div className="glass-card p-4 border border-white/5">
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1.5">
            <Share2 size={14} className="text-purple-400" /> Total Shares
          </p>
          <p className="text-2xl font-black text-purple-400">{stats.totalSharesLogged}</p>
          <span className="text-[10px] text-text-muted">WhatsApp / Links</span>
        </div>

        <div className="glass-card p-4 border border-white/5 col-span-2 md:col-span-1">
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1.5">
            <Users size={14} className="text-blue-400" /> Joined Friends
          </p>
          <p className="text-2xl font-black text-blue-400">{stats.totalReferralsMade}</p>
          <span className="text-[10px] text-text-muted">Registered through invites</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: Free Access vs Subscription Master Gate */}
        <div className="glass-card p-6 border border-white/10 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="text-neon-gold" size={20} />
                Free Access &amp; Gate Rules
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Control whether tournaments are 100% free for everyone, or require subscription/sharing.
              </p>
            </div>
            {form.subscription_free_mode === 'true' ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                100% FREE MODE ACTIVE
              </span>
            ) : form.subscription_enabled === 'true' ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                GATE ENFORCED (SUB / SHARE REQUIRED)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-text-muted">
                GATE DISABLED
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Mode Toggle Card */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Zap size={16} className="text-neon-cyan" />
                    100% Free Access Mode
                  </h4>
                  <p className="text-xs text-text-secondary mt-0.5">
                    When active, all users can create teams without paying or sharing.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={form.subscription_free_mode === 'true'}
                    onChange={e => setForm({ ...form, subscription_free_mode: e.target.checked ? 'true' : 'false' })}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            {/* Free Until Date Picker */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Clock size={16} className="text-neon-gold" />
                  Free Access Valid Until (Date &amp; Time)
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Promotional window: free for all until this exact deadline.
                </p>
              </div>
              <input
                type="datetime-local"
                value={form.subscription_free_until ? form.subscription_free_until.slice(0, 16) : ''}
                onChange={e => setForm({ ...form, subscription_free_until: e.target.value })}
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-neon-cyan"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Share & Subscription Pricing Policy */}
        <div className="glass-card p-6 border border-white/10 space-y-6">
          <div className="pb-4 border-b border-white/5">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Share2 className="text-emerald-400" size={20} />
              Share Unlock Rules &amp; Subscription Pricing
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Set how many shares/friends unlock team creation, and set the monthly pass price.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Minimum Shares Target */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Min. Shares to Unlock
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.share_unlock_target}
                  onChange={e => setForm({ ...form, share_unlock_target: e.target.value })}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl font-bold text-white focus:outline-none focus:border-neon-cyan text-sm"
                />
                <span className="absolute right-3 top-2.5 text-xs text-text-muted">Users</span>
              </div>
              <p className="text-[10px] text-text-muted mt-1">E.g. share with 3 friends to play free</p>
            </div>

            {/* Reward Days on Share */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Free Pass Validity
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={form.share_unlock_reward_days}
                  onChange={e => setForm({ ...form, share_unlock_reward_days: e.target.value })}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl font-bold text-white focus:outline-none focus:border-neon-cyan text-sm"
                />
                <span className="absolute right-3 top-2.5 text-xs text-text-muted">Days</span>
              </div>
              <p className="text-[10px] text-text-muted mt-1">Free pass duration when target met</p>
            </div>

            {/* Monthly VIP Price */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Monthly Pass Price (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.subscription_monthly_price}
                  onChange={e => setForm({ ...form, subscription_monthly_price: e.target.value })}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl font-bold text-neon-gold focus:outline-none focus:border-neon-gold text-sm"
                />
                <span className="absolute right-3 top-2.5 text-xs text-text-muted">INR</span>
              </div>
              <p className="text-[10px] text-text-muted mt-1">Price for instant VIP monthly pass</p>
            </div>

            {/* Pass Duration Days */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                VIP Pass Duration
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={form.subscription_duration_days}
                  onChange={e => setForm({ ...form, subscription_duration_days: e.target.value })}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl font-bold text-white focus:outline-none focus:border-neon-cyan text-sm"
                />
                <span className="absolute right-3 top-2.5 text-xs text-text-muted">Days</span>
              </div>
              <p className="text-[10px] text-text-muted mt-1">Duration of paid pass (e.g. 30 days)</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-bold rounded-xl text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-neon-purple/20"
            >
              <Save size={16} />
              {saving ? 'Saving Changes...' : 'Save Subscription & Share Rules'}
            </button>
          </div>
        </div>
      </form>

      {/* SECTION 3: User Share & Subscription Audit Table */}
      <div className="glass-card p-6 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Users className="text-neon-cyan" size={20} />
              User Share &amp; Subscription Audit
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Live record of every user&apos;s shares, referral signups, and access status.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-text-muted" size={14} />
            <input
              type="text"
              placeholder="Search user, email or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-neon-cyan w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-text-secondary font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Promo Code</th>
                <th className="py-3 px-4 text-center">Shares Logged</th>
                <th className="py-3 px-4 text-center">Friends Joined</th>
                <th className="py-3 px-4">Pass Status</th>
                <th className="py-3 px-4">Access Type</th>
                <th className="py-3 px-4">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-text-secondary">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    No users found matching query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-[11px] text-text-muted">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-neon-cyan">
                      {u.referralCode || '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-purple-300">
                      {u.totalShares || 0}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-blue-300">
                      {u.totalReferrals || 0}
                    </td>
                    <td className="py-3 px-4">
                      {u.hasActivePass ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                          <Check size={14} /> Active
                        </span>
                      ) : u.isShareTargetMet ? (
                        <span className="inline-flex items-center gap-1 text-neon-cyan font-bold">
                          <Check size={14} /> Unlocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-text-muted">
                          <X size={14} /> Locked
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] font-semibold">
                      {u.subscriptionType || 'none'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {u.subscriptionActiveUntil
                        ? new Date(u.subscriptionActiveUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
