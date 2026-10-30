'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '../lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mail, Lock, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiPost('/auth/forgot-password', { email });
      setSuccessMsg('OTP sent! Please check your email inbox.');
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiPost('/auth/reset-password', { email, otp, newPassword });
      setSuccessMsg('Password reset successful! Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        
        <div className="glass p-8 glow-cyan">
          <div className="w-12 h-12 rounded-full bg-neon-cyan/20 text-neon-cyan flex items-center justify-center mb-6 mx-auto">
            <KeyRound size={24} />
          </div>
          
          <h2 className="text-2xl font-bold mb-2 text-center">Reset Password</h2>
          <p className="text-sm text-text-secondary mb-6 text-center">
            {step === 1 ? "Enter your email to receive an OTP" : "Enter the OTP sent to your email and set a new password"}
          </p>

          {error && <div className="mb-4 p-3 rounded-xl bg-danger/10 text-sm text-danger text-center">{error}</div>}
          {successMsg && <div className="mb-4 p-3 rounded-xl bg-success/10 text-sm text-success text-center">{successMsg}</div>}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10" />
                <input
                  type="email"
                  placeholder="Registered Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full !pl-10"
                />
              </div>
              <motion.button
                type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 text-sm font-bold bg-neon-cyan text-black rounded-xl"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <ShieldCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10" />
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="w-full !pl-10 font-mono tracking-widest"
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10" />
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  className="w-full !pl-10"
                />
              </div>
              <motion.button
                type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 text-sm font-bold bg-neon-cyan text-black rounded-xl"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </motion.button>
            </form>
          )}

          <div className="text-center mt-6">
            <Link href="/login" className="text-sm text-text-muted hover:text-white transition-colors">
              Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
