'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet, apiPut } from '../../lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Crown, Users, Gift, Save, CheckCircle2, AlertCircle,
  RefreshCw, ArrowLeft, Shield, Zap, Calendar, IndianRupee, Sparkles
} from 'lucide-react';

interface SettingsData {
  subscription_monthly_price: string;
  subscription_duration_days: string;
  subscription_enabled: string;
  referral_round_1_target: string;
  referral_round_1_days: string;
  referral_round_2_target: string;
  referral_round_2_days: string;
  referral_round_3_target: string;
  referral_round_3_days: string;
  referral_round_4_target: string;
  referral_round_4_days: string;
}

interface StatsData {
  activeSubscribersCount: number;
  paidSubscribersCount: number;
  referralPassesCount: number;
  totalReferralsMade: number;
}

export default function AdminSubscriptionsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState<SettingsData>({
    subscription_monthly_price: '199',
    subscription_duration_days: '30',
    subscription_enabled: 'true',
    referral_round_1_target: '2',
    referral_round_1_days: '15',
    referral_round_2_target: '3',
    referral_round_2_days: '15',
    referral_round_3_target: '4',
    referral_round_3_days: '15',
    referral_round_4_target: '5',
    referral_round_4_days: '30',
  });

  const [stats, setStats] = useState<StatsData>({
    activeSubscribersCount: 0,
    paidSubscribersCount: 0,
    referralPassesCount: 0,
    totalReferralsMade: 0,
  });

  const fetchSettings = () => {
    if (!token) return;
    setLoading(true);
    apiGet('/admin/subscription-settings', token)
      .then(res => {
        if (res && res.settings) {
          setForm(res.settings);
          if (res.stats) setStats(res.stats);
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
      setMessage({ type: 'success', text: 'Subscription & Referral Round settings updated successfully!' });
      fetchSettings();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <Link href="/admin" className="text-xs text-text-muted hover:text-white flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Crown className="text-neon-gold" size={32} />
            Subscription & Referral Rounds Control
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Configure monthly tournament access pricing and customize the 4-round viral referral milestone rewards.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-2 border border-white/10 cursor-pointer self-start"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Stats
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5 border border-neon-gold/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-muted uppercase">Active Subscribers</span>
            <Crown size={16} className="text-neon-gold" />
          </div>
          <p className="text-2xl font-black text-neon-gold">{stats.activeSubscribersCount}</p>
          <span className="text-[10px] text-text-muted">Total active tournament passes</span>
        </div>

        <div className="glass-card p-5 border border-neon-cyan/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-muted uppercase">Paid Monthly</span>
            <IndianRupee size={16} className="text-neon-cyan" />
          </div>
          <p className="text-2xl font-black text-neon-cyan">{stats.paidSubscribersCount}</p>
          <span className="text-[10px] text-text-muted">Paid ₹ subscription passes</span>
        </div>

        <div className="glass-card p-5 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-muted uppercase">Referral Passes</span>
            <Gift size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{stats.referralPassesCount}</p>
          <span className="text-[10px] text-text-muted">Earned via friend invites</span>
        </div>

        <div className="glass-card p-5 border border-neon-purple/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-muted uppercase">Total Referrals</span>
            <Users size={16} className="text-neon-purple" />
          </div>
          <p className="text-2xl font-black text-neon-purple">{stats.totalReferralsMade}</p>
          <span className="text-[10px] text-text-muted">Users registered via promo codes</span>
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl mb-6 flex items-center gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-bold">{message.text}</span>
        </motion.div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: Monthly Subscription Pricing */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neon-gold/20 flex items-center justify-center text-neon-gold">
                <Crown size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Monthly Subscription Price & Policy</h3>
                <p className="text-xs text-text-secondary">Users must hold an active pass to build & enter teams into tournaments</p>
              </div>
            </div>

            {/* Toggle Active Check */}
            <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-2 rounded-xl border border-white/10">
              <input
                type="checkbox"
                checked={form.subscription_enabled === 'true'}
                onChange={e => setForm({ ...form, subscription_enabled: e.target.checked ? 'true' : 'false' })}
                className="w-4 h-4 accent-neon-gold cursor-pointer"
              />
              <span className="text-xs font-bold text-white">
                {form.subscription_enabled === 'true' ? 'Gate Enabled' : 'Gate Disabled'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                Monthly Pass Price (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-neon-gold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.subscription_monthly_price}
                  onChange={e => setForm({ ...form, subscription_monthly_price: e.target.value })}
                  className="w-full !pl-9 !py-3 !bg-black/50 !border-white/15 !rounded-xl !text-base font-black text-white outline-none focus:border-neon-gold"
                  required
                />
              </div>
              <p className="text-[11px] text-text-muted mt-1.5">
                Amount deducted from player&apos;s wallet when purchasing the monthly pass.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                Pass Duration (Days)
              </label>
              <div className="relative">
                <Calendar size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={form.subscription_duration_days}
                  onChange={e => setForm({ ...form, subscription_duration_days: e.target.value })}
                  className="w-full !pl-10 !py-3 !bg-black/50 !border-white/15 !rounded-xl !text-base font-black text-white outline-none focus:border-neon-gold"
                  required
                />
              </div>
              <p className="text-[11px] text-text-muted mt-1.5">
                Default: 30 days. Player gets access to all tournament battles during this period.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: 4-Round Referral Milestone Controls */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10">
          <div className="border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neon-cyan/20 flex items-center justify-center text-neon-cyan">
                <Gift size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">4-Round Viral Referral Program Controls</h3>
                <p className="text-xs text-text-secondary">
                  If users share their promo code, they unlock free tournament access across 4 sequential milestone rounds.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Round 1 */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-neon-cyan/40 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
                  Round 1 Milestone
                </span>
                <span className="text-xs text-text-muted">First-time referral stage</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Invite Friends Target</label>
                  <input
                    type="number"
                    min="1"
                    value={form.referral_round_1_target}
                    onChange={e => setForm({ ...form, referral_round_1_target: e.target.value })}
                    className="w-full !py-2.5 !px-3 !bg-black/50 !border-white/15 !rounded-xl !text-sm font-bold text-white"
                  />
                  <span className="text-[10px] text-text-muted">Default: 2 friends</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Free Access (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.referral_round_1_days}
                    onChange={e => setForm({ ...form, referral_round_1_days: e.target.value })}
                    className="w-full !py-2.5 !px-3 !bg-black/50 !border-white/15 !rounded-xl !text-sm font-bold text-white"
                  />
                  <span className="text-[10px] text-text-muted">Default: 15 days</span>
                </div>
              </div>
            </div>

            {/* Round 2 */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-neon-purple/40 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-neon-purple/20 text-neon-purple border border-neon-purple/30">
                  Round 2 Milestone
                </span>
                <span className="text-xs text-text-muted">After Round 1 expires</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Invite Friends Target</label>
                  <input
                    type="number"
                    min="1"
                    value={form.referral_round_2_target}
                    onChange={e => setForm({ ...form, referral_round_2_target: e.target.value })}
                    className="w-full !py-2.5 !px-3 !bg-black/50 !border-white/15 !rounded-xl !text-sm font-bold text-white"
                  />
                  <span className="text-[10px] text-text-muted">Default: 3 friends</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Free Access (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.referral_round_2_days}
                    onChange={e => setForm({ ...form, referral_round_2_days: e.target.value })}
                    className="w-full !py-2.5 !px-3 !bg-black/50 !border-white/15 !rounded-xl !text-sm font-bold text-white"
                  />
                  <span className="text-[10px] text-text-muted">Default: 15 days</span>
                </div>
              </div>
            </div>

            {/* Round 3 */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-neon-gold/40 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-neon-gold/20 text-neon-gold border border-neon-gold/30">
                  Round 3 Milestone
                </span>
                <span className="text-xs text-text-muted">After Round 2 expires</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Invite Friends Target</label>
                  <input
                    type="number"
                    min="1"
                    value={form.referral_round_3_target}
                    onChange={e => setForm({ ...form, referral_round_3_target: e.target.value })}
                    className="w-full !py-2.5 !px-3 !bg-black/50 !border-white/15 !rounded-xl !text-sm font-bold text-white"
                  />
                  <span className="text-[10px] text-text-muted">Default: 4 friends</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Free Access (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.referral_round_3_days}
                    onChange={e => setForm({ ...form, referral_round_3_days: e.target.value })}
                    className="w-full !py-2.5 !px-3 !bg-black/50 !border-white/15 !rounded-xl !text-sm font-bold text-white"
                  />
                  <span className="text-[10px] text-text-muted">Default: 15 days</span>
                </div>
              </div>
            </div>

            {/* Round 4 */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Round 4 Grand Milestone
                </span>
                <span className="text-xs text-text-muted">Final mega round</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Invite Friends Target</label>
                  <input
                    type="number"
                    min="1"
                    value={form.referral_round_4_target}
                    onChange={e => setForm({ ...form, referral_round_4_target: e.target.value })}
                    className="w-full !py-2.5 !px-3 !bg-black/50 !border-white/15 !rounded-xl !text-sm font-bold text-white"
                  />
                  <span className="text-[10px] text-text-muted">Default: 5 friends</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Free Access (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.referral_round_4_days}
                    onChange={e => setForm({ ...form, referral_round_4_days: e.target.value })}
                    className="w-full !py-2.5 !px-3 !bg-black/50 !border-white/15 !rounded-xl !text-sm font-bold text-white"
                  />
                  <span className="text-[10px] text-text-muted">Default: 30 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/admin">
            <button
              type="button"
              className="px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm cursor-pointer border border-white/10"
            >
              Cancel
            </button>
          </Link>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-neon-gold to-amber-500 text-black font-black text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-neon-gold/20 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving Settings...' : 'Save Subscription & Referral Settings'}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
