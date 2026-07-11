import React from 'react';
import { useWebSocketContext } from '../context/WebSocketContext';
import { useNotificationStore } from '../stores/useNotificationStore';

interface NotificationBellIconProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const NotificationBellIcon: React.FC<NotificationBellIconProps> = ({ isOpen, onToggle }) => {
  const { isConnected, isConnecting } = useWebSocketContext();
  const unreadCount = useNotificationStore((state) => state.getUnreadCount());

  const getStatusColor = () => {
    if (isConnected) return 'bg-green-500';
    if (isConnecting) return 'bg-yellow-500 animate-pulse';
    return 'bg-red-500';
  };

  const getStatusTitle = () => {
    if (isConnected) return 'Connected to server';
    if (isConnecting) return 'Connecting to server...';
    return 'Disconnected from server';
  };

  return (
    <button
      onClick={onToggle}
      className={`relative p-2 rounded-lg transition-colors ${
        isOpen ? 'bg-slate-100' : 'hover:bg-slate-100'
      }`}
      title="Notifications"
      aria-label="Notifications"
    >
      {/* Bell Icon */}
      <svg
        className="w-6 h-6 text-slate-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {/* Status Dot Overlay */}
      <div
        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${getStatusColor()}`}
        title={getStatusTitle()}
      />

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </button>
  );
};
