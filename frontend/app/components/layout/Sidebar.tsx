'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Users, Shield, Wallet, Crown, Settings, Sparkles, ShieldAlert } from 'lucide-react';
import { playSpatialSFX } from '../ui/StageControls3D';
import { useAuth } from '../../lib/auth-context';
import { apiGet } from '../../lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [liveCount, setLiveCount] = useState<number>(0);
  const [creatorsCount, setCreatorsCount] = useState<number>(50);

  useEffect(() => {
    // Fetch real live tournaments / contests count
    apiGet('/tournaments')
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.tournaments;
        if (Array.isArray(list)) {
          const liveTournaments = list.filter((t: any) => t.status === 'live');
          let liveContests = 0;
          list.forEach((t: any) => {
            if (Array.isArray(t.contests)) {
              liveContests += t.contests.filter((c: any) => c.status === 'live').length;
            }
          });
          const count = liveContests > 0 ? liveContests : liveTournaments.length;
          setLiveCount(count);
        }
      })
      .catch(() => {});

    // Fetch real creators count
    apiGet('/creators')
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.creators;
        if (Array.isArray(list) && list.length > 0) {
          setCreatorsCount(list.length);
        }
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { label: '3D Arena Hub', href: '/', icon: Sparkles },
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    {
      label: 'Tournaments',
      href: '/tournaments',
      icon: Trophy,
      badge: `${liveCount} LIVE`,
      badgeColor:
        liveCount > 0
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30 animate-pulse'
          : 'bg-white/10 text-slate-400 border-white/10',
    },
    {
      label: 'Creators Vault',
      href: '/creators',
      icon: Users,
      badge: String(creatorsCount),
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    },
    { label: 'My Teams & Score', href: '/my-teams', icon: Shield },
    { label: '3D Wallet', href: '/wallet', icon: Wallet },
    { label: 'Pass & Refer', href: '/subscription', icon: Crown },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/10 bg-slate-950/75 backdrop-blur-2xl p-4 justify-between z-20">
      <div className="space-y-6">
        <Link
          href="/dashboard"
          onClick={() => playSpatialSFX('click')}
          className="flex items-center gap-3 px-2 pt-1 group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center font-black text-lg text-slate-950 shadow-lg shadow-purple-500/30 group-hover:scale-105 transition">
            C11
          </div>
          <div>
            <div className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent">
              CREATOR11
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
              3D Cyber Fantasy
            </div>
          </div>
        </Link>

        <nav className="space-y-1.5" aria-label="Sidebar Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => playSpatialSFX('click')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition ${
                  isActive
                    ? 'nav-btn-active border-cyan-400/50 text-white'
                    : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border font-bold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {user?.role === 'admin' && (
            <Link
              href="/admin"
              onClick={() => playSpatialSFX('click')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold border mt-2 transition ${
                pathname?.startsWith('/admin')
                  ? 'nav-btn-active border-amber-400/50 text-amber-200'
                  : 'border-amber-400/20 text-amber-300 hover:bg-amber-400/10'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Admin Panel</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold">
                ROOT
              </span>
            </Link>
          )}
        </nav>
      </div>

      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/70 to-slate-900/90 border border-purple-500/30 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Scoring Engine
          </span>
          <span className="text-[10px] font-mono text-cyan-400">cel_scoring.js</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-snug">
          Real-time YouTube metric deltas active.
        </p>
        <button
          type="button"
          onClick={() => {
            playSpatialSFX('power');
            window.dispatchEvent(new CustomEvent('creator11:shockwave'));
          }}
          className="w-full py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30 transition cursor-pointer"
        >
          ⚡ Boost 3D Arena
        </button>
      </div>
    </aside>
  );
}
