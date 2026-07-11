import React from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../stores/useNotificationStore";
import { Notification, NotificationType } from "../types/notification";

interface NotificationDropdownProps {
  onClose: () => void;
}

const getNotificationStyles = (type: NotificationType, isRead: boolean) => {
  const baseStyles = "px-4 py-3 rounded-lg cursor-pointer transition-colors";

  if (!isRead) {
    switch (type) {
      case "error":
        return `${baseStyles} bg-red-100 border-l-2 border-l-red-500 font-semibold text-red-900`;
      case "success":
        return `${baseStyles} bg-green-100 border-l-2 border-l-green-500 font-semibold text-green-900`;
      case "warning":
        return `${baseStyles} bg-yellow-100 border-l-2 border-l-yellow-500 font-semibold text-yellow-900`;
      case "info":
        return `${baseStyles} bg-blue-100 border-l-2 border-l-blue-500 font-semibold text-blue-900`;
      default:
        return `${baseStyles} bg-blue-100 border-l-2 border-l-blue-500 font-semibold text-blue-900`;
    }
  } else {
    switch (type) {
      case "error":
        return `${baseStyles} bg-white text-red-700 hover:bg-red-50`;
      case "success":
        return `${baseStyles} bg-white text-green-700 hover:bg-green-50`;
      case "warning":
        return `${baseStyles} bg-white text-yellow-700 hover:bg-yellow-50`;
      case "info":
        return `${baseStyles} bg-white text-blue-700 hover:bg-blue-50`;
      default:
        return `${baseStyles} bg-white text-blue-700 hover:bg-blue-50`;
    }
  }
};

const getTypeIcon = (type: NotificationType) => {
  switch (type) {
    case "error":
      return "✕";
    case "success":
      return "✓";
    case "warning":
      return "⚠";
    case "info":
      return "ℹ";
    default:
      return "●";
  }
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const lastNotifications = useNotificationStore((state) => state.getLastN(3));
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleSeeAll = () => {
    navigate("/notifications");
    onClose();
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-96 rounded-2xl bg-white shadow-2xl shadow-slate-200/40 z-50">
      {/* Header with Mark All As Read */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h3 className="font-semibold text-slate-900">Notifications</h3>
        {lastNotifications.some((n) => !n.read) && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-sky-600 hover:text-sky-700 font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-200">
        {lastNotifications.length > 0 ? (
          lastNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={getNotificationStyles(notification.type, notification.read)}
            >
              <div className="flex items-start gap-3">
                <span className="text-base mt-0.5 flex-shrink-0">
                  {getTypeIcon(notification.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="break-words text-sm">{notification.message}</p>
                  <p className="text-xs mt-1 opacity-60">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-8 text-center text-slate-500">
            <p>No notifications yet</p>
          </div>
        )}
      </div>

      {/* Footer with See All Link */}
      <div className="border-t border-slate-200 px-6 py-4">
        <button
          onClick={handleSeeAll}
          className="w-full text-center text-sm font-medium text-sky-600 hover:text-sky-700 transition-colors"
        >
          See all notifications
        </button>
      </div>
    </div>
  );
};
