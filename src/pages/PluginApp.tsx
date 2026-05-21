import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LineChart, Mail, Share2, AlertCircle, BarChart3, Users, MousePointerClick, Send, Instagram, Twitter, Linkedin, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

export default function PluginApp() {
  const { id } = useParams();
  const { profile } = useAuth();
  
  if (!profile?.plugins?.includes(id || '')) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 text-stone-500">
        <AlertCircle size={48} className="mb-4 text-stone-300" />
        <h2 className="text-xl font-bold mb-2">Extension Not Installed</h2>
        <p>You need to install this extension from the Plugin Marketplace first.</p>
      </div>
    );
  }

  // Analytics Pro
  if (id === 'analytics-pro') {
    return (
      <div className="space-y-8 font-display pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif font-black text-stone-900 mb-2">Analytics Pro</h2>
            <p className="text-stone-500 text-sm">Real-time engagement and telemetry data.</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-widest">Live Monitoring</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Visitors', value: '124.5K', change: '+12%', icon: Users },
            { label: 'Avg. Session', value: '4m 32s', change: '+4%', icon: BarChart3 },
            { label: 'Bounce Rate', value: '24.1%', change: '-2%', icon: MousePointerClick }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm flex flex-col justify-between h-40">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400">
                  <stat.icon size={24} />
                </div>
                <span className={`text-xs font-bold ${stat.change.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stat.change}
                </span>
              </div>
              <div>
                <p className="text-3xl font-bold text-stone-900">{stat.value}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-white rounded-[2.5rem] border border-stone-200 p-8 min-h-[300px] flex items-center justify-center text-stone-400">
           <LineChart size={48} className="opacity-20 mb-4" />
           <p className="text-sm font-medium">Telemetry charts are compiling data...</p>
        </div>
      </div>
    );
  }

  // Newsletter Forge
  if (id === 'newsletter-forge') {
    return (
      <div className="space-y-8 font-display pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif font-black text-stone-900 mb-2">Newsletter Forge</h2>
            <p className="text-stone-500 text-sm">Design and broadcast your stories to the world.</p>
          </div>
          <button className="bg-stone-900 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors flex items-center gap-2">
            <Send size={16} /> New Broadcast
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-stone-200 p-8 shadow-sm">
           <h3 className="text-lg font-bold mb-6">Recent Campaigns</h3>
           <div className="space-y-4">
             {[
               { title: 'The Artisan Weekly - Issue #42', date: 'Oct 24, 2026', opens: '45%', status: 'Sent' },
               { title: 'New Collection Announcement', date: 'Oct 18, 2026', opens: '52%', status: 'Sent' },
               { title: 'Holiday Special Preview', date: 'Draft', opens: '-', status: 'Draft' }
             ].map((camp, i) => (
               <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-100">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                     <Mail size={20} />
                   </div>
                   <div>
                     <p className="font-bold text-stone-900">{camp.title}</p>
                     <p className="text-xs text-stone-500">{camp.date}</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-6">
                   <div className="text-right">
                     <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Open Rate</p>
                     <p className="font-bold text-stone-900">{camp.opens}</p>
                   </div>
                   <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${camp.status === 'Sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                     {camp.status}
                   </span>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    );
  }

  // Social Connect
  if (id === 'social-connect') {
    return (
      <div className="space-y-8 font-display pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div>
          <h2 className="text-3xl font-serif font-black text-stone-900 mb-2">Social Connect</h2>
          <p className="text-stone-500 text-sm">Synchronize your content across the digital sphere.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { platform: 'Instagram', icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50', connected: true },
            { platform: 'Twitter', icon: Twitter, color: 'text-sky-500', bg: 'bg-sky-50', connected: true },
            { platform: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-50', connected: false }
          ].map((social, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm flex flex-col items-center text-center">
              <div className={`w-20 h-20 rounded-2xl ${social.bg} ${social.color} flex items-center justify-center mb-6`}>
                <social.icon size={40} />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">{social.platform}</h3>
              <p className="text-sm text-stone-500 mb-8">
                {social.connected ? 'Account synchronized. Cross-posting enabled.' : 'Not connected. Connect to enable sync.'}
              </p>
              <button className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${
                social.connected ? 'bg-stone-50 text-stone-500 hover:bg-stone-100' : 'bg-stone-900 text-white hover:bg-stone-800'
              }`}>
                {social.connected ? 'Manage Sync' : 'Connect Account'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-stone-500">
      <AlertCircle size={48} className="mb-4 text-stone-300" />
      <h2 className="text-xl font-bold mb-2">Extension Interface Missing</h2>
      <p>This plugin is installed but its user interface module was not found.</p>
    </div>
  );
}
