import { useNotificationStore } from '../stores/useNotificationStore';

export function useNotifications() {
  const addNotification = useNotificationStore((state) => state.addNotification);

  return {
    notifySuccess: (message: string) => addNotification({ type: 'success', message }),
    notifyError: (message: string) => addNotification({ type: 'error', message }),
    notifyInfo: (message: string) => addNotification({ type: 'info', message }),
    notifyWarning: (message: string) => addNotification({ type: 'warning', message }),
  };
}
