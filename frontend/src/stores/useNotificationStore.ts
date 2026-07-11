import { create } from 'zustand';
import { Notification, NotificationStoreState } from '../types/notification';

export const useNotificationStore = create<NotificationStoreState>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false,
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
    }));
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  getLastN: (n) => {
    return get().notifications.slice(0, n);
  },

  getUnreadCount: () => {
    return get().notifications.filter((notification) => !notification.read).length;
  },
}));
