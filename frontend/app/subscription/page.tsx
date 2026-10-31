'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiGet, apiPost } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Crown, Gift, Users, Copy, Check, Share2, Sparkles,
  ShieldCheck, AlertCircle, ArrowRight, Zap, CheckCircle2,
  Calendar, Lock, ExternalLink, RefreshCw, Trophy, Clock,
  MessageCircle, Send
} from 'lucide-react';

interface SubscriptionData {
  access: {
    hasAccess: boolean;
    reason: string;
    isFreeForEveryone: boolean;
    freeUntil?: string;
    expiresAt?: string;
    targetShares?: number;
    totalShares?: number;
    totalReferrals?: number;
    sharesNeeded?: number;
  };
  freePromo: {
    isFreeMode: boolean;
    freeUntil: string | null;
    isFreeNow: boolean;
  };
  subscription: {
    isEnabled: boolean;
    isActive: boolean;
    expiresAt: string | null;
    daysRemaining: number;
    type: string;
    monthlyPrice: number;
    durationDays: number;
  };
  wallet: {
    balance: number;
    currencySymbol: string;
  };
  share: {
    code: string;
    shareUrl: string;
    targetShares: number;
    rewardDays: number;
    totalShares: number;
    totalReferrals: number;
    progressCount: number;
    isUnlocked: boolean;
    sharesNeeded: number;
    shareHistory: Array<{ id: string; platform: string; recipient: string; sharedAt: string }>;
    referralHistory: Array<{ id: string; name: string; joinedAt: string }>;
  };
}

export default function SubscriptionHubPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = () => {
    if (!token) return;
    setLoading(true);
    apiGet('/subscription/status', token)
      .then(res => {
        if (res && res.success) {
          setData(res);
        }
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
  }, [token]);

  const handleRecordShare = async (platform: string, recipient = 'direct') => {
    try {
      setSharing(true);
      const res = await apiPost('/subscription/record-share', { platform, recipient }, token);
      if (res && res.success) {
        fetchStatus();
        if (res.justUnlocked) {
          setMessage({
            type: 'success',
            text: '🎉 Congratulations! You reached the share requirement and unlocked FREE tournament access!'
          });
        }
      }
    } catch (err: unknown) {
      console.warn('Record share notice:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleCopyCode = () => {
    if (!data?.share?.code) return;
    navigator.clipboard.writeText(data.share.code);
    setCopiedCode(true);
    handleRecordShare('copy_code');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!data?.share?.shareUrl) return;
    navigator.clipboard.writeText(data.share.shareUrl);
    setCopiedLink(true);
    handleRecordShare('copy_link');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!data?.share?.code || !data?.share?.shareUrl) return;
    handleRecordShare('whatsapp');
    const text = `🔥 Join me on Creator11! Build your 11-creator fantasy squad with 100% Never-Lose Guarantee.

Use my promo code: *${data.share.code}*

Sign up here: ${data.share.shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTelegram = () => {
    if (!data?.share?.code || !data?.share?.shareUrl) return;
    handleRecordShare('telegram');
    const text = `🔥 Join me on Creator11! Build your 11-creator fantasy squad with 100% Never-Lose Guarantee.\n\nCode: ${data.share.code}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(data.share.shareUrl)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePurchasePass = async () => {
    if (!token) return;
    setPurchasing(true);
    setMessage(null);

    try {
      const res = await apiPost('/subscription/purchase', {}, token);
      if (res && res.success) {
        setMessage({
          type: 'success',
          text: `👑 VIP Monthly Pass Activated! Valid until ${new Date(res.subscriptionActiveUntil).toLocaleDateString('en-IN')}.`
        });
        fetchStatus();
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to purchase pass';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setPurchasing(false);
    }
  };

  const sub = data?.subscription;
  const share = data?.share;
  const access = data?.access;
  const freePromo = data?.freePromo;

  const targetShares = share?.targetShares || 3;
  const progressCount = share?.progressCount || 0;
  const progressPercent = Math.min(100, Math.round((progressCount / targetShares) * 100));

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-neon-purple/20 text-neon-purple border border-neon-purple/30 mb-3">
            <Sparkles size={14} /> VIP Tournament Access Gate
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Subscription &amp; Share Pass
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Choose your way: Instant VIP Monthly Pass or 100% Free Access by sharing with friends.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold border border-white/10 transition-all self-start md:self-auto text-text-secondary hover:text-white"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Status
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

      {/* ACCESS STATUS HERO CARD */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 md:p-8 border border-white/10 relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {access?.hasAccess ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  TOURNAMENT ACCESS: UNLOCKED ✅
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  <Lock size={12} />
                  TOURNAMENT ACCESS: LOCKED
                </span>
              )}

              {freePromo?.isFreeNow && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
                  <Sparkles size={12} /> 100% Free Access Window Active
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-black text-white">
              {access?.hasAccess
                ? freePromo?.isFreeNow
                  ? 'All Leagues are Currently Free to Play!'
                  : access.reason === 'paid_subscription'
                  ? `VIP Monthly Pass Active (${sub?.daysRemaining || 0} Days Remaining)`
                  : 'Unlocked via Friend Shares & Invites!'
                : 'Ya toh Subscription lo ya fir doston ke saath Share karo!'}
            </h2>

            <p className="text-xs md:text-sm text-text-secondary max-w-2xl leading-relaxed">
              {access?.hasAccess
                ? 'Your account is authorized to build and enter 11-creator squads into any live or upcoming tournament.'
                : `To enter fantasy matches, you can either buy a VIP Monthly Pass for ₹${sub?.monthlyPrice || 199}, OR invite/share with ${targetShares} friends to unlock completely FREE.`}
            </p>
          </div>

          <div className="shrink-0 flex flex-col gap-2">
            <Link
              href="/tournaments"
              className="px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 shadow-lg shadow-neon-purple/20 transition-all text-center"
            >
              <Trophy size={16} /> Enter Live Contests
            </Link>
          </div>
        </div>
      </motion.div>

      {/* DUAL OPTIONS: OPTION A (VIP PASS) vs OPTION B (SHARE FOR FREE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OPTION 1: VIP MONTHLY PASS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 md:p-8 flex flex-col justify-between border border-neon-gold/20 relative"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-neon-gold/20 border border-neon-gold/40 flex items-center justify-center text-neon-gold">
                <Crown size={26} />
              </div>
              <span className="text-xs font-bold text-neon-gold uppercase tracking-wider bg-neon-gold/10 px-3 py-1 rounded-full border border-neon-gold/20">
                Instant Access
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">VIP Monthly Pass</h3>
              <p className="text-xs text-text-secondary mt-1">
                Skip sharing requirements and unlock instant VIP access to all tournament battle cups.
              </p>
            </div>

            <div className="py-3 px-4 rounded-xl bg-white/5 border border-white/5 flex items-baseline gap-2">
              <span className="text-3xl font-black text-neon-gold">₹{sub?.monthlyPrice || 199}</span>
              <span className="text-xs text-text-muted">/ {sub?.durationDays || 30} Days</span>
            </div>

            <ul className="space-y-2 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" /> Unlimited tournament team entries
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" /> Full 100% Never-Lose money back refund protection
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" /> Real-time YouTube &amp; Instagram creator surge tracking
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" /> Wallet Balance: <b>₹{data?.wallet?.balance?.toFixed(2) || '0.00'}</b>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-white/5 space-y-3">
            <button
              onClick={handlePurchasePass}
              disabled={purchasing}
              className="w-full py-3 bg-gradient-to-r from-neon-gold to-amber-500 text-black font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-neon-gold/20"
            >
              <Crown size={16} />
              {purchasing ? 'Activating VIP Pass...' : `Buy VIP Monthly Pass (₹${sub?.monthlyPrice || 199})`}
            </button>

            {data?.wallet && data.wallet.balance < (sub?.monthlyPrice || 199) && (
              <p className="text-[11px] text-center text-text-muted">
                Insufficient wallet balance?{' '}
                <Link href={`/wallet?required=${sub?.monthlyPrice || 199}`} className="text-neon-cyan underline font-bold">
                  Add ₹{((sub?.monthlyPrice || 199) - data.wallet.balance).toFixed(2)} to wallet
                </Link>
              </p>
            )}
          </div>
        </motion.div>

        {/* OPTION 2: 100% FREE ACCESS VIA SHARING */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 md:p-8 flex flex-col justify-between border border-emerald-500/20 relative"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Share2 size={26} />
              </div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                100% Free
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">Share &amp; Unlock Free</h3>
              <p className="text-xs text-text-secondary mt-1">
                Share Creator11 with friends or groups. When you share with {targetShares} people, you unlock {share?.rewardDays || 30} days of free tournament access!
              </p>
            </div>

            {/* Live Progress Bar */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-text-secondary">Sharing Progress</span>
                <span className="text-emerald-400">
                  {progressCount} / {targetShares} {progressCount >= targetShares ? '(UNLOCKED 🎉)' : 'Shares'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-neon-cyan transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-text-muted">
                {progressCount >= targetShares
                  ? `🎉 You've unlocked free access! Valid for ${share?.rewardDays || 30} days.`
                  : `Share with ${Math.max(0, targetShares - progressCount)} more friends to unlock without paying.`}
              </p>
            </div>

            {/* Promo Code & Link Box */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase">Your Personal Promo Code</label>
              <div className="flex gap-2">
                <div className="flex-1 py-2 px-3 bg-black/60 border border-white/10 rounded-xl font-mono font-bold text-sm text-neon-cyan flex items-center justify-between">
                  <span>{share?.code || '...'}</span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-white flex items-center gap-1.5"
                >
                  {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copiedCode ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="mt-8 pt-4 border-t border-white/5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
              >
                <MessageCircle size={16} /> Share on WhatsApp
              </button>

              <button
                onClick={handleShareTelegram}
                className="py-2.5 px-3 bg-[#229ED9] hover:bg-[#229ED9]/80 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#229ED9]/20"
              >
                <Send size={16} /> Share on Telegram
              </button>
            </div>

            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copiedLink ? 'Link Copied to Clipboard!' : 'Copy Direct Signup Link'}
            </button>
          </div>
        </motion.div>
      </div>

      {/* SHARE & REFERRAL HISTORY AUDIT SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6 md:p-8 border border-white/10 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/5">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Clock className="text-neon-cyan" size={20} />
              Your Share &amp; Friend History
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Every time you share or a friend registers with your code, it is permanently logged here.
            </p>
          </div>
          <div className="flex gap-4 text-xs font-bold">
            <span className="text-purple-400">Total Shares: {share?.totalShares || 0}</span>
            <span className="text-blue-400">Friends Joined: {share?.totalReferrals || 0}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Share Events Log */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Share2 size={14} className="text-purple-400" /> Recent Shares Logged
            </h4>
            {share?.shareHistory && share.shareHistory.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {share.shareHistory.map(s => (
                  <div key={s.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase text-neon-cyan">{s.platform}</span>
                      <span className="text-[10px] text-text-muted">({s.recipient})</span>
                    </div>
                    <span className="text-[11px] text-text-muted">
                      {new Date(s.sharedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted p-4 bg-white/5 rounded-xl text-center">
                No shares recorded yet. Tap WhatsApp or Telegram share above to start!
              </p>
            )}
          </div>

          {/* Friends Who Registered Log */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users size={14} className="text-blue-400" /> Friends Who Joined
            </h4>
            {share?.referralHistory && share.referralHistory.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {share.referralHistory.map(r => (
                  <div key={r.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                    <div className="font-bold text-white flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span>{r.name}</span>
                    </div>
                    <span className="text-[11px] text-text-muted">
                      {new Date(r.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted p-4 bg-white/5 rounded-xl text-center">
                No friends have registered with your code yet. Share your link to get them onboard!
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
