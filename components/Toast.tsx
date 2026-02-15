import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onUndo?: () => void;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300); // Wait for animation
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle2 className="text-green-400" size={20} />;
      case 'error': return <AlertCircle className="text-red-400" size={20} />;
      default: return <CheckCircle2 className="text-blue-400" size={20} />;
    }
  };

  return (
    <div 
      className={`
        pointer-events-auto min-w-[300px] max-w-sm bg-slate-900 border border-slate-700/50 text-slate-200 
        px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 transform transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-10 scale-95' : 'opacity-100 translate-x-0 scale-100 animate-slide-up'}
      `}
    >
      {getIcon()}
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      
      {toast.onUndo && (
        <button 
          onClick={() => { toast.onUndo?.(); handleClose(); }}
          className="text-sm font-bold text-primary-400 hover:text-primary-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
        >
          <RotateCcw size={14} /> 撤销
        </button>
      )}

      <button 
        onClick={handleClose}
        className="text-slate-500 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};