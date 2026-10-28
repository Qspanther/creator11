'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home, Trophy, Users, Shield, Wallet, Sliders, ArrowLeft, Gamepad2
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Console Overview', icon: Home },
  { href: '/admin/tournaments', label: '4 Battle Leagues', icon: Trophy },
  { href: '/admin/creators', label: 'Creator Studio', icon: Users },
  { href: '/admin/crypto', label: 'USDT Crypto Gateway', icon: Wallet },
  { href: '/admin/formula', label: 'Points Formula', icon: Sliders },
  { href: '/admin/users', label: 'Player Management', icon: Shield },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex glass-sidebar fixed left-0 top-0 h-full w-[240px] z-40 flex-col py-6">
      {/* Admin Branding */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center shadow-lg shadow-neon-purple/20">
            <Gamepad2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-tight uppercase">Master Console</h1>
            <p className="text-[10px] text-neon-cyan font-bold tracking-widest uppercase">Admin Suite</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-neon-cyan/[0.12] text-neon-cyan border border-neon-cyan/30 shadow-md shadow-neon-cyan/10 font-bold'
                    : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-neon-cyan' : ''} />
                <span className="text-xs font-semibold">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Return to Public Player App */}
      <div className="px-4 mt-auto space-y-2">
        <Link href="/dashboard">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-text-muted hover:text-white transition-colors cursor-pointer text-xs font-bold">
            <ArrowLeft size={14} />
            <span>Switch to Player Portal</span>
          </div>
        </Link>
        <p className="px-4 text-[10px] text-text-muted tracking-wider">CREATOR11 MASTER • v2.0</p>
      </div>
    </aside>
  );
}
