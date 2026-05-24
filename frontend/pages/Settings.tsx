/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  Globe, 
  Palette, 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
  Key,
  Save,
  Check,
  ChevronRight,
  Plus,
  User,
  Camera,
  Mail,
  User as UserIcon,
  Briefcase,
  MapPin,
  Link as LinkIcon,
  ExternalLink,
  Cpu,
  Zap,
  Loader2,
  X,
  Trash2,
  CreditCard,
  Target,
  BadgePercent,
  IndianRupee,
  Sun,
  Moon,
  MessageSquare,
  CheckCircle,
  ThumbsUp,
  Bug,
  Lightbulb,
  History,
  Activity,
  Terminal,
  Clock,
  Sparkles,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Settings() {
  const { profile, user, logout, refreshProfile } = useAuth(); // Assume we might need to refresh profile or logout
  const { theme: appTheme, toggleTheme, palette, setPalette } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [siteName, setSiteName] = useState('Artisan Workshop');
  const [siteDescription, setSiteDescription] = useState('');
  const [languages, setLanguages] = useState(['English', 'French']);
  const [theme, setTheme] = useState(palette || 'Natural');
  const [timezone, setTimezone] = useState('UTC');
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [accentColor, setAccentColor] = useState('#064e3b');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'groq'>('gemini');
  const [notificationToggles, setNotificationToggles] = useState({
    email: true,
    system: true,
    marketing: false
  });

  const [pricingPlans, setPricingPlans] = useState([
    { id: '1', name: 'Apprentice', price: 0, interval: 'month', features: ['1 Workshop', 'Basic AI', 'Community Support'] },
    { id: '2', name: 'Artisan', price: 2999, interval: 'month', features: ['5 Workshops', 'Pro AI Sculptor', 'Priority Support', 'Custom Domains'] },
    { id: '3', name: 'Master', price: 9999, interval: 'month', features: ['Unlimited Workshops', 'Neural Prime Engine', '24/7 Concierge', 'White-label'] }
  ]);

  // Profile State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Feedback State
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general' | 'praise'>('general');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin' && activeTab === 'audit') {
      const fetchLogs = async () => {
        setLogsLoading(true);
        try {
          const list = await api.adminLogs.list();
          setAdminLogs(list || []);
        } catch (err) {
          console.error('Failed to fetch logs:', err);
        } finally {
          setLogsLoading(false);
        }
      };
      fetchLogs();
    }
  }, [profile, activeTab]);

  useEffect(() => {
    if (profile?.role === 'admin' && activeTab === 'security') {
      const fetchFeedback = async () => {
        try {
          const list = await api.feedback.list();
          setAdminFeedback(list || []);
        } catch (err) {
          console.error('Failed to fetch feedback:', err);
        }
      };
      fetchFeedback();
    }
  }, [profile, activeTab]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setOccupation(profile.occupation || profile.jobTitle || '');
      setWebsite(profile.website || '');
      setAvatarUrl(profile.avatarUrl || '');
    }
  }, [profile]);

  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const data = await api.settings.get();
        if (data) {
          setSiteName(data.siteName || 'My Sculpted Site');
          setSiteDescription(data.siteDescription || '');
          setLanguages(data.languages || ['English', 'French']);
          setTheme(data.theme || 'Natural');
          setTimezone(data.timezone || 'UTC');
          setPrimaryColor(data.primaryColor || '#10b981');
          setAccentColor(data.accentColor || '#064e3b');
          setAiProvider(data.aiProvider || 'gemini');
          setNotificationToggles(data.notificationToggles || { email: true, system: true, marketing: false });
          if (data.pricingPlans) setPricingPlans(data.pricingPlans);
        }
      } catch (err) {
        console.error('Failed to fetch site settings:', err);
      }
    };
    fetchSiteSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (activeTab === 'site') {
        await api.settings.update({
          siteName,
          siteDescription,
          languages,
          theme,
          timezone,
          primaryColor,
          accentColor,
          aiProvider,
          notificationToggles,
          pricingPlans
        });
        await api.adminLogs.record('Update Site Settings', `Global workshop settings updated. Site name: ${siteName}`);
      } else if (activeTab === 'pricing') {
        await api.settings.update({ pricingPlans });
        await api.adminLogs.record('Update Pricing Strategy', 'Administrative modification of monetization tiers.');
      } else if ((activeTab === 'profile' || activeTab === 'notifications') && profile) {
        const userId = profile._id || profile.id;
        await api.users.update(userId, {
          displayName,
          bio,
          location,
          occupation,
          jobTitle: occupation,
          website,
          avatarUrl,
          notificationToggles
        });
        await refreshProfile();
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await api.media.upload(file);
      setAvatarUrl(response.url);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      alert('Avatar upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    setFeedbackSending(true);
    try {
      await api.feedback.send({
        type: feedbackType,
        subject: feedbackSubject,
        message: feedbackMessage
      });
      setFeedbackSent(true);
      setFeedbackMessage('');
      setFeedbackSubject('');
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch (err) {
      console.error('Failed to send feedback:', err);
      alert('Failed to send feedback. Please try again.');
    } finally {
      setFeedbackSending(false);
    }
  };

  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: User, roles: ['admin', 'editor', 'author', 'viewer'] },
    { id: 'appearance', label: 'Appearance', icon: Palette, roles: ['admin', 'editor', 'author', 'viewer'] },
    { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'editor', 'author', 'viewer'] },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare, roles: ['admin', 'editor', 'author', 'viewer'] },
    { id: 'site', label: 'Site Settings', icon: Globe, roles: ['admin', 'editor'] },
    { id: 'pricing', label: 'Pricing Plans', icon: CreditCard, roles: ['admin'] },
    { id: 'audit', label: 'Audit Trail', icon: History, roles: ['admin'] },
    { id: 'security', label: 'Security & System', icon: Shield, roles: ['admin'] }
  ];

  const role = profile?.role || 'author';
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(role));

  const handleSeed = async () => {
    setLoading(true);
    try {
       await api.system.seed();
       await api.adminLogs.record('Emergency System Seed', 'Triggered global system seed to populate environment artifacts.');
       setSaved(true);
       setTimeout(() => setSaved(false), 2000);
       alert('System successfully seeded. Refresh your workshop to see the new sculptures.');
    } catch (err) {
      console.error('Seed failed:', err);
      alert('System already seeded or unauthorized.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-12 max-w-6xl pb-20">
      <div className="w-full lg:w-72 space-y-1.5">
        <div className="px-4 mb-6">
          <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-white mb-1">Preferences</h2>
          <p className="text-[10px] text-stone-400 dark:text-stone-600 font-bold uppercase tracking-[0.14em]">Configuration Center</p>
        </div>
        {filteredMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group relative overflow-hidden ${
              activeTab === item.id 
                ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-2xl shadow-stone-900/20 dark:shadow-white/5 active:scale-[0.98]' 
                : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900'
            }`}
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className={`p-2 rounded-xl transition-colors ${
                activeTab === item.id ? 'bg-white/10 dark:bg-black/10 text-emerald-400' : 'text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300'
              }`}>
                <item.icon size={18} />
              </div>
              <span className="text-sm font-bold tracking-tight">{item.label}</span>
            </div>
            {activeTab === item.id && (
              <motion.div layoutId="settingActive" className="absolute inset-0 bg-stone-950 dark:bg-stone-50" />
            )}
            <ChevronRight size={16} className={`relative z-10 transition-transform ${activeTab === item.id ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col min-h-[600px] transition-colors duration-300">
        <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'appearance' && (
            <div className="space-y-12">
              <div>
                <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-white mb-3 tracking-tight">Interface Aesthetic</h2>
                <p className="text-stone-500 dark:text-stone-400 text-sm">Choose how the workshop appears to your eyes. Synchronized across all your sessions.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button 
                  onClick={() => appTheme === 'dark' && toggleTheme()}
                  className={`p-10 rounded-[2.5rem] border transition-all text-left relative overflow-hidden group ${
                    appTheme === 'light' 
                      ? 'border-emerald-600 bg-white shadow-2xl shadow-emerald-500/10' 
                      : 'border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 text-stone-400'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all ${
                    appTheme === 'light' ? 'bg-emerald-600 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-500'
                  }`}>
                    <Sun size={28} />
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${appTheme === 'light' ? 'text-stone-900' : 'text-stone-500'}`}>Light Essence</h3>
                  <p className="text-xs font-medium opacity-60">Classic clarity. Perfect for high-intensity sculpting and focused reading.</p>
                  {appTheme === 'light' && (
                    <div className="absolute top-6 right-6">
                      <div className="bg-emerald-600 text-white rounded-full p-1">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </button>

                <button 
                  onClick={() => appTheme === 'light' && toggleTheme()}
                  className={`p-10 rounded-[2.5rem] border transition-all text-left relative overflow-hidden group ${
                    appTheme === 'dark' 
                      ? 'border-emerald-400 bg-stone-950 shadow-2xl shadow-emerald-400/10' 
                      : 'border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 text-stone-400'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all ${
                    appTheme === 'dark' ? 'bg-emerald-400 text-stone-950' : 'bg-stone-200 dark:bg-stone-700 text-stone-500'
                  }`}>
                    <Moon size={28} />
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${appTheme === 'dark' ? 'text-white' : 'text-stone-500'}`}>Dark Obsidian</h3>
                  <p className="text-xs font-medium opacity-60">Nocturnal comfort. Reduces eye strain during late-night digital forge sessions.</p>
                  {appTheme === 'dark' && (
                    <div className="absolute top-6 right-6">
                      <div className="bg-emerald-400 text-stone-950 rounded-full p-1">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-12">
              <div>
                <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-white mb-3 tracking-tight">Signal Channels</h2>
                <p className="text-stone-500 dark:text-stone-400 text-sm">Orchestrate how findings and updates reach your workshop doorstep.</p>
              </div>

              <div className="space-y-6">
                {[
                  { id: 'email', label: 'Email Notifications', desc: 'Critical workshop updates and artisan activity.' },
                  { id: 'system', label: 'System Alerts', desc: 'Internal neural bridge status and security logs.' },
                  { id: 'marketing', label: 'Artisan Insights', desc: 'New tutorials and community news.' }
                ].map((type) => (
                  <div key={type.id} className="flex items-center justify-between p-6 bg-stone-50 dark:bg-stone-800 rounded-3xl border border-stone-100 dark:border-stone-700 transition-colors">
                    <div>
                      <p className="font-bold text-stone-900 dark:text-white mb-1">{type.label}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">{type.desc}</p>
                    </div>
                    <button 
                      onClick={() => setNotificationToggles(prev => ({ ...prev, [type.id]: !prev[type.id as keyof typeof prev] }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${notificationToggles[type.id as keyof typeof notificationToggles] ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notificationToggles[type.id as keyof typeof notificationToggles] ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-12">
              <div>
                <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-white mb-3 tracking-tight">Artisan Feedback</h2>
                <p className="text-stone-500 dark:text-stone-400 text-sm">Help us refine the digital forge. Your thoughts directly reach our lead architects.</p>
              </div>

              <div className="bg-stone-50 dark:bg-stone-800/50 p-8 rounded-[2.5rem] border border-stone-100 dark:border-stone-700 space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                    { id: 'feature', label: 'New Idea', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { id: 'general', label: 'Thoughts', icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { id: 'praise', label: 'Praise', icon: ThumbsUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setFeedbackType(item.id as any)}
                      className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-3 ${
                        feedbackType === item.id 
                          ? 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-xl' 
                          : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-400 hover:border-stone-200 dark:hover:border-stone-700'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl ${feedbackType === item.id ? 'bg-white/10 dark:bg-black/10' : item.bg + ' ' + item.color}`}>
                        <item.icon size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest px-1">Subject (Optional)</label>
                    <input 
                      type="text" 
                      value={feedbackSubject}
                      onChange={(e) => setFeedbackSubject(e.target.value)}
                      placeholder="Context of your feedback..."
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-stone-900 dark:text-white" 
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest px-1">Detailed Message</label>
                    <textarea 
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Share your experience, feature requests, or report issues encountered..."
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-stone-900 dark:text-white h-40 resize-none" 
                    />
                  </div>
                  
                  <div className="flex items-center justify-end">
                    <button
                      onClick={handleSendFeedback}
                      disabled={feedbackSending || !feedbackMessage.trim()}
                      className={`px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${
                        feedbackSent 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-white shadow-xl shadow-stone-900/20'
                      } active:scale-95 disabled:opacity-50`}
                    >
                      {feedbackSending ? <Loader2 size={18} className="animate-spin" /> : feedbackSent ? <CheckCircle size={18} /> : null}
                      {feedbackSending ? 'Broadcasting...' : feedbackSent ? 'Feedback Received' : 'Dispatch Feedback'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-8 border border-stone-100 dark:border-stone-800 rounded-[2.5rem] flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900 dark:text-white mb-0.5">Privacy Assurance</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Your email is included so we can respond if needed, but your data is otherwise protected.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-12">
              <div>
                <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-white mb-3 tracking-tight">My Digital Persona</h2>
                <p className="text-stone-500 dark:text-stone-400 text-sm max-w-sm">Curate your public identity and the way other artisans perceive you in the forest.</p>
              </div>

              <div className="space-y-10">
                {/* Profile Picture */}
                <div className="flex items-center gap-10">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-[2rem] bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 overflow-hidden relative shadow-inner transition-colors">
                      {avatarUrl ? (
                        <img src={avatarUrl} referrerPolicy="no-referrer" alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-200 dark:text-stone-700 bg-stone-50 dark:bg-stone-900">
                          <UserIcon size={56} strokeWidth={1} />
                        </div>
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[2px] flex items-center justify-center">
                          <Loader2 size={24} className="text-emerald-500 animate-spin" />
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-3 -right-3 p-3 bg-emerald-600 text-white rounded-2xl cursor-pointer hover:bg-stone-900 dark:hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/10 active:scale-95 group">
                      <Camera size={18} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    </label>
                  </div>
                  <div>
                    <h4 className="text-stone-900 dark:text-white font-bold text-base mb-1 font-display tracking-tight transition-colors">Identity Mark</h4>
                    <p className="text-xs text-stone-400 dark:text-stone-500 font-medium">Standard JPG, PNG or WEBP formats.<br/>High resolution recommended.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-[0.2em] px-1 font-display">Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your artistic name"
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-stone-900 dark:text-white" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-[0.2em] px-1 font-display">Email Registry</label>
                    <div className="w-full bg-stone-100/50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl px-5 py-4 text-sm text-stone-400 dark:text-stone-500 flex items-center gap-3 cursor-not-allowed font-medium transition-colors">
                      <Mail size={16} /> {profile?.email}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-[0.2em] px-1 font-display">Short Bio</label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all h-32 resize-none text-stone-900 dark:text-white" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-[0.2em] px-1 font-display flex items-center gap-2">
                       <Briefcase size={10} /> Occupation
                    </label>
                    <input 
                      type="text" 
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="e.g. Lead Designer"
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-stone-900 dark:text-white" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-[0.2em] px-1 font-display flex items-center gap-2">
                       <MapPin size={10} /> Location
                    </label>
                    <input 
                      type="text" 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. San Francisco, CA"
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-stone-900 dark:text-white" 
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-[0.2em] px-1 font-display flex items-center gap-2">
                    <LinkIcon size={10} /> Personal Website
                  </label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yourportfolio.com"
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-stone-900 dark:text-white pr-20" 
                    />
                    {website && (
                      <a 
                        href={website.startsWith('http') ? website : `https://${website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl text-stone-400 hover:text-emerald-600 hover:border-emerald-100 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'site' && (
          <div className="space-y-12 transition-all">
            <div>
              <h2 className="text-3xl font-serif font-black text-stone-900 dark:text-white mb-3 tracking-tighter uppercase transition-colors">Artisan Workshop Configuration</h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm font-medium transition-colors">Fine-tune the parameters and aesthetic essence of your digital grove.</p>
            </div>

            <div className="space-y-8">
              <div className="p-8 bg-stone-50 dark:bg-stone-800/50 rounded-[2.5rem] border border-stone-100 dark:border-stone-700 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest px-1">Workshop Title</label>
                    <input 
                      type="text" 
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-stone-900 dark:text-white shadow-sm" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest px-1">Heritage (Language)</label>
                    <select 
                      value={languages[0]}
                      onChange={(e) => setLanguages([e.target.value])}
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl px-5 py-4 text-sm focus:outline-none appearance-none cursor-pointer text-stone-900 dark:text-white transition-all shadow-sm"
                    >
                      <option value="English">English (Global)</option>
                      <option value="Sanskrit">Sanskrit (Classical)</option>
                      <option value="Hindi">Hindi (Regional)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest px-1">Artisan Tagline</label>
                  <textarea 
                    value={siteDescription}
                    onChange={(e) => setSiteDescription(e.target.value)}
                    placeholder="Where crafts meet code..."
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-stone-900 dark:text-white h-24 resize-none shadow-sm" 
                  />
                </div>
              </div>

              {/* SEO and Artisan Workspace Synchronization Toggles */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-stone-950 dark:text-white uppercase tracking-widest px-1">Intelligence Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-stone-50 dark:bg-stone-800 rounded-3xl border border-stone-100 dark:border-stone-700 flex items-center justify-between transition-all">
                    <div>
                      <p className="font-bold text-stone-900 dark:text-white mb-1">SEO Architect Mode</p>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">Auto-generate meta structures and semantic tags.</p>
                    </div>
                    <button 
                      onClick={() => setNotificationToggles(prev => ({ ...prev, seo: !((prev as any).seo) }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${(notificationToggles as any).seo ? 'bg-blue-600' : 'bg-stone-300 dark:bg-stone-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${(notificationToggles as any).seo ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="p-6 bg-stone-50 dark:bg-stone-800 rounded-3xl border border-stone-100 dark:border-stone-700 flex items-center justify-between transition-all">
                    <div>
                      <p className="font-bold text-stone-900 dark:text-white mb-1">Artisan Synchronization</p>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">Mirror workshop settings across all neural bridges.</p>
                    </div>
                    <button 
                      onClick={() => setNotificationToggles(prev => ({ ...prev, artisanSync: !((prev as any).artisanSync) }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${(notificationToggles as any).artisanSync ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${(notificationToggles as any).artisanSync ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-stone-100 dark:border-stone-800 overflow-hidden">
                <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-white transition-colors">Aesthetic Palette</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Natural', 'Obsidian', 'Snow', 'Midnight'].map((t) => (
                    <button 
                      key={t}
                      onClick={() => {
                        setTheme(t);
                        setPalette(t as any);
                      }}
                      className={`p-6 rounded-[2.5rem] border transition-all text-center space-y-3 ${
                        theme === t ? 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-xl' : 'border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:border-stone-200 dark:hover:border-stone-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full mx-auto ${t === 'Obsidian' ? 'bg-stone-800' : t === 'Snow' ? 'bg-white border' : t === 'Midnight' ? 'bg-blue-900' : 'bg-emerald-600'}`} />
                      <span className="text-[10px] font-bold uppercase tracking-widest block">{t}</span>
                    </button>
                  ))}
                </div>
              </div>

                  <div className="p-8 bg-emerald-50 dark:bg-emerald-950/20 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white dark:bg-stone-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100/50 dark:border-stone-800">
                        <Zap size={28} strokeWidth={1} />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 dark:text-white transition-colors">Neural Engine</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 font-medium transition-colors">Current Provider: <span className="capitalize text-emerald-600 dark:text-emerald-400 font-bold">{aiProvider}</span></p>
                      </div>
                    </div>
                    <div className="flex bg-white/50 dark:bg-stone-800/50 backdrop-blur-sm p-1 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30 transition-colors">
                      {(['gemini', 'openai', 'groq'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setAiProvider(p)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                            aiProvider === p 
                              ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-lg' 
                              : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-200'
                          }`}
                        >
                          {p === 'gemini' ? <Sparkles size={12} /> : p === 'openai' ? <Bot size={12} /> : <Cpu size={12} />}
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-white mb-2 tracking-tight transition-colors">Security & System Core</h2>
                <p className="text-stone-500 dark:text-stone-400 text-sm transition-colors">Protect your artisanal workspace and monitor neural bridges.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-stone-950 dark:bg-black text-white rounded-[2.5rem] relative overflow-hidden group border border-stone-800 dark:border-stone-900 transition-colors">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Cpu size={20} />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest text-stone-400">AI Intelligence Core</p>
                    </div>
                    <p className="text-3xl font-serif font-bold mb-2">Neural Engine</p>
                    <p className="text-xs text-stone-400 mb-8 max-w-[200px]">Secure multi-provider AI core is active and healthy on the backend.</p>
                    
                    <div className="flex -space-x-3">
                        <div className="w-10 h-10 rounded-xl border-[3px] border-stone-950 dark:border-stone-900 flex items-center justify-center bg-emerald-500 text-white" title="Gemini Active"><Sparkles size={16} /></div>
                        <div className="w-10 h-10 rounded-xl border-[3px] border-stone-950 dark:border-stone-900 flex items-center justify-center bg-blue-500 text-white" title="OpenAI Ready"><Bot size={16} /></div>
                        <div className="w-10 h-10 rounded-xl border-[3px] border-stone-950 dark:border-stone-900 flex items-center justify-center bg-purple-500 text-white" title="Groq Ready"><Cpu size={16} /></div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[80px] -mr-12 -mt-12 rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
                </div>

                <div className="p-8 bg-stone-50 dark:bg-stone-800 rounded-[2.5rem] border border-stone-100 dark:border-stone-700 flex flex-col justify-between transition-colors">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-2 tracking-tight transition-colors">Digital Resilience</h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed transition-colors">Manage your cloud footprints and ensure your digital core remains lean and performant.</p>
                  </div>
                  <div className="mt-8 p-4 bg-white/50 dark:bg-stone-900/50 rounded-2xl border border-stone-100 dark:border-stone-700">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest text-center">System Status: Active</p>
                  </div>
                </div>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-stone-100 dark:bg-stone-800 rounded-[2.5rem] border border-stone-200 dark:border-stone-700 flex flex-col justify-between gap-6 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-stone-900 dark:text-white transition-colors">Digital Archive</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium leading-relaxed transition-colors">Export your entire workshop configuration as a JSON scroll.</p>
                  </div>
                  <button 
                      onClick={async () => {
                        try {
                          const posts = await api.posts.list();
                          const data = JSON.stringify({ posts, profile, timestamp: new Date().toISOString() }, null, 2);
                          const blob = new Blob([data], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `sculpt-backup-${new Date().getTime()}.json`;
                          a.click();
                        } catch (err) {
                           console.error('Export failed:', err);
                        }
                      }}
                      className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-50 dark:hover:bg-stone-900 transition-all text-center transition-colors shadow-sm"
                    >
                      Export Workshop
                  </button>
                </div>
                <div className="p-8 bg-rose-50 dark:bg-rose-950/20 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/50 flex flex-col justify-between gap-6 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-rose-900 dark:text-rose-400 transition-colors">Dissolve Workshop</p>
                    <p className="text-xs text-rose-500 dark:text-rose-600 font-medium leading-relaxed transition-colors">Caution: This will purge all local artifacts and reset your neural bridges.</p>
                  </div>
                  <button 
                      onClick={() => {
                        if (confirm('This will purge your local session and history. Are you sure?')) {
                          localStorage.clear();
                          window.location.href = '/';
                        }
                      }}
                      className="w-full bg-rose-600 text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-700 transition-all transition-colors shadow-lg shadow-rose-900/10"
                    >
                      Purge Local Essence
                  </button>
                </div>
              </div>

              {profile?.role === 'admin' && (
                <div className="pt-12 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-stone-900 dark:text-white transition-colors">Feedback Archive</h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-medium transition-colors">Strategic insights from the artisan community.</p>
                    </div>
                    <button 
                      onClick={async () => {
                        const list = await api.feedback.list();
                        setAdminFeedback(list);
                      }}
                      className="p-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-2xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                    >
                      <Zap size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {adminFeedback.length === 0 ? (
                      <div className="p-10 border-2 border-dashed border-stone-100 dark:border-stone-800 rounded-[2.5rem] text-center">
                        <p className="text-sm text-stone-400 font-medium">The archive is currently whisper-quiet.</p>
                      </div>
                    ) : (
                      adminFeedback.map((fb: any) => (
                        <div key={fb.id} className="p-6 bg-stone-50 dark:bg-stone-800 rounded-3xl border border-stone-100 dark:border-stone-700 space-y-4 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                fb.type === 'bug' ? 'bg-rose-100 text-rose-600' :
                                fb.type === 'feature' ? 'bg-amber-100 text-amber-600' :
                                fb.type === 'praise' ? 'bg-emerald-100 text-emerald-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {fb.type}
                              </span>
                              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{fb.userEmail}</span>
                            </div>
                            <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">
                              {new Date(fb.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            {fb.subject && <h4 className="font-bold text-stone-900 dark:text-white mb-1">{fb.subject}</h4>}
                            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed font-medium transition-colors">{fb.message}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Status: {fb.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-12">
            <div>
              <h2 className="text-3xl font-serif font-black text-stone-900 dark:text-white mb-3 tracking-tighter uppercase transition-colors">Market Strategies</h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm font-medium transition-colors">Define the value tiers and access levels for your workshop ecosystem.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pricingPlans.map((plan, index) => (
                <motion.div 
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-8 rounded-[2.5rem] border transition-all ${
                    index === 1 
                      ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10' 
                      : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900'
                  } space-y-6 relative group overflow-hidden shadow-sm`}
                >
                  {index === 1 && (
                    <div className="absolute top-6 right-6 px-3 py-1 bg-emerald-600 text-[8px] font-black uppercase text-white rounded-full tracking-[0.2em]">
                      Most Popular
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <input 
                        value={plan.name}
                        onChange={(e) => {
                          const newPlans = [...pricingPlans];
                          newPlans[index].name = e.target.value;
                          setPricingPlans(newPlans);
                        }}
                        className="bg-transparent border-none text-[10px] font-black text-stone-400 dark:text-stone-600 uppercase tracking-[0.3em] w-full focus:outline-none transition-colors"
                      />
                      {pricingPlans.length > 1 && (
                        <button 
                          onClick={() => {
                            if (confirm(`Remove the "${plan.name}" pricing plan?`)) {
                              setPricingPlans(pricingPlans.filter((_, i) => i !== index));
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 dark:text-stone-705 hover:text-rose-500 transition-all shrink-0"
                          title="Remove Plan"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-serif font-bold text-stone-900 dark:text-white transition-colors">₹</span>
                      <input 
                        type="number"
                        value={plan.price}
                        onChange={(e) => {
                          const newPlans = [...pricingPlans];
                          newPlans[index].price = parseInt(e.target.value) || 0;
                          setPricingPlans(newPlans);
                        }}
                        className="bg-transparent border-none text-4xl font-serif font-bold text-stone-900 dark:text-white w-full focus:outline-none transition-colors"
                      />
                      <span className="text-stone-400 dark:text-stone-600 text-xs font-medium transition-colors">/mo</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-6 border-t border-stone-100 dark:border-stone-800/50 transition-colors">
                    {plan.features.map((feature, fIndex) => (
                      <div key={fIndex} className="flex items-center gap-3 group/feature">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 transition-colors">
                          <Check size={10} strokeWidth={3} />
                        </div>
                        <input 
                          value={feature}
                          onChange={(e) => {
                            const newPlans = [...pricingPlans];
                            newPlans[index].features[fIndex] = e.target.value;
                            setPricingPlans(newPlans);
                          }}
                          className="bg-transparent border-none text-xs text-stone-500 dark:text-stone-400 font-medium w-full focus:outline-none focus:text-stone-900 dark:focus:text-white transition-colors"
                        />
                        <button 
                          onClick={() => {
                            const newPlans = [...pricingPlans];
                            newPlans[index].features = newPlans[index].features.filter((_, i) => i !== fIndex);
                            setPricingPlans(newPlans);
                          }}
                          className="opacity-0 group-hover/feature:opacity-100 p-1 text-stone-300 dark:text-stone-700 hover:text-rose-500 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const newPlans = [...pricingPlans];
                        newPlans[index].features.push('New Feature');
                        setPricingPlans(newPlans);
                      }}
                      className="flex items-center gap-3 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest pt-2 hover:translate-x-1 transition-transform"
                    >
                      <Plus size={12} /> Add Feature
                    </button>
                  </div>
                </motion.div>
              ))}

              {pricingPlans.length < 6 && (
                <button
                  onClick={() => {
                    const newId = String(Date.now());
                    setPricingPlans([
                      ...pricingPlans,
                      {
                        id: newId,
                        name: 'Custom Tier',
                        price: 4999,
                        interval: 'month',
                        features: ['Custom Feature']
                      }
                    ]);
                  }}
                  className="p-8 rounded-[2.5rem] border-2 border-dashed border-stone-200 dark:border-stone-800 hover:border-emerald-500 dark:hover:border-emerald-500/50 bg-stone-50/50 dark:bg-stone-900/20 hover:bg-stone-50 dark:hover:bg-stone-900/40 transition-all flex flex-col items-center justify-center gap-4 text-center min-h-[300px] group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-400 group-hover:text-emerald-500 group-hover:border-emerald-500 transition-all shadow-sm">
                    <Plus size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900 dark:text-white">Create Custom Plan</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-[200px]">Add a new pricing tier to offer to your customers.</p>
                  </div>
                </button>
              )}
            </div>

            <div className="p-8 bg-stone-900 dark:bg-stone-950 rounded-[2.5rem] border border-stone-800 dark:border-stone-700 flex items-center justify-between text-white overflow-hidden relative transition-colors shadow-2xl shadow-stone-950/20">
               <div className="relative z-10">
                  <h4 className="text-xl font-serif font-bold mb-2">Monetization Engine</h4>
                  <p className="text-stone-400 dark:text-stone-500 text-xs max-w-sm transition-colors">Changes here reflect across the Artisan Network and Heritage Store once committed to the ledger.</p>
               </div>
               <div className="w-16 h-16 rounded-2xl bg-white/10 dark:bg-white/5 flex items-center justify-center backdrop-blur-md relative z-10 transition-colors">
                  <BadgePercent size={32} className="text-emerald-400" />
               </div>
               <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full"></div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-12">
            <div>
              <h2 className="text-3xl font-serif font-black text-stone-900 dark:text-white mb-3 tracking-tighter uppercase">Audit Ledger</h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">Monitoring all strategic changes and administrative maneuvers within the Page Pilot network.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-black text-stone-400 dark:text-stone-600 uppercase tracking-[0.2em]">Activity Registry</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Live Monitoring</span>
                </div>
              </div>

              <div className="bg-stone-50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                {logsLoading ? (
                  <div className="p-20 flex flex-col items-center justify-center gap-4">
                    <Loader2 size={32} className="text-emerald-500 animate-spin" />
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Decrypting Logs...</p>
                  </div>
                ) : adminLogs.length === 0 ? (
                  <div className="p-20 flex flex-col items-center justify-center gap-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-300 dark:text-stone-700">
                      <Terminal size={32} />
                    </div>
                    <p className="text-sm text-stone-400 font-medium">The ledger is currently silent. No recent administrative activities recorded.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {adminLogs.map((log: any) => (
                      <div key={log.id} className="p-6 hover:bg-white dark:hover:bg-stone-800/50 transition-colors group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 bg-stone-100 dark:bg-stone-800 rounded-xl text-stone-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-600 transition-colors">
                              {log.action.toLowerCase().includes('delete') ? <X size={14} /> : 
                               log.action.toLowerCase().includes('update') ? <Zap size={14} /> : 
                               log.action.toLowerCase().includes('create') ? <Plus size={14} /> : 
                               <Activity size={14} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-stone-900 dark:text-white mb-0.5 group-hover:text-emerald-600 transition-colors">{log.action}</p>
                              <p className="text-xs text-stone-500 dark:text-stone-500 font-medium">{log.detail}</p>
                            </div>
                          </div>
                          <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-1 pl-12 md:pl-0">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-stone-900 dark:text-stone-300 uppercase tracking-widest">
                              <User size={10} className="text-emerald-500" />
                              {log.adminName || log.adminEmail || 'Admin'}
                            </div>
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                              <Clock size={10} />
                              {log.createdAt ? new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Unknown Date'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {['profile', 'site', 'pricing', 'general', 'localization', 'notifications'].includes(activeTab) && (
          <div className="mt-12 pt-8 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end transition-colors">
             <button 
              onClick={handleSave}
              disabled={loading}
              className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-700 dark:hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/10 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : saved ? (
                <Check size={20} />
              ) : (
                <Save size={20} />
              )}
              {loading ? 'Committing...' : saved ? 'Preferences Recorded' : 'Record Changes'}
            </button>
          </div>
        )}

      </div>
    </div>
  </div>
  );
}
