import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'error' | 'success' | 'info';
  onClose: () => void;
  duration?: number;
}

const ErrorNotification: React.FC<NotificationProps> = ({ 
  message, 
  type, 
  onClose, 
  duration = 5000 
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getIcon = () => {
    switch (type) {
      case 'error': return <AlertCircle size={20} />;
      case 'success': return <CheckCircle size={20} />;
      case 'info': return <Info size={20} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'error': return 'bg-red-900/90 border-red-500 text-red-100';
      case 'success': return 'bg-green-900/90 border-green-500 text-green-100';
      case 'info': return 'bg-blue-900/90 border-blue-500 text-blue-100';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 min-w-80 ${getColors()}`}>
      {getIcon()}
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button 
        onClick={onClose}
        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default ErrorNotification;