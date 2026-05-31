import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActionSheet({ 
  isOpen, 
  onClose, 
  options = [] // array of { label, icon, onClick, isDanger }
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1a1a2e] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] px-4 pb-8 pt-4 md:max-w-md mx-auto"
          >
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6" />
            
            <div className="flex flex-col gap-2">
              {options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    option.onClick();
                    onClose();
                  }}
                  className={`flex items-center gap-3 p-4 w-full rounded-2xl transition-all font-bold text-left active:scale-95 ${
                    option.isDanger 
                      ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' 
                      : 'text-main hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {option.icon && <span>{option.icon}</span>}
                  <span className="flex-1 text-center sm:text-left">{option.label}</span>
                </button>
              ))}
              
              <button
                onClick={onClose}
                className="mt-2 p-4 w-full rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all font-bold text-main active:scale-95 text-center"
              >
                ยกเลิก
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
