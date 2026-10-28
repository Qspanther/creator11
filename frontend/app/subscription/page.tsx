'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiGet, apiPost } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Crown, Gift, Users, Copy, Check, Share2, Sparkles,
  ShieldCheck, AlertCircle, ArrowRight, Zap, CheckCircle2,
  Calendar, Lock, ExternalLink, RefreshCw, Trophy
} from 'lucide-react';

interface RoadmapItem {
  round: number;
  target: number;
  rewardDays: number;
  status: 'completed' | 'active' | 'locked';
  progress: number;
}

interface SubscriptionData {
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
  referral: {
    code: string;
    shareUrl: string;
    currentRound: number;
    referralsInCurrentRound: number;
    targetForCurrentRound: number;
    rewardDaysForCurrentRound: number;
    totalReferralsCount: number;
    hasCompletedAllRounds: boolean;
    roadmap: RoadmapItem[];
    recentReferrals: Array<{ id: string; name: string; round: number; joinedAt: string }>;
  };
}

export default function SubscriptionHubPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
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

  const handleCopyCode = () => {
    if (!data?.referral?.code) return;
    navigator.clipboard.writeText(data.referral.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!data?.referral?.shareUrl) return;
    navigator.clipboard.writeText(data.referral.shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!data?.referral?.code || !data?.referral?.shareUrl) return;
    const text = `🔥 Join me on Creator11 (Creator Entertainment League)! Build your 11-creator squad with 100% Never-Lose Money Back Guarantee.

Use my promo code: *${data.referral.code}*

Sign up here: ${data.referral.shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePurchase = async () => {
    if (!token || !data) return;
    setPurchasing(true);
    setMessage(null);

    try {
      const res = await apiPost('/subscription/purchase', {}, token);
      setMessage({
        type: 'success',
        text: '🎉 Monthly Tournament Pass activated successfully! Valid for 30 Days.'
      });
      fetchStatus();
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to activate pass'
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-2 border-neon-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sub = data?.subscription;
  const ref = data?.referral;
  const wallet = data?.wallet;
  const price = sub?.monthlyPrice || 199;
  const balance = wallet?.balance || 0;
  const hasEnoughBalance = balance >= price;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* ─── HERO PASS STATUS ─── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-8 border border-white/10 glass-card bg-gradient-to-br from-[#120d1f] via-[#0e111a] to-[#070b12]"
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-neon-purple/20 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-neon-gold/15 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${sub?.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className={`text-xs font-black uppercase tracking-widest ${sub?.isActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                {sub?.isActive ? 'Tournament Pass Active' : 'Access Pass Required'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white flex items-center gap-3">
              <Crown className="text-neon-gold" size={32} />
              Tournament Access Pass
            </h1>

            <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-xl">
              {sub?.isActive
                ? `You have full access to create & lock teams in all tournaments. Valid until ${new Date(sub.expiresAt!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${sub.daysRemaining} days left).`
                : 'To enter & compete in YouTube tournaments, activate your Monthly Pass or unlock Free Access by sharing your promo code with friends!'}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs">
              <span className="flex items-center gap-1.5 text-neon-gold font-bold">
                <Trophy size={14} /> Never-Lose 100% Refund Guarantee
              </span>
              <span className="text-white/20">•</span>
              <span className="flex items-center gap-1.5 text-neon-cyan font-bold">
                <Zap size={14} /> Real-Time Delta Points
              </span>
            </div>
          </div>

          {/* Quick Wallet Info */}
          <div className="bg-black/40 p-4 rounded-2xl border border-white/10 shrink-0 text-right">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Wallet Balance</span>
            <span className="text-2xl font-black text-white font-mono">₹{balance.toFixed(2)}</span>
            <Link href="/wallet" className="block text-[11px] text-neon-cyan hover:underline font-bold mt-1">
              + Add Cash
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Alert / Feedback message */}
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

      {/* ─── TWO PATHWAYS GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* PATHWAY 1: BUY MONTHLY PASS */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl bg-gradient-to-r from-neon-gold/20 to-amber-500/20 text-neon-gold text-[10px] font-black uppercase tracking-wider border-l border-b border-neon-gold/30">
            Instant Access
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-neon-gold/15 text-neon-gold flex items-center justify-center border border-neon-gold/30">
                <Crown size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Monthly Tournament Pass</h3>
                <p className="text-xs text-text-secondary">30 Days Unlimited Tournament Participation</p>
              </div>
            </div>

            <div className="my-6 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs text-text-muted font-bold uppercase">Pass Fee</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-neon-gold font-mono">₹{price}</span>
                  <span className="text-xs text-text-muted">/ 30 Days</span>
                </div>
              </div>
              <ul className="space-y-2 mt-4 text-xs text-text-secondary">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>Enter unlimited Daily, 2-Day, and 3-Day tournaments</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>100% Never-Lose Guarantee on all tournament entry fees</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>Instant activation directly from your INR wallet balance</span>
                </li>
              </ul>
            </div>
          </div>

          <div>
            {hasEnoughBalance ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePurchase}
                disabled={purchasing}
                className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-neon-gold to-amber-500 text-black flex items-center justify-center gap-2 shadow-lg shadow-neon-gold/20 cursor-pointer disabled:opacity-50"
              >
                <Crown size={16} />
                {purchasing ? 'Activating Pass...' : `Activate 30-Day Pass for ₹${price}`}
              </motion.button>
            ) : (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
                  <span>Balance: <strong>₹{balance.toFixed(2)}</strong></span>
                  <span>Need: <strong>₹{(price - balance).toFixed(2)} more</strong></span>
                </div>
                <Link href={`/wallet?required=${price}`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <span>Deposit ₹{price} via UPI & Subscribe</span>
                    <ArrowRight size={16} />
                  </motion.button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* PATHWAY 2: 100% FREE VIA PROMO CODE & REFERRAL ROUNDS */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl bg-gradient-to-r from-neon-cyan/20 to-blue-500/20 text-neon-cyan text-[10px] font-black uppercase tracking-wider border-l border-b border-neon-cyan/30">
            100% Free Option
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-neon-cyan/15 text-neon-cyan flex items-center justify-center border border-neon-cyan/30">
                <Gift size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Earn Free Access via Promo Code</h3>
                <p className="text-xs text-text-secondary">Invite friends to play & unlock up to 4 Free Rounds</p>
              </div>
            </div>

            {/* Promo Code Box */}
            <div className="my-5 p-4 rounded-2xl bg-black/60 border border-neon-cyan/30">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                Your Unique Promo Code
              </span>
              <div className="flex items-center justify-between gap-3">
                <span className="text-2xl font-black text-neon-cyan tracking-wider font-mono">
                  {ref?.code || 'LOADING...'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 cursor-pointer transition-colors"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>

                  <button
                    onClick={handleShareWhatsApp}
                    className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/30 cursor-pointer transition-colors"
                  >
                    <Share2 size={14} />
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>

            {/* Current Round Progress Card */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-neon-purple uppercase">
                  {ref?.hasCompletedAllRounds ? 'All 4 Rounds Completed!' : `Current: Round ${ref?.currentRound || 1} Milestone`}
                </span>
                <span className="text-xs font-bold text-white font-mono">
                  {ref?.referralsInCurrentRound || 0} / {ref?.targetForCurrentRound || 2} Friends
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, ((ref?.referralsInCurrentRound || 0) / (ref?.targetForCurrentRound || 2)) * 100)}%`
                  }}
                />
              </div>

              <p className="text-[11px] text-text-secondary">
                {ref?.hasCompletedAllRounds
                  ? 'Awesome! You have unlocked all 4 milestone rounds!'
                  : `Invite ${(ref?.targetForCurrentRound || 2) - (ref?.referralsInCurrentRound || 0)} more friend(s) with your promo code to unlock ${ref?.rewardDaysForCurrentRound || 15} Days of FREE access!`}
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyLink}
            className="w-full py-3.5 rounded-2xl font-bold text-xs bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-2 border border-white/10 cursor-pointer transition-all"
          >
            {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copiedLink ? 'Link Copied to Clipboard!' : 'Copy Direct Signup Invite Link'}
          </button>
        </motion.div>
      </div>

      {/* ─── 4-ROUND REFERRAL ROADMAP ─── */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 mb-10">
        <div className="border-b border-white/10 pb-4 mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="text-neon-cyan" size={20} />
              4-Round Milestone Progression
            </h3>
            <p className="text-xs text-text-secondary">
              Each round unlocks extended free tournament days. Once a round expires, you advance to the next round!
            </p>
          </div>
          <span className="text-xs font-bold text-text-muted">Total Friends Invited: {ref?.totalReferralsCount || 0}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {ref?.roadmap?.map((item) => {
            const isCompleted = item.status === 'completed';
            const isActive = item.status === 'active';
            const isLocked = item.status === 'locked';

            return (
              <div
                key={item.round}
                className={`p-5 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : isActive
                    ? 'border-neon-purple/50 bg-neon-purple/10 shadow-lg shadow-neon-purple/10'
                    : 'border-white/5 bg-white/[0.01] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase text-text-muted">
                    Round {item.round}
                  </span>
                  {isCompleted ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check size={10} /> Done
                    </span>
                  ) : isActive ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neon-purple/20 text-neon-purple border border-neon-purple/30">
                      Active Now
                    </span>
                  ) : (
                    <span className="text-text-muted"><Lock size={12} /></span>
                  )}
                </div>

                <div className="space-y-1 mb-4">
                  <p className="text-base font-black text-white">
                    {item.rewardDays} Days Free
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    Invite {item.target} Friends
                  </p>
                </div>

                {/* Progress bar inside card */}
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full ${isCompleted ? 'bg-emerald-400' : 'bg-neon-purple'}`}
                    style={{ width: `${Math.min(100, (item.progress / item.target) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-text-muted block text-right font-mono">
                  {item.progress}/{item.target}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── RECENT FRIENDS JOINED ─── */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10">
        <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
          <Users size={18} className="text-neon-gold" />
          Friends Who Joined Using Your Promo Code
        </h3>

        {(!ref?.recentReferrals || ref.recentReferrals.length === 0) ? (
          <div className="p-8 text-center border border-white/5 rounded-2xl bg-white/[0.01] text-xs text-text-muted">
            No friends have joined with your promo code yet. Share your promo code on WhatsApp to unlock free tournament access!
          </div>
        ) : (
          <div className="space-y-2">
            {ref.recentReferrals.map((friend) => (
              <div
                key={friend.id}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neon-purple/20 text-neon-purple flex items-center justify-center font-bold">
                    {friend.name.slice(0, 1)}
                  </div>
                  <div>
                    <p className="font-bold text-white">{friend.name}</p>
                    <p className="text-[10px] text-text-muted">
                      Joined {new Date(friend.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 text-neon-cyan border border-white/10">
                  Credited to Round {friend.round}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
