import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Banknote, X, Check, Award } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { type: 'spring', duration: 0.8, bounce: 0 },
      opacity: { duration: 0.01 }
    }
  }
};

export default function ExtraSuccessModal({ isOpen, onClose, data, lang = 'th' }) {
  if (typeof document === 'undefined' || !isOpen || !data) return null;

  // Formatting date
  const localeObj = lang === 'th' ? th : undefined;
  const fullDateFormat = lang === 'th' ? 'MMMM yyyy' : 'MMMM yyyy';
  
  let dateDisplayStr = format(new Date(`${data.month}-01`), fullDateFormat, { locale: localeObj });
  if (lang === 'th') {
    const year = new Date(`${data.month}-01`).getFullYear() + 543;
    dateDisplayStr = dateDisplayStr.replace(new Date(`${data.month}-01`).getFullYear().toString(), year.toString());
  }

  const isIncome = data.type === 'income';

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 backdrop-blur-md"
          style={{ backgroundColor: 'var(--overlay-bg)' }}
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md overflow-hidden liquid-glass-card border border-white/20 dark:border-white/10 shadow-2xl p-6 md:p-8 rounded-3xl z-10 flex flex-col bg-white/80 dark:bg-zinc-900/80"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-main/50 hover:text-main"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col items-center text-center mt-2 mb-6">
            <div className="relative mb-4 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                className="absolute w-20 h-20 rounded-full border-4 border-green-500/30"
              />
              <motion.svg
                width="80"
                height="80"
                viewBox="0 0 80 80"
                initial="hidden"
                animate="visible"
                className="text-green-500"
              >
                <motion.circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="transparent"
                  variants={draw}
                  className="opacity-20"
                />
                <motion.path
                  d="M26 40 L36 50 L56 30"
                  fill="transparent"
                  strokeWidth="5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  variants={draw}
                  transition={{ delay: 0.2 }}
                />
              </motion.svg>
            </div>

            <h3 className="text-xl font-bold text-main tracking-tight">เพิ่มรายการเสร็จสิ้น!</h3>
            <p className="text-sm text-main/60 mt-1">
              ระบบบันทึก{isIncome ? 'รายได้พิเศษ' : 'รายจ่าย'}ของคุณเรียบร้อยแล้ว
            </p>
          </div>

          <div className="bg-black/5 dark:bg-white/5 border border-black/[0.03] dark:border-white/[0.03] rounded-2xl p-4.5 space-y-3.5 mb-6 text-sm">
            <div className="text-xs font-extrabold uppercase tracking-wider text-main/40 border-b border-black/5 dark:border-white/5 pb-2 flex items-center gap-1.5">
              <Award size={14} className="text-primary-500" />
              รายละเอียดรายการ
            </div>

            <div className="flex justify-between items-center">
              <span className="text-main/50 font-medium">ชื่อรายการ</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${isIncome ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}`}>
                {data.title}
              </span>
            </div>

            <div className="flex justify-between items-start gap-4">
              <span className="text-main/50 font-medium whitespace-nowrap">ประจำเดือน</span>
              <span className="text-main font-bold text-right flex items-center gap-1.5">
                <Calendar size={14} className="text-primary-500" />
                <span>{dateDisplayStr}</span>
              </span>
            </div>

            <div className="border-t border-black/5 dark:border-white/5 my-2 pt-2.5 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-main font-bold text-base">
                  จำนวนเงิน
                </span>
                <span className={`${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-bold text-lg flex items-center gap-0.5`}>
                  <Banknote size={16} />
                  <span>
                    {isIncome ? '+' : '-'} ฿{Math.abs(Number(data.amount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-600 active:scale-[0.98] transition-all shadow-lg shadow-green-500/25 flex items-center justify-center gap-1.5"
          >
            <Check size={18} strokeWidth={3} />
            ตกลง
          </button>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
