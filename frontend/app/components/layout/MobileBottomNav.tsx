'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home, Trophy, Users, Shield, Wallet, ArrowLeft, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdminRoute = pathname.startsWith('/admin');

  const playerNavItems = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/tournaments', label: 'Leagues', icon: Trophy },
    { href: '/my-teams', label: 'My Teams', icon: Shield },
    { href: '/wallet', label: 'Wallet', icon: Wallet },
    { href: '/creators', label: 'Creators', icon: Users },
  ];

  const adminNavItems = [
    { href: '/admin', label: 'Console', icon: Home },
    { href: '/admin/tournaments', label: 'Leagues', icon: Trophy },
    { href: '/admin/creators', label: 'Studio', icon: Users },
    { href: '/admin/crypto', label: 'INR Gateway', icon: Wallet },
    { href: '/dashboard', label: 'Exit Admin', icon: ArrowLeft },
  ];

  const items = isAdminRoute ? adminNavItems : playerNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#09090d]/95 backdrop-blur-2xl border-t border-white/10 px-2 pt-1 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className="flex-1 py-1">
              <motion.div
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center justify-center relative cursor-pointer"
              >
                {/* Active indicator top bar */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-pill"
                    className="absolute -top-1 w-7 h-1 rounded-full bg-gradient-to-r from-neon-purple to-neon-cyan shadow-[0_0_8px_rgba(0,240,255,0.8)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                <div
                  className={`p-1.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? isAdminRoute
                        ? 'text-neon-cyan bg-neon-cyan/15'
                        : 'text-neon-purple bg-neon-purple/15'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'} />
                </div>
                
                <span
                  className={`text-[10px] mt-0.5 tracking-tight ${
                    isActive
                      ? isAdminRoute
                        ? 'text-neon-cyan font-bold'
                        : 'text-white font-bold'
                      : 'text-text-muted font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}

        {/* If player is admin but browsing player app, show tiny admin button */}
        {!isAdminRoute && user?.role === 'admin' && (
          <Link href="/admin" className="py-1">
            <motion.div
              whileTap={{ scale: 0.88 }}
              className="flex flex-col items-center justify-center cursor-pointer px-1"
            >
              <div className="p-1.5 rounded-xl text-neon-cyan/80 bg-neon-cyan/10">
                <ShieldAlert size={20} className="stroke-[1.8]" />
              </div>
              <span className="text-[10px] mt-0.5 text-neon-cyan font-bold">Admin</span>
            </motion.div>
          </Link>
        )}
      </div>
    </nav>
  );
}
