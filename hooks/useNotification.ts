import { useState, useCallback } from 'react';

interface Notification {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

export const useNotification = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showError = useCallback((message: string) => {
    addNotification(message, 'error');
  }, [addNotification]);

  const showSuccess = useCallback((message: string) => {
    addNotification(message, 'success');
  }, [addNotification]);

  const showInfo = useCallback((message: string) => {
    addNotification(message, 'info');
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    showError,
    showSuccess,
    showInfo
  };
};