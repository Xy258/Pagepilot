import { useEffect } from 'react';
import { notificationService } from './notificationService';
import { useAuth } from '../contexts/AuthContext';

export function useNotificationSimulator() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const simulate = () => {
      const types: Array<'success' | 'info' | 'warning' | 'error' | 'publication' | 'order' | 'welcome'> = ['success', 'info', 'warning', 'error', 'publication', 'order', 'welcome'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      const content: Record<string, { title: string; message: string }> = {
        success: { title: 'Optimization Complete', message: 'All assets have been compressed for faster loading.' },
        info: { title: 'Visitor Alert', message: 'A new user from Japan is browsing your landing page.' },
        warning: { title: 'Low Inventory', message: 'Stock for "Artisan Sandalwood" is below 5 units.' },
        error: { title: 'Generation Sync', message: 'Failed to sync AI canvas state. Retrying automatically...' },
        publication: { title: 'Deployment Success', message: 'Your latest changes are now live on the edge network.' },
        order: { title: 'New Sale!', message: 'You just received an order for ₹1,200.00' },
        welcome: { title: 'Artisan Milestone', message: 'Congratulations! You reached 500 followers.' }
      };

      const selected = content[type] || content.info;

      notificationService.createNotification({
        userId: user.uid,
        title: selected.title,
        message: selected.message,
        type: type,
        link: type === 'order' ? '/ecommerce' : type === 'publication' ? '/builder' : '/dashboard'
      });
    };

    // Run every 45 seconds to match the requested simulation frequency
    const interval = setInterval(simulate, 45000);
    
    // Initial jumpstart for demo feel
    const timeout = setTimeout(simulate, 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [user]);
}
