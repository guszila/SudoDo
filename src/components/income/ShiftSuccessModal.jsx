import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, X, Check, Award, Building2, Sparkles, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useSettings } from '../../contexts/SettingsContext';
import { useSwipeToClose } from '../../hooks/useSwipeToClose';

const JOB_COLORS = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  pink: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  primary: 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-500/20'
};

export default function ShiftSuccessModal({ isOpen, onClose, data, lang = 'th' }) {
  const { settings } = useSettings();
  const { dragProps, handleProps } = useSwipeToClose(onClose);

  // Preserve data in ref so during exit animation the modal still has content
  const lastDataRef = useRef(data);
  if (data) {
    lastDataRef.current = data;
  }
  const currentData = data || lastDataRef.current;

  if (typeof document === 'undefined') return null;

  // Calculate shift statistics safely
  let dateDisplayStr = '';
  let netHrs = 0;
  let breakHrs = 0;
  let estPayPerShift = 0;
  let totalEstPay = 0;
  let job = null;
  let jobColorClass = '';

  if (currentData) {
    const startDateObj = new Date(`${currentData.startDate}T${currentData.startTime}:00`);
    let endDateObj = new Date(`${currentData.startDate}T${currentData.endTime}:00`);
    if (currentData.endTime < currentData.startTime) {
      endDateObj.setDate(endDateObj.getDate() + 1);
    }
    const grossHrs = (endDateObj - startDateObj) / (1000 * 60 * 60);
    breakHrs = Number(currentData.breakHours) || 0;
    netHrs = Math.max(0, grossHrs - breakHrs);

    estPayPerShift = currentData.rateType === 'daily'
      ? (Number(currentData.hourlyRate) || 0)
      : (netHrs * (Number(currentData.hourlyRate) || 0));
    if (currentData.isHolidayPay) estPayPerShift *= 2;

    totalEstPay = estPayPerShift * (currentData.shiftCount || 1);

    job = (settings?.jobs || []).find(j => j.name === currentData.title);
    jobColorClass = JOB_COLORS[job?.color || 'primary'];

    const localeObj = lang === 'th' ? th : undefined;
    const fullDateFormat = lang === 'th' ? 'EEEEที่ d MMMM yyyy' : 'EEEE, d MMMM yyyy';
    const shortDateFormat = lang === 'th' ? 'd MMM yyyy' : 'd MMM yyyy';

    if (currentData.startDate === currentData.endDate) {
      dateDisplayStr = format(new Date(currentData.startDate), fullDateFormat, { locale: localeObj });
      if (lang === 'th') {
        const year = new Date(currentData.startDate).getFullYear() + 543;
        dateDisplayStr = dateDisplayStr.replace(new Date(currentData.startDate).getFullYear().toString(), year.toString());
      }
    } else {
      let startStr = format(new Date(currentData.startDate), shortDateFormat, { locale: localeObj });
      let endStr = format(new Date(currentData.endDate), shortDateFormat, { locale: localeObj });
      if (lang === 'th') {
        const startYear = new Date(currentData.startDate).getFullYear() + 543;
        const endYear = new Date(currentData.endDate).getFullYear() + 543;
        startStr = startStr.replace(new Date(currentData.startDate).getFullYear().toString(), startYear.toString());
        endStr = endStr.replace(new Date(currentData.endDate).getFullYear().toString(), endYear.toString());
      }
      dateDisplayStr = `${startStr} – ${endStr} (${currentData.shiftCount} ${lang === 'th' ? 'วัน' : 'days'})`;
    }
  }

  const translations = {
    th: {
      successTitle: 'เพิ่มกะงานสำเร็จแล้ว',
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
      holidayBadge: 'วันหยุด x2',
      hoursUnit: 'ชม.',
      shiftsUnit: 'กะ',
      okBtn: 'ตกลง'
    },
    en: {
      successTitle: 'Shift Logged Successfully',
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
      holidayBadge: 'Holiday Pay x2',
      hoursUnit: 'hrs',
      shiftsUnit: 'shifts',
      okBtn: 'Awesome'
    }
  };

  const t = translations[lang] || translations.th;

  return createPortal(
    <AnimatePresence>
      {isOpen && currentData && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop overlay with fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 backdrop-blur-sm bg-black/20 dark:bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal card with snappy spring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 30, stiffness: 420 }}
            {...dragProps}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shift-success-title"
            tabIndex={-1}
            onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
            className="relative w-full max-w-md max-h-[86vh] overflow-y-auto overscroll-contain bg-white dark:bg-[#1a182c] border border-white/80 dark:border-white/10 shadow-2xl p-6 md:p-8 rounded-t-[32px] sm:rounded-3xl z-10 flex flex-col"
          >
            <div {...handleProps} className={`${handleProps.className} sm:hidden`} />
            
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'en' ? 'Close' : 'ปิด'}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-main/50 hover:text-main"
            >
              <X size={18} />
            </button>

            {/* Success Icon */}
            <div className="flex flex-col items-center text-center mt-2 mb-6">
              <motion.div 
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mb-3 shadow-lg shadow-emerald-500/10"
              >
                <CheckCircle2 size={34} strokeWidth={2.4} />
              </motion.div>

              <h3 id="shift-success-title" className="text-xl font-bold text-main tracking-tight">
                {t.successTitle}
              </h3>
              <p className="text-sm text-main/60 mt-1">{t.successSub}</p>
            </div>

            {/* Details list card */}
            <div className="bg-slate-50/90 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 rounded-2xl p-4.5 space-y-3 mb-6 text-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-main/45 border-b border-black/5 dark:border-white/5 pb-2 flex items-center gap-1.5">
                <Award size={14} className="text-primary-500" />
                {t.detailHeader}
              </div>

              {/* Job details */}
              <div className="flex justify-between items-center gap-3">
                <span className="text-main/50 font-medium">{t.jobLabel}</span>
                <span className={`min-w-0 max-w-[62%] flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${jobColorClass || 'bg-black/5 text-main border-black/10'}`}>
                  {job?.emoji ? (
                    <span className="text-xs">{job.emoji}</span>
                  ) : (
                    <Building2 size={13} className="text-primary-500" />
                  )}
                  <span className="truncate">{currentData.title}</span>
                </span>
              </div>

              {/* Date Details */}
              <div className="flex justify-between items-start gap-4">
                <span className="text-main/50 font-medium whitespace-nowrap">{t.dateLabel}</span>
                <span className="text-main font-bold text-right flex items-start justify-end gap-1.5 min-w-0">
                  <Calendar size={14} className="text-primary-500 mt-0.5" />
                  <span className="break-words">{dateDisplayStr}</span>
                </span>
              </div>

              {/* Time / Duration Details */}
              <div className="flex justify-between items-start gap-3">
                <span className="text-main/50 font-medium whitespace-nowrap">{t.timeLabel}</span>
                <span className="text-main font-bold flex items-start justify-end gap-1.5 text-right min-w-0">
                  <Clock size={14} className="text-primary-500 mt-0.5 flex-shrink-0" />
                  <span className="break-words">
                    {currentData.startTime} – {currentData.endTime}
                    {currentData.rateType === 'hourly' && ` (${netHrs % 1 === 0 ? netHrs : netHrs.toFixed(1)} ${t.hoursUnit})`}
                  </span>
                </span>
              </div>

              {/* Break Time details */}
              {currentData.rateType === 'hourly' && breakHrs > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-main/50 font-medium">{t.breakLabel}</span>
                  <span className="text-main font-bold">
                    {breakHrs} {t.hoursUnit}
                  </span>
                </div>
              )}

              {/* Wage rate details */}
              <div className="flex justify-between items-start gap-3">
                <span className="text-main/50 font-medium">{t.rateLabel}</span>
                <div className="flex flex-wrap justify-end items-center gap-2 min-w-0">
                  {currentData.isHolidayPay && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <Sparkles size={10} />
                      {t.holidayBadge}
                    </span>
                  )}
                  <span className="text-main font-bold text-right">
                    ฿{Number(currentData.hourlyRate).toLocaleString()} / {currentData.rateType === 'hourly' ? (lang === 'th' ? 'ชม.' : 'hr') : (lang === 'th' ? 'วัน' : 'day')}
                  </span>
                </div>
              </div>

              {/* Projected payout separator */}
              <div className="border-t border-black/5 dark:border-white/5 my-2 pt-2.5 space-y-2">
                {currentData.shiftCount > 1 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-main/50 font-medium">{t.estPayLabel}</span>
                    <span className="text-main/70 font-semibold">
                      ≈ ฿{estPayPerShift.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-main font-bold text-base">
                    {currentData.shiftCount > 1 ? t.totalEstPayLabel : t.estPayLabel}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg flex items-baseline justify-end gap-1 text-right">
                    <span>
                      ฿{totalEstPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {currentData.shiftCount > 1 && (
                      <span className="text-xs text-main/40 font-medium ml-1">
                        ({currentData.shiftCount} {t.shiftsUnit})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Action button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5"
            >
              <Check size={18} strokeWidth={2.6} />
              {t.okBtn}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
