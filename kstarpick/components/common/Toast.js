import React, { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const bgColor = 
    type === 'success' ? 'bg-green-50 border-green-500' :
    type === 'error' ? 'bg-red-50 border-red-500' :
    type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
    'bg-blue-50 border-blue-500';

  const textColor = 
    type === 'success' ? 'text-green-800' :
    type === 'error' ? 'text-red-800' :
    type === 'warning' ? 'text-yellow-800' :
    'text-blue-800';

  const Icon = 
    type === 'success' ? CheckCircle :
    type === 'error' ? AlertCircle :
    type === 'warning' ? AlertCircle :
    Info;

  const iconColor = 
    type === 'success' ? 'text-green-500' :
    type === 'error' ? 'text-red-500' :
    type === 'warning' ? 'text-yellow-500' :
    'text-blue-500';

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-fade-in">
      <div className={`flex items-center p-4 rounded-lg border ${bgColor} shadow-md`}>
        <Icon className={`mr-2 ${iconColor}`} size={20} />
        <div className={`flex-grow ${textColor}`}>{message}</div>
        <button 
          onClick={() => {
            setVisible(false);
            if (onClose) onClose();
          }} 
          className="ml-4 text-gray-500 hover:text-gray-700"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast; 