import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Info, AlertTriangle, AlertCircle, ShoppingBag, Sparkles, Gift } from 'lucide-react';
import { AppNotification, notificationService, NotificationType } from '../services/notificationService';
import { useAuth } from './AuthContext';

interface Toast extends Omit<AppNotification, '_id' | 'createdAt' | 'read' | 'userId'> {
  id: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  toast: (title: string, message: string, type?: NotificationType) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  const showToast = useCallback((title: string, message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const toast = useCallback((title: string, message: string, type: NotificationType = 'info') => {
    showToast(title, message, type);
  }, [showToast]);

  const isInitialMount = React.useRef(true);
  const shownToastIds = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    isInitialMount.current = true;
    shownToastIds.current.clear();

    if (!user) {
      setNotifications([]);
      return;
    }

    const unsubscribe = notificationService.subscribeToNotifications(user.uid, (newNotifications) => {
      setNotifications(newNotifications);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    if (isInitialMount.current) {
      if (notifications.length > 0) {
        notifications.forEach(n => {
          const id = n._id || n.id;
          if (id) {
            shownToastIds.current.add(id);
          }
        });
        isInitialMount.current = false;
      }
      return;
    }

    notifications.forEach(n => {
      const id = n._id || n.id;
      if (id && !n.read && !shownToastIds.current.has(id)) {
        shownToastIds.current.add(id);
        showToast(n.title, n.message, n.type);
      }
    });
  }, [notifications, showToast, user]);

  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
  };

  const markAllAsRead = async () => {
    await notificationService.markAllAsRead();
  };

  const clearAll = async () => {
    await notificationService.clearAll();
  };

  const deleteNotification = async (id: string) => {
    await notificationService.deleteNotification(id);
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <Check className="text-emerald-500" size={18} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={18} />;
      case 'error': return <AlertCircle className="text-rose-500" size={18} />;
      case 'order': return <ShoppingBag className="text-blue-500" size={18} />;
      case 'publication': return <Sparkles className="text-purple-500" size={18} />;
      case 'welcome': return <Gift className="text-pink-500" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, toast, markAsRead, markAllAsRead, clearAll, deleteNotification }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto w-80 bg-white rounded-2xl shadow-2xl border border-stone-100 p-4 flex gap-4 overflow-hidden group relative"
            >
              <div className="shrink-0 w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center border border-stone-100">
                {getIcon(t.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-stone-900 truncate">{t.title}</h4>
                <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{t.message}</p>
              </div>
              <button 
                onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
                className="p-1 text-stone-300 hover:text-stone-900 transition-colors shrink-0"
              >
                <X size={14} />
              </button>
              <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/20 w-full">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
