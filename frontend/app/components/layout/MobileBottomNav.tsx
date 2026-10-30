'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Shield, Wallet, Users } from 'lucide-react';

const playerNavItems = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Leagues', href: '/tournaments', icon: Trophy },
  { label: 'My Teams', href: '/my-teams', icon: Shield },
  { label: 'Wallet', href: '/wallet', icon: Wallet },
  { label: 'Creators', href: '/creators', icon: Users },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/90 backdrop-blur-2xl border-t border-white/15 px-2 py-2 flex items-center justify-around">
      {playerNavItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 text-[11px] font-semibold transition ${
              active ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
