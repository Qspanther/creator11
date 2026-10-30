'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Volume2, VolumeX, LogOut } from 'lucide-react';
import { apiGet, apiPut } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { playSpatialSFX } from '../ui/StageControls3D';

export default function TopBar() {
  const { user, token, logout } = useAuth();
  const [balance, setBalance] = useState<number>(14850);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiGet('/wallet/balance', token)
      .then((res) => {
        if (typeof res?.balance === 'number') setBalance(res.balance);
      })
      .catch(() => {});

    apiGet('/notifications', token)
      .then((res) => {
        if (Array.isArray(res)) setNotifications(res);
        else if (Array.isArray(res?.notifications)) setNotifications(res.notifications);
      })
      .catch(() => {});
  }, [token]);

  const handleThemeChange = (theme: string) => {
    playSpatialSFX('click');
    window.dispatchEvent(new CustomEvent('creator11:theme-change', { detail: theme }));
  };

  const toggleSFX = () => {
    const next = !sfxMuted;
    setSfxMuted(next);
    if (typeof window !== 'undefined') {
      (window as any).__CREATOR11_SFX_MUTED = next;
    }
  };

  const markRead = async (id: string) => {
    try {
      await apiPut(`/notifications/${id}/read`, {}, token);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center font-black text-slate-950 text-sm">
            C11
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">CREATOR11</span>
        </Link>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
          <span className="text-cyan-400 font-bold">3D Mode:</span>
          <span>Interactive Holo-Tilt + WebGL Stadium</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <select
          onChange={(e) => handleThemeChange(e.target.value)}
          aria-label="Select 3D Arena Theme"
          className="bg-slate-900/90 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-cyan-300 focus:outline-none focus:border-cyan-400"
        >
          <option value="cyber">🌌 Cyber Obsidian</option>
          <option value="supernova">🔥 Supernova Gold</option>
          <option value="matrix">🧪 Emerald Hypergrid</option>
        </select>

        <button
          type="button"
          onClick={toggleSFX}
          className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1"
        >
          {sfxMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          <span className="hidden sm:inline">{sfxMuted ? 'Muted' : 'SFX On'}</span>
        </button>

        <Link
          href="/wallet"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 hover:bg-emerald-500/25 transition"
        >
          <span className="text-xs">💳</span>
          <span className="font-mono text-xs sm:text-sm font-bold">₹{Number(balance).toLocaleString()}</span>
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotif(!showNotif)}
            className="relative p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-fuchsia-500 text-[10px] font-bold flex items-center justify-center text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 mt-2 w-80 holo-card p-4 rounded-2xl border border-purple-400/40 shadow-2xl space-y-2.5 z-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">🔔 Live Arena Notifications</span>
                <button type="button" onClick={() => setShowNotif(false)} className="text-xs text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-xs text-cyan-200">
                  ⚡ 3D Scoring Engine active! Real-time creator metrics are synced.
                </div>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className="p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-200 cursor-pointer hover:border-cyan-400/40"
                  >
                    {n.message || n.title}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-white/5 border border-white/10">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center text-xs font-black text-slate-950">
            {(user?.name || 'QP').slice(0, 2).toUpperCase()}
          </div>
          <div className="text-left">
            <div className="text-xs font-bold leading-none text-white">{user?.name || 'Qspanther'}</div>
            <div className="text-[10px] text-amber-300 font-semibold">VIP Pass</div>
          </div>
          {user && (
            <button
              type="button"
              onClick={logout}
              title="Logout"
              className="ml-1 text-slate-400 hover:text-rose-400 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
