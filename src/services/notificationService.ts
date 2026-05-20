/**
 * Notification Service
 * Manages the creation, retrieval, and state of in-app notifications.
 * Mocked for local execution.
 */

import { api } from '../lib/api';

export type NotificationType = 'welcome' | 'publication' | 'system' | 'order' | 'success' | 'warning' | 'error' | 'info';

export interface AppNotification {
  _id?: string;
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: any; 
  link?: string;
  persistent?: boolean;
}

export const notificationService = {
  /**
   * Dispatches a new notification.
   */
  async createNotification(data: Omit<AppNotification, '_id' | 'id' | 'createdAt' | 'read'>) {
    try {
      return await api.notifications.create(data);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  },

  /**
   * Sends a notification to all administrators.
   */
  async notifyAdmins(data: Omit<AppNotification, '_id' | 'id' | 'createdAt' | 'read' | 'userId'>) {
    try {
      const users = await api.users.list();
      const admins = (users || []).filter((u: any) => u.role === 'admin');
      
      const promises = admins.map((admin: any) => 
        api.notifications.create({
          ...data,
          userId: admin.uid || admin.id
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  },

  /**
   * Establishes a listener to the user's notification stream.
   * Stubbed for local mock.
   */
  subscribeToNotifications(userId: string, callback: (notifications: AppNotification[]) => void) {
    if (!userId) return () => {};

    // Initial fetch
    api.notifications.list().then(list => {
      callback(list as AppNotification[]);
    });

    // In a real local app, we might use a custom event emitter or polling
    const interval = setInterval(async () => {
      const list = await api.notifications.list();
      callback(list as AppNotification[]);
    }, 5000);

    return () => clearInterval(interval);
  },

  /**
   * Updates a single notification's status to read.
   */
  async markAsRead(notificationId: string) {
    try {
      await api.notifications.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  /**
   * Performs a batch update to mark all unread notifications as read.
   */
  async markAllAsRead() {
    try {
      await api.notifications.readAll();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  },

  /**
   * Permanently removes a notification.
   */
  async deleteNotification(notificationId: string) {
    try {
      await api.notifications.delete(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  },

  /**
   * Clears all notifications for the user.
   */
  async clearAll() {
    try {
      await api.notifications.clearAll();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
};
