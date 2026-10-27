'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet, apiPut } from '../../lib/api';
import { motion } from 'framer-motion';
import { Sliders, Save, Check, RefreshCw, Calculator, Sparkles } from 'lucide-react';

export default function PointsFormulaPage() {
  const { token } = useAuth();
  const [formula, setFormula] = useState({
    youtube_views: 0.0001,
    instagram_likes: 0.0001,
    instagram_followers: 0.0002,
    captain_multiplier: 2.0,
    vice_captain_multiplier: 1.5,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState('');

  // Sample simulation inputs
  const [simViews, setSimViews] = useState(50000);
  const [simLikes, setSimLikes] = useState(5000);
  const [simFollowers, setSimFollowers] = useState(1000);

  useEffect(() => {
    if (token) {
      apiGet('/admin/points-formula', token)
        .then(data => {
          if (data) setFormula(data);
        })
        .catch(console.error);
    }
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await apiPut('/admin/points-formula', formula, token!);
      setSaved(true);
      setMsg('Scoring formula weights saved and deployed to scoring engine!');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Failed to update formula');
    } finally {
      setSaving(false);
    }
  };

  // Compute live simulated points
  const rawYtPts = simViews * formula.youtube_views;
  const rawIgPts = (simLikes * formula.instagram_likes) + (simFollowers * formula.instagram_followers);

  return (
    <div className="widescreen-container py-4 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <Sliders size={32} className="text-neon-cyan" />
          Fantasy Points Formula Engine
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Adjust live mathematical weights and multipliers that calculate player tournament scores
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Form Controls (7 cols) */}
        <div className="lg:col-span-7 glass-card p-6 sm:p-8 border border-white/10">
          <form onSubmit={handleSave} className="space-y-6">
            <h3 className="text-lg font-extrabold text-white pb-3 border-b border-white/5">
              Raw Metric Weights (Per Unit Gained)
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">
                  YouTube Views Weight
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={formula.youtube_views}
                  onChange={e => setFormula(prev => ({ ...prev, youtube_views: parseFloat(e.target.value) || 0 }))}
                  className="w-full !font-mono !py-3"
                />
                <p className="text-[11px] text-text-muted mt-1">
                  e.g. 0.0001 means 10,000 views = 1.0 fantasy point.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Instagram Scoring Weights</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">Frozen / Inactive</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">
                    Instagram Likes Weight
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    disabled
                    value={formula.instagram_likes}
                    className="w-full !font-mono !py-3 opacity-60 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">
                    Instagram Followers Weight
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    disabled
                    value={formula.instagram_followers}
                    className="w-full !font-mono !py-3 opacity-60 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <h3 className="text-lg font-extrabold text-white pt-4 pb-3 border-b border-white/5">
              Leadership Role Multipliers
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-neon-gold uppercase tracking-wider block mb-1.5">
                  👑 Captain Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formula.captain_multiplier}
                  onChange={e => setFormula(prev => ({ ...prev, captain_multiplier: parseFloat(e.target.value) || 0 }))}
                  className="w-full !font-mono !py-3"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neon-cyan uppercase tracking-wider block mb-1.5">
                  ⭐ Vice-Captain Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formula.vice_captain_multiplier}
                  onChange={e => setFormula(prev => ({ ...prev, vice_captain_multiplier: parseFloat(e.target.value) || 0 }))}
                  className="w-full !font-mono !py-3"
                />
              </div>
            </div>

            {msg && (
              <p className="text-xs text-success font-bold">{msg}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-xl text-xs font-black uppercase tracking-wider bg-neon-cyan text-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-neon-cyan/20 hover:opacity-95"
            >
              {saved ? <Check size={16} /> : <Save size={16} />}
              <span>{saving ? 'Saving...' : saved ? 'Formula Deployed!' : 'Save & Deploy Scoring Formula'}</span>
            </button>
          </form>
        </div>

        {/* Live Formula Simulator (5 cols) */}
        <div className="lg:col-span-5 glass-card p-6 sm:p-8 border border-white/10">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
            <Calculator size={20} className="text-neon-cyan" />
            <h3 className="text-base font-extrabold text-white">Live Simulator Preview</h3>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-[10px] text-text-muted uppercase font-bold block mb-1">Simulated YT Views Gained</label>
              <input
                type="number"
                value={simViews}
                onChange={e => setSimViews(parseInt(e.target.value) || 0)}
                className="w-full !py-2 !text-xs !bg-black/60"
              />
            </div>

            <div>
              <label className="text-[10px] text-text-muted uppercase font-bold block mb-1">Simulated IG Likes Gained</label>
              <input
                type="number"
                value={simLikes}
                onChange={e => setSimLikes(parseInt(e.target.value) || 0)}
                className="w-full !py-2 !text-xs !bg-black/60"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Calculated Points</p>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Standard Player:</span>
              <span className="font-extrabold text-white">{rawYtPts.toFixed(2)} Pts</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-neon-gold font-bold">👑 Captain (x{formula.captain_multiplier}):</span>
              <span className="font-black text-neon-gold">{(rawYtPts * formula.captain_multiplier).toFixed(2)} Pts</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-neon-cyan font-bold">⭐ Vice-Captain (x{formula.vice_captain_multiplier}):</span>
              <span className="font-black text-neon-cyan">{(rawYtPts * formula.vice_captain_multiplier).toFixed(2)} Pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
