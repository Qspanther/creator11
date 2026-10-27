'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiGet, apiPut } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Edit2, Check, X, Video, Camera, Link as LinkIcon, Search, Image as ImageIcon } from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  platform: string;
  category: string;
  credit_cost: string;
  external_channel_id: string;
  profile_url: string;
  profile_image_url: string;
}

export default function AdminCreatorsPage() {
  const { token, loading: authLoading } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Creator>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'youtube'>('youtube');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (token) {
        fetchCreators();
      } else {
        setLoading(false);
      }
    }
  }, [token, authLoading]);

  const fetchCreators = () => {
    apiGet('/admin/creators', token)
      .then(data => {
        if (Array.isArray(data)) {
          setCreators(data);
        } else {
          setCreators([]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleEdit = (creator: Creator) => {
    setEditingId(creator.id);
    setEditForm(creator);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async (id: string) => {
    try {
      await apiPut(`/admin/creators/${id}`, editForm, token);
      setEditingId(null);
      fetchCreators();
    } catch (err) {
      console.error('Failed to update creator', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api-backend/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        setEditForm(prev => ({ ...prev, profile_image_url: data.url }));
      } else {
        console.error('Upload failed', data);
      }
    } catch (err) {
      console.error('Upload error', err);
    } finally {
      setUploading(false);
    }
  };

  const filteredCreators = creators.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.external_channel_id && c.external_channel_id.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPlatform = c.platform === 'youtube';
    return matchesSearch && matchesPlatform;
  });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-neon-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users size={28} className="text-neon-gold" />
          <h1 className="text-3xl font-bold">Manage Creators</h1>
        </div>
        <p className="text-text-secondary">Edit creator details, channel links, and base stats</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-1.5 glass p-1 rounded-xl w-fit">
          <div className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-500/10 text-red-400 font-bold border border-red-500/20">
            <Video size={14} className="text-red-500" /> YouTube Creators Roster (Active)
          </div>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search creators..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full !pl-10 h-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredCreators.map((c) => {
            const isEditing = editingId === c.id;
            return (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative p-6 rounded-2xl transition-all ${
                  isEditing 
                    ? 'bg-white/5 border border-neon-gold/50 shadow-[0_0_20px_rgba(255,215,0,0.1)]' 
                    : 'glass hover:bg-white/[0.04]'
                }`}
              >
                {/* Action Buttons (Top Right Corner) */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {isEditing ? (
                    <>
                      <button onClick={() => handleSave(c.id)} className="p-2 bg-neon-green/20 text-neon-green rounded-lg hover:bg-neon-green/30 transition-colors">
                        <Check size={16} />
                      </button>
                      <button onClick={handleCancel} className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleEdit(c)} className="p-2 bg-white/5 text-text-secondary rounded-lg hover:bg-white/10 hover:text-white transition-colors">
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-4 pr-16">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold bg-white/[0.05] text-text-secondary overflow-hidden shrink-0`}>
                    {c.profile_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.profile_image_url} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <Video className="text-red-500" size={24} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editForm.name || ''} 
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="bg-dark-bg border border-white/20 rounded px-3 py-1.5 w-full focus:border-neon-gold outline-none text-sm font-bold mb-1"
                        placeholder="Creator Name"
                      />
                    ) : (
                      <h3 className="text-lg font-bold truncate">{c.name}</h3>
                    )}
                    
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editForm.category || ''} 
                        onChange={e => setEditForm({...editForm, category: e.target.value})}
                        className="bg-dark-bg border border-white/20 rounded px-2 py-1 w-full focus:border-neon-gold outline-none text-xs"
                        placeholder="Category"
                      />
                    ) : (
                      <span className="text-xs text-neon-gold px-2 py-1 bg-neon-gold/10 rounded-md">
                        {c.category} • {parseFloat(c.credit_cost).toFixed(1)} CR
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div>
                    <label className="text-xs text-text-muted flex items-center gap-1 mb-1">
                      <LinkIcon size={12} /> Channel Link / ID
                    </label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editForm.external_channel_id || ''} 
                        onChange={e => setEditForm({...editForm, external_channel_id: e.target.value})}
                        className="bg-dark-bg border border-white/20 rounded px-3 py-2 w-full focus:border-neon-gold outline-none text-sm font-mono"
                        placeholder="e.g. UC_mock_id or ig_username"
                      />
                    ) : (
                      <p className="text-sm font-mono text-text-primary truncate">
                        {c.external_channel_id || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Photo URL & Custom Upload Input */}
                  <div>
                    <label className="text-xs text-text-muted flex items-center gap-1 mb-1 font-bold">
                      <ImageIcon size={12} className="text-neon-cyan" /> Photo URL & Custom Upload
                    </label>
                    {isEditing ? (
                      <div className="space-y-2 mt-1">
                        <input
                          type="text"
                          value={editForm.profile_image_url || ''}
                          onChange={e => setEditForm({...editForm, profile_image_url: e.target.value})}
                          className="w-full bg-dark-bg border border-white/20 rounded-lg px-3 py-2 text-xs font-mono text-text-primary outline-none focus:border-neon-cyan"
                          placeholder="Paste image URL (https://...)"
                        />
                        <div className="flex items-center gap-2">
                          <label className="flex-1 cursor-pointer bg-white/[0.04] border border-white/10 hover:border-neon-cyan/50 rounded-lg px-3 py-2 text-xs text-center transition-colors">
                            <span className="truncate font-semibold text-white/90">{uploading ? 'Uploading...' : '📁 Upload Local File'}</span>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={e => handleFileUpload(e, c.id)}
                              className="hidden"
                            />
                          </label>
                          {editForm.profile_image_url && (
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/20 shrink-0">
                              <img src={editForm.profile_image_url} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-neon-cyan truncate max-w-[180px]">
                          {c.profile_image_url ? c.profile_image_url.slice(0, 32) + '...' : 'No photo set'}
                        </span>
                        {c.profile_image_url && (
                          <span className="px-2 py-0.5 rounded bg-success/15 text-success text-[10px] font-bold">✓ Active</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

