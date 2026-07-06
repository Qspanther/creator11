'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiGet, apiPost } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft,
  Trophy, CreditCard, ShieldCheck, History, CheckCircle
} from 'lucide-react';

interface TransactionItem {
  id: string;
  type: string;
  amount: string;
  description: string;
  status: string;
  created_at: string;
}

export default function WalletPage() {
  const { user, token } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'add' | 'withdraw' | 'kyc' | 'history'>('add');
  const [addAmount, setAddAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [kycForm, setKycForm] = useState({ fullName: '', panNumber: '' });
  const [kycStatus, setKycStatus] = useState('none');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = () => {
    if (!token) return;
    apiGet('/wallet/balance', token).then(d => setBalance(d.balance)).catch(() => {});
    apiGet('/wallet/transactions', token).then(d => setTransactions(d)).catch(() => {});
    apiGet('/auth/me', token).then(d => setKycStatus(d.kycStatus || 'none')).catch(() => {});
  };

  useEffect(fetchData, [token]);

  const handleAddFunds = async () => {
    const amt = parseFloat(addAmount);
    if (!amt || amt <= 0) return;
    setLoading(true);
    setMessage('');
    try {
      const data = await apiPost('/wallet/add-funds', { amount: amt }, token);
      setBalance(data.balance);
      setMessage(`₹${amt} added successfully!`);
      setAddAmount('');
      fetchData();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) return;
    setLoading(true);
    setMessage('');
    try {
      const data = await apiPost('/wallet/withdraw', { amount: amt }, token);
      setBalance(data.balance);
      setMessage(`₹${amt} withdrawn successfully!`);
      setWithdrawAmount('');
      fetchData();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKyc = async () => {
    if (!kycForm.fullName || !kycForm.panNumber) return;
    setLoading(true);
    setMessage('');
    try {
      await apiPost('/wallet/kyc', kycForm, token);
      setKycStatus('verified');
      setMessage('KYC verified successfully!');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft size={14} className="text-success" />;
      case 'withdraw': return <ArrowUpRight size={14} className="text-danger" />;
      case 'entry_fee': return <Trophy size={14} className="text-neon-purple" />;
      case 'prize': return <Trophy size={14} className="text-neon-gold" />;
      default: return <CreditCard size={14} className="text-text-muted" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <WalletIcon size={28} className="text-neon-gold" /> Wallet
        </h1>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass p-8 mb-8 glow-gold text-center"
      >
        <p className="label-upper text-neon-gold mb-2">Available Balance</p>
        <p className="text-5xl font-black">₹{balance.toLocaleString()}</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'add', label: 'Add Funds', icon: Plus },
          { key: 'withdraw', label: 'Withdraw', icon: ArrowUpRight },
          { key: 'kyc', label: 'KYC', icon: ShieldCheck },
          { key: 'history', label: 'History', icon: History },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key as typeof activeTab); setMessage(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-all ${
              activeTab === tab.key
                ? 'bg-neon-purple/10 text-neon-purple border border-neon-purple/30'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="glass p-6"
        >
          {activeTab === 'add' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Add Funds</h3>
              <p className="text-sm text-text-secondary mb-4">Instantly credit your wallet (mock payment)</p>
              <div className="flex gap-2 mb-4">
                {[100, 500, 1000, 5000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setAddAmount(amt.toString())}
                    className="px-4 py-2 text-sm glass rounded-xl hover:bg-white/[0.06]"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={addAmount}
                  onChange={e => setAddAmount(e.target.value)}
                  className="flex-1"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddFunds}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-success to-success/80 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Funds'}
                </motion.button>
              </div>
            </div>
          )}

          {activeTab === 'withdraw' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Withdraw Funds</h3>
              {kycStatus !== 'verified' ? (
                <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                  <p className="text-sm text-warning">KYC verification required before withdrawal. Please complete KYC first.</p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    className="flex-1"
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleWithdraw}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-purple/80 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Withdraw'}
                  </motion.button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'kyc' && (
            <div>
              <h3 className="text-lg font-bold mb-4">KYC Verification</h3>
              {kycStatus === 'verified' ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
                  <CheckCircle size={20} className="text-success" />
                  <p className="text-sm text-success font-medium">KYC verified successfully</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Full Legal Name"
                    value={kycForm.fullName}
                    onChange={e => setKycForm({ ...kycForm, fullName: e.target.value })}
                    className="w-full"
                  />
                  <input
                    type="text"
                    placeholder="PAN Number (e.g., ABCDE1234F)"
                    value={kycForm.panNumber}
                    onChange={e => setKycForm({ ...kycForm, panNumber: e.target.value.toUpperCase() })}
                    maxLength={10}
                    className="w-full"
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleKyc}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-xl font-bold text-sm disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Submit KYC'}
                  </motion.button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Transaction History</h3>
              {transactions.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
                      {getTypeIcon(tx.type)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{tx.description || tx.type}</p>
                        <p className="text-xs text-text-muted">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`text-sm font-bold ${parseFloat(tx.amount) >= 0 ? 'text-success' : 'text-danger'}`}>
                        {parseFloat(tx.amount) >= 0 ? '+' : ''}₹{Math.abs(parseFloat(tx.amount)).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 rounded-xl bg-success/10 border border-success/20 text-sm text-success"
        >
          {message}
        </motion.div>
      )}
    </div>
  );
}
