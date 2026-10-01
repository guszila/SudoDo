import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useSwipeToClose } from '../../hooks/useSwipeToClose';

export default function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'ยืนยัน', 
  cancelText = 'ยกเลิก', 
  onConfirm, 
  onCancel, 
  isDanger = false,
  lang = 'th'
}) {
  const { dragProps, handleProps } = useSwipeToClose(onCancel);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 backdrop-blur-md z-[90]"
            style={{ backgroundColor: 'var(--overlay-bg)' }}
            onClick={onCancel}
            aria-hidden="true"
          />
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            {...dragProps}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            tabIndex={-1}
            onKeyDown={(event) => { if (event.key === 'Escape') onCancel(); }}
            className="fixed bottom-0 left-0 right-0 z-[100] bg-white dark:bg-[#1a182c] border border-slate-200/80 dark:border-white/10 rounded-b-none border-x-0 border-b-0 shadow-2xl p-6 md:p-8 max-w-md mx-auto max-h-[86vh] overflow-y-auto overscroll-contain md:border md:rounded-3xl"
          >
            <div {...handleProps} />
            <div className="flex flex-col items-center text-center">
              {isDanger && (
                <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                  <AlertTriangle size={32} />
                </div>
              )}
              
              <h3 id="confirm-dialog-title" className="text-xl font-bold text-main mb-2">{title}</h3>
              <p id="confirm-dialog-message" className="text-main/70 mb-8 whitespace-pre-line leading-relaxed">
                {message}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button 
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-3.5 px-4 rounded-xl font-bold text-main/70 bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
                >
                  {lang === 'en' && cancelText === 'ยกเลิก' ? 'Cancel' : cancelText}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    onConfirm();
                  }}
                  className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-white transition-colors shadow-lg active:scale-95 ${
                    isDanger ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/30'
                  }`}
                >
                  {lang === 'en' && confirmText === 'ยืนยัน' ? 'Confirm' : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
