/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Layout,
  FileText, 
  ShoppingBag, 
  Settings, 
  Users, 
  Plug, 
  Shapes,
  ChevronRight,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

import Logo from './Logo';

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { profile } = useAuth();
  const role = profile?.role || 'author';

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'editor', 'author', 'viewer'], color: 'text-blue-500' },
    { name: 'Pages & Themes', path: '/builder', icon: Layout, roles: ['admin', 'editor'], color: 'text-amber-500' },
    { name: 'Site Projects', path: '/designs', icon: Shapes, roles: ['admin', 'editor'], color: 'text-indigo-500' },
    { name: 'Content & Articles', path: '/content', icon: FileText, roles: ['admin', 'editor', 'author'], color: 'text-emerald-500' },
    { name: 'Media Library', path: '/media', icon: ImageIcon, roles: ['admin', 'editor', 'author'], color: 'text-purple-500' },
    { name: 'Store Manager', path: '/ecommerce', icon: ShoppingBag, roles: ['admin', 'editor'], color: 'text-rose-500' },
    { name: 'User Management', path: '/users', icon: Users, roles: ['admin'], color: 'text-indigo-500' },
    { name: 'Plugins & Add-ons', path: '/plugins', icon: Plug, roles: ['admin', 'editor'], color: 'text-pink-500' },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'editor', 'author'], color: 'text-stone-400' },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-full lg:w-72 h-full bg-stone-950 text-stone-400 flex flex-col shrink-0 relative">
      {/* Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      
      <div className="h-24 flex items-center justify-between px-8 relative z-10 border-b border-stone-900/50">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all duration-500">
            <Logo size={24} textColor="text-emerald-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-white tracking-tighter block leading-none group-hover:text-emerald-400 transition-colors uppercase">Page Pilot</span>
            <span className="text-[8px] font-bold text-stone-600 uppercase tracking-[0.4em] mt-1 block group-hover:text-stone-400 transition-colors">Workspace Portfolio</span>
          </div>
        </Link>
        <button 
          onClick={onClose}
          className="lg:hidden p-2 text-stone-500 hover:text-white bg-stone-900 rounded-xl transition-all active:scale-90"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-5 mt-8 space-y-1 relative z-10 overflow-y-auto no-scrollbar">
        <div className="px-4 mb-4">
          <p className="text-[10px] font-black text-stone-700 uppercase tracking-[0.2em] flex items-center gap-2">
            Workspace
          </p>
        </div>
        
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all group relative overflow-hidden ${
                isActive 
                  ? 'text-white' 
                  : 'hover:text-stone-200 hover:bg-stone-900/50'
              }`}
            >
              <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-emerald-400 relative z-10' : `${item.color} opacity-60 group-hover:opacity-100 relative z-10 transition-all duration-300`} />
              <span className={`text-[13px] font-medium tracking-tight relative z-10 ${isActive ? 'translate-x-1' : 'group-hover:translate-x-0.5'} transition-transform whitespace-nowrap`}>
                {item.name}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="sidebarActive"
                  className="absolute inset-0 bg-stone-900 border-r-2 border-emerald-500"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}

        <div className="pt-8 px-4 mb-4">
          <p className="text-[10px] font-black text-stone-700 uppercase tracking-[0.2em] flex items-center gap-2">
            Resources
          </p>
        </div>
        <a 
          href="/blog" 
          target="_blank"
          className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-stone-500 hover:text-stone-200 hover:bg-stone-900/50 transition-all font-medium text-[13px]"
        >
          <Shapes size={18} className="text-stone-700" />
          <span>Live Site</span>
          <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </nav>

      <div className="p-6 mt-auto relative z-10">
        <div className="bg-stone-900/50 rounded-2xl p-5 border border-stone-900 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-black text-stone-600 uppercase tracking-[0.1em]">Cloud Status</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)] animate-pulse"></div>
              <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">not Operational</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
             <div className="h-1 w-full bg-stone-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "1%" }}
                  className="h-full bg-rose-500/50"
                />
             </div>
             <p className="text-[9px] text-stone-600 font-bold uppercase tracking-widest mt-1">Storage 1%</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
