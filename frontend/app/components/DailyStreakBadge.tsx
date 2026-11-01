'use client';

import React, { useState, useEffect } from 'react';
import { Flame, Sparkles, Gift, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { apiGet, apiPost } from '../lib/api';
import { playSpatialSFX } from './ui/StageControls3D';

interface StreakData {
  streakCount: number;
  canClaimToday: boolean;
  lastClaimDate: string | null;
  rewards: Array<{ day: number; reward: number; label: string }>;
  nextReward: { day: number; reward: number; label: string };
}

export default function DailyStreakBadge() {
  const { token } = useAuth();
  const [data, setData] = useState<StreakData | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimedMessage, setClaimedMessage] = useState<string | null>(null);

  const fetchStreak = () => {
    if (!token) return;
    apiGet('/gamification/streak', token)
      .then((res) => {
        setData(res);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchStreak();
  }, [token]);

  const handleClaim = async () => {
    if (!token || claiming || !data?.canClaimToday) return;
    setClaiming(true);
    try {
      playSpatialSFX('power');
      const res = await apiPost('/gamification/streak/claim', {}, token);
      setClaimedMessage(res.message || `Claimed Day ${res.newStreak} reward!`);
      fetchStreak();
    } catch (err: any) {
      alert(err.message || 'Failed to claim daily reward');
    } finally {
      setClaiming(false);
    }
  };

  if (!data) return null;

  const currentStreak = data.streakCount || 0;

  return (
    <div className="glass-card p-4 sm:p-5 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-purple-500/5 to-transparent relative overflow-hidden shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Streak Status & Flame */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20 shrink-0">
            <Flame className="w-7 h-7 text-slate-950 fill-slate-950 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">
                DAILY ENGAGEMENT REWARD
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40">
                {currentStreak} DAY STREAK
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {currentStreak > 0 ? `You're on a ${currentStreak}-Day Hot Streak!` : 'Start Your 7-Day Login Streak!'}
            </h3>
          </div>
        </div>

        {/* Right: Claim Action Button */}
        <div>
          {data.canClaimToday ? (
            <button
              type="button"
              disabled={claiming}
              onClick={handleClaim}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(251,191,36,0.5)] hover:shadow-[0_0_30px_rgba(251,191,36,0.7)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Gift size={16} />
              <span>{claiming ? 'Unlocking...' : `Claim ${data.nextReward?.label || 'Bonus'}`}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-emerald-400 text-xs font-bold">
              <CheckCircle2 size={16} />
              <span>Claimed Today • Next unlocks tomorrow!</span>
            </div>
          )}
        </div>
      </div>

      {/* 7-Day Milestone Stepper */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mt-4 pt-3 border-t border-white/10">
        {data.rewards.map((r) => {
          const isDone = currentStreak >= r.day;
          const isCurrent = currentStreak + 1 === r.day && data.canClaimToday;

          return (
            <div
              key={r.day}
              className={`p-2 rounded-xl text-center transition flex flex-col items-center justify-between min-h-[58px] ${
                isDone
                  ? 'bg-amber-400/20 border border-amber-400/50 shadow-sm shadow-amber-400/10'
                  : isCurrent
                    ? 'bg-purple-500/20 border border-purple-400/60 ring-1 ring-purple-400/40 animate-pulse'
                    : 'bg-black/30 border border-white/5 opacity-60'
              }`}
            >
              <div className="text-[10px] font-bold text-text-muted">Day {r.day}</div>
              <div
                className={`text-[11px] font-mono font-black ${
                  isDone ? 'text-amber-300' : isCurrent ? 'text-purple-300' : 'text-slate-400'
                }`}
              >
                {r.day === 7 ? '👑 50' : `+₹${r.reward}`}
              </div>
              <div className="mt-0.5">
                {isDone ? (
                  <CheckCircle2 size={12} className="text-amber-400 mx-auto" />
                ) : (
                  <Flame size={12} className={isCurrent ? 'text-purple-400' : 'text-slate-600'} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {claimedMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs text-center font-bold animate-in fade-in">
          {claimedMessage}
        </div>
      )}
    </div>
  );
}
