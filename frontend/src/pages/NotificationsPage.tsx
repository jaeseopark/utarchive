import React from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../stores/useNotificationStore";
import { Notification, NotificationType } from "../types/notification";

const getNotificationBgColor = (type: NotificationType) => {
  switch (type) {
    case "error":
      return "bg-red-50";
    case "success":
      return "bg-green-50";
    case "warning":
      return "bg-yellow-50";
    case "info":
      return "bg-blue-50";
    default:
      return "bg-slate-50";
  }
};

const getNotificationTextColor = (type: NotificationType) => {
  switch (type) {
    case "error":
      return "text-red-700";
    case "success":
      return "text-green-700";
    case "warning":
      return "text-yellow-700";
    case "info":
      return "text-blue-700";
    default:
      return "text-slate-700";
  }
};

const getNotificationBorderColor = (type: NotificationType) => {
  switch (type) {
    case "error":
      return "border-l-red-500";
    case "success":
      return "border-l-green-500";
    case "warning":
      return "border-l-yellow-500";
    case "info":
      return "border-l-blue-500";
    default:
      return "border-l-slate-500";
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

export function NotificationsPage() {
  const navigate = useNavigate();
  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearAll = useNotificationStore((state) => state.clearAll);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Notifications</h2>
          <p className="mt-2 text-slate-600">
            {notifications.length === 0
              ? "No notifications"
              : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""} (${unreadCount} unread)`}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="rounded-2xl border border-slate-400 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:border-sky-500 hover:bg-sky-100"
              >
                Mark all as read
              </button>
            )}
            <button
              onClick={clearAll}
              className="rounded-2xl border border-slate-400 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:bg-slate-200"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-12 text-center">
            <p className="text-slate-600">No notifications yet</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 text-sm text-sky-600 hover:text-sky-700 font-medium"
            >
              ← Go back
            </button>
          </div>
        ) : (
          <>
            {/* Unread Notifications */}
            {notifications.filter((n) => !n.read).length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Unread
                </h3>
                <div className="space-y-2">
                  {notifications
                    .filter((n) => !n.read)
                    .map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`rounded-2xl border-l-2 ${getNotificationBorderColor(
                          notification.type,
                        )} ${getNotificationBgColor(notification.type)} p-4 cursor-pointer transition hover:shadow-md`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`text-lg flex-shrink-0 ${getNotificationTextColor(notification.type)}`}
                          >
                            {getTypeIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-semibold break-words ${getNotificationTextColor(notification.type)}`}
                            >
                              {notification.message}
                            </p>
                            <p
                              className={`text-xs mt-1 ${getNotificationTextColor(notification.type)} opacity-70`}
                            >
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Read Notifications */}
            {notifications.filter((n) => n.read).length > 0 && (
              <div>
                {notifications.filter((n) => !n.read).length > 0 && (
                  <h3 className="my-6 text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    Read
                  </h3>
                )}
                <div className="space-y-2">
                  {notifications
                    .filter((n) => n.read)
                    .map((notification) => (
                      <div
                        key={notification.id}
                        className={`rounded-2xl border-l-2 ${getNotificationBorderColor(
                          notification.type,
                        )} bg-white p-4 transition hover:shadow-md`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`text-lg flex-shrink-0 ${getNotificationTextColor(notification.type)}`}
                          >
                            {getTypeIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`break-words ${getNotificationTextColor(notification.type)}`}
                            >
                              {notification.message}
                            </p>
                            <p
                              className={`text-xs mt-1 ${getNotificationTextColor(notification.type)} opacity-60`}
                            >
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
