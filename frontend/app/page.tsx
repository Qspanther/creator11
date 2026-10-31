'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from './lib/api';
import TiltCard3D from './components/ui/TiltCard3D';
import { playSpatialSFX } from './components/ui/StageControls3D';

const FALLBACK_TOURNAMENTS = [
  { id: 't-yt-24h', name: 'YouTube 24-Hour Creator Cup', platform: 'youtube', duration_type: '24h', entry_fee: 49, prize_pool: 50000, status: 'live' },
  { id: 't-ig-24h', name: 'Instagram 24-Hour Creator Cup', platform: 'instagram', duration_type: '24h', entry_fee: 49, prize_pool: 50000, status: 'live' },
  { id: 't-yt-3d', name: 'YouTube 3-Day Creator Cup', platform: 'youtube', duration_type: '3d', entry_fee: 149, prize_pool: 100000, status: 'upcoming' },
];

export default function LandingPage3D() {
  const [tournaments, setTournaments] = useState<any[]>([]);

  useEffect(() => {
    apiGet('/tournaments')
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.tournaments;
        if (Array.isArray(list)) setTournaments(list.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full space-y-12">
      {/* 3D Hero Split Stage */}
      <div className="grid lg:grid-cols-12 gap-8 items-center pt-2">
        <div className="lg:col-span-7 space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <span>✨</span> Upgraded 3D Spatial Experience • Creator11
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08]">
            The Creator Entertainment Arena for{' '}
            <span className="bg-gradient-to-r from-purple-400 via-cyan-300 to-amber-300 bg-clip-text text-transparent">
              Digital Creators
            </span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
            Instead of cricket or football athletes, draft your 11-creator entertainment lineup from 50 top YouTube & Instagram stars inside an interactive 3D stadium. Earn real-time points from Views, Likes, Engagement Velocity, and 2.0x Captain multipliers.
          </p>
          <div className="flex flex-wrap gap-3.5 pt-2">
            <Link
              href={`/team-builder/${tournaments[0]?.id || 't-yt-24h'}`}
              onClick={() => playSpatialSFX('power')}
              className="px-6 py-3.5 rounded-2xl font-extrabold text-sm sm:text-base bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-500 text-white shadow-xl shadow-purple-500/30 hover:scale-105 transition flex items-center gap-2"
            >
              <span>⚡</span> Launch 3D Team Pitch
            </Link>
            <Link
              href="/tournaments"
              onClick={() => playSpatialSFX('click')}
              className="px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base bg-white/10 border border-cyan-400/40 text-cyan-200 hover:bg-white/15 transition flex items-center gap-2"
            >
              <span>🏆</span> Browse 6 Live Cups
            </Link>
            <Link
              href="/creators"
              onClick={() => playSpatialSFX('click')}
              className="px-5 py-3.5 rounded-2xl font-semibold text-sm bg-amber-500/15 border border-amber-400/40 text-amber-300 hover:bg-amber-500/25 transition"
            >
              <span>👥</span> Explore 50 Holo-Creators
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <TiltCard3D className="p-3.5">
              <div className="text-xs text-slate-400">Verified Creators</div>
              <div className="text-xl sm:text-2xl font-black text-white mt-0.5">50 Holo-Stars</div>
              <div className="text-[11px] text-cyan-300">25 YouTube • 25 Instagram</div>
            </TiltCard3D>
            <TiltCard3D className="p-3.5">
              <div className="text-xs text-slate-400">Total Prize Pool</div>
              <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">₹4,50,000</div>
              <div className="text-[11px] text-emerald-400">Instant Wallet Payouts</div>
            </TiltCard3D>
            <TiltCard3D className="p-3.5">
              <div className="text-xs text-slate-400">Roster Cap</div>
              <div className="text-xl sm:text-2xl font-black text-purple-300 mt-0.5">11 Creators</div>
              <div className="text-[11px] text-slate-300">100.0 Credit Budget</div>
            </TiltCard3D>
          </div>
        </div>

        {/* Interactive 3D Floating Hero Creator Card */}
        <div className="lg:col-span-5 perspective-stage">
          <TiltCard3D intensity={16} className="p-6 border border-cyan-400/40 animate-float-3d">
            <div className="flex items-center justify-between mb-4 depth-layer-20">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                👑 CAPTAIN 2.0x HOLO-CARD
              </span>
              <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-500/15 px-2.5 py-1 rounded-lg border border-cyan-400/30">
                12.5 CR
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/60 via-slate-900/90 to-cyan-950/60 border border-white/15 depth-layer-30 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center text-2xl font-black text-slate-950 shadow-lg shadow-cyan-500/30">
                  LC
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white">LaughCraft Studio</h2>
                    <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-400/30 font-semibold">
                      YouTube
                    </span>
                  </div>
                  <p className="text-xs text-cyan-300 mt-0.5">Comedy • #1 Trending Creator Seed</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-2.5 rounded-xl bg-black/45 border border-white/10">
                  <div className="text-[11px] text-slate-400">Views Delta</div>
                  <div className="text-sm font-black text-emerald-400">+18,40,000</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/45 border border-white/10">
                  <div className="text-[11px] text-slate-400">Likes Surge</div>
                  <div className="text-sm font-black text-cyan-300">+1,42,800</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/45 border border-white/10">
                  <div className="text-[11px] text-slate-400">2x Multiplier Pts</div>
                  <div className="text-sm font-black text-amber-300">964.5 pts</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs text-slate-300">
                <span>Move cursor over card for 3D Holo-Tilt</span>
                <Link
                  href={`/team-builder/${tournaments[0]?.id || 't-yt-24h'}`}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 font-bold hover:bg-cyan-500/40 transition"
                >
                  + Draft to Squad
                </Link>
              </div>
            </div>
          </TiltCard3D>
        </div>
      </div>

      {/* 3D Scoring Engine & Multipliers */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold">3D Scoring Engine & Multipliers</h2>
          <p className="text-sm text-slate-400">
            Powered by <code className="text-cyan-300 font-mono">backend/services/scoring-engine.js</code> real-time metric snapshots
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TiltCard3D className="p-5">
            <div className="text-2xl mb-2">👁️</div>
            <div className="text-xs font-bold uppercase text-cyan-300">View Acceleration</div>
            <div className="text-xl font-black text-white mt-1">+1 Pt / 1,000 Views</div>
            <p className="text-xs text-slate-400 mt-1">Tracks net new views gained during tournament window vs baseline.</p>
          </TiltCard3D>
          <TiltCard3D className="p-5">
            <div className="text-2xl mb-2">❤️</div>
            <div className="text-xs font-bold uppercase text-fuchsia-300">Likes & Reactions</div>
            <div className="text-xl font-black text-white mt-1">+2 Pts / 100 Likes</div>
            <p className="text-xs text-slate-400 mt-1">High-engagement viral posts trigger rapid creator point bursts.</p>
          </TiltCard3D>
          <TiltCard3D className="p-5">
            <div className="text-2xl mb-2">👑</div>
            <div className="text-xs font-bold uppercase text-amber-300">Captain & Vice-Captain</div>
            <div className="text-xl font-black text-white mt-1">2.0x & 1.5x Boost</div>
            <p className="text-xs text-slate-400 mt-1">Your Captain scores double points; Vice-Captain earns 1.5x points.</p>
          </TiltCard3D>
          <TiltCard3D className="p-5">
            <div className="text-2xl mb-2">🚀</div>
            <div className="text-xs font-bold uppercase text-emerald-300">Viral Surge Bonus</div>
            <div className="text-xl font-black text-white mt-1">+50 Pt Milestone</div>
            <p className="text-xs text-slate-400 mt-1">Awarded when a creator crosses &gt;10% engagement velocity in 24h.</p>
          </TiltCard3D>
        </div>
      </div>

      {/* Featured Live Tournaments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Featured 3D Creator Cups</h2>
          <Link href="/tournaments" className="text-cyan-400 hover:underline text-sm font-bold">
            View All Tournaments →
          </Link>
        </div>
        {tournaments.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-3">
            <p className="text-slate-400 text-sm">No tournaments currently live. Check back soon or create one via Admin Panel.</p>
            <Link href="/admin" className="inline-block px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs font-bold border border-purple-500/30 transition">
              Open Admin Panel →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {tournaments.map((t) => (
              <TiltCard3D key={t.id} className="p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      {t.platform} • {t.duration_type}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 uppercase">● {t.status}</span>
                  </div>
                  <h3 className="text-xl font-black text-white">{t.name}</h3>
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/45 border border-white/10">
                    <div>
                      <div className="text-[11px] text-slate-400">Prize Pool</div>
                      <div className="text-xl font-black text-amber-300 font-mono">
                        ₹{Number(t.prize_pool || 50000).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Entry Fee</div>
                      <div className="text-lg font-black text-cyan-300 font-mono">₹{t.entry_fee}</div>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/team-builder/${t.id}`}
                  className="w-full py-3 rounded-xl font-extrabold text-xs sm:text-sm text-center bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg hover:opacity-95 transition block"
                >
                  ⚡ Enter & Draft in 3D Pitch
                </Link>
              </TiltCard3D>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
