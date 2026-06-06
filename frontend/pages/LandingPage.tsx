/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Globe, Rocket, Shield, PenTool, ArrowRight, ShoppingBag, Plug, Loader2, Sparkles } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Section {
  id: string;
  type: 'hero' | 'features' | 'testimonials' | 'cta' | 'contact' | 'text' | 'image' | 'gallery' | 'pricing' | 'footer';
  content: any;
  style: 'minimal' | 'bold' | 'glass' | 'brutalist';
}

interface SiteStyle {
  primaryColor: string;
  accentColor: string;
  fontFamily: 'serif' | 'sans' | 'mono' | 'display';
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
}

function RenderSection({ section, style }: { section: Section, style: SiteStyle }) {
  const getFontClass = () => {
    switch (style.fontFamily) {
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono';
      case 'display': return 'font-display';
      default: return 'font-sans';
    }
  };

  const getRadiusClass = () => {
    switch (style.borderRadius) {
      case 'none': return 'rounded-none';
      case 'small': return 'rounded-lg';
      case 'medium': return 'rounded-2xl';
      case 'large': return 'rounded-[2.5rem]';
      case 'full': return 'rounded-[4rem]';
      default: return 'rounded-[2rem]';
    }
  };

  return (
    <div className={`w-full py-12 md:py-20 px-6 ${getFontClass()}`}>
      <div className="max-w-6xl mx-auto">
        {section.type === 'hero' && (
          <div className="text-center space-y-8 py-20">
            <h1 className="text-5xl md:text-8xl font-bold tracking-tight leading-none" style={{ color: style.primaryColor }}>
              {section.content.title}
            </h1>
            <p className="text-xl text-stone-500 max-w-2xl mx-auto leading-relaxed">
              {section.content.subtitle}
            </p>
            <button 
              className={`px-10 py-5 text-white ${getRadiusClass()} text-sm font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-2xl`}
              style={{ backgroundColor: style.accentColor }}
            >
              {section.content.buttonText}
            </button>
          </div>
        )}

        {section.type === 'features' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {section.content.items?.map((item: any, i: number) => (
              <div key={i} className="p-10 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center mb-8" style={{ color: style.accentColor }}>
                  <Sparkles size={28} />
                </div>
                <h3 className="text-2xl font-bold text-stone-900 dark:text-white mb-4">{item.title}</h3>
                <p className="text-stone-500 dark:text-stone-400 leading-relaxed font-medium">{item.description}</p>
              </div>
            ))}
          </div>
        )}

        {section.type === 'text' && (
          <div className="max-w-3xl mx-auto py-10 space-y-6">
             <h3 className="text-3xl font-bold" style={{ color: style.primaryColor }}>{section.content.title}</h3>
             <div className="text-lg text-stone-600 dark:text-stone-400 leading-relaxed whitespace-pre-wrap">
               {section.content.body}
             </div>
          </div>
        )}

        {section.type === 'image' && (
          <div className={`overflow-hidden ${getRadiusClass()} bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 aspect-[21/9] relative`}>
             <img src={section.content.url} alt="Section" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
             {section.content.caption && (
               <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/60 to-transparent">
                 <p className="text-white text-sm font-bold uppercase tracking-widest">{section.content.caption}</p>
               </div>
             )}
          </div>
        )}

        {section.type === 'gallery' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {section.content.urls?.map((url: string, i: number) => (
              <div key={i} className={`aspect-square bg-stone-100 dark:bg-stone-800 ${getRadiusClass()} overflow-hidden border border-stone-100 dark:border-stone-800`}>
                <img src={url} alt="Gallery" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
        )}

        {section.type === 'pricing' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {section.content.tiers?.map((tier: any, i: number) => (
              <div key={i} className={`p-10 rounded-[2.5rem] border ${i === 1 ? 'border-emerald-200 bg-emerald-50/10 dark:bg-emerald-900/10' : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900'} text-center space-y-6`}>
                <h4 className="text-sm font-bold text-stone-400 uppercase tracking-widest">{tier.name}</h4>
                <p className="text-5xl font-bold" style={{ color: i === 1 ? style.accentColor : style.primaryColor }}>
                  {tier.price}
                </p>
                <div className="space-y-3">
                   {tier.features?.map((f: string, j: number) => (
                     <p key={j} className="text-sm text-stone-500 font-medium">{f}</p>
                   ))}
                </div>
                <button 
                  className={`w-full py-4 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all ${i === 1 ? 'bg-stone-900 dark:bg-emerald-600 text-white shadow-xl' : 'border border-stone-200 dark:border-stone-800 text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800'}`}
                >
                  Get {tier.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {section.type === 'testimonials' && (
          <div className="grid grid-cols-1 gap-12 max-w-4xl mx-auto">
            {section.content.v?.map((v: any, i: number) => (
              <div key={i} className="text-center space-y-6">
                <p className="text-2xl md:text-3xl text-stone-800 dark:text-stone-200 leading-relaxed italic font-serif">"{v.text}"</p>
                <div className="flex flex-col items-center">
                  <div className="w-20 h-px bg-stone-200 dark:bg-stone-800 mb-6" />
                  <div className="text-sm font-bold text-stone-400 uppercase tracking-widest">
                    {v.author} <span className="opacity-40 px-2">|</span> {v.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {section.type === 'cta' && (
          <div 
            className={`p-20 text-center text-white ${getRadiusClass()} space-y-8 overflow-hidden relative shadow-2xl`}
            style={{ backgroundColor: style.primaryColor }}
          >
            <div className="absolute inset-0 opacity-10 bg-white/5" />
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight relative z-10">{section.content.title}</h2>
            <p className="text-xl text-white/70 max-w-xl mx-auto relative z-10">{section.content.ctaText}</p>
            <button 
              className={`px-12 py-5 bg-white rounded-2xl text-sm font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-xl relative z-10`}
              style={{ color: style.primaryColor }}
            >
              {section.content.buttonLabel}
            </button>
          </div>
        )}

        {section.type === 'contact' && (
          <div className="max-w-2xl mx-auto space-y-10">
             <div className="text-center space-y-4">
                <h3 className="text-3xl font-bold" style={{ color: style.primaryColor }}>{section.content.title}</h3>
                <p className="text-stone-500 font-medium">{section.content.subtitle}</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Name" className="bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl px-6 py-4 font-medium focus:outline-none focus:ring-4 focus:ring-stone-900/5" />
                <input placeholder="Email" className="bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl px-6 py-4 font-medium focus:outline-none focus:ring-4 focus:ring-stone-900/5" />
                <textarea placeholder="Message" className="col-span-1 md:col-span-2 bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl px-6 py-4 font-medium focus:outline-none focus:ring-4 focus:ring-stone-900/5 h-40" />
                <button className={`col-span-1 md:col-span-2 py-5 text-white font-bold uppercase tracking-widest rounded-2xl shadow-xl hover:opacity-90 transition-all`} style={{ backgroundColor: style.primaryColor }}>
                   Send Message
                </button>
             </div>
          </div>
        )}

        {section.type === 'footer' && (
          <div className="py-10 border-t border-stone-100 dark:border-stone-900 text-center space-y-6">
             <p className="text-sm text-stone-400 font-medium uppercase tracking-widest">© 2026 {section.content.companyName}. All Rights Reserved.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { guestLogin, user } = useAuth();
  const navigate = useNavigate();
  const [siteData, setSiteData] = useState<{ sections: Section[], style: SiteStyle } | null>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSite = async () => {
      try {
        const [sites, users] = await Promise.all([
          api.sites.list(),
          api.users.list()
        ]);

        if (sites && sites.length > 0) {
          const latest = sites[0];
          setSiteData({
            sections: latest.sections,
            style: latest.style
          });
        }
        
        if (users) {
          const founders = ['pc0050272005@gmail.com', 'ravikumar888452@gmail.com', 'ullasmahesh21@gmail.com'];
          const filtered = users.filter((u: any) => u.email && founders.includes(u.email));
          setTeam(filtered);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSite();
  }, []);

  const handleGetStarted = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(user ? '/dashboard' : '/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-stone-300" size={40} />
      </div>
    );
  }

  // If there's a saved site, render it!
  if (siteData && siteData.sections.length > 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-stone-950">
        <nav className="fixed top-0 inset-x-0 h-16 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-100 dark:border-stone-900 z-50 px-6 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <Logo size={24} />
             <span className="font-bold uppercase tracking-tight text-xs">Live Preview</span>
           </div>
           <div className="flex items-center gap-4">
              <button 
                onClick={handleGetStarted}
                className="bg-stone-900 dark:bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest"
              >
                {user ? 'Go to Dashboard' : 'Login / Build'}
              </button>
           </div>
        </nav>
        <main className="pt-16">
          {siteData.sections.map((section, idx) => (
            <RenderSection key={section.id || idx} section={section} style={siteData.style} />
          ))}
        </main>
      </div>
    );
  }

  // Fallback to original Landing Page
  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 selection:bg-emerald-100 dark:selection:bg-emerald-900 selection:text-emerald-900 dark:selection:text-emerald-100 overflow-x-hidden transition-colors duration-300">
      <nav className="max-w-7xl mx-auto px-6 md:px-8 h-24 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Logo size={32} />
          <span className="text-xl md:text-3xl font-serif font-black text-stone-900 dark:text-white whitespace-nowrap tracking-tighter">Page Pilot</span>
        </div>
        <div className="flex items-center gap-4 md:gap-8 lg:gap-10">
          <Link to="/blog" className="text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:hover:text-white font-black tracking-[0.2em] text-[10px] uppercase transition-colors">Blogs</Link>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleGetStarted}
              className="bg-stone-900 dark:bg-emerald-600 hover:bg-stone-800 dark:hover:bg-emerald-500 text-white px-5 md:px-8 py-3 md:py-4 rounded-2xl font-black transition-all text-[10px] md:text-xs uppercase tracking-[0.25em] shadow-2xl shadow-stone-900/20 active:scale-95"
            >
              Login
            </button>
          </div>
        </div>
      </nav>

      <main>
        <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-32 text-center relative">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-white dark:bg-stone-900 rounded-full border border-stone-200 dark:border-stone-800 shadow-sm mb-6 md:mb-8">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[8px] md:text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-[0.2em] font-display">v2.0 Pilot Engine</span>
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-[ clamp(4rem,8vw,9rem)] font-serif font-bold text-stone-900 dark:text-white tracking-[-0.04em] mb-6 md:mb-10 leading-[0.95] max-w-5xl mx-auto">
              Sculpt your digital <br className="hidden sm:block" />
              <span className="italic text-emerald-600">masterpiece.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-base md:text-xl text-stone-600 dark:text-stone-400 mb-10 md:mb-14 font-sans font-medium opacity-80 leading-relaxed px-4">
              The next-generation, AI-fueled CMS for creators who value craftsmanship, performance, and the future of digital art.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 px-6">
              <button 
                onClick={handleGetStarted}
                className="w-full sm:w-auto bg-stone-900 dark:bg-white text-white dark:text-stone-950 px-8 md:px-12 py-4 md:py-5 rounded-2xl text-base md:text-lg font-bold hover:bg-stone-800 dark:hover:bg-stone-100 transition-all flex items-center justify-center gap-3 group shadow-2xl shadow-stone-950/20 active:scale-[0.98]"
              >
                Start Building <ArrowRight className="group-hover:translate-x-2 transition-transform" size={20} />
              </button>
              <button 
                onClick={() => navigate('/signup')}
                className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-5 rounded-2xl text-base md:text-lg font-bold text-stone-900 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900 transition-all border border-transparent hover:border-stone-200 dark:hover:border-stone-800 active:scale-[0.98]"
              >
                Sign up
              </button>
            </div>
          </motion.div>
        </section>

        <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-32">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-12">
            {[
              { icon: Cpu, title: 'AI Synthesis', desc: 'Generate high-fidelity content and optimize your reach with native Gemini Pro integration.' },
              { icon: Shield, title: 'Iron Clad', desc: 'Built on a zero-trust architecture with hardened security rules for total peace of mind.' },
              { icon: Globe, title: 'Universal Reach', desc: 'Zero-config internationalization. Deploy your voice to every corner of the planet.' },
              { icon: PenTool, title: 'Zen Editor', desc: 'A distraction-free visual environment where your thoughts become digital stone.' },
              { icon: ShoppingBag, title: 'Artisan Commerce', desc: 'Sell your creations with a seamless, modular shop experience out of the box.' },
              { icon: Plug, title: 'Neural Plugins', desc: 'Extend your sculptor hooks with a growing ecosystem of high-performance modules.' }
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-10 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-2xl hover:shadow-stone-200/40 dark:hover:shadow-black/20 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-stone-50 dark:bg-stone-800 rounded-bl-[4rem] group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors -z-10"></div>
                <div className="w-14 h-14 rounded-2xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500 mb-8 group-hover:scale-110 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-all shadow-inner border border-stone-100 dark:border-stone-700">
                  <f.icon size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-stone-900 dark:text-white mb-4 tracking-tight">{f.title}</h3>
                <p className="text-stone-500 dark:text-stone-400 font-sans leading-relaxed text-[15px]">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-32 border-t border-stone-100 dark:border-stone-900 transition-colors">
          <div className="text-center mb-16 md:mb-24">
             <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.4em] mb-4 block">The Council of Artisans</span>
             <h2 className="text-4xl md:text-6xl font-serif font-black text-stone-900 dark:text-white tracking-tighter">Meet the Guild</h2>
             <p className="mt-6 text-stone-500 dark:text-stone-400 max-w-2xl mx-auto font-medium">The visionaries and architects behind the CMS revolution. Each member brings a unique craft to the digital workshop.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.slice(0, 8).map((member, i) => (
              <motion.div 
                key={member.id || i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group flex flex-col items-center text-center p-8 rounded-[2.5rem] bg-stone-50/50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800/50 hover:bg-white dark:hover:bg-stone-900 hover:shadow-2xl hover:shadow-stone-200/50 dark:hover:shadow-black/40 transition-all"
              >
                <div className="w-24 h-24 rounded-[2rem] bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-300 mb-6 shadow-inner border border-stone-200/50 dark:border-stone-700/50 overflow-hidden relative">
                   <img 
                     src={member.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
                     alt={member.displayName || 'Page Pilot User'} 
                     referrerPolicy="no-referrer"
                     className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                   />
                </div>
                <div className="space-y-2">
                   <h3 className="text-xl font-serif font-black text-stone-900 dark:text-white tracking-tight">{member.displayName || 'Elite Pilot'}</h3>
                   <span className="inline-block text-[9px] font-black bg-stone-900 dark:bg-emerald-600 text-white px-2 py-0.5 rounded uppercase tracking-widest leading-none">
                      {member.jobTitle || member.role || 'Contributor'}
                   </span>
                   {member.bio && (
                     <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed max-w-[180px] mx-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {member.bio}
                     </p>
                   )}
                </div>
              </motion.div>
            ))}
          </div>

          {team.length === 0 && (
            <div className="flex flex-col items-center text-center py-10 opacity-40">
               <Shield size={48} className="text-stone-300 mb-4" />
               <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">Awaiting the first arrival...</p>
            </div>
          )}
        </section>

      </main>

      <footer className="border-t border-stone-200 dark:border-stone-900 py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="font-bold text-stone-900 dark:text-white uppercase tracking-tight text-xs">Page Pilot</span>
          </div>
          <p className="text-stone-400 dark:text-stone-600 text-sm">© 2026 Page Pilot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
