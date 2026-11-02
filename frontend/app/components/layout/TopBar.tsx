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
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true, isRead: true } : n)));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await apiPut('/notifications/read-all', {}, token);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, isRead: true })));
    } catch {}
  };

  const formatTimeAgo = (dateStr?: string | Date) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diff) || diff < 0) return 'Just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return '30d ago';
  };

  const unreadCount = notifications.filter((n) => !n.is_read && !n.isRead).length;

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

          {/* Notifications Bell Trigger */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                playSpatialSFX('click');
                setShowNotif((prev) => !prev);
              }}
              className="relative p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-400/40 transition shrink-0 cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-fuchsia-500 text-[10px] font-bold flex items-center justify-center text-white shadow-sm shadow-fuchsia-500/50 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
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

      {/* FLOATING NOTIFICATIONS POPUP DIALOG (Foreground Popover, completely isolated from header) */}
      {showNotif && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-2 sm:p-5 pointer-events-none">
          {/* Dimmed backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto transition-opacity animate-in fade-in duration-200"
            onClick={() => setShowNotif(false)}
          />

          {/* Floating Popup Box popping out to foreground */}
          <div className="relative pointer-events-auto mt-14 sm:mt-16 w-full max-w-[390px] bg-[#0c101a] border-2 border-cyan-400/60 rounded-2xl shadow-[0_25px_60px_-10px_rgba(0,0,0,0.95),0_0_35px_rgba(0,240,255,0.25)] flex flex-col max-h-[calc(100vh-5rem)] overflow-hidden transition-all transform animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/[0.04] border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-400/30">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white tracking-wide">Notifications</h3>
                  <p className="text-[10px] text-cyan-300 font-medium">30 Days Activity Log</p>
                </div>
                <span className="ml-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold">
                  {notifications.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline transition px-2 py-1 rounded-lg hover:bg-cyan-500/10 cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowNotif(false)}
                  className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
                  aria-label="Close notifications"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable Notifications Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[380px] sm:max-h-[460px] custom-scrollbar overscroll-contain">
              {notifications.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                    <Bell className="w-5 h-5 opacity-40" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">No notifications in past 30 days</p>
                  <p className="text-xs text-slate-500 max-w-[240px] mx-auto">
                    Contest updates, match starts, and rewards will show up here.
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const isUnread = !n.is_read && !n.isRead;
                  return (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        isUnread
                          ? 'bg-cyan-950/40 border-cyan-400/50 shadow-sm shadow-cyan-500/10 hover:bg-cyan-950/60'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                      }`}
                    >
                      <div className="pt-1.5 shrink-0">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${
                            isUnread ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.8)]' : 'bg-slate-600'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4 className="text-xs font-bold text-white truncate">
                            {n.title || 'League Alert'}
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {formatTimeAgo(n.createdAt || n.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed break-words">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 bg-black/40 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Past 30 Days Activity
              </span>
              <span className="text-slate-500 font-mono">Auto-purged &gt;30d</span>
            </div>
          </div>
        </div>
      )}

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
