'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home, LayoutDashboard, Trophy, Users, Shield,
  Wallet, Settings, Gamepad2, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/creators', label: 'Creators', icon: Users },
  { href: '/my-teams', label: 'My Teams', icon: Shield },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="hidden md:flex glass-sidebar fixed left-0 top-0 h-full w-[220px] z-40 flex-col py-6">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-3 px-6 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
          <Gamepad2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-text-primary tracking-tight">Creator11</h1>
          <p className="text-[8px] text-neon-cyan font-bold tracking-widest uppercase">Creator Entertainment League</p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-neon-purple/10 border-glow-purple text-neon-purple'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-neon-purple' : ''} />
                <span className="text-sm font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute right-0 w-[3px] h-6 bg-neon-purple rounded-l-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
        {/* Admin Link for Admins Only */}
        {user?.role === 'admin' && (
          <div className="px-6 mt-4 pt-4 border-t border-white/5">
            <Link
              href="/admin"
              className="group flex flex-col gap-1 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden text-neon-cyan hover:bg-neon-cyan/10"
            >
              <div className="flex items-center gap-3 relative z-10">
                <ShieldAlert size={20} className="text-neon-cyan" />
                <span className="font-medium tracking-wide">Admin Panel</span>
              </div>
            </Link>
          </div>
        )}
      </nav>

      {/* User Mini Profile */}
      <div className="px-6 mt-auto">
        <p className="text-[10px] text-text-muted tracking-wider">v1.0.0 • BETA</p>
      </div>
    </aside>
  );
}
