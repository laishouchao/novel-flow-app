import React, { useEffect, useState } from 'react';
import { useAppState, useAppDispatch, uiActions } from '../../store';
import type { Notification } from '../../types';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const iconMap = {
  success: <CheckCircle size={16} className="text-emerald-500" />,
  error: <AlertCircle size={16} className="text-red-500" />,
  warning: <AlertTriangle size={16} className="text-amber-500" />,
  info: <Info size={16} className="text-blue-500" />,
};

const bgMap = {
  success: 'bg-emerald-50 border-emerald-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-amber-50 border-amber-200',
  info: 'bg-blue-50 border-blue-200',
};

const NotificationCenter: React.FC = () => {
  const notifications = useAppState().ui.notifications;
  const dispatch = useAppDispatch();
  const [visible, setVisible] = useState<Notification[]>([]);

  useEffect(() => {
    setVisible(notifications.slice(-5)); // 只显示最近5条
  }, [notifications]);

  useEffect(() => {
    // 自动移除有过期时间的通知
    const timers = visible.map((n) => {
      if (n.duration && n.duration > 0) {
        return setTimeout(() => {
          dispatch(uiActions.removeNotification(n.id));
        }, n.duration);
      }
      return null;
    });
    return () => { timers.forEach((t) => t && clearTimeout(t)); };
  }, [visible, dispatch]);

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {visible.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-2 p-3 rounded-lg border shadow-sm animate-slide-in ${bgMap[n.type]}`}
        >
          <span className="mt-0.5 shrink-0">{iconMap[n.type]}</span>
          <div className="flex-1 min-w-0">
            {n.title && <div className="text-sm font-semibold text-slate-800">{n.title}</div>}
            <div className="text-xs text-slate-600">{n.message}</div>
          </div>
          <button
            onClick={() => dispatch(uiActions.removeNotification(n.id))}
            className="shrink-0 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;
