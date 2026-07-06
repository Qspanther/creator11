'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { apiPost } from '../lib/api';
import { Mail, Lock, Zap, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiPost('/auth/login', form);

      if (data.requiresOtp) {
        sessionStorage.setItem('otp_email', form.email);
        sessionStorage.setItem('mock_otp', data.mockOtp);
        router.push('/verify-otp');
        return;
      }

      login(data.token, data.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
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

        <div className="glass p-8 glow-purple">
          <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
          <p className="text-sm text-text-secondary mb-6">Log in to your account</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10" />
              <input
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                className="w-full !pl-10"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10" />
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                className="w-full !pl-10"
              />
            </div>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 text-sm font-bold bg-gradient-to-r from-neon-purple to-neon-purple/80 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Log In'} {!loading && <ArrowRight size={16} />}
            </motion.button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-neon-purple hover:underline font-medium">Sign Up</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
