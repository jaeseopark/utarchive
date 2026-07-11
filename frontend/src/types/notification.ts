export type NotificationType = "error" | "success" | "info" | "warning";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface NotificationStoreState {
  notifications: Notification[];

  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  getLastN: (n: number) => Notification[];
  getUnreadCount: () => number;
}
