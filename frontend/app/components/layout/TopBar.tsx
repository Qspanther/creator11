'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { apiGet, apiPut } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, Wallet, User, LogOut, Check, Trophy, Info, Gamepad2 } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function TopBar() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const { user, token, logout, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = async () => {
    if (isAuthenticated && token) {
      try {
        const data = await apiGet('/notifications', token);
        setNotifications(data);
      } catch (err) {}
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      // Initial fetch
      apiGet('/wallet/balance', token)
        .then(data => setBalance(data.balance))
        .catch(() => {});
      
      fetchNotifications();
      
      // Poll every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, token]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiPut(`/notifications/${id}/read`, {}, token!);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await apiPut(`/notifications/read-all`, {}, token!);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {}
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-16 z-30 flex items-center justify-between px-3.5 sm:px-6 transition-all duration-200 ${
        isAdminRoute ? 'md:left-[240px]' : 'md:left-[220px]'
      }`}
      style={{
        background: 'rgba(10, 10, 15, 0.8)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
      }}
    >
      {/* Mobile Branding (Visible only on mobile screens) */}
      <div className="flex items-center gap-2 md:hidden">
        <Link href={isAdminRoute ? '/admin' : '/dashboard'} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center shadow-lg shadow-neon-purple/20">
            <Gamepad2 size={16} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-white tracking-tight leading-none">Creator11</span>
            {isAdminRoute ? (
              <span className="text-[9px] text-neon-cyan font-bold tracking-wider uppercase">Console</span>
            ) : (
              <span className="text-[9px] text-neon-purple font-semibold tracking-wider uppercase">Creator Entertainment League</span>
            )}
          </div>
        </Link>
      </div>

      {/* Desktop Search (Hidden on small mobile screens to save precious space) */}
      <div className="hidden sm:block relative w-64 md:w-72">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search creators, tournaments..."
          className="w-full !pl-10 !py-2 !text-sm !bg-white/[0.03] !border-white/[0.06] !rounded-xl"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 sm:gap-4 relative">
        {isAuthenticated ? (
          <>
            {/* Wallet Balance Pill */}
            <Link href="/wallet">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 glass rounded-xl cursor-pointer border border-white/10"
              >
                <Wallet size={14} className="text-neon-gold shrink-0" />
                <span className="hidden sm:inline label-upper text-neon-gold text-[10px]">Balance</span>
                <span className="text-xs sm:text-sm font-bold text-text-primary">
                  {balance !== null ? `${parseFloat(balance.toString()).toFixed(1)}` : '—'}
                  <span className="text-[10px] text-neon-gold ml-1 font-semibold">USDT</span>
                </span>
              </motion.div>
            </Link>

            {/* Notifications */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu);
                  setShowProfileMenu(false);
                }}
                className="relative p-2 rounded-xl hover:bg-white/[0.04] transition-colors"
                aria-label="Notifications"
              >
                <Bell size={18} className="text-text-secondary" />
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-neon-purple rounded-full shadow-[0_0_10px_rgba(157,78,221,0.8)]"
                  />
                )}
              </motion.button>

              <AnimatePresence>
                {showNotifMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 w-auto sm:w-80 glass-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 border border-white/10"
                  >
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
                      <h3 className="font-bold text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-xs text-neon-cyan hover:underline flex items-center gap-1">
                          <Check size={12}/> Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-text-muted text-sm">No new notifications</div>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => { if(!n.isRead) handleMarkAsRead(n.id); }}
                            className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors flex gap-3 ${!n.isRead ? 'bg-neon-purple/5' : ''}`}
                          >
                            <div className="mt-1">
                              {n.type.includes('tournament') ? <Trophy size={16} className="text-neon-gold" /> : 
                               n.type.includes('creator') ? <User size={16} className="text-neon-cyan" /> :
                               <Info size={16} className="text-neon-purple" />}
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm ${!n.isRead ? 'font-bold text-white' : 'font-medium text-text-secondary'}`}>{n.title}</p>
                              <p className="text-xs text-text-muted mt-1 leading-relaxed">{n.message}</p>
                            </div>
                            {!n.isRead && <div className="w-2 h-2 rounded-full bg-neon-purple mt-2 flex-shrink-0" />}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar & Menu */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifMenu(false);
                }}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/[0.04]"
                aria-label="User Profile"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </motion.button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-14 w-52 glass-strong p-2 rounded-xl z-50 border border-white/10 shadow-2xl"
                  >
                    <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                      <p className="text-sm font-semibold text-text-primary">{user?.name}</p>
                      <p className="text-xs text-text-muted truncate">{user?.email}</p>
                    </div>
                    <Link href="/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] text-sm text-text-secondary">
                      <User size={14} /> Profile & Settings
                    </Link>
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-danger/10 text-sm text-danger w-full text-left"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Log In
              </motion.button>
            </Link>
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-medium bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl shadow-md shadow-neon-purple/20"
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
