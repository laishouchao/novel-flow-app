import React, { useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (type: ToastType, message: string, duration?: number) => void;
}

export const ToastContext = React.createContext<ToastContextType>({
  addToast: () => {},
});

export const useToast = () => React.useContext(ToastContext);

const typeConfig: Record<ToastType, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  success: {
    icon: <CheckCircle size={18} className="text-emerald-500" />,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
  },
  error: {
    icon: <XCircle size={18} className="text-red-500" />,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
  },
  warning: {
    icon: <AlertTriangle size={18} className="text-amber-500" />,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
  },
  info: {
    icon: <Info size={18} className="text-blue-500" />,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
  },
};

let toastId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, message, duration }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast 容器 */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => {
          const config = typeConfig[toast.type];
          return (
            <div
              key={toast.id}
              className={`
                flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg
                ${config.bg} ${config.border} ${config.text}
                animate-in slide-in-from-right-full duration-300
              `}
            >
              <span className="shrink-0 mt-0.5">{config.icon}</span>
              <p className="text-sm flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

/** 独立使用的 Toast 组件（不依赖 Context） */
const Toast: React.FC<{
  type?: ToastType;
  message: string;
  visible: boolean;
  onClose?: () => void;
}> = ({ type = 'info', message, visible, onClose }) => {
  if (!visible) return null;
  const config = typeConfig[type];

  return (
    <div
      className={`
        fixed top-4 right-4 z-[100] flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg
        max-w-sm
        ${config.bg} ${config.border} ${config.text}
        animate-in slide-in-from-right-full duration-300
      `}
    >
      <span className="shrink-0 mt-0.5">{config.icon}</span>
      <p className="text-sm flex-1">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default Toast;
