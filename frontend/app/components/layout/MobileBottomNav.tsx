'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Shield, Wallet, Users, Crown } from 'lucide-react';
import { playSpatialSFX } from '../ui/StageControls3D';

const playerNavItems = [
  { label: 'Arena', href: '/', icon: Home },
  { label: 'Leagues', href: '/tournaments', icon: Trophy },
  { label: 'My Teams', href: '/my-teams', icon: Shield },
  { label: 'Pass', href: '/subscription', icon: Crown },
  { label: 'Wallet', href: '/wallet', icon: Wallet },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 px-1 py-1.5 flex items-center justify-around shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
      {playerNavItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => playSpatialSFX('click')}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl transition-all duration-200 ${
              active
                ? 'text-cyan-300 font-bold bg-white/5 shadow-inner shadow-cyan-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <Icon className={`w-4 h-4 transition-transform ${active ? 'scale-110 text-cyan-300' : ''}`} />
              {active && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
