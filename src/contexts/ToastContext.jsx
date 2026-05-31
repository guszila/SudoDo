import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, RotateCcw } from 'lucide-react';

const ToastContext = createContext();

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  const showToast = useCallback((message, options = {}) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setToast({
      id: Date.now(),
      message,
      onUndo: options.onUndo,
      duration: options.duration || 5000,
    });

    timeoutRef.current = setTimeout(() => {
      setToast(null);
    }, options.duration || 5000);
  }, []);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setToast(null);
  }, []);

  const handleUndo = useCallback(() => {
    if (toast && toast.onUndo) {
      toast.onUndo();
    }
    hideToast();
  }, [toast, hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[400px] z-50 pointer-events-none"
          >
            <div className="bg-[#1a1a2e] dark:bg-white text-white dark:text-[#1a1a2e] rounded-2xl p-4 shadow-2xl flex items-center gap-3 pointer-events-auto">
              <div className="text-green-400 dark:text-green-600">
                <CheckCircle2 size={24} />
              </div>
              <p className="flex-1 font-medium">{toast.message}</p>
              {toast.onUndo && (
                <button
                  onClick={handleUndo}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 rounded-lg font-bold text-sm transition-colors active:scale-95"
                >
                  <RotateCcw size={14} /> ยกเลิก
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}
