'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiGet, apiPost } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import TiltCard3D from '../components/ui/TiltCard3D';
import {
  Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft,
  Trophy, ShieldCheck, History, CheckCircle, Copy, Check,
  QrCode, AlertCircle, Clock, ExternalLink, RefreshCw,
  Building2, Smartphone, IndianRupee, Zap, Info, Shield
} from 'lucide-react';

interface TransactionItem {
  id: string;
  type: string;
  amount: string | number;
  network?: string;
  txid?: string;
  wallet_address?: string;
  description: string;
  status: string;
  createdAt: string;
}

interface WalletConfig {
  currency: string;
  currencySymbol: string;
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  upi: {
    id: string;
    name: string;
    qrPayload: string;
  };
  bank: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
  };
}

export default function WalletPage() {
  const { user, token } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history' | 'kyc'>('deposit');

  // Wallet Gateway Config (INR)
  const [config, setConfig] = useState<WalletConfig>({
    currency: 'INR',
    currencySymbol: '₹',
    minDeposit: 99,
    maxDeposit: 100000,
    minWithdrawal: 100,
    upi: {
      id: 'creator11.league@upi',
      name: 'Creator Entertainment League',
      qrPayload: 'upi://pay?pa=creator11.league@upi&pn=Creator%20Entertainment%20League&cu=INR'
    },
    bank: {
      accountName: 'Creator Entertainment League Pvt Ltd',
      accountNumber: '50200084729104',
      ifsc: 'HDFC0000240',
      bankName: 'HDFC Bank Ltd'
    }
  });

  // Deposit Form State (INR UPI)
  const [depositAmount, setDepositAmount] = useState('99');
  const [requiredAmount, setRequiredAmount] = useState<string | null>(null);
  const [depositUtr, setDepositUtr] = useState('');
  const [senderUpi, setSenderUpi] = useState('');
  const [depositMethod, setDepositMethod] = useState<'UPI' | 'BANK'>('UPI');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  // Withdraw Form State (INR)
  const [withdrawMethod, setWithdrawMethod] = useState<'UPI' | 'BANK'>('UPI');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [bankForm, setBankForm] = useState({
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: '',
    accountName: '',
    bankName: ''
  });

  // KYC State
  const [kycForm, setKycForm] = useState({ fullName: '', panNumber: '' });
  const [kycStatus, setKycStatus] = useState('none');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const req = params.get('required');
      if (req) {
        setRequiredAmount(req);
        setDepositAmount(req);
        setActiveTab('deposit');
      }
    }
  }, []);

  const fetchData = () => {
    if (!token) return;
    apiGet('/wallet/balance', token)
      .then(d => {
        if (d && typeof d.balance === 'number') setBalance(d.balance);
      })
      .catch(() => {});

    apiGet('/wallet/transactions', token)
      .then(d => {
        if (Array.isArray(d)) setTransactions(d);
      })
      .catch(() => {});

    apiGet('/auth/me', token)
      .then(d => {
        if (d && d.kycStatus) setKycStatus(d.kycStatus);
      })
      .catch(() => {});

    apiGet('/wallet/config', token)
      .then(d => {
        if (d && d.currency === 'INR') setConfig(d);
      })
      .catch(() => {});
  };

  useEffect(fetchData, [token]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(config.upi.id);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleCopyBank = () => {
    const text = `A/C: ${config.bank.accountNumber}\nIFSC: ${config.bank.ifsc}\nName: ${config.bank.accountName}\nBank: ${config.bank.bankName}`;
    navigator.clipboard.writeText(text);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  // Submit Deposit Proof (UTR)
  const handleDepositSubmit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt < 10) {
      setMessage({ type: 'error', text: 'Please enter a valid deposit amount (Minimum ₹10).' });
      return;
    }
    if (!depositUtr.trim() || depositUtr.trim().length < 6) {
      setMessage({ type: 'error', text: 'Please enter the 12-digit UPI Reference Number / UTR from your payment app.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await apiPost('/wallet/deposit-request', {
        amount: amt,
        method: depositMethod,
        utr: depositUtr.trim(),
        sender_upi: senderUpi.trim()
      }, token);

      setMessage({
        type: 'success',
        text: `Deposit proof of ₹${amt.toLocaleString('en-IN')} submitted! Verification is instant and balance will be credited shortly.`
      });
      setDepositUtr('');
      setSenderUpi('');
      fetchData();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to submit deposit request' });
    } finally {
      setLoading(false);
    }
  };

  // Submit Withdrawal Request
  const handleWithdrawSubmit = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 100) {
      setMessage({ type: 'error', text: 'Minimum withdrawal amount is ₹100.' });
      return;
    }
    if (amt > balance) {
      setMessage({ type: 'error', text: `Withdrawal amount exceeds your available balance of ₹${balance.toLocaleString('en-IN')}.` });
      return;
    }

    if (kycStatus !== 'verified') {
      setMessage({ type: 'error', text: 'Govt regulations require PAN KYC verification before INR withdrawals. Please complete KYC in the KYC tab.' });
      setActiveTab('kyc');
      return;
    }

    if (withdrawMethod === 'UPI') {
      if (!withdrawUpi.trim() || !withdrawUpi.includes('@')) {
        setMessage({ type: 'error', text: 'Please enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm).' });
        return;
      }
    } else {
      if (!bankForm.accountNumber || bankForm.accountNumber.trim().length < 8) {
        setMessage({ type: 'error', text: 'Please enter a valid Bank Account Number.' });
        return;
      }
      if (bankForm.accountNumber !== bankForm.confirmAccountNumber) {
        setMessage({ type: 'error', text: 'Bank Account Numbers do not match.' });
        return;
      }
      if (!bankForm.ifsc || bankForm.ifsc.trim().length < 8) {
        setMessage({ type: 'error', text: 'Please enter a valid Bank IFSC code.' });
        return;
      }
    }

    setLoading(true);
    setMessage(null);
    try {
      await apiPost('/wallet/withdraw', {
        amount: amt,
        method: withdrawMethod,
        upi_id: withdrawUpi.trim(),
        account_number: bankForm.accountNumber.trim(),
        ifsc: bankForm.ifsc.trim(),
        account_name: bankForm.accountName.trim(),
        bank_name: bankForm.bankName.trim()
      }, token);

      setMessage({
        type: 'success',
        text: `Withdrawal request for ₹${amt.toLocaleString('en-IN')} submitted! Payout will be sent directly to your ${withdrawMethod === 'UPI' ? 'UPI ID' : 'Bank Account'}.`
      });
      setWithdrawAmount('');
      fetchData();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Withdrawal failed' });
    } finally {
      setLoading(false);
    }
  };

  // Submit KYC
  const handleKycSubmit = async () => {
    if (!kycForm.fullName.trim() || !kycForm.panNumber.trim()) {
      setMessage({ type: 'error', text: 'Please enter your Full Name and 10-digit PAN number.' });
      return;
    }
    if (kycForm.panNumber.trim().length !== 10) {
      setMessage({ type: 'error', text: 'PAN number must be exactly 10 characters (e.g. ABCDE1234F).' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await apiPost('/wallet/kyc', {
        fullName: kycForm.fullName.trim(),
        panNumber: kycForm.panNumber.trim().toUpperCase()
      }, token);

      setMessage({ type: 'success', text: 'KYC PAN Verified successfully! You can now request instant INR withdrawals.' });
      setKycStatus('verified');
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'KYC verification failed' });
    } finally {
      setLoading(false);
    }
  };

  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    `upi://pay?pa=${config.upi.id}&pn=${encodeURIComponent(config.upi.name)}&am=${depositAmount || '500'}&cu=INR`
  )}`;

  return (
    <div className="max-w-4xl mx-auto py-4 px-3 sm:px-6">
      {/* ─── HEADER ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-xl">
            ₹
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              INR Cash Wallet
            </h1>
            <p className="text-xs text-text-secondary">
              Instant UPI deposits & direct IMPS withdrawals in Indian Rupees (₹)
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─── MAIN INR BALANCE CARD ─── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="holo-card relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-8 border border-emerald-500/35 shadow-[0_0_50px_rgba(16,185,129,0.15)]"
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/20 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/15 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Active INR Balance</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400">₹</span>
              <span className="text-4xl sm:text-6xl font-black text-white tracking-tight font-mono">
                {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs sm:text-sm font-bold text-text-muted uppercase">INR</span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-text-secondary">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck size={14} /> 100% Secure & Compliant
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-neon-cyan">
                <Zap size={14} /> Instant UPI & IMPS Ready
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => { setActiveTab('deposit'); setMessage(null); }}
              className="flex-1 sm:flex-none px-6 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              <ArrowDownLeft size={18} />
              <span>Add Cash (₹)</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => { setActiveTab('withdraw'); setMessage(null); }}
              className="flex-1 sm:flex-none px-6 py-3 rounded-2xl font-black text-sm bg-white/10 hover:bg-white/15 text-white border border-white/15 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <ArrowUpRight size={18} />
              <span>Withdraw Winnings</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ─── ALERT / STATUS MESSAGE ─── */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-2xl mb-6 text-xs sm:text-sm font-bold border flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-red-500/15 border-red-500/40 text-red-300'
            }`}
          >
            {message.type === 'success' ? <CheckCircle size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
            <span className="leading-snug">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── NAVIGATION TABS ─── */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 mb-6 overflow-x-auto">
        {[
          { id: 'deposit', label: 'Add Cash (UPI / QR)', icon: Smartphone },
          { id: 'withdraw', label: 'Withdraw (UPI / Bank)', icon: Building2 },
          { id: 'kyc', label: `PAN KYC (${kycStatus === 'verified' ? 'Verified' : 'Required'})`, icon: ShieldCheck },
          { id: 'history', label: 'Passbook History', icon: History },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setMessage(null); }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-text-muted hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <tab.icon size={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB 1: ADD CASH (DEPOSIT VIA UPI / QR) ─── */}
      {activeTab === 'deposit' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Method Selector: UPI vs Bank */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDepositMethod('UPI')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                depositMethod === 'UPI'
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                  : 'border-white/10 bg-white/[0.02] text-text-muted hover:text-white'
              }`}
            >
              <Smartphone size={22} className={depositMethod === 'UPI' ? 'text-emerald-400' : ''} />
              <div>
                <p className="text-xs sm:text-sm font-black">Instant UPI QR Code</p>
                <p className="text-[10px] text-text-muted">GPay, PhonePe, Paytm, BHIM</p>
              </div>
            </button>

            <button
              onClick={() => setDepositMethod('BANK')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                depositMethod === 'BANK'
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                  : 'border-white/10 bg-white/[0.02] text-text-muted hover:text-white'
              }`}
            >
              <Building2 size={22} className={depositMethod === 'BANK' ? 'text-emerald-400' : ''} />
              <div>
                <p className="text-xs sm:text-sm font-black">Direct Bank Transfer</p>
                <p className="text-[10px] text-text-muted">IMPS, NEFT, RTGS</p>
              </div>
            </button>
          </div>

          {/* Amount Presets */}
          <div className="glass p-5 rounded-3xl border border-white/10">
            <label className="block text-xs font-black text-text-muted uppercase tracking-wider mb-2">
              Select or Enter Deposit Amount (₹)
            </label>
            {/* Contest Entry Deposit Banner if redirected */}
            {requiredAmount && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-transparent border border-amber-500/40 mb-4 flex items-start gap-3">
                <ShieldCheck size={22} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-black text-white text-sm">Contest Entry Fee: ₹{requiredAmount}</h4>
                  <p className="text-xs text-text-secondary mt-1">
                    Deposit ₹{requiredAmount} via UPI to lock your 11-creator battle squad. Under our <strong>100% Never-Lose Guarantee</strong>, if your team does not win a top prize, your full ₹99 is safely refunded back to your wallet!
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-5 gap-2 mb-3">
              {[99, 198, 495, 999, 2000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setDepositAmount(amt.toString())}
                  className={`py-2 rounded-xl text-xs sm:text-sm font-black border transition-all cursor-pointer ${
                    depositAmount === amt.toString()
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : 'border-white/10 bg-white/[0.03] text-white hover:border-white/20'
                  }`}
                >
                  +₹{amt}
                </button>
              ))}
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-400">₹</span>
              <input
                type="number"
                min="10"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="Enter custom amount in ₹"
                className="w-full !pl-9 !py-3 !text-lg !font-black !bg-black/50 !border-white/15 !rounded-2xl text-white"
              />
            </div>
          </div>

          {/* Payment Instructions: UPI vs Bank */}
          {depositMethod === 'UPI' ? (
            <div className="glass p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/15 via-black/40 to-black/60">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* QR Code Container */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="p-3 bg-white rounded-2xl shadow-xl shadow-emerald-500/10">
                    <img
                      src={dynamicQrUrl}
                      alt="UPI Payment QR Code"
                      className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-text-muted mt-2 flex items-center gap-1">
                    <QrCode size={13} className="text-emerald-400" /> Scan with Any UPI App
                  </span>
                </div>

                {/* UPI Details & 1-Click Copy */}
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                      Step 1: Pay via UPI
                    </span>
                    <h3 className="text-lg font-black text-white mt-0.5">
                      Send ₹{parseFloat(depositAmount || '0').toLocaleString('en-IN')} to Official UPI ID
                    </h3>
                  </div>

                  {/* UPI ID Pill with Copy */}
                  <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between gap-3">
                    <div className="text-left overflow-hidden">
                      <p className="text-[10px] text-text-muted uppercase font-bold">Official UPI ID</p>
                      <p className="text-sm sm:text-base font-black text-white font-mono truncate">{config.upi.id}</p>
                    </div>
                    <button
                      onClick={handleCopyUpi}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
                    >
                      {copiedUpi ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
                    </button>
                  </div>

                  {/* Supported UPI Apps Badges */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                    {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI', 'Cred', 'Amazon Pay'].map(app => (
                      <span key={app} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                        {app}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 2: Enter UTR / Reference Number */}
              <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    Step 2: Submit 12-Digit UPI Reference Number (UTR)
                  </span>
                  <p className="text-xs text-text-secondary mt-0.5">
                    After paying in your UPI app, copy the 12-digit UTR / Ref Number from the payment receipt and paste below:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    maxLength={16}
                    value={depositUtr}
                    onChange={e => setDepositUtr(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    placeholder="e.g. 428901849201 (12 digits)"
                    className="w-full !py-3 !px-4 !bg-black/60 !border-white/15 !rounded-xl !text-sm font-mono text-white"
                  />
                  <input
                    type="text"
                    value={senderUpi}
                    onChange={e => setSenderUpi(e.target.value)}
                    placeholder="Your UPI ID (optional e.g. you@upi)"
                    className="w-full !py-3 !px-4 !bg-black/60 !border-white/15 !rounded-xl !text-sm text-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <motion.button
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDepositSubmit}
                    className="flex-1 py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 text-black shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Submitting Proof...' : `Confirm Deposit of ₹${parseFloat(depositAmount || '0').toLocaleString('en-IN')}`}
                  </motion.button>
                </div>
              </div>
            </div>
          ) : (
            /* Bank Transfer Mode */
            <div className="glass p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
              <h3 className="text-lg font-black text-white">Direct IMPS / NEFT Bank Details</h3>
              <p className="text-xs text-text-secondary">
                Transfer via net banking or mobile banking to our corporate account and paste transaction reference number:
              </p>

              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-text-muted">Bank Name</span>
                  <span className="font-bold text-white">{config.bank.bankName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-text-muted">Account Name</span>
                  <span className="font-bold text-white">{config.bank.accountName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-text-muted">Account Number</span>
                  <span className="font-bold text-white font-mono">{config.bank.accountNumber}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-text-muted">IFSC Code</span>
                  <span className="font-bold text-emerald-400 font-mono">{config.bank.ifsc}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyBank}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {copiedBank ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedBank ? 'Copied Details' : 'Copy Bank Details'}</span>
                </button>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <label className="block text-xs font-bold text-text-muted">Enter IMPS / NEFT Transaction Reference Number (UTR)</label>
                <input
                  type="text"
                  value={depositUtr}
                  onChange={e => setDepositUtr(e.target.value)}
                  placeholder="e.g. N1234567890"
                  className="w-full !py-3 !px-4 !bg-black/60 !border-white/15 !rounded-xl !text-sm font-mono text-white"
                />
                <motion.button
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDepositSubmit}
                  className="w-full py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg cursor-pointer"
                >
                  Submit Bank Transfer Proof
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── TAB 2: WITHDRAW WINNINGS (UPI / BANK) ─── */}
      {activeTab === 'withdraw' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* KYC Status Banner */}
          {kycStatus !== 'verified' ? (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>Govt PAN verification is required before initiating your first INR withdrawal.</span>
              </div>
              <button
                onClick={() => setActiveTab('kyc')}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-black text-xs shrink-0 cursor-pointer"
              >
                Verify PAN Now
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-xs font-bold">
              <ShieldCheck size={16} />
              <span>KYC Verified. Your account is eligible for instant 24x7 INR payouts.</span>
            </div>
          )}

          {/* Withdrawal Mode: UPI vs Bank Account */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setWithdrawMethod('UPI')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                withdrawMethod === 'UPI'
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                  : 'border-white/10 bg-white/[0.02] text-text-muted hover:text-white'
              }`}
            >
              <Smartphone size={22} className={withdrawMethod === 'UPI' ? 'text-emerald-400' : ''} />
              <div>
                <p className="text-xs sm:text-sm font-black">UPI Instant Payout</p>
                <p className="text-[10px] text-text-muted">Fastest (2-5 mins)</p>
              </div>
            </button>

            <button
              onClick={() => setWithdrawMethod('BANK')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                withdrawMethod === 'BANK'
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                  : 'border-white/10 bg-white/[0.02] text-text-muted hover:text-white'
              }`}
            >
              <Building2 size={22} className={withdrawMethod === 'BANK' ? 'text-emerald-400' : ''} />
              <div>
                <p className="text-xs sm:text-sm font-black">Bank IMPS Transfer</p>
                <p className="text-[10px] text-text-muted">Direct to savings account</p>
              </div>
            </button>
          </div>

          {/* Amount Input */}
          <div className="glass p-5 rounded-3xl border border-white/10 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-text-muted uppercase">Withdrawal Amount (₹)</span>
              <span className="font-bold text-white">
                Available: <strong className="text-emerald-400">₹{balance.toLocaleString('en-IN')}</strong>
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-400">₹</span>
              <input
                type="number"
                min="100"
                max={balance}
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount to withdraw (Min ₹100)"
                className="w-full !pl-9 !py-3 !text-lg !font-black !bg-black/50 !border-white/15 !rounded-2xl text-white"
              />
            </div>

            {/* Quick Percentage Buttons */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[0.25, 0.5, 0.75, 1.0].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setWithdrawAmount(Math.floor(balance * pct).toString())}
                  className="py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 cursor-pointer"
                >
                  {pct === 1.0 ? 'MAX (100%)' : `${pct * 100}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Destination Form: UPI vs Bank */}
          {withdrawMethod === 'UPI' ? (
            <div className="glass p-5 rounded-3xl border border-white/10 space-y-3">
              <label className="block text-xs font-black text-text-muted uppercase tracking-wider">
                Destination UPI ID (VPA)
              </label>
              <input
                type="text"
                value={withdrawUpi}
                onChange={e => setWithdrawUpi(e.target.value)}
                placeholder="e.g. 9876543210@paytm or yourname@okhdfcbank"
                className="w-full !py-3 !px-4 !bg-black/50 !border-white/15 !rounded-xl !text-sm text-white"
              />
              <p className="text-[11px] text-text-muted">
                Ensure your UPI ID is linked to your bank account with active incoming transfers.
              </p>
            </div>
          ) : (
            <div className="glass p-5 rounded-3xl border border-white/10 space-y-3">
              <h3 className="text-sm font-black text-white">Bank Account Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    value={bankForm.accountName}
                    onChange={e => setBankForm({ ...bankForm, accountName: e.target.value })}
                    placeholder="As per bank passbook"
                    className="w-full !py-2.5 !px-3.5 !bg-black/50 !border-white/15 !rounded-xl !text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankForm.bankName}
                    onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                    placeholder="e.g. HDFC Bank, SBI, ICICI"
                    className="w-full !py-2.5 !px-3.5 !bg-black/50 !border-white/15 !rounded-xl !text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Account Number</label>
                  <input
                    type="text"
                    value={bankForm.accountNumber}
                    onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    placeholder="Enter Account Number"
                    className="w-full !py-2.5 !px-3.5 !bg-black/50 !border-white/15 !rounded-xl !text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Confirm Account Number</label>
                  <input
                    type="text"
                    value={bankForm.confirmAccountNumber}
                    onChange={e => setBankForm({ ...bankForm, confirmAccountNumber: e.target.value })}
                    placeholder="Re-enter Account Number"
                    className="w-full !py-2.5 !px-3.5 !bg-black/50 !border-white/15 !rounded-xl !text-xs font-mono text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Bank IFSC Code</label>
                  <input
                    type="text"
                    maxLength={11}
                    value={bankForm.ifsc}
                    onChange={e => setBankForm({ ...bankForm, ifsc: e.target.value.toUpperCase() })}
                    placeholder="e.g. HDFC0000240"
                    className="w-full !py-2.5 !px-3.5 !bg-black/50 !border-white/15 !rounded-xl !text-xs font-mono uppercase text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <motion.button
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleWithdrawSubmit}
            className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 text-black shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Request Instant Payout of ₹${parseFloat(withdrawAmount || '0').toLocaleString('en-IN')}`}
          </motion.button>
        </motion.div>
      )}

      {/* ─── TAB 3: KYC VERIFICATION ─── */}
      {activeTab === 'kyc' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-6 sm:p-8 rounded-3xl border border-white/10 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center text-neon-purple">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">PAN Card Verification</h3>
              <p className="text-xs text-text-secondary">Mandatory for real-money gaming in India (100% confidential)</p>
            </div>
          </div>

          {kycStatus === 'verified' ? (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
              <CheckCircle size={36} className="text-emerald-400 mx-auto" />
              <h4 className="text-base font-black text-white">PAN Card Verified</h4>
              <p className="text-xs text-emerald-300">
                Your KYC is complete. You have unlimited access to cash contests and instant INR withdrawals.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">Full Name (as on PAN card)</label>
                <input
                  type="text"
                  value={kycForm.fullName}
                  onChange={e => setKycForm({ ...kycForm, fullName: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full !py-3 !px-4 !bg-black/50 !border-white/15 !rounded-xl !text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">10-Digit PAN Number</label>
                <input
                  type="text"
                  maxLength={10}
                  value={kycForm.panNumber}
                  onChange={e => setKycForm({ ...kycForm, panNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full !py-3 !px-4 !bg-black/50 !border-white/15 !rounded-xl !text-sm font-mono uppercase text-white"
                />
              </div>

              <motion.button
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleKycSubmit}
                className="w-full py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-neon-purple to-neon-cyan text-white shadow-lg cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify PAN Card'}
              </motion.button>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── TAB 4: PASSBOOK TRANSACTION HISTORY ─── */}
      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black text-text-muted uppercase tracking-wider">Passbook Entries</h3>
            <button
              onClick={fetchData}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="glass p-10 rounded-3xl border border-white/10 text-center text-text-muted text-xs">
              No transactions yet. Add cash via UPI or enter a tournament to get started!
            </div>
          ) : (
            transactions.map(tx => {
              const numAmt = parseFloat(tx.amount.toString());
              const isPositive = numAmt > 0;
              const dateStr = new Date(tx.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={tx.id}
                  className="glass p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {isPositive ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-black text-white">{tx.description || tx.type}</p>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                        <span>{dateStr}</span>
                        {tx.network && <span>• {tx.network}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-sm sm:text-base font-black font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}₹{Math.abs(numAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        tx.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : tx.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </motion.div>
      )}
    </div>
  );
}
