import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeToClose } from '../../hooks/useSwipeToClose';

export default function ActionSheet({ 
  isOpen, 
  onClose, 
  options = [], // array of { label, icon, onClick, isDanger }
  children,
  title,
  lang = 'th'
}) {
  const { dragProps, handleProps } = useSwipeToClose(onClose);

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
            onClick={onClose}
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
            aria-labelledby="action-sheet-title"
            aria-label={title ? undefined : (lang === 'en' ? 'Actions' : 'การดำเนินการ')}
            tabIndex={-1}
            onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
            className="fixed bottom-0 left-0 right-0 z-[100] liquid-glass-card rounded-b-none border-x-0 border-b-0 shadow-2xl px-4 pb-8 pt-4 max-h-[86vh] overflow-y-auto overscroll-contain md:max-w-md md:mx-auto md:rounded-[28px] md:border"
          >
            <div {...handleProps} />
            {title && <h3 id="action-sheet-title" className="text-xl font-bold text-main mb-4 text-center">{title}</h3>}
            
            <div className="flex flex-col gap-2">
              {children}
              {options.map((option, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    option.onClick();
                    onClose();
                  }}
                  className={`flex items-center justify-center gap-3 p-4 w-full rounded-2xl transition-all font-bold active:scale-95 ${
                    option.isDanger 
                      ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' 
                      : 'text-main hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {option.icon && <span>{option.icon}</span>}
                  <span>{option.label}</span>
                </button>
              ))}
              
              <button
                type="button"
                onClick={onClose}
                className="mt-2 p-4 w-full rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all font-bold text-main active:scale-95 text-center"
              >
                {lang === 'en' ? 'Cancel' : 'ยกเลิก'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
