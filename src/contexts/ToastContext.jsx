import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';

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
      isError: options.isError === true || options.type === 'error',
      icon: options.icon,
      duration: options.duration || 4000,
    });

    timeoutRef.current = setTimeout(() => {
      setToast(null);
    }, options.duration || 4000);
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
      <div 
        className="fixed top-0 inset-x-0 flex justify-center z-[99999] pointer-events-none px-4 pt-[max(14px,calc(env(safe-area-inset-top)+10px))]"
        aria-live="polite"
        role="status"
      >
        <AnimatePresence mode="wait">
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -45, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.94, filter: 'blur(6px)' }}
              transition={{ type: "spring", stiffness: 480, damping: 28, mass: 0.8 }}
              className="pointer-events-auto"
            >
              <div 
                onClick={toast.onUndo ? undefined : hideToast}
                className={`rounded-full py-2.5 px-4 md:px-5 flex items-center gap-2.5 backdrop-blur-2xl border transition-all cursor-pointer active:scale-95 ${
                  toast.isError 
                    ? 'bg-rose-500/95 text-white border-rose-400/40 shadow-[0_16px_36px_-8px_rgba(244,63,94,0.35),0_4px_12px_rgba(244,63,94,0.2)]' 
                    : 'bg-white/92 dark:bg-zinc-900/90 text-main border-white/80 dark:border-white/12 shadow-[0_16px_36px_-8px_rgba(25,15,45,0.18),0_4px_12px_rgba(25,15,45,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)]'
                }`}
              >
                <div className={`flex-shrink-0 ${toast.isError ? 'text-white' : 'text-emerald-500'}`}>
                  {toast.icon ? (
                    toast.icon
                  ) : toast.isError ? (
                    <AlertCircle size={18} className="fill-white/20" />
                  ) : (
                    <CheckCircle2 size={18} className="fill-emerald-500/20" />
                  )}
                </div>
                <p className="text-xs md:text-sm font-semibold tracking-tight select-none">{toast.message}</p>
                {toast.onUndo && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleUndo(); }}
                    className="ml-1 flex items-center gap-1 px-2.5 py-1 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 rounded-full font-bold text-xs transition-transform active:scale-95 text-main"
                  >
                    <RotateCcw size={12} /> ยกเลิก
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
