'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { motion } from 'framer-motion';
import { apiPost } from '../lib/api';
import { ShieldCheck, Zap } from 'lucide-react';

export default function VerifyOtpPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [mockOtp, setMockOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const e = sessionStorage.getItem('otp_email');
    const o = sessionStorage.getItem('mock_otp');
    if (e) setEmail(e);
    if (o) setMockOtp(o);
    if (!e) router.push('/signup');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiPost('/auth/verify-otp', { email, otp });
      login(data.token, data.user);
      sessionStorage.removeItem('otp_email');
      sessionStorage.removeItem('mock_otp');
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold">Creator11</span>
        </div>

        <div className="glass p-8 glow-cyan">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck size={28} className="text-neon-cyan" />
            <div>
              <h2 className="text-2xl font-bold">Verify OTP</h2>
              <p className="text-sm text-text-secondary">Enter the code sent to {email}</p>
            </div>
          </div>

          {/* MOCK OTP Display */}
          {mockOtp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-xl bg-neon-purple/10 border border-neon-purple/20"
            >
              <p className="text-xs text-text-muted mb-1">🔑 MOCK OTP (for testing)</p>
              <p className="text-3xl font-mono font-bold text-neon-purple tracking-[0.3em]">{mockOtp}</p>
            </motion.div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              className="w-full text-center !text-2xl !tracking-[0.5em] !font-mono"
            />
            <motion.button
              type="submit"
              disabled={loading || otp.length !== 6}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 text-sm font-bold bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-xl disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
