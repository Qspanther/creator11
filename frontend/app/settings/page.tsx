'use client';

import { useAuth } from '../lib/auth-context';
import { motion } from 'framer-motion';
import { Settings, User, Mail, Shield, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings size={28} className="text-text-secondary" /> Settings
        </h1>
      </motion.div>

      <div className="glass p-6 mb-4">
        <h3 className="text-lg font-bold mb-4">Account Information</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
            <User size={16} className="text-text-muted" />
            <div>
              <p className="text-xs text-text-muted">Name</p>
              <p className="text-sm font-medium">{user?.name || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
            <Mail size={16} className="text-text-muted" />
            <div>
              <p className="text-xs text-text-muted">Email</p>
              <p className="text-sm font-medium">{user?.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
            <Shield size={16} className="text-text-muted" />
            <div>
              <p className="text-xs text-text-muted">KYC Status</p>
              <p className="text-sm font-medium capitalize">{user?.kycStatus || 'none'}</p>
            </div>
          </div>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleLogout}
        className="w-full py-3 glass rounded-xl text-danger font-medium flex items-center justify-center gap-2 hover:bg-danger/10 transition-colors"
      >
        <LogOut size={16} /> Sign Out
      </motion.button>
    </div>
  );
}
