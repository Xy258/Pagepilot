/**
 * Plugin Marketplace Page
 * Displays available and installed modular extensions for the platform.
 */

import { Plug, Plus, Shield, Zap, ExternalLink, Settings, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export default function Plugins() {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const availablePlugins = [
    { id: 'ai-optimizer', name: 'AI Image Optimizer', dev: 'Page Pilot', desc: 'Automatically optimizes and compresses images using AI algorithms for faster load times.' },
    { id: 'analytics-pro', name: 'Analytics Pro', dev: 'MetricFlow', desc: 'Advanced real-time analytics and heatmaps for your website visitors.' },
    { id: 'social-connect', name: 'Social Connect', dev: 'Nexus', desc: 'Sync your content automatically with Instagram, Twitter, and LinkedIn.' },
    { id: 'newsletter-forge', name: 'Newsletter Forge', dev: 'Page Pilot', desc: 'Build and send beautiful newsletters directly from your content dashboard.' },
  ];

  useEffect(() => {
    if (profile) {
      setLoading(false);
    }
  }, [profile]);

  const togglePlugin = async (pluginId: string) => {
    if (!profile) {
      alert("No profile found.");
      return;
    }
    setProcessing(pluginId);
    try {
      const currentPlugins = profile.plugins || [];
      const isInstalled = currentPlugins.includes(pluginId);
      
      let updatedPlugins;
      if (isInstalled) {
        updatedPlugins = currentPlugins.filter((id: string) => id !== pluginId);
      } else {
        updatedPlugins = [...currentPlugins, pluginId];
      }

      const userId = profile._id || profile.id;
      if (!userId) {
        throw new Error("User ID is missing from profile");
      }
      
      await api.users.update(userId, { plugins: updatedPlugins });
      await refreshProfile(); // Refresh context to update UI
    } catch (error: any) {
      console.error("Plugin action failed:", error);
      alert("Failed to toggle plugin: " + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const installedPlugins = profile?.plugins || [];

  return (
    <div className="space-y-8 pb-12 font-display">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-stone-900 mb-1">Plugin Marketplace</h2>
          <p className="text-stone-500 text-sm italic">Extend your sculpture's capabilities with modular extensions.</p>
        </div>
        <button className="bg-stone-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-stone-800 transition-all text-xs uppercase tracking-widest">
          <Plus size={18} /> Developer Mode
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest font-display">Loading the forge...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {availablePlugins.map((plugin, i) => {
            const isInstalled = installedPlugins.includes(plugin.id);
            const isProcessing = processing === plugin.id;

            return (
              <motion.div
                key={plugin.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm hover:shadow-2xl hover:shadow-stone-200/50 transition-all group overflow-hidden relative"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-50 transition-all shadow-inner">
                    <Plug size={32} />
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <span className={`text-[10px] uppercase font-bold tracking-widest px-4 py-1.5 rounded-full font-display ${
                      isInstalled ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {isInstalled ? 'Installed' : 'Available'}
                    </span>
                    <div className="flex gap-2">
                      {isInstalled && <button className="p-2 bg-stone-50 text-stone-400 hover:text-stone-900 rounded-xl transition-colors"><Settings size={14} /></button>}
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-serif font-bold text-stone-900 mb-1">{plugin.name}</h3>
                <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-4">by {plugin.dev}</p>
                <p className="text-stone-500 leading-relaxed mb-8 text-[15px] font-medium h-20 overflow-hidden line-clamp-3">{plugin.desc}</p>

                <button 
                  onClick={() => togglePlugin(plugin.id)}
                  disabled={isProcessing}
                  className={`w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                    isInstalled 
                      ? 'bg-stone-50 text-stone-900 hover:bg-rose-50 hover:text-rose-600' 
                      : 'bg-stone-900 text-white hover:bg-emerald-600'
                  } active:scale-95`}
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : (isInstalled ? <Zap size={16} /> : <Plus size={16} />)}
                  {isInstalled ? 'Uninstall Extension' : 'Install Now'}
                </button>
                
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-stone-50/50 rounded-full group-hover:scale-150 transition-transform duration-700 blur-2xl"></div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="bg-emerald-900 rounded-[3rem] p-12 text-white overflow-hidden relative mt-12 shadow-2xl shadow-emerald-900/20">
         <div className="relative z-10 max-w-lg">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-8 border border-emerald-500/10">
               <Shield size={28} className="text-emerald-400" />
            </div>
            <h3 className="text-3xl font-serif font-bold mb-6 italic leading-tight">Sculpt Your Own Modules</h3>
            <p className="text-emerald-100/70 mb-10 leading-relaxed text-lg">
              Page Pilot uses a modular architecture. You can build internal tools or share them with the community using our specialized extension SDK.
            </p>
            <button className="flex items-center gap-3 bg-white text-emerald-900 px-10 py-4 rounded-2xl font-bold transition-all hover:bg-emerald-50 active:scale-95 text-sm uppercase tracking-widest">
               Developer Documentation <ExternalLink size={18} />
            </button>
         </div>
         <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-emerald-800/10 flex items-center justify-center overflow-hidden">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <Shield size={320} className="text-emerald-700/10" />
              <Plug size={120} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-400/20" />
            </motion.div>
         </div>
      </div>
    </div>
  );
}
