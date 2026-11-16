/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NotificationDropdown from '../components/NotificationDropdown';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';


export default function MainLayout() {
  const { profile, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const getPageTitle = () => {
    const path = location.pathname.split('/')[1];
    return path ? path.charAt(0).toUpperCase() + path.slice(1) : 'Dashboard';
  };

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
    navigate('/login');
  };

  return (
    <div className="flex h-dvh bg-stone-50 dark:bg-stone-950 font-sans text-stone-900 dark:text-stone-100 leading-relaxed overflow-hidden transition-colors duration-300">
      {/* Logout Confirm Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 border border-stone-100 dark:border-stone-800"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <LogOut size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white">Sign Out</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">End Session</p>
                </div>
              </div>
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-8">
                Are you sure you want to sign out? You'll need to log in again to access the workspace.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleLogout}
                  className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20 active:scale-95"
                >
                  Yes, Sign Out
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-6 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 border-0 p-0 bg-stone-900/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[min(18rem,calc(100vw_-_2rem))] z-50 lg:hidden shadow-2xl"
            >
              <Sidebar onClose={() => setIsSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 md:h-24 bg-white dark:bg-stone-900 border-b border-stone-200/60 dark:border-stone-800 flex items-center justify-between px-4 sm:px-6 md:px-10 shrink-0 z-30 sticky top-0 transition-colors duration-300">
          <div className="flex items-center gap-4 md:gap-8 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={isSidebarOpen}
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2.5 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-xl transition-all active:scale-95 shrink-0 border border-stone-200 dark:border-stone-700 shadow-sm"
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-[0.25em] mb-1 leading-none">Management</span>
              <h1 className="text-xl md:text-3xl font-serif font-black text-stone-900 dark:text-white tracking-tighter truncate">{getPageTitle()}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-8 shrink-0">

            <NotificationDropdown />
            
            <div className="flex items-center gap-3 md:pl-6 md:border-l md:border-stone-100 dark:border-stone-800">
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-2 justify-end mb-1">
                  <p className="text-xs font-bold text-stone-900 dark:text-white leading-none truncate max-w-[120px]">{profile?.displayName || user?.email?.split('@')[0]}</p>
                  {profile?.role === 'admin' && (
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
                <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-300 overflow-hidden border border-stone-200 dark:border-stone-700 shrink-0 shadow-sm">
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
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="text-stone-500 dark:text-stone-300 hover:text-rose-600 dark:hover:text-rose-400 transition-all p-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                aria-label="Sign out"
                title="Sign out"
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
