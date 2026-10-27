'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet, apiPost, apiPut } from '../../lib/api';
import { motion } from 'framer-motion';
import {
  Wallet, CheckCircle, XCircle, Clock, Copy, Check,
  ExternalLink, Save, RefreshCw, AlertCircle
} from 'lucide-react';

interface DepositItem {
  id: string;
  amount: string;
  network?: string;
  txid?: string;
  status: string;
  createdAt: string;
  description: string;
  Wallet?: {
    balance: string;
    User?: {
      id: string;
      name: string;
      email: string;
    };
  };
}

interface WithdrawalItem {
  id: string;
  amount: string;
  network?: string;
  wallet_address?: string;
  status: string;
  createdAt: string;
  Wallet?: {
    balance: string;
    User?: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export default function AdminCryptoControlPage() {
  const { token } = useAuth();
  
  // Wallet addresses state
  const [addresses, setAddresses] = useState({
    TRC20: '',
    BEP20: '',
    ERC20: ''
  });
  const [savingAddresses, setSavingAddresses] = useState(false);
  const [addressSaveSuccess, setAddressSaveSuccess] = useState(false);

  // Queues
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [addr, dep, withdr] = await Promise.all([
        apiGet('/admin/crypto-settings', token).catch(() => ({})),
        apiGet('/admin/deposits/pending', token).catch(() => []),
        apiGet('/admin/withdrawals/pending', token).catch(() => [])
      ]);
      setAddresses(addr || {});
      setDeposits(Array.isArray(dep) ? dep : []);
      setWithdrawals(Array.isArray(withdr) ? withdr : []);
    } catch (err) {
      console.error('Fetch admin crypto data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSaveAddresses = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddresses(true);
    setMsg(null);
    try {
      await apiPut('/admin/crypto-settings', addresses, token!);
      setAddressSaveSuccess(true);
      setTimeout(() => setAddressSaveSuccess(false), 3000);
      setMsg({ type: 'success', text: 'Admin receiving crypto wallet addresses updated successfully!' });
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save addresses' });
    } finally {
      setSavingAddresses(false);
    }
  };

  const handleApproveDeposit = async (id: string) => {
    setActionLoadingId(id);
    setMsg(null);
    try {
      await apiPost(`/admin/deposits/${id}/approve`, {}, token!);
      setMsg({ type: 'success', text: 'Deposit verified and USDT credited to user balance!' });
      fetchData();
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Approval failed' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectDeposit = async (id: string) => {
    const reason = prompt('Enter rejection reason (e.g. TXID not found on explorer):') || 'TXID verification failed';
    setActionLoadingId(id);
    setMsg(null);
    try {
      await apiPost(`/admin/deposits/${id}/reject`, { reason }, token!);
      setMsg({ type: 'success', text: 'Deposit marked as rejected.' });
      fetchData();
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Rejection failed' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    setActionLoadingId(id);
    setMsg(null);
    try {
      await apiPost(`/admin/withdrawals/${id}/approve`, {}, token!);
      setMsg({ type: 'success', text: 'Withdrawal marked as completed.' });
      fetchData();
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Approval failed' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    const reason = prompt('Enter rejection reason:') || 'Invalid destination address';
    setActionLoadingId(id);
    setMsg(null);
    try {
      await apiPost(`/admin/withdrawals/${id}/reject`, { reason }, token!);
      setMsg({ type: 'success', text: 'Withdrawal rejected and USDT refunded to player.' });
      fetchData();
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Rejection failed' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getExplorerUrl = (txid?: string, network?: string) => {
    if (!txid) return '#';
    if (network === 'TRC20') return `https://tronscan.org/#/transaction/${txid}`;
    if (network === 'BEP20') return `https://bscscan.com/tx/${txid}`;
    return `https://etherscan.io/tx/${txid}`;
  };

  return (
    <div className="widescreen-container py-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <Wallet size={32} className="text-neon-cyan" />
          USDT Crypto Gateway Control
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure receiving addresses and review user deposit proofs (TXID) & withdrawal payouts
        </p>
      </div>

      {/* Message Banner */}
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 border text-sm ${
            msg.type === 'success' ? 'bg-success/15 border-success/30 text-success' : 'bg-danger/15 border-danger/30 text-danger'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{msg.text}</span>
        </motion.div>
      )}

      {/* SECTION 1: Admin Receiving Wallet Addresses */}
      <div className="glass-card p-6 sm:p-8 border border-white/10">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div>
            <h3 className="text-lg font-extrabold text-white">Platform Receiving Addresses</h3>
            <p className="text-xs text-text-muted">Users will send USDT to these addresses during deposit</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-xs text-neon-cyan hover:underline cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Reload</span>
          </button>
        </div>

        <form onSubmit={handleSaveAddresses} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">
                USDT (TRC20 - Tron) Address
              </label>
              <input
                type="text"
                value={addresses.TRC20 || ''}
                onChange={e => setAddresses(prev => ({ ...prev, TRC20: e.target.value }))}
                placeholder="TYDzs..."
                className="w-full !font-mono !text-xs !py-3"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">
                USDT (BEP20 - BSC) Address
              </label>
              <input
                type="text"
                value={addresses.BEP20 || ''}
                onChange={e => setAddresses(prev => ({ ...prev, BEP20: e.target.value }))}
                placeholder="0x8894..."
                className="w-full !font-mono !text-xs !py-3"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">
                USDT (ERC20 - Ethereum) Address
              </label>
              <input
                type="text"
                value={addresses.ERC20 || ''}
                onChange={e => setAddresses(prev => ({ ...prev, ERC20: e.target.value }))}
                placeholder="0x0d4a..."
                className="w-full !font-mono !text-xs !py-3"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingAddresses}
              className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-neon-cyan text-black flex items-center gap-2 cursor-pointer shadow-lg shadow-neon-cyan/20 hover:opacity-95"
            >
              {addressSaveSuccess ? <Check size={16} /> : <Save size={16} />}
              <span>{savingAddresses ? 'Saving...' : addressSaveSuccess ? 'Saved!' : 'Save Wallet Addresses'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Pending Deposits Verification Queue */}
      <div className="glass-card p-6 sm:p-8 border border-white/10">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-white">Pending Deposits Verification Queue</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-bold">
                {deposits.length} Pending
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Verify blockchain TXID and click "Approve" to instantly credit the user's USDT wallet balance
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-text-muted">Loading queue...</div>
        ) : deposits.length === 0 ? (
          <div className="py-12 text-center text-text-muted">
            <CheckCircle size={36} className="mx-auto mb-2 text-success opacity-40" />
            <p>Verification queue is clear. No pending deposits.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deposits.map(d => (
              <div
                key={d.id}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-black text-white">{parseFloat(d.amount).toFixed(2)} USDT</span>
                    <span className="px-2 py-0.5 rounded-md bg-neon-cyan/15 text-neon-cyan font-mono text-[10px] font-bold">
                      {d.network || 'TRC20'}
                    </span>
                    <span className="text-xs text-text-secondary">• Player: {d.Wallet?.User?.name || 'User'} ({d.Wallet?.User?.email})</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted font-mono">TXID:</span>
                    <span className="font-mono text-neon-gold select-all truncate max-w-xs">{d.txid || 'N/A'}</span>
                    {d.txid && (
                      <a
                        href={getExplorerUrl(d.txid, d.network)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-text-muted hover:text-neon-cyan flex items-center gap-0.5 text-[11px]"
                        title="View on Blockchain Explorer"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-text-muted">Submitted at: {new Date(d.createdAt).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto">
                  <button
                    onClick={() => handleApproveDeposit(d.id)}
                    disabled={actionLoadingId === d.id}
                    className="flex-1 lg:flex-none px-5 py-2.5 rounded-xl bg-success text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-success/20 hover:opacity-90"
                  >
                    <CheckCircle size={14} />
                    <span>Approve & Credit Balance</span>
                  </button>

                  <button
                    onClick={() => handleRejectDeposit(d.id)}
                    disabled={actionLoadingId === d.id}
                    className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl bg-danger/20 hover:bg-danger/30 text-danger text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border border-danger/30"
                  >
                    <XCircle size={14} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Pending Withdrawals Queue */}
      <div className="glass-card p-6 sm:p-8 border border-white/10">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-white">Pending Withdrawals Queue</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-neon-gold/20 text-neon-gold text-xs font-bold">
                {withdrawals.length} Pending
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Send USDT to user's destination wallet address and mark completed
            </p>
          </div>
        </div>

        {withdrawals.length === 0 ? (
          <div className="py-8 text-center text-text-muted">
            <p>No pending withdrawal payout requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawals.map(w => (
              <div
                key={w.id}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-black text-danger">-{Math.abs(parseFloat(w.amount)).toFixed(2)} USDT</span>
                    <span className="px-2 py-0.5 rounded-md bg-neon-gold/15 text-neon-gold font-mono text-[10px] font-bold">
                      {w.network || 'TRC20'}
                    </span>
                    <span className="text-xs text-text-secondary">• Player: {w.Wallet?.User?.name || 'User'}</span>
                  </div>

                  <p className="font-mono text-xs text-text-primary break-all">
                    Destination: <span className="text-neon-cyan">{w.wallet_address || 'Address'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto">
                  <button
                    onClick={() => handleApproveWithdrawal(w.id)}
                    disabled={actionLoadingId === w.id}
                    className="flex-1 lg:flex-none px-5 py-2.5 rounded-xl bg-neon-cyan text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle size={14} />
                    <span>Mark Payout Sent</span>
                  </button>

                  <button
                    onClick={() => handleRejectWithdrawal(w.id)}
                    disabled={actionLoadingId === w.id}
                    className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl bg-danger/20 hover:bg-danger/30 text-danger text-xs font-black uppercase tracking-wider cursor-pointer border border-danger/30"
                  >
                    <span>Reject & Refund</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
