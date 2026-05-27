/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NotificationDropdown from '../components/NotificationDropdown';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User as UserIcon, Bell, Menu, X, Layout } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { useNotificationSimulator } from '../services/notificationSimulator';

export default function MainLayout() {
  const { profile, user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [digitalResilience, setDigitalResilience] = useState(() => {
    return localStorage.getItem('digitalResilience') !== 'false';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setDigitalResilience(localStorage.getItem('digitalResilience') !== 'false');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('digitalResilienceChange', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('digitalResilienceChange', handleStorageChange);
    };
  }, []);

  // useNotificationSimulator();

  const getPageTitle = () => {
    const path = location.pathname.split('/')[1];
    return path ? path.charAt(0).toUpperCase() + path.slice(1) : 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-stone-50 dark:bg-stone-950 font-sans text-stone-900 dark:text-stone-100 leading-relaxed overflow-hidden transition-colors duration-300">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden shadow-2xl"
            >
              <Sidebar onClose={() => setIsSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-24 bg-white dark:bg-stone-900 border-b border-stone-200/60 dark:border-stone-800 flex items-center justify-between px-6 md:px-10 shrink-0 z-30 sticky top-0 transition-colors duration-300">
          <div className="flex items-center gap-4 md:gap-8 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-3 text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-2xl transition-all active:scale-95 shrink-0 border border-stone-100 dark:border-stone-800 shadow-sm"
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-stone-300 dark:text-stone-600 uppercase tracking-[0.4em] mb-1 leading-none">Management</span>
              <h1 className="text-xl md:text-3xl font-serif font-black text-stone-900 dark:text-white tracking-tighter truncate">{getPageTitle()}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-8 shrink-0">
            <div className="hidden xl:flex items-center gap-2 bg-stone-50/50 dark:bg-stone-800/50 p-1 rounded-2xl border border-stone-100 dark:border-stone-800">
               <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-100 dark:border-stone-800">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${digitalResilience ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`}></div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${digitalResilience ? 'text-stone-900 dark:text-white' : 'text-rose-500'}`}>
                    {digitalResilience ? 'Site Online' : 'Site Offline'}
                  </span>
               </div>
               <div className="px-4 py-2 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em]">
                  Page Pilot Production
               </div>
            </div>

            <NotificationDropdown />
            
            <div className="flex items-center gap-3 md:pl-6 md:border-l md:border-stone-100 dark:border-stone-800">
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-2 justify-end mb-1">
                  <p className="text-xs font-bold text-stone-900 dark:text-white leading-none truncate max-w-[120px]">{profile?.displayName || user?.email?.split('@')[0]}</p>
                  {['pc0050272005@gmail.com', 'ravikumar888452@gmail.com', 'ullasmahesh21@gmail.com'].includes(profile?.email || '') && (
                    <span className="text-[7px] font-black bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-1 py-0.5 rounded uppercase tracking-widest">Founder</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  {profile?.jobTitle && (
                    <span className="text-[8px] font-black bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full uppercase tracking-widest leading-none border border-emerald-500/20">
                      {profile.jobTitle}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                    <p className="text-[9px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">{profile?.role || 'Artisan'}</p>
                  </div>
                </div>
              </div>
                <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500 overflow-hidden border border-stone-200 dark:border-stone-700 shrink-0 shadow-sm transition-all group-hover:border-emerald-200 dark:group-hover:border-emerald-800">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} referrerPolicy="no-referrer" alt="Profile" className="w-full h-full object-cover" />
                  ) : user?.photoURL ? (
                    <img src={user.photoURL} referrerPolicy="no-referrer" alt="Profile" className="w-full h-full object-cover" />
                  ) : profile?.photoURL ? (
                    <img src={profile.photoURL} referrerPolicy="no-referrer" alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={16} />
                  )}
                </div>
              <button 
                onClick={() => logout()}
                className="text-stone-300 dark:text-stone-700 hover:text-stone-600 dark:hover:text-stone-400 transition-all p-2 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-xl active:scale-90"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-white dark:bg-stone-950 transition-colors duration-300">
          <div className="max-w-7xl mx-auto min-h-full">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
