'use client';

import React, { useState } from 'react';

export function playSpatialSFX(type: 'click' | 'power' = 'click') {
  if (typeof window === 'undefined') return;
  if ((window as any).__CREATOR11_SFX_MUTED) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!(window as any).__CREATOR11_AUDIO_CTX) {
      (window as any).__CREATOR11_AUDIO_CTX = new AudioCtx();
    }
    const ctx: AudioContext = (window as any).__CREATOR11_AUDIO_CTX;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(960, now + 0.22);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch {}
}

export default function StageControls3D() {
  const [activeCam, setActiveCam] = useState<'front' | 'stadium' | 'core'>('front');

  const setCameraPreset = (preset: 'front' | 'stadium' | 'core') => {
    playSpatialSFX('click');
    setActiveCam(preset);
    window.dispatchEvent(new CustomEvent('creator11:camera-preset', { detail: preset }));
  };

  const triggerShockwave = () => {
    playSpatialSFX('power');
    window.dispatchEvent(new CustomEvent('creator11:shockwave'));
  };

  return (
    <div className="fixed bottom-20 lg:bottom-5 right-4 z-40 flex items-center gap-2 bg-slate-950/85 border border-white/15 backdrop-blur-xl px-3 py-2 rounded-2xl shadow-2xl">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300 hidden sm:inline">
        3D Stage:
      </span>
      <button
        type="button"
        onClick={() => setCameraPreset('front')}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
          activeCam === 'front'
            ? 'bg-purple-600/50 border border-purple-400/60 text-white'
            : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
        }`}
      >
        Arena
      </button>
      <button
        type="button"
        onClick={() => setCameraPreset('stadium')}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
          activeCam === 'stadium'
            ? 'bg-purple-600/50 border border-purple-400/60 text-white'
            : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
        }`}
      >
        Drone
      </button>
      <button
        type="button"
        onClick={() => setCameraPreset('core')}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
          activeCam === 'core'
            ? 'bg-purple-600/50 border border-purple-400/60 text-white'
            : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
        }`}
      >
        Core
      </button>
      <button
        type="button"
        onClick={triggerShockwave}
        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-500 text-slate-950 hover:opacity-90 transition"
      >
        ⚡ Boost 3D
      </button>
    </div>
  );
}
