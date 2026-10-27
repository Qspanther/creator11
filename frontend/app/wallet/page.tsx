'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiGet, apiPost } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft,
  Trophy, ShieldCheck, History, CheckCircle, Copy, Check,
  QrCode, AlertCircle, Clock, ExternalLink, RefreshCw
} from 'lucide-react';

interface TransactionItem {
  id: string;
  type: string;
  amount: string;
  network?: string;
  txid?: string;
  wallet_address?: string;
  description: string;
  status: string;
  createdAt: string;
}

interface CryptoNetworks {
  [key: string]: {
    name: string;
    address: string;
    symbol: string;
    confirmations: number;
  };
}

export default function WalletPage() {
  const { user, token } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history' | 'kyc'>('deposit');
  
  // Deposit form state
  const [selectedNetwork, setSelectedNetwork] = useState<'TRC20' | 'BEP20' | 'ERC20'>('TRC20');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositTxid, setDepositTxid] = useState('');
  const [cryptoNetworks, setCryptoNetworks] = useState<CryptoNetworks>({
    TRC20: { name: 'Tron (TRC20)', address: 'TYDzsYUEpvnYmQK4WKnMBukZxDHzU4mTRC', symbol: 'USDT-TRC20', confirmations: 1 },
    BEP20: { name: 'BNB Smart Chain (BEP20)', address: '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3', symbol: 'USDT-BEP20', confirmations: 15 },
    ERC20: { name: 'Ethereum (ERC20)', address: '0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852', symbol: 'USDT-ERC20', confirmations: 12 },
  });
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Withdraw form state
  const [withdrawNetwork, setWithdrawNetwork] = useState<'TRC20' | 'BEP20' | 'ERC20'>('TRC20');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');

  // KYC state
  const [kycForm, setKycForm] = useState({ fullName: '', panNumber: '' });
  const [kycStatus, setKycStatus] = useState('none');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = () => {
    if (!token) return;
    apiGet('/wallet/balance', token).then(d => setBalance(d.balance)).catch(() => {});
    apiGet('/wallet/transactions', token).then(d => setTransactions(d)).catch(() => {});
    apiGet('/auth/me', token).then(d => setKycStatus(d.kycStatus || 'none')).catch(() => {});
    apiGet('/wallet/crypto-addresses', token).then(d => {
      if (d.networks) setCryptoNetworks(d.networks);
    }).catch(() => {});
  };

  useEffect(fetchData, [token]);

  const activeDepositAddress = cryptoNetworks[selectedNetwork]?.address || 'TYDzsYUEpvnYmQK4WKnMBukZxDHzU4mTRC';

  const handleCopy = () => {
    navigator.clipboard.writeText(activeDepositAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  const handleDepositSubmit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid deposit amount in USDT.' });
      return;
    }
    if (!depositTxid.trim()) {
      setMessage({ type: 'error', text: 'Please enter your Transaction Hash (TXID proof).' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await apiPost('/wallet/deposit-request', {
        amount: amt,
        network: selectedNetwork,
        txid: depositTxid.trim()
      }, token);

      setMessage({
        type: 'success',
        text: `Deposit proof of ${amt} USDT (${selectedNetwork}) submitted! Admin will verify and credit your balance.`
      });
      setDepositAmount('');
      setDepositTxid('');
      fetchData();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to submit deposit' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawSubmit = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid withdrawal amount in USDT.' });
      return;
    }
    if (amt > balance) {
      setMessage({ type: 'error', text: 'Withdrawal amount exceeds your available USDT balance.' });
      return;
    }
    if (!withdrawAddress.trim() || withdrawAddress.trim().length < 15) {
      setMessage({ type: 'error', text: 'Please provide a valid destination USDT wallet address.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await apiPost('/wallet/withdraw', {
        amount: amt,
        network: withdrawNetwork,
        wallet_address: withdrawAddress.trim()
      }, token);

      setBalance(res.balance);
      setMessage({
        type: 'success',
        text: `Withdrawal request for ${amt} USDT submitted! Payout will be sent to your ${withdrawNetwork} address.`
      });
      setWithdrawAmount('');
      setWithdrawAddress('');
      fetchData();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Withdrawal failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleKyc = async () => {
    if (!kycForm.fullName || !kycForm.panNumber) return;
    setLoading(true);
    setMessage(null);
    try {
      await apiPost('/wallet/kyc', kycForm, token);
      setKycStatus('verified');
      setMessage({ type: 'success', text: 'KYC verified successfully! You are now eligible for withdrawals.' });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'KYC verification failed' });
    } finally {
      setLoading(false);
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(activeDepositAddress)}`;

  return (
    <div className="widescreen-container py-4">
      {/* Page Title */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <WalletIcon size={32} className="text-neon-cyan" />
          USDT Crypto Treasury & Wallet
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Deposit USDT via TRC20, BEP20, or ERC20 networks to join tournaments and claim prizes
        </p>
      </motion.div>

      {/* Hero OLED Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 mb-8 border border-white/10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="label-upper text-neon-cyan flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-usdt-green animate-pulse" />
                Live USDT Balance
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl sm:text-6xl font-black tracking-tight text-white">
                {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-2xl font-black text-neon-cyan">USDT</span>
            </div>
            <p className="text-xs text-text-muted mt-2">
              Pegged 1:1 with USD • Zero deposit fee on Tron (TRC20)
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => { setActiveTab('deposit'); setMessage(null); }}
              className={`flex-1 md:flex-none px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'deposit'
                  ? 'bg-neon-cyan text-black shadow-lg shadow-neon-cyan/25'
                  : 'bg-white/[0.06] text-white hover:bg-white/[0.1]'
              }`}
            >
              <ArrowDownLeft size={16} />
              <span>Deposit USDT</span>
            </button>

            <button
              onClick={() => { setActiveTab('withdraw'); setMessage(null); }}
              className={`flex-1 md:flex-none px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'withdraw'
                  ? 'bg-neon-gold text-black shadow-lg shadow-neon-gold/25'
                  : 'bg-white/[0.06] text-white hover:bg-white/[0.1]'
              }`}
            >
              <ArrowUpRight size={16} />
              <span>Withdraw USDT</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tabs Selector */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'deposit', label: 'USDT Deposit (Multi-Network)', icon: ArrowDownLeft },
          { id: 'withdraw', label: 'USDT Payout Request', icon: ArrowUpRight },
          { id: 'history', label: 'Blockchain Transaction History', icon: History },
          { id: 'kyc', label: 'KYC & ID Verification', icon: ShieldCheck },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setMessage(null); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-white/[0.1] text-neon-cyan border border-neon-cyan/40 shadow-lg shadow-neon-cyan/10'
                  : 'bg-white/[0.02] text-text-secondary hover:text-white border border-white/5'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Message Feedback Banner */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl mb-6 text-sm flex items-center gap-3 border ${
            message.type === 'success'
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-danger/10 border-danger/30 text-danger'
          }`}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </motion.div>
      )}

      {/* TAB CONTENT: DEPOSIT */}
      {activeTab === 'deposit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: QR Code & Admin Wallet Address (5 cols) */}
          <div className="lg:col-span-5 glass-card p-6 border border-white/10 text-center">
            <h3 className="text-base font-extrabold text-white mb-1">Scan QR or Copy Address</h3>
            <p className="text-xs text-text-muted mb-6">
              Send USDT using only the selected blockchain network
            </p>

            {/* Dynamic QR Code Card */}
            <div className="w-52 h-52 mx-auto p-3 rounded-2xl bg-white shadow-2xl flex items-center justify-center mb-6">
              <img
                src={qrCodeUrl}
                alt="USDT Deposit QR"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Network Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-xs font-bold mb-4">
              <span>Network:</span>
              <span className="font-extrabold">{cryptoNetworks[selectedNetwork]?.name}</span>
            </div>

            {/* Admin Receiving Wallet Address Box */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="label-upper text-[10px] text-text-muted">Admin Receiving Address</span>
                <span className="text-[10px] text-usdt-green font-bold">1-Click Copy</span>
              </div>
              <p className="font-mono text-xs text-text-primary break-all mb-4 select-all">
                {activeDepositAddress}
              </p>

              <button
                onClick={handleCopy}
                className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  copiedAddress
                    ? 'bg-success text-black'
                    : 'bg-neon-cyan text-black hover:bg-neon-cyan/90'
                }`}
              >
                {copiedAddress ? (
                  <>
                    <Check size={14} />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Wallet Address</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Network Selector & TXID Proof Submission (7 cols) */}
          <div className="lg:col-span-7 glass-card p-6 sm:p-8 border border-white/10">
            <h3 className="text-lg font-extrabold text-white mb-2">Step 1: Choose Blockchain Network</h3>
            <p className="text-xs text-text-muted mb-6">
              Ensure you select the exact network you are transferring from to avoid coin loss
            </p>

            {/* Network Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              {(['TRC20', 'BEP20', 'ERC20'] as const).map(net => {
                const isSelected = selectedNetwork === net;
                return (
                  <button
                    key={net}
                    onClick={() => setSelectedNetwork(net)}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neon-cyan/[0.08] border-neon-cyan shadow-lg shadow-neon-cyan/15'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-black text-white">{net}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-neon-cyan" />}
                    </div>
                    <p className="text-[10px] text-text-muted font-medium">
                      {net === 'TRC20' ? 'Tron (Fast & $1 Fee)' : net === 'BEP20' ? 'BNB Chain (Low Fee)' : 'Ethereum ($5+ Gas)'}
                    </p>
                  </button>
                );
              })}
            </div>

            <h3 className="text-lg font-extrabold text-white mb-2">Step 2: Submit Deposit & TXID Proof</h3>
            <p className="text-xs text-text-muted mb-6">
              Enter the USDT amount sent and paste your blockchain Transaction Hash (TXID)
            </p>

            {/* Amount input */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-text-secondary block mb-1.5 uppercase tracking-wider">
                  Deposit Amount (USDT)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  className="w-full !py-3.5 !text-base font-bold"
                />

                {/* Quick Amount Chips */}
                <div className="flex gap-2 mt-2">
                  {[10, 25, 50, 100, 250].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(amt.toString())}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white transition-colors cursor-pointer"
                    >
                      +{amt} USDT
                    </button>
                  ))}
                </div>
              </div>

              {/* TXID Input */}
              <div>
                <label className="text-xs font-bold text-text-secondary block mb-1.5 uppercase tracking-wider">
                  Transaction Hash / TXID Proof
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8a3f7c2e... or 0x9b1a4c..."
                  value={depositTxid}
                  onChange={e => setDepositTxid(e.target.value)}
                  className="w-full !py-3.5 !text-sm font-mono"
                />
                <p className="text-[11px] text-text-muted mt-1.5">
                  Found in your crypto wallet (TrustWallet, Binance, OKX, etc.) after transfer is completed.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleDepositSubmit}
              disabled={loading || !depositAmount || !depositTxid}
              className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-neon-cyan via-blue-500 to-neon-purple text-black cursor-pointer shadow-xl shadow-neon-cyan/20 hover:opacity-95 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting Proof...' : 'Submit Deposit Proof for Verification'}
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: WITHDRAW */}
      {activeTab === 'withdraw' && (
        <div className="max-w-2xl mx-auto glass-card p-6 sm:p-8 border border-white/10">
          <h3 className="text-xl font-extrabold text-white mb-1">Request USDT Payout</h3>
          <p className="text-xs text-text-muted mb-6">
            Withdraw your winnings directly to your personal crypto wallet
          </p>

          {/* KYC Status warning */}
          {kycStatus !== 'verified' && (
            <div className="p-4 rounded-2xl bg-warning/10 border border-warning/30 text-warning text-xs flex items-center justify-between gap-4 mb-6">
              <span>⚠️ Identity verification (KYC) required before submitting your first withdrawal.</span>
              <button
                onClick={() => setActiveTab('kyc')}
                className="px-3 py-1.5 rounded-lg bg-warning text-black font-black uppercase text-[10px] shrink-0 cursor-pointer"
              >
                Verify KYC
              </button>
            </div>
          )}

          <div className="space-y-5 mb-8">
            {/* Network Selector */}
            <div>
              <label className="text-xs font-bold text-text-secondary block mb-1.5 uppercase tracking-wider">
                Select Payout Network
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['TRC20', 'BEP20', 'ERC20'] as const).map(net => (
                  <button
                    key={net}
                    onClick={() => setWithdrawNetwork(net)}
                    className={`py-3 px-4 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      withdrawNetwork === net
                        ? 'bg-neon-gold text-black border-neon-gold shadow-md shadow-neon-gold/20'
                        : 'bg-white/[0.04] text-text-secondary border-white/5 hover:text-white'
                    }`}
                  >
                    USDT-{net}
                  </button>
                ))}
              </div>
            </div>

            {/* Destination Address */}
            <div>
              <label className="text-xs font-bold text-text-secondary block mb-1.5 uppercase tracking-wider">
                Destination USDT Wallet Address
              </label>
              <input
                type="text"
                placeholder={`Paste your ${withdrawNetwork} recipient address`}
                value={withdrawAddress}
                onChange={e => setWithdrawAddress(e.target.value)}
                className="w-full !py-3.5 !text-sm font-mono"
              />
            </div>

            {/* Amount */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Withdrawal Amount (USDT)
                </label>
                <span className="text-xs text-text-muted">
                  Max: <strong className="text-white">{balance.toFixed(2)} USDT</strong>
                </span>
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                className="w-full !py-3.5 !text-base font-bold"
              />
            </div>
          </div>

          <button
            onClick={handleWithdrawSubmit}
            disabled={loading || kycStatus !== 'verified' || !withdrawAmount || !withdrawAddress}
            className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-wider bg-neon-gold text-black cursor-pointer shadow-xl shadow-neon-gold/20 hover:opacity-95 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Confirm & Submit Withdrawal Request'}
          </button>
        </div>
      )}

      {/* TAB CONTENT: HISTORY */}
      {activeTab === 'history' && (
        <div className="glass-card p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
            <h3 className="text-lg font-extrabold text-white">All Blockchain Transactions</h3>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-xs text-neon-cyan hover:underline cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="py-16 text-center text-text-muted">
              <History size={40} className="mx-auto mb-3 opacity-40" />
              <p>No transaction history recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map(tx => {
                const isPositive = parseFloat(tx.amount) > 0;
                return (
                  <div
                    key={tx.id}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'deposit' ? 'bg-usdt-green/15 text-usdt-green' :
                        tx.type === 'withdraw' ? 'bg-danger/15 text-danger' :
                        tx.type === 'prize' ? 'bg-neon-gold/15 text-neon-gold' :
                        'bg-neon-cyan/15 text-neon-cyan'
                      }`}>
                        {tx.type === 'deposit' ? <ArrowDownLeft size={18} /> :
                         tx.type === 'withdraw' ? <ArrowUpRight size={18} /> :
                         <Trophy size={18} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white capitalize">{tx.description || tx.type}</p>
                          {tx.network && (
                            <span className="px-2 py-0.2 rounded-md bg-white/[0.05] text-[10px] font-mono text-neon-cyan">
                              {tx.network}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {new Date(tx.createdAt).toLocaleString()}
                          {tx.txid && (
                            <span className="ml-2 font-mono text-text-secondary">
                              TXID: {tx.txid.slice(0, 8)}...{tx.txid.slice(-6)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                      <p className={`text-base font-black ${isPositive ? 'text-usdt-green' : 'text-danger'}`}>
                        {isPositive ? '+' : ''}{parseFloat(tx.amount).toFixed(2)} USDT
                      </p>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
                        tx.status === 'completed' ? 'bg-success/15 text-success' :
                        tx.status === 'pending' ? 'bg-warning/15 text-warning animate-pulse' :
                        'bg-danger/15 text-danger'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: KYC */}
      {activeTab === 'kyc' && (
        <div className="max-w-xl mx-auto glass-card p-6 sm:p-8 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-neon-cyan/20 text-neon-cyan flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Identity & Compliance</h3>
              <p className="text-xs text-text-muted">Instant mock KYC verification for payouts</p>
            </div>
          </div>

          <div className="mb-6 p-4 rounded-2xl bg-black/40 border border-white/5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted font-bold uppercase">Current Status:</span>
              <span className={`font-black uppercase px-2.5 py-0.5 rounded-full text-[10px] ${
                kycStatus === 'verified' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
              }`}>
                {kycStatus.toUpperCase()}
              </span>
            </div>
          </div>

          {kycStatus === 'verified' ? (
            <div className="p-6 rounded-2xl bg-success/10 border border-success/30 text-center">
              <CheckCircle size={36} className="text-success mx-auto mb-2" />
              <h4 className="text-base font-bold text-white mb-1">KYC Verified Successfully</h4>
              <p className="text-xs text-text-muted">You are 100% authorized for crypto withdrawals.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-secondary block mb-1 uppercase tracking-wider">
                  Legal Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={kycForm.fullName}
                  onChange={e => setKycForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full !py-3"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-secondary block mb-1 uppercase tracking-wider">
                  Government ID / Document ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. ABCDE1234F"
                  value={kycForm.panNumber}
                  onChange={e => setKycForm(prev => ({ ...prev, panNumber: e.target.value }))}
                  className="w-full !py-3"
                />
              </div>

              <button
                onClick={handleKyc}
                disabled={loading || !kycForm.fullName || !kycForm.panNumber}
                className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider bg-neon-cyan text-black cursor-pointer shadow-lg shadow-neon-cyan/20 disabled:opacity-40"
              >
                {loading ? 'Verifying...' : 'Verify Identity Now'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
