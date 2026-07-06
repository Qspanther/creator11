'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet } from '../../lib/api';
import { motion } from 'framer-motion';
import { Search, Bell, Wallet, User, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function TopBar() {
  const { user, token, logout, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (isAuthenticated && token) {
      apiGet('/wallet/balance', token)
        .then(data => setBalance(data.balance))
        .catch(() => {});
    }
  }, [isAuthenticated, token]);

  return (
    <header className="fixed top-0 left-[220px] right-0 h-16 z-30 flex items-center justify-between px-6"
      style={{
        background: 'rgba(10, 10, 15, 0.6)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Search */}
      <div className="relative w-72">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search creators, tournaments..."
          className="w-full !pl-10 !py-2 !text-sm !bg-white/[0.03] !border-white/[0.06] !rounded-xl"
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <>
            {/* Wallet Balance */}
            <Link href="/wallet">
              <motion.div
                whileHover={{ scale: 1.03 }}
                className="flex items-center gap-2 px-4 py-2 glass rounded-xl cursor-pointer"
              >
                <Wallet size={14} className="text-neon-gold" />
                <span className="label-upper text-neon-gold">Balance</span>
                <span className="text-sm font-bold text-text-primary">
                  ₹{balance !== null ? balance.toLocaleString() : '—'}
                </span>
              </motion.div>
            </Link>

            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative p-2 rounded-xl hover:bg-white/[0.04] transition-colors"
            >
              <Bell size={18} className="text-text-secondary" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-neon-purple rounded-full" />
            </motion.button>

            {/* Profile */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/[0.04]"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </motion.button>

              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-12 w-48 glass-strong p-2 rounded-xl z-50"
                >
                  <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                    <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                    <p className="text-xs text-text-muted truncate">{user?.email}</p>
                  </div>
                  <Link href="/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] text-sm text-text-secondary">
                    <User size={14} /> Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-danger/10 text-sm text-danger w-full"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </motion.div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-5 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Log In
              </motion.button>
            </Link>
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-5 py-2 text-sm font-medium bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl"
              >
                Sign Up
              </motion.button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
