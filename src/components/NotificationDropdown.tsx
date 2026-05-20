import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, Trash2, ExternalLink, Info, Sparkles, ShoppingBag, Gift } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationType } from '../services/notificationService';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const safeFormatDistanceToNow = (date: any) => {
  if (!date) return 'just now';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'just now';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch (e) {
    return 'just now';
  }
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, deleteNotification } = useNotifications();

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'welcome': return <Gift size={16} className="text-pink-500" />;
      case 'publication': return <Sparkles size={16} className="text-emerald-500" />;
      case 'order': return <ShoppingBag size={16} className="text-blue-500" />;
      case 'success': return <Check size={16} className="text-emerald-500" />;
      case 'warning': return <Info size={16} className="text-amber-500" />;
      case 'error': return <X size={16} className="text-rose-500" />;
      case 'info': return <Info size={16} className="text-blue-500" />;
      default: return <Info size={16} className="text-stone-400" />;
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await markAsRead(id);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteNotification(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleClearAll = async () => {
    await clearAll();
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`transition-all relative p-2.5 rounded-xl ${isOpen ? 'bg-emerald-50 text-emerald-600' : 'text-stone-400 hover:text-emerald-900 hover:bg-stone-50'}`}
      >
        <Bell size={20} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 text-[9px] text-white font-black rounded-full border-2 border-white shadow-sm flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-stone-950/5" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
              className="absolute right-0 mt-3 w-80 md:w-[28rem] bg-stone-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/10 z-50 overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] font-serif">Notifications</h3>
                   <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                      >
                        {unreadCount} New
                      </motion.span>
                    )}
                   </AnimatePresence>
                </div>
                {notifications.length > 0 && (
                  <div className="flex gap-6">
                    <button 
                      onClick={handleMarkAllAsRead}
                      className="text-[9px] font-black text-stone-500 hover:text-white transition-colors uppercase tracking-[0.2em]"
                    >
                      Sweep All
                    </button>
                    <button 
                      onClick={handleClearAll}
                      className="text-[9px] font-black text-stone-500 hover:text-stone-400 transition-colors uppercase tracking-[0.2em]"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="max-h-[440px] overflow-y-auto no-scrollbar">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {notifications.map((n) => (
                      <div 
                        key={n._id || n.id}
                        className={`p-6 group transition-all relative ${!n.read ? 'bg-white/5' : 'hover:bg-white/5'}`}
                      >
                         <div className="flex gap-5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-500 ${!n.read ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-stone-800/50 border-white/5 grayscale group-hover:grayscale-0 group-hover:bg-stone-800'}`}>
                              {getIcon(n.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <h4 className={`text-sm leading-tight truncate ${!n.read ? 'font-black text-white' : 'font-bold text-stone-400 group-hover:text-stone-200'}`}>
                                    {n.title}
                                  </h4>
                                  <span className="text-[9px] font-bold text-stone-600 whitespace-nowrap mt-0.5 uppercase tracking-widest group-hover:text-stone-500 transition-colors">
                                    {safeFormatDistanceToNow(n.createdAt)}
                                  </span>
                               </div>
                               <p className={`text-[11px] leading-relaxed line-clamp-2 font-medium transition-colors ${!n.read ? 'text-stone-300' : 'text-stone-500 group-hover:text-stone-400'}`}>
                                 {n.message}
                               </p>
                               {n.link && (
                                 <Link 
                                   to={n.link} 
                                   onClick={() => { setIsOpen(false); markAsRead(n._id || n.id || ''); }}
                                   className="inline-flex items-center gap-2 mt-3 text-[9px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-[0.2em] transition-all group-hover:translate-x-1"
                                 >
                                   Expedite <ExternalLink size={10} />
                                 </Link>
                               )}
                            </div>
                         </div>
                         
                         <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 flex gap-1.5">
                            {!n.read && (
                              <button 
                                onClick={(e) => handleMarkAsRead(e, n._id || n.id || '')}
                                className="p-2 bg-stone-800 border border-white/10 rounded-xl text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-xl active:scale-90"
                                title="Mark as read"
                              >
                                <Check size={12} />
                              </button>
                            )}
                            <button 
                              onClick={(e) => handleDelete(e, n._id || n.id || '')}
                              className="p-2 bg-stone-800 border border-white/10 rounded-xl text-stone-500 hover:bg-rose-500 hover:text-white transition-all shadow-xl active:scale-90"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                         </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-20 text-center space-y-4">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-16 h-16 bg-stone-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-stone-700 border border-white/5"
                    >
                      <Bell size={32} strokeWidth={1} />
                    </motion.div>
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Zen State</h3>
                    <p className="text-[11px] text-stone-500 font-medium leading-relaxed max-w-[15rem] mx-auto italic">Your workshop is currently in a state of perfect harmony. No disturbances detected.</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white/5 border-t border-white/5 text-center">
                <button className="text-[9px] font-black text-stone-500 hover:text-white uppercase tracking-[0.3em] transition-colors font-display">
                  System Preferences
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
