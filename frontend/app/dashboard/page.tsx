'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import TiltCard3D from '../components/ui/TiltCard3D';
import { playSpatialSFX } from '../components/ui/StageControls3D';
import { Trophy, Users, TrendingUp, Wallet, Sparkles, ArrowRight, Video, ShieldCheck, Flame } from 'lucide-react';

export default function DashboardPage3D() {
  const { user, token } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [teamsCount, setTeamsCount] = useState<number>(0);
  const [liveTournaments, setLiveTournaments] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    apiGet('/wallet/balance', token)
      .then((res) => {
        if (typeof res?.balance === 'number') setBalance(res.balance);
        else if (res?.balance) setBalance(parseFloat(res.balance));
      })
      .catch(() => {});

    apiGet('/teams', token)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.teams;
        if (Array.isArray(list)) setTeamsCount(list.length);
      })
      .catch(() => {});

    apiGet('/tournaments', token)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.tournaments;
        if (Array.isArray(list)) setLiveTournaments(list.slice(0, 3));
      })
      .catch(() => {});
  }, [token]);

  return (
    <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full space-y-8">
      {/* 3D NEVER LOSE Hero Stage Banner */}
      <TiltCard3D intensity={10} className="p-8 sm:p-10 border border-amber-400/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/35 text-amber-300 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Creator Entertainment League • 3D Holographic Arena</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400">
              NEVER LOSE
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Welcome back, <strong className="text-white">{user?.name || 'Creator'}</strong>. Draft your 11 verified YouTube creators, monitor live metric surges, and earn top-tier prize payouts.
            </p>
            <div className="flex items-center gap-3 text-xs text-emerald-400 font-semibold pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Smart Prize Pool Algorithm Active • Guaranteed Returns for Top 1,000</span>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-col gap-3 shrink-0">
            <Link
              href="/tournaments"
              onClick={() => playSpatialSFX('power')}
              className="px-6 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 shadow-xl shadow-amber-500/25 hover:scale-105 transition flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" /> Enter 3D Tournament <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/creators"
              onClick={() => playSpatialSFX('click')}
              className="px-6 py-3 rounded-2xl font-bold text-sm bg-white/10 border border-white/20 text-cyan-200 hover:bg-white/15 transition flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-cyan-400" /> Scout 50 Creators
            </Link>
          </div>
        </div>
      </TiltCard3D>

      {/* 3D Telemetry Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <TiltCard3D className="p-5 border border-emerald-400/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-bold">Total Wallet</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300 font-mono mt-1">
            ₹{Number(balance).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-2 flex items-center gap-1">
            <span>●</span> Verified INR Balance
          </div>
        </TiltCard3D>

        <TiltCard3D className="p-5 border border-cyan-400/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-bold">My Active Squads</span>
            <Trophy className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-300 font-mono mt-1">
            {teamsCount} Teams
          </div>
          <div className="text-[11px] text-cyan-400/80 mt-2 flex items-center gap-1">
            <span>●</span> Competing in Live Creator Cups
          </div>
        </TiltCard3D>

        <TiltCard3D className="p-5 border border-purple-400/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-bold">Bot Competitors</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono mt-1">
            1,100 Bots Active
          </div>
          <div className="text-[11px] text-purple-400/80 mt-2 flex items-center gap-1">
            <span>●</span> Automated pre-match & ranking rearrange
          </div>
        </TiltCard3D>

        <TiltCard3D className="p-5 border border-amber-400/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-bold">Scoring Engine</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono mt-1">
            2.0x Captains
          </div>
          <div className="text-[11px] text-amber-400/80 mt-2 flex items-center gap-1">
            <span>●</span> Real-time delta tracking synced
          </div>
        </TiltCard3D>
      </div>

      {/* Featured Battle Division (YouTube Active) */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-white">
          <Video className="w-6 h-6 text-red-500" /> Active Battle Division
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <TiltCard3D className="p-6 border border-red-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                <Video className="w-6 h-6 text-white" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Battles Active
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">YouTube Creator League</h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Draft 11 verified YouTube creators across Gaming, Vlogging, Comedy, Tech, and Lifestyle with live video view delta scoring.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-cyan-300 font-bold">25 Seeded YouTube Stars</span>
              <Link
                href="/tournaments"
                className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-red-500 to-purple-600 text-white hover:opacity-90 transition"
              >
                Join League →
              </Link>
            </div>
          </TiltCard3D>

          <TiltCard3D className="p-6 border border-cyan-400/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                Top 1,000 Slabs
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Prize Pool Distribution</h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Custom 1st Prize, 50% 2nd, 25% 3rd, 10% 4th, 7% 5th, 4% (6-10), 2% (11-100), scaling to ₹100 for rank 1000 with ₹97 guaranteed return.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-amber-300 font-bold">₹97 Refund + ₹2 Fee Protection</span>
              <Link
                href="/my-teams"
                className="px-4 py-2 rounded-xl text-xs font-black bg-white/10 border border-white/20 text-slate-200 hover:bg-white/20 transition"
              >
                My Standings →
              </Link>
            </div>
          </TiltCard3D>
        </div>
      </div>
    </div>
  );
}
