import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, Info } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

import { useTasks } from '../contexts/TasksContext';
import { useSettings } from '../contexts/SettingsContext';
import { calcSSO } from '../utils/socialSecurity';
import { TASK_STATUS, RATE_TYPE } from '../constants';
import { SectionLabel, GlassCard, Toggle } from '../components/common/SettingsUI';

const Row = ({ title, subtitle, rightElement, onClick, isLast }) => (
  <div 
    onClick={onClick}
    className={`flex items-center min-h-[52px] px-4 py-[13px] ${!isLast ? 'border-b-[0.5px] border-[rgba(255,255,255,0.3)] dark:border-[rgba(255,255,255,0.08)]' : ''} ${onClick ? 'cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors' : ''}`}
  >
    <div className="flex-1 min-w-0 flex flex-col justify-center">
      <div className="text-[14px] font-[500] text-main leading-none mb-[2px]">{title}</div>
      {subtitle && <div className="text-[12px] text-main/70 leading-none mt-1">{subtitle}</div>}
    </div>
    <div className="shrink-0 ml-3 flex items-center gap-2">
      {rightElement}
    </div>
  </div>
);

export default function SocialSecurityPage({ lang }) {
  const navigate = useNavigate();
  const { tasks } = useTasks();
  const { settings, updateSettings } = useSettings();

  const isEnabled = settings.socialSecurity;
  const showInIncome = settings.showInIncome;

  const toggleSSO = async () => {
    await updateSettings({ socialSecurity: !isEnabled });
  };

  const toggleShowInIncome = async () => {
    await updateSettings({ showInIncome: !showInIncome });
  };

  const { currentMonthData, historyData, totalDeducted } = useMemo(() => {
    const monthlyGross = {};
    const monthlySsGross = {};
    
    // Calculate gross income for all months from part-time tasks
    tasks.forEach(t => {
      if (!t.isPartTime || t.isExpense) return;
      const isCompleted = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
      // For Social Security history, we only consider completed tasks
      if (!isCompleted) return;
      
      const job = (settings.jobs || []).find(j => j.name === t.title);
      const deductsSSO = job ? job.deductSSO : settings.socialSecurity;

      const rate = Number(t.hourlyRate) || 0;
      const d = new Date(t.start);
      if (isNaN(d.getTime())) return;
      
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      let taskEarned = 0;
      if (t.isExtraIncome) {
        taskEarned = Number(t.amount) || 0;
      } else {
        let hours;
        if (t.actualStart && t.actualEnd) {
          hours = (new Date(t.actualEnd) - new Date(t.actualStart)) / (1000 * 60 * 60);
        } else {
          hours = (new Date(t.end) - new Date(t.start)) / (1000 * 60 * 60);
        }
        if (t.breakHours) hours -= Number(t.breakHours);
        hours = Math.max(0, hours);
        if (t.rateType === RATE_TYPE.DAILY) taskEarned = rate;
        else if (hours > 0) taskEarned = hours * rate;
        if (t.isHolidayPay) taskEarned *= 2;
      }
      
      monthlyGross[monthKey] = (monthlyGross[monthKey] || 0) + taskEarned;
      if (deductsSSO) {
        monthlySsGross[monthKey] = (monthlySsGross[monthKey] || 0) + taskEarned;
      }
    });

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentGross = monthlyGross[currentMonthKey] || 0;
    const currentSsGross = monthlySsGross[currentMonthKey] || 0;
    
    const history = [];
    let sumDeducted = 0;

    Object.keys(monthlyGross)
      .sort((a, b) => b.localeCompare(a)) // Sort desc
      .forEach(monthKey => {
        const gross = monthlyGross[monthKey] || 0;
        const ssGross = monthlySsGross[monthKey] || 0;
        if (gross > 0) { // Skip months with 0 income
          const { deduction } = calcSSO(ssGross); // Calculate deduction ONLY on ssGross
          sumDeducted += deduction;
          history.push({
            monthKey,
            gross: Math.round(gross),
            ssGross: Math.round(ssGross),
            deduction,
            isCurrent: monthKey === currentMonthKey
          });
        }
      });

    const currentSSO = calcSSO(currentSsGross); // Calculate deduction ONLY on currentSsGross

    return {
      currentMonthData: {
        gross: Math.round(currentGross),
        ssGross: Math.round(currentSsGross),
        deduction: currentSSO.deduction,
        net: currentSSO.netIncome,
        monthLabel: format(now, 'MMMM yyyy', { locale: lang === 'th' ? th : undefined })
      },
      historyData: history,
      totalDeducted: sumDeducted
    };
  }, [tasks, lang]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen font-sans pb-32 pt-safe overflow-x-hidden"
    >
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mx-4 mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.6)] dark:bg-[rgba(255,255,255,0.08)] backdrop-blur-[20px] border-[0.5px] border-white/40 dark:border-[rgba(255,255,255,0.12)] text-main active:scale-[0.95] transition-transform shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[20px] font-bold text-main m-0 flex items-center gap-2">
            <Calculator size={24} className="text-[var(--theme-section-label)] dark:text-[#AFA9EC]" /> 
            {lang === 'th' ? 'ประกันสังคม' : 'Social Security'}
          </h1>
        </div>

        {/* Current Month Summary Card */}
        <div className="p-6 rounded-[24px] shadow-lg border-[0.5px] border-[rgba(255,255,255,0.5)] dark:border-[rgba(255,255,255,0.12)] mx-4 mb-8" style={{ background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)', backdropFilter: 'blur(20px)' }}>
          <h2 className="text-lg font-bold text-main mb-4 opacity-90 text-center">
            {lang === 'th' ? `ประจำเดือน ${currentMonthData.monthLabel}` : `For ${currentMonthData.monthLabel}`}
          </h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white/40 dark:bg-black/20 p-4 rounded-2xl flex flex-col items-center justify-center border-[0.5px] border-[rgba(255,255,255,0.5)] dark:border-[rgba(255,255,255,0.08)]">
              <span className="text-sm text-main/70 font-medium mb-1">{lang === 'th' ? 'รายได้รวม' : 'Gross Income'}</span>
              <span className="text-xl font-bold text-main">฿{currentMonthData.gross.toLocaleString()}</span>
            </div>
            <div className="bg-[rgba(239,68,68,0.1)] p-4 rounded-2xl flex flex-col items-center justify-center border-[0.5px] border-[rgba(240,149,149,0.2)] relative group">
              <span className="text-sm text-red-500 font-medium mb-1">{lang === 'th' ? 'หัก 5%' : '5% Deduction'}</span>
              <span className="text-xl font-bold text-red-500">-฿{currentMonthData.deduction.toLocaleString()}</span>
              {currentMonthData.ssGross < currentMonthData.gross && (
                <div className="absolute top-1 right-2 text-[10px] text-red-500/70 border border-red-500/20 px-1.5 rounded-full">คิดจากฐาน ฿{currentMonthData.ssGross.toLocaleString()}</div>
              )}
            </div>
          </div>
          
          <div className="bg-[var(--theme-accent)] p-5 rounded-2xl flex flex-col items-center justify-center shadow-[0_8px_16px_rgba(127,119,221,0.3)]">
            <span className="text-white/80 font-medium mb-1">{lang === 'th' ? 'รายได้สุทธิ' : 'Net Income'}</span>
            <span className="text-4xl font-bold text-white">฿{currentMonthData.net.toLocaleString()}</span>
          </div>
        </div>

        {/* Settings Section */}
        <SectionLabel>{lang === 'th' ? 'ตั้งค่าการคำนวณ' : 'Settings'}</SectionLabel>
        <GlassCard>
          <Row 
            title={lang === 'th' ? 'เปิดใช้งานเครื่องคิดเลข' : 'Enable Calculator'}
            subtitle={lang === 'th' ? 'หัก 5% อัตโนมัติในหน้ารายได้' : 'Auto deduct 5% in income pages'}
            rightElement={<Toggle checked={isEnabled} onChange={() => toggleSSO()} />}
            onClick={() => toggleSSO()}
          />
          <Row 
            title={lang === 'th' ? 'แสดงในหน้ารายได้' : 'Show in Income Summary'}
            subtitle={lang === 'th' ? 'แสดงแถบหักประกันสังคมในรายงาน' : 'Show deduction row in reports'}
            rightElement={<Toggle checked={showInIncome} onChange={() => toggleShowInIncome()} />}
            onClick={() => toggleShowInIncome()}
          />
          <Row 
            title={lang === 'th' ? 'อัตราการหัก' : 'Deduction Rate'}
            rightElement={<span className="font-bold text-[var(--theme-section-label)] dark:text-[#AFA9EC] bg-[rgba(127,119,221,0.15)] px-3 py-1 rounded-full text-sm">5%</span>}
            isLast
          />
        </GlassCard>

        {/* Info Note */}
        <div className="flex items-start gap-3 p-4 mx-4 mb-4 bg-[rgba(127,119,221,0.1)] border-[0.5px] border-[rgba(127,119,221,0.2)] rounded-[16px] text-[var(--theme-section-label)] dark:text-[#AFA9EC]">
          <Info size={20} className="mt-0.5 flex-shrink-0" />
          <p className="text-[13px] font-medium leading-relaxed">
            {lang === 'th' ? 'ประกันสังคมไทยหัก 5% ของเงินเดือน โดยคำนวณจากฐานเงินเดือนสูงสุดไม่เกิน 15,000 บาท (หักสูงสุดไม่เกิน ฿750/เดือน)' : 'Thai Social Security deducts 5% of monthly salary, capped at a maximum salary base of 15,000 THB (max deduction ฿750/month).'}
          </p>
        </div>

        {/* History Table */}
        <SectionLabel>{lang === 'th' ? 'ประวัติการคำนวณ' : 'History'}</SectionLabel>
        <GlassCard className="!mb-8 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-[0.5px] border-[rgba(255,255,255,0.3)] dark:border-[rgba(255,255,255,0.08)]">
                <th className="py-3 px-4 text-[12px] font-[500] text-main/70">{lang === 'th' ? 'เดือน' : 'Month'}</th>
                <th className="py-3 px-4 text-[12px] font-[500] text-main/70 text-right">{lang === 'th' ? 'รายได้' : 'Gross'}</th>
                <th className="py-3 px-4 text-[12px] font-[500] text-main/70 text-right">{lang === 'th' ? 'หัก 5%' : 'Deduction'}</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((row) => {
                const [y, m] = row.monthKey.split('-');
                const d = new Date(Number(y), Number(m) - 1);
                const monthLabel = format(d, 'MMM yy', { locale: lang === 'th' ? th : undefined });
                return (
                  <tr key={row.monthKey} className={`border-b-[0.5px] border-[rgba(255,255,255,0.3)] dark:border-[rgba(255,255,255,0.08)] ${row.isCurrent ? 'bg-[rgba(127,119,221,0.05)]' : ''}`}>
                    <td className="py-3 px-4 text-[14px] text-main font-[500]">{monthLabel}</td>
                    <td className="py-3 px-4 text-[14px] text-main text-right">฿{row.gross.toLocaleString()}</td>
                    <td className="py-3 px-4 text-[14px] text-red-500 font-bold text-right">-฿{row.deduction.toLocaleString()}</td>
                  </tr>
                );
              })}
              {historyData.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-main/70 text-[14px]">
                    {lang === 'th' ? 'ไม่มีประวัติ' : 'No history found'}
                  </td>
                </tr>
              )}
            </tbody>
            {historyData.length > 0 && (
              <tfoot>
                <tr className="bg-black/5 dark:bg-white/5 border-t-[0.5px] border-[rgba(255,255,255,0.3)] dark:border-[rgba(255,255,255,0.08)]">
                  <td className="py-3 px-4 text-[14px] text-main font-bold">{lang === 'th' ? 'รวมที่หักไป' : 'Total Deducted'}</td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 text-[14px] text-red-500 font-bold text-right">-฿{totalDeducted.toLocaleString()}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </GlassCard>

      </div>
    </motion.div>
  );
}
