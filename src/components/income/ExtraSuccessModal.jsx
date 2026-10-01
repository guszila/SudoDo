import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Banknote, X, Check, Award, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useSwipeToClose } from '../../hooks/useSwipeToClose';

export default function ExtraSuccessModal({ isOpen, onClose, data, lang = 'th' }) {
  const { dragProps, handleProps } = useSwipeToClose(onClose);

  // Preserve data in ref so during exit animation the modal still has content
  const lastDataRef = useRef(data);
  if (data) {
    lastDataRef.current = data;
  }
  const currentData = data || lastDataRef.current;

  if (typeof document === 'undefined') return null;

  // Formatting date safely
  let dateDisplayStr = '';
  const isIncome = currentData?.type === 'income';

  if (currentData) {
    const localeObj = lang === 'th' ? th : undefined;
    const fullDateFormat = lang === 'th' ? 'MMMM yyyy' : 'MMMM yyyy';
    
    dateDisplayStr = format(new Date(`${currentData.month}-01`), fullDateFormat, { locale: localeObj });
    if (lang === 'th') {
      const year = new Date(`${currentData.month}-01`).getFullYear() + 543;
      dateDisplayStr = dateDisplayStr.replace(new Date(`${currentData.month}-01`).getFullYear().toString(), year.toString());
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && currentData && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 backdrop-blur-sm bg-black/20 dark:bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 30, stiffness: 420 }}
            {...dragProps}
            role="dialog"
            aria-modal="true"
            aria-labelledby="extra-success-title"
            tabIndex={-1}
            onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
            className="relative w-full max-w-md max-h-[86vh] overflow-y-auto overscroll-contain bg-white dark:bg-[#1a182c] border border-white/80 dark:border-white/10 shadow-2xl p-6 md:p-8 rounded-t-[32px] sm:rounded-3xl z-10 flex flex-col"
          >
            <div {...handleProps} className={`${handleProps.className} sm:hidden`} />
            
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'en' ? 'Close' : 'ปิด'}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-main/50 hover:text-main"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center mt-2 mb-6">
              <motion.div 
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${
                  isIncome 
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 shadow-emerald-500/10' 
                    : 'bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 text-red-500 shadow-red-500/10'
                }`}
              >
                <CheckCircle2 size={34} strokeWidth={2.4} />
              </motion.div>

              <h3 id="extra-success-title" className="text-xl font-bold text-main tracking-tight">
                {lang === 'en' ? 'Entry Saved Successfully' : 'เพิ่มรายการเสร็จสิ้น'}
              </h3>
              <p className="text-sm text-main/60 mt-1">
                {lang === 'en' 
                  ? `Your ${isIncome ? 'extra income' : 'expense'} has been recorded.` 
                  : `ระบบบันทึก${isIncome ? 'รายได้พิเศษ' : 'รายจ่าย'}ของคุณเรียบร้อยแล้ว`}
              </p>
            </div>

            <div className="bg-slate-50/90 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 rounded-2xl p-4.5 space-y-3 mb-6 text-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-main/45 border-b border-black/5 dark:border-white/5 pb-2 flex items-center gap-1.5">
                <Award size={14} className="text-primary-500" />
                {lang === 'en' ? 'Entry Details' : 'รายละเอียดรายการ'}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-main/50 font-medium">{lang === 'en' ? 'Item' : 'ชื่อรายการ'}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${isIncome ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}`}>
                  {currentData.title}
                </span>
              </div>

              <div className="flex justify-between items-start gap-4">
                <span className="text-main/50 font-medium whitespace-nowrap">{lang === 'en' ? 'Month' : 'ประจำเดือน'}</span>
                <span className="text-main font-bold text-right flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary-500" />
                  <span>{dateDisplayStr}</span>
                </span>
              </div>

              <div className="border-t border-black/5 dark:border-white/5 my-2 pt-2.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-main font-bold text-base">
                    {lang === 'en' ? 'Amount' : 'จำนวนเงิน'}
                  </span>
                  <span className={`${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} font-bold text-lg flex items-center gap-1`}>
                    <Banknote size={18} />
                    <span>
                      {isIncome ? '+' : '-'} ฿{Math.abs(Number(currentData.amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`w-full py-3.5 text-white font-bold rounded-2xl active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-1.5 ${
                isIncome 
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25' 
                  : 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/25'
              }`}
            >
              <Check size={18} strokeWidth={2.6} />
              {lang === 'en' ? 'Done' : 'ตกลง'}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
