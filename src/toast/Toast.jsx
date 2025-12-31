import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useTheme, themeConfig } from '../theme/theme';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const MAX_TOASTS = 5;
  const recentToastsRef = useRef(new Map()); // Track recent toasts to prevent duplicates

  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    // Prevent duplicate toasts within 2 seconds
    const toastKey = `${type}-${message}`;
    const now = Date.now();
    const lastShown = recentToastsRef.current.get(toastKey);
    
    if (lastShown && (now - lastShown) < 2000) {
      // Duplicate toast within 2 seconds, ignore it
      return null;
    }

    recentToastsRef.current.set(toastKey, now);
    
    // Clean up old entries after 5 seconds
    setTimeout(() => {
      recentToastsRef.current.delete(toastKey);
    }, 5000);

    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    
    setToasts(prev => {
      const newToasts = [...prev, toast];
      // Keep only the most recent toasts
      return newToasts.slice(-MAX_TOASTS);
    });

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message, duration) => {
    return showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message, duration) => {
    return showToast(message, 'error', duration);
  }, [showToast]);

  const info = useCallback((message, duration) => {
    return showToast(message, 'info', duration);
  }, [showToast]);

  const warning = useCallback((message, duration) => {
    return showToast(message, 'warning', duration);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
          colors={colors}
        />
      ))}
    </div>
  );
};

const Toast = ({ toast, onRemove, colors }) => {
  const { theme } = useTheme();
  const [isExiting, setIsExiting] = useState(false);

  // Auto-remove toast after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onRemove(toast.id);
      }, 300);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300);
  };

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-green-500/10 dark:bg-green-500/20',
          border: 'border-green-500/30',
          icon: 'text-green-500',
          iconBg: 'bg-green-500/20',
          iconSvg: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      case 'error':
        return {
          bg: 'bg-red-500/10 dark:bg-red-500/20',
          border: 'border-red-500/30',
          icon: 'text-red-500',
          iconBg: 'bg-red-500/20',
          iconSvg: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/20',
          border: 'border-amber-500/30',
          icon: 'text-amber-500',
          iconBg: 'bg-amber-500/20',
          iconSvg: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        };
      default:
        return {
          bg: 'bg-blue-500/10 dark:bg-blue-500/20',
          border: 'border-blue-500/30',
          icon: 'text-blue-500',
          iconBg: 'bg-blue-500/20',
          iconSvg: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className={`
        ${styles.bg} ${styles.border} border rounded-lg shadow-lg p-4
        ${colors.surface} pointer-events-auto
        transform transition-all duration-300 ease-in-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        animate-slide-in-right
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className={`${styles.iconBg} ${styles.icon} rounded-lg p-2 flex-shrink-0`}>
          {styles.iconSvg}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${colors.text}`}>
            {toast.message}
          </p>
        </div>
        <button
          onClick={handleRemove}
          className={`flex-shrink-0 ${colors.textMuted} hover:${colors.text} transition-colors p-1 rounded hover:${colors.surfaceSecondary}`}
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

