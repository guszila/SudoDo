import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, DollarSign, X, Check, Award } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useSettings } from '../../contexts/SettingsContext';

const JOB_COLORS = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  pink: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  primary: 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-500/20'
};

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

export default function ShiftSuccessModal({ isOpen, onClose, data, lang = 'th' }) {
  const { settings } = useSettings();

  if (typeof document === 'undefined' || !isOpen || !data) return null;

  // Calculate shift statistics
  const startDateObj = new Date(`${data.startDate}T${data.startTime}:00`);
  let endDateObj = new Date(`${data.startDate}T${data.endTime}:00`);
  if (data.endTime < data.startTime) {
    endDateObj.setDate(endDateObj.getDate() + 1);
  }
  const grossHrs = (endDateObj - startDateObj) / (1000 * 60 * 60);
  const breakHrs = Number(data.breakHours) || 0;
  const netHrs = Math.max(0, grossHrs - breakHrs);

  let estPayPerShift = data.rateType === 'daily'
    ? (Number(data.hourlyRate) || 0)
    : (netHrs * (Number(data.hourlyRate) || 0));
  if (data.isHolidayPay) estPayPerShift *= 2;

  const totalEstPay = estPayPerShift * data.shiftCount;

  // Find job configurations (emoji, color)
  const job = (settings?.jobs || []).find(j => j.name === data.title);
  const jobEmoji = job?.emoji || '🏢';
  const jobColorClass = JOB_COLORS[job?.color || 'primary'];

  // Formatting date range beautifully
  const localeObj = lang === 'th' ? th : undefined;
  const fullDateFormat = lang === 'th' ? 'EEEEที่ d MMMM yyyy' : 'EEEE, d MMMM yyyy';
  const shortDateFormat = lang === 'th' ? 'd MMM yyyy' : 'd MMM yyyy';

  let dateDisplayStr = '';
  if (data.startDate === data.endDate) {
    dateDisplayStr = format(new Date(data.startDate), fullDateFormat, { locale: localeObj });
    if (lang === 'th') {
      // Add year offset for Buddhist Era if Thai lang
      const year = new Date(data.startDate).getFullYear() + 543;
      dateDisplayStr = dateDisplayStr.replace(new Date(data.startDate).getFullYear().toString(), year.toString());
    }
  } else {
    let startStr = format(new Date(data.startDate), shortDateFormat, { locale: localeObj });
    let endStr = format(new Date(data.endDate), shortDateFormat, { locale: localeObj });
    if (lang === 'th') {
      const startYear = new Date(data.startDate).getFullYear() + 543;
      const endYear = new Date(data.endDate).getFullYear() + 543;
      startStr = startStr.replace(new Date(data.startDate).getFullYear().toString(), startYear.toString());
      endStr = endStr.replace(new Date(data.endDate).getFullYear().toString(), endYear.toString());
    }
    dateDisplayStr = `${startStr} – ${endStr} (${data.shiftCount} ${lang === 'th' ? 'วัน' : 'days'})`;
  }

  // Translation helpers
  const translations = {
    th: {
      successTitle: 'เพิ่มกะงานสำเร็จแล้ว!',
      successSub: 'ระบบบันทึกตารางกะงานของคุณเรียบร้อยแล้ว',
      detailHeader: 'รายละเอียดกะงาน',
      jobLabel: 'บริษัท/กะงาน',
      dateLabel: 'วันที่ทำงาน',
      timeLabel: 'เวลาทำงาน',
      breakLabel: 'พักเบรก',
      rateLabel: 'ค่าแรง',
      hourlyRate: '฿/ชั่วโมง',
      dailyRate: '฿/วัน',
      estPayLabel: 'รายได้ประมาณกะละ',
      totalEstPayLabel: 'รวมรายได้คาดการณ์',
      holidayBadge: 'วันหยุด x2 🎉',
      hoursUnit: 'ชม.',
      shiftsUnit: 'กะ',
      okBtn: 'ตกลง'
    },
    en: {
      successTitle: 'Shift Logged Successfully!',
      successSub: 'Your shifts have been logged in the system.',
      detailHeader: 'Shift Details',
      jobLabel: 'Job / Company',
      dateLabel: 'Date',
      timeLabel: 'Shift Time',
      breakLabel: 'Break Time',
      rateLabel: 'Wage Rate',
      hourlyRate: '฿/hour',
      dailyRate: '฿/day',
      estPayLabel: 'Est. Pay / Shift',
      totalEstPayLabel: 'Total Expected Earnings',
      holidayBadge: 'Holiday Pay x2 🎉',
      hoursUnit: 'hrs',
      shiftsUnit: 'shifts',
      okBtn: 'Awesome'
    }
  };

  const t = translations[lang] || translations.th;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 backdrop-blur-md"
          style={{ backgroundColor: 'var(--overlay-bg)' }}
          onClick={onClose}
        />

        {/* Modal body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md overflow-hidden liquid-glass-card border border-white/20 dark:border-white/10 shadow-2xl p-6 md:p-8 rounded-3xl z-10 flex flex-col bg-white/80 dark:bg-zinc-900/80"
        >
          {/* Close button top right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-main/50 hover:text-main"
          >
            <X size={18} />
          </button>

          {/* Success Animated Circle & Checkmark */}
          <div className="flex flex-col items-center text-center mt-2 mb-6">
            <div className="relative mb-4 flex items-center justify-center">
              {/* Pulse Ring animation */}
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

            <h3 className="text-xl font-bold text-main tracking-tight">{t.successTitle}</h3>
            <p className="text-sm text-main/60 mt-1">{t.successSub}</p>
          </div>

          {/* Details list card */}
          <div className="bg-black/5 dark:bg-white/5 border border-black/[0.03] dark:border-white/[0.03] rounded-2xl p-4.5 space-y-3.5 mb-6 text-sm">
            {/* Header label */}
            <div className="text-xs font-extrabold uppercase tracking-wider text-main/40 border-b border-black/5 dark:border-white/5 pb-2 flex items-center gap-1.5">
              <Award size={14} className="text-primary-500" />
              {t.detailHeader}
            </div>

            {/* Job details */}
            <div className="flex justify-between items-center">
              <span className="text-main/50 font-medium">{t.jobLabel}</span>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${jobColorClass || 'bg-black/5 text-main border-black/10'}`}>
                <span>{jobEmoji}</span>
                <span>{data.title}</span>
              </span>
            </div>

            {/* Date Details */}
            <div className="flex justify-between items-start gap-4">
              <span className="text-main/50 font-medium whitespace-nowrap">{t.dateLabel}</span>
              <span className="text-main font-bold text-right flex items-center gap-1.5">
                <Calendar size={14} className="text-primary-500" />
                <span>{dateDisplayStr}</span>
              </span>
            </div>

            {/* Time / Duration Details */}
            <div className="flex justify-between items-center">
              <span className="text-main/50 font-medium">{t.timeLabel}</span>
              <span className="text-main font-bold flex items-center gap-1.5">
                <Clock size={14} className="text-primary-500" />
                <span>
                  {data.startTime} – {data.endTime}
                  {data.rateType === 'hourly' && ` (${netHrs % 1 === 0 ? netHrs : netHrs.toFixed(1)} ${t.hoursUnit})`}
                </span>
              </span>
            </div>

            {/* Break Time details */}
            {data.rateType === 'hourly' && breakHrs > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-main/50 font-medium">{t.breakLabel}</span>
                <span className="text-main font-bold">
                  {breakHrs} {t.hoursUnit}
                </span>
              </div>
            )}

            {/* Wage rate details */}
            <div className="flex justify-between items-center">
              <span className="text-main/50 font-medium">{t.rateLabel}</span>
              <div className="flex items-center gap-2">
                {data.isHolidayPay && (
                  <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 font-bold px-1.5 py-0.5 rounded-md">
                    {t.holidayBadge}
                  </span>
                )}
                <span className="text-main font-bold">
                  ฿{Number(data.hourlyRate).toLocaleString()} / {data.rateType === 'hourly' ? (lang === 'th' ? 'ชม.' : 'hr') : (lang === 'th' ? 'วัน' : 'day')}
                </span>
              </div>
            </div>

            {/* Projected payout separator */}
            <div className="border-t border-black/5 dark:border-white/5 my-2 pt-2.5 space-y-2.5">
              {data.shiftCount > 1 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-main/50 font-medium">{t.estPayLabel}</span>
                  <span className="text-main/70 font-semibold">
                    ≈ ฿{estPayPerShift.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-main font-bold text-base">
                  {data.shiftCount > 1 ? t.totalEstPayLabel : t.estPayLabel}
                </span>
                <span className="text-green-600 dark:text-green-400 font-black text-lg flex items-center gap-0.5">
                  <DollarSign size={16} className="text-green-500" />
                  <span>
                    ฿{totalEstPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  {data.shiftCount > 1 && (
                    <span className="text-xs text-main/40 font-medium ml-1">
                      ({data.shiftCount} {t.shiftsUnit})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-600 active:scale-[0.98] transition-all shadow-lg shadow-green-500/25 flex items-center justify-center gap-1.5"
          >
            <Check size={18} strokeWidth={3} />
            {t.okBtn}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
