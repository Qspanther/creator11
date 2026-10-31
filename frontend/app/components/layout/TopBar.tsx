'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Bell, Volume2, VolumeX, LogOut, Menu, X, Home, Trophy, 
  Shield, Wallet, Users, Crown, Settings, ShieldAlert, Sparkles, ChevronRight 
} from 'lucide-react';
import { apiGet, apiPut } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { playSpatialSFX } from '../ui/StageControls3D';

export default function TopBar() {
  const { user, token, logout } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Logo & 3D Indicator */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link href="/" onClick={() => playSpatialSFX('click')} className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center font-black text-slate-950 text-sm shadow-md shadow-purple-500/20">
              C11
            </div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-white hidden xs:inline">
              CREATOR11
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
            <span className="text-cyan-400 font-bold">3D Arena:</span>
            <span>Holo-Tilt + WebGL Stadium</span>
          </div>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Theme Dropdown (Desktop & Tablets) */}
          <select
            onChange={(e) => handleThemeChange(e.target.value)}
            aria-label="Select 3D Arena Theme"
            className="hidden sm:inline-block bg-slate-900/90 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-cyan-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="cyber">🌌 Cyber Obsidian</option>
            <option value="supernova">🔥 Supernova Gold</option>
            <option value="matrix">🧪 Emerald Hypergrid</option>
          </select>

          {/* Sound Toggle (Desktop & Tablets) */}
          <button
            type="button"
            onClick={toggleSFX}
            className="hidden sm:flex px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition items-center gap-1"
          >
            {sfxMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="hidden md:inline">{sfxMuted ? 'Muted' : 'SFX On'}</span>
          </button>

          {/* Wallet Balance Pill */}
          <Link
            href="/wallet"
            onClick={() => playSpatialSFX('click')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 hover:bg-emerald-500/25 transition shrink-0"
          >
            <span className="text-xs">💳</span>
            <span className="font-mono text-xs sm:text-sm font-extrabold whitespace-nowrap">
              ₹{Number(balance).toLocaleString('en-IN')}
            </span>
          </Link>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-fuchsia-500 text-[10px] font-bold flex items-center justify-center text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 holo-card p-4 rounded-2xl border border-purple-400/40 shadow-2xl space-y-2.5 z-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">🔔 Arena Notifications</span>
                  <button type="button" onClick={() => setShowNotif(false)} className="text-xs text-slate-400 hover:text-white">
                    ✕
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-xs text-cyan-200">
                    ⚡ 3D Engine active! Creator metrics are syncing.
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

          {/* Desktop User Avatar & Profile */}
          <div className="hidden md:flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-white/5 border border-white/10">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center text-xs font-black text-slate-950">
              {(user?.name || 'QP').slice(0, 2).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold leading-none text-white truncate max-w-[90px]">{user?.name || 'Player'}</div>
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

          {/* Mobile Hamburger Drawer Trigger */}
          <button
            type="button"
            onClick={() => {
              playSpatialSFX('click');
              setMobileDrawerOpen(true);
            }}
            aria-label="Open mobile navigation menu"
            className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:text-white transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MOBILE SLIDE-OVER DRAWER */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-sm h-full bg-slate-950/98 border-r border-white/15 p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center font-black text-slate-950 text-base shadow-md shadow-purple-500/20">
                    C11
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white tracking-tight">CREATOR11</h3>
                    <p className="text-[10px] font-mono uppercase text-cyan-400">3D Entertainment</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/10 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                >
                  <X size={18} />
                </button>
              </div>

              {/* User Profile Card */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center text-sm font-black text-slate-950">
                    {(user?.name || 'QP').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-white truncate">{user?.name || 'Player'}</p>
                    <p className="text-[11px] text-text-muted truncate">{user?.email || 'player@creator11.com'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                  <span className="text-text-secondary">Wallet Balance:</span>
                  <span className="font-mono font-bold text-emerald-400">₹{Number(balance).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1">
                {[
                  { label: '3D Arena Hub', href: '/', icon: Sparkles },
                  { label: 'Battle Leagues', href: '/tournaments', icon: Trophy },
                  { label: 'My 3D Teams', href: '/my-teams', icon: Shield },
                  { label: 'Pass & Refer (Free / VIP)', href: '/subscription', icon: Crown },
                  { label: '3D Wallet & Cashier', href: '/wallet', icon: Wallet },
                  { label: 'Creators Vault (50 Stars)', href: '/creators', icon: Users },
                  { label: 'Account Settings', href: '/settings', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        playSpatialSFX('click');
                        setMobileDrawerOpen(false);
                      }}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className="text-cyan-400" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight size={14} className="text-text-muted" />
                    </Link>
                  );
                })}

                {user?.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => {
                      playSpatialSFX('click');
                      setMobileDrawerOpen(false);
                    }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-neon-gold bg-neon-gold/10 border border-neon-gold/20 hover:bg-neon-gold/20 transition mt-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert size={16} />
                      <span>Admin Command Center</span>
                    </div>
                    <ChevronRight size={14} />
                  </Link>
                )}
              </nav>

              {/* Theme & Sound Selector on Mobile */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Arena Theme &amp; SFX
                </label>
                <select
                  onChange={(e) => handleThemeChange(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs font-semibold text-cyan-300 focus:outline-none"
                >
                  <option value="cyber">🌌 Cyber Obsidian</option>
                  <option value="supernova">🔥 Supernova Gold</option>
                  <option value="matrix">🧪 Emerald Hypergrid</option>
                </select>

                <button
                  type="button"
                  onClick={toggleSFX}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 flex items-center justify-between"
                >
                  <span>Sound Effects (SFX)</span>
                  <span className={sfxMuted ? 'text-rose-400' : 'text-cyan-400 font-bold'}>
                    {sfxMuted ? 'Muted' : 'Enabled 🔊'}
                  </span>
                </button>
              </div>
            </div>

            {/* Drawer Bottom: Logout */}
            <div className="pt-4 border-t border-white/10">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    logout();
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-500/20 transition"
                >
                  <LogOut size={16} /> Logout Account
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-extrabold text-xs flex items-center justify-center text-center shadow-lg"
                >
                  Sign In / Register
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
