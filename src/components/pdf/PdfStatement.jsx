import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { TASK_STATUS, RATE_TYPE } from '../../constants';
import { calcSSO } from '../../utils/socialSecurity';

const PdfStatement = forwardRef(({ month, summary, shiftsList, user }, ref) => {
  const monthDate = new Date(`${month}-01T00:00:00`);
  const sortedShifts = [...(shiftsList || [])].sort((a, b) => new Date(a.start) - new Date(b.start));

  const fmtBaht = (n) => {
    const num = Number(n);
    if (isNaN(num)) return '฿0.00';
    return `฿${num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // calcSSO returns an object {deduction, netIncome} — extract deduction safely
  const ssoDeductVal = typeof summary?.ssoDeduct === 'object'
    ? (summary.ssoDeduct?.deduction ?? 0)
    : (Number(summary?.ssoDeduct) || 0);

  const totalIncomeVal = Number(summary?.totalIncome) || 0;
  const finalIncomeVal = totalIncomeVal - ssoDeductVal;

  const PURPLE = '#5B4CF6';
  const PURPLE_LIGHT = '#EEF2FF';
  const PURPLE_DARK = '#3730A3';
  const GRAY_50 = '#F8FAFC';
  const GRAY_100 = '#F1F5F9';
  const GRAY_200 = '#E2E8F0';
  const GRAY_400 = '#94A3B8';
  const GRAY_600 = '#475569';
  const GRAY_800 = '#1E293B';
  const GREEN = '#059669';
  const GREEN_BG = '#ECFDF5';
  const RED = '#DC2626';
  const RED_BG = '#FEF2F2';

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '-10000px',
        left: '-10000px',
        width: '210mm',
        minHeight: '297mm',
        backgroundColor: '#ffffff',
        color: GRAY_800,
        fontFamily: '"Sarabun", "Noto Sans Thai", "Kanit", sans-serif',
        boxSizing: 'border-box',
        fontSize: '13px',
        lineHeight: '1.6',
      }}
      className="pdf-statement"
    >
      {/* ─── HEADER BAND ─── */}
      <div style={{
        background: `linear-gradient(135deg, ${PURPLE_DARK} 0%, ${PURPLE} 60%, #7C3AED 100%)`,
        padding: '16px 24px 14px',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ marginBottom: '6px' }}>
              {/* Inline white logo SVG for dark header */}
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="38" viewBox="0 0 320 100">
                <defs>
                  <linearGradient id="wloop" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff"/>
                    <stop offset="100%" stopColor="rgba(255,255,255,0.7)"/>
                  </linearGradient>
                </defs>
                <rect x="4" y="8" width="88" height="84" rx="22" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
                <circle cx="32" cy="50" r="22" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="8"/>
                <circle cx="68" cy="50" r="22" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="8"/>
                <rect x="43" y="28" width="14" height="44" fill="white" fillOpacity="0.01"/>
                <path d="M43 34 Q50 50 43 66" stroke="white" strokeOpacity="0.9" strokeWidth="8" fill="none" strokeLinecap="round"/>
                <path d="M57 34 Q50 50 57 66" stroke="white" strokeOpacity="0.6" strokeWidth="8" fill="none" strokeLinecap="round"/>
                <circle cx="14" cy="50" r="7" fill="white" fillOpacity="0.9"/>
                <circle cx="86" cy="50" r="7" fill="white" fillOpacity="0.6"/>
                <text x="108" y="58" fontFamily="system-ui,-apple-system,sans-serif" fontSize="38" fontWeight="800" fill="white">SudoDo</text>
                <text x="110" y="76" fontFamily="system-ui,sans-serif" fontSize="10" fontWeight="500" fill="white" fillOpacity="0.6" letterSpacing="4">TASK MANAGER</text>
              </svg>
            </div>
            <h1 style={{ margin: '0 0 2px', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.01em' }}>
              สรุปรายได้ประจำเดือน
            </h1>
            <p style={{ margin: 0, fontSize: '13px', opacity: 0.8, fontWeight: 500 }}>
              {format(monthDate, 'MMMM yyyy', { locale: th })}
            </p>
          </div>
          <div style={{ textAlign: 'right', opacity: 0.9, marginTop: '4px' }}>
            <p style={{ margin: '0 0 2px', fontSize: '10px', letterSpacing: '0.08em', opacity: 0.65, textTransform: 'uppercase' }}>ผู้รับเงิน</p>
            <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>{user?.displayName || 'พนักงาน'}</p>
            <p style={{ margin: '0 0 2px', fontSize: '9px', opacity: 0.6 }}>สร้างเมื่อ</p>
            <p style={{ margin: 0, fontSize: '11px' }}>
              {format(new Date(), 'dd MMM yyyy · HH:mm น.', { locale: th })}
            </p>
          </div>
        </div>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${GRAY_200}` }}>
        <div style={{ flex: 1, padding: '12px 24px', borderRight: `1px solid ${GRAY_200}`, backgroundColor: GRAY_50 }}>
          <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: GRAY_400 }}>รายได้รวม</p>
          <p style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: 800, color: PURPLE, letterSpacing: '-0.02em' }}>
            {fmtBaht(totalIncomeVal)}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: GRAY_400 }}>
            {summary?.shiftCount || 0} กะ · {(summary?.totalHours || 0).toFixed(1)} ชม.
          </p>
        </div>
        <div style={{ flex: 1, padding: '12px 24px', borderRight: `1px solid ${GRAY_200}`, backgroundColor: ssoDeductVal > 0 ? RED_BG : GRAY_50 }}>
          <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: GRAY_400 }}>หักประกันสังคม</p>
          <p style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: 800, color: ssoDeductVal > 0 ? RED : GRAY_400, letterSpacing: '-0.02em' }}>
            {ssoDeductVal > 0 ? `-${fmtBaht(ssoDeductVal)}` : '—'}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: GRAY_400 }}>
            {ssoDeductVal > 0 ? 'อัตรา 5% (สูงสุด ฿750)' : 'ไม่มีการหัก'}
          </p>
        </div>
        <div style={{ flex: 1, padding: '12px 24px', backgroundColor: finalIncomeVal > 0 ? GREEN_BG : GRAY_50 }}>
          <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: GRAY_400 }}>ยอดรับสุทธิ</p>
          <p style={{ margin: '0 0 2px', fontSize: '20px', fontWeight: 800, color: finalIncomeVal > 0 ? GREEN : GRAY_400, letterSpacing: '-0.02em' }}>
            {fmtBaht(finalIncomeVal)}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: GRAY_400 }}>หลังหักทุกรายการ</p>
        </div>
      </div>

      {/* ─── TABLE SECTION ─── */}
      <div style={{ padding: '16px 24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: GRAY_800 }}>รายละเอียดกะงาน</h2>
          <span style={{
            backgroundColor: PURPLE_LIGHT, color: PURPLE,
            fontSize: '11px', fontWeight: 700, padding: '3px 12px', borderRadius: '20px'
          }}>
            {summary?.shiftCount || 0} กะ · {(summary?.totalHours || 0).toFixed(1)} ชม.
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ backgroundColor: GRAY_800, color: '#fff' }}>
              <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', width: '12%' }}>วันที่</th>
              <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', width: '28%' }}>งาน / สถานที่</th>
              <th style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', width: '18%' }}>เวลา</th>
              <th style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', width: '10%' }}>ชม.</th>
              <th style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', width: '16%' }}>อัตราค่าจ้าง</th>
              <th style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', width: '16%' }}>รวม</th>
            </tr>
          </thead>
          <tbody>
            {sortedShifts.map((shift, index) => {
              const start = new Date(shift.actualStart || shift.start);
              const end = new Date(shift.actualEnd || shift.end);
              const isDone = shift.status === TASK_STATUS.DONE || (shift.actualStart && shift.actualEnd);
              const isEven = index % 2 === 0;
              const rowBg = isEven ? '#fff' : GRAY_50;

              if (shift.isExpense) {
                return (
                  <tr key={shift.id} style={{ backgroundColor: isEven ? '#FFF5F5' : RED_BG }}>
                    <td style={{ padding: '6px 12px', color: GRAY_600, fontSize: '12px' }}>{format(start, 'dd MMM', { locale: th })}</td>
                    <td style={{ padding: '6px 12px', color: RED, fontWeight: 600 }}>
                      📤 {shift.title}{shift.isPercentage && ' (หัก %)'}
                    </td>
                    <td style={{ padding: '6px 12px', textAlign: 'center', color: GRAY_400 }}>—</td>
                    <td style={{ padding: '6px 12px', textAlign: 'center', color: GRAY_400 }}>—</td>
                    <td style={{ padding: '6px 12px', textAlign: 'right', color: GRAY_400 }}>—</td>
                    <td style={{ padding: '6px 12px', textAlign: 'right', color: RED, fontWeight: 800 }}>
                      -{fmtBaht(shift.amount || 0)}
                    </td>
                  </tr>
                );
              }

              if (shift.isExtraIncome) {
                return (
                  <tr key={shift.id} style={{ backgroundColor: isEven ? '#F0FFF4' : GREEN_BG }}>
                    <td style={{ padding: '6px 12px', color: GRAY_600, fontSize: '12px' }}>{format(start, 'dd MMM', { locale: th })}</td>
                    <td style={{ padding: '6px 12px', color: GREEN, fontWeight: 600 }}>
                      📥 {shift.title}
                    </td>
                    <td style={{ padding: '6px 12px', textAlign: 'center', color: GRAY_400 }}>—</td>
                    <td style={{ padding: '6px 12px', textAlign: 'center', color: GRAY_400 }}>—</td>
                    <td style={{ padding: '6px 12px', textAlign: 'right', color: GRAY_400 }}>—</td>
                    <td style={{ padding: '6px 12px', textAlign: 'right', color: GREEN, fontWeight: 800 }}>
                      +{fmtBaht(shift.amount || 0)}
                    </td>
                  </tr>
                );
              }

              let hours = 0;
              let earnings = 0;
              const rate = Number(shift.hourlyRate || 0);
              if (isDone) {
                hours = (end - start) / (1000 * 60 * 60);
                if (shift.breakHours) hours -= Number(shift.breakHours);
                hours = Math.max(0, hours);
                if (shift.rateType === RATE_TYPE.DAILY) {
                  earnings = rate;
                } else {
                  earnings = hours * rate;
                }
                if (shift.isHolidayPay) earnings *= 2;
              }

              return (
                <tr key={shift.id} style={{ backgroundColor: isDone ? rowBg : GRAY_100, opacity: isDone ? 1 : 0.65 }}>
                  <td style={{ padding: '6px 12px', color: GRAY_600, fontSize: '12px' }}>
                    {format(start, 'dd MMM', { locale: th })}
                  </td>
                  <td style={{ padding: '6px 12px', fontWeight: isDone ? 600 : 400, color: isDone ? GRAY_800 : GRAY_400 }}>
                    {shift.title}
                    {shift.isHolidayPay && (
                      <span style={{ fontSize: '9px', backgroundColor: '#FEF9C3', color: '#854D0E', padding: '1px 5px', borderRadius: '4px', marginLeft: '6px', fontWeight: 700 }}>OT×2</span>
                    )}
                    {!isDone && (
                      <span style={{ fontSize: '10px', color: GRAY_400, marginLeft: '6px' }}>(ยังไม่จบกะ)</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'center', color: isDone ? GRAY_600 : GRAY_400, fontFamily: 'monospace', fontSize: '12px' }}>
                    {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'center', color: isDone ? GRAY_600 : GRAY_400, fontFamily: 'monospace' }}>
                    {isDone ? hours.toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', color: GRAY_400, fontSize: '11px' }}>
                    {isDone
                      ? (shift.rateType === RATE_TYPE.DAILY ? `฿${rate.toLocaleString()}/วัน` : `฿${rate.toLocaleString()}/ชม.`)
                      : '—'}
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 800, color: isDone ? GRAY_800 : GRAY_400 }}>
                    {isDone ? fmtBaht(earnings) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totals footer */}
          <tfoot>
            <tr style={{ backgroundColor: GRAY_800, color: '#fff', borderTop: `3px solid ${GRAY_800}` }}>
              <td colSpan={3} style={{ padding: '12px', fontWeight: 700, fontSize: '13px' }}>รวมทั้งสิ้น</td>
              <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                {(summary?.totalHours || 0).toFixed(1)}
              </td>
              <td style={{ padding: '12px' }}></td>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, fontSize: '14px' }}>
                {fmtBaht(totalIncomeVal)}
              </td>
            </tr>
            {ssoDeductVal > 0 && (
              <tr style={{ backgroundColor: RED_BG }}>
                <td colSpan={5} style={{ padding: '6px 12px', color: RED, fontWeight: 600, fontSize: '12px' }}>
                  หักประกันสังคม (5% · สูงสุด ฿750/เดือน)
                </td>
                <td style={{ padding: '6px 12px', textAlign: 'right', color: RED, fontWeight: 800, fontSize: '13px' }}>
                  -{fmtBaht(ssoDeductVal)}
                </td>
              </tr>
            )}
            <tr style={{ backgroundColor: GREEN_BG }}>
              <td colSpan={5} style={{ padding: '12px', color: GREEN, fontWeight: 700, fontSize: '13px' }}>
                ยอดรับสุทธิ
              </td>
              <td style={{ padding: '12px', textAlign: 'right', color: GREEN, fontWeight: 900, fontSize: '16px' }}>
                {fmtBaht(finalIncomeVal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ─── FOOTER STRIP ─── */}
      <div style={{
        margin: '0 24px 20px',
        padding: '10px 16px',
        backgroundColor: PURPLE_LIGHT,
        borderRadius: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Inline full-color logo SVG for light footer */}
          <svg xmlns="http://www.w3.org/2000/svg" width="130" height="40" viewBox="0 0 320 100">
            <defs>
              <linearGradient id="floop" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6"/>
                <stop offset="100%" stopColor="#a78bfa"/>
              </linearGradient>
              <linearGradient id="floop2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa"/>
                <stop offset="100%" stopColor="#f472b6"/>
              </linearGradient>
              <linearGradient id="ftext" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7c3aed"/>
                <stop offset="100%" stopColor="#db2777"/>
              </linearGradient>
            </defs>
            <rect x="4" y="8" width="88" height="84" rx="22" fill="white" fillOpacity="0.55" stroke="white" strokeOpacity="0.8" strokeWidth="1.5"/>
            <circle cx="32" cy="50" r="22" fill="none" stroke="url(#floop)" strokeWidth="8"/>
            <circle cx="68" cy="50" r="22" fill="none" stroke="url(#floop2)" strokeWidth="8"/>
            <rect x="43" y="28" width="14" height="44" fill="white"/>
            <path d="M43 34 Q50 50 43 66" stroke="url(#floop)" strokeWidth="8" fill="none" strokeLinecap="round"/>
            <path d="M57 34 Q50 50 57 66" stroke="url(#floop2)" strokeWidth="8" fill="none" strokeLinecap="round"/>
            <circle cx="14" cy="50" r="7" fill="#f472b6"/>
            <circle cx="14" cy="50" r="3.5" fill="white" fillOpacity="0.6"/>
            <circle cx="86" cy="50" r="7" fill="#a78bfa"/>
            <circle cx="86" cy="50" r="3.5" fill="white" fillOpacity="0.6"/>
            <text x="108" y="58" fontFamily="system-ui,-apple-system,sans-serif" fontSize="38" fontWeight="800" fill="url(#ftext)">SudoDo</text>
            <text x="110" y="76" fontFamily="system-ui,sans-serif" fontSize="10" fontWeight="500" fill="#9d8ec0" letterSpacing="4">TASK MANAGER</text>
          </svg>
        </div>
        <p style={{ margin: 0, fontSize: '11px', color: GRAY_400 }}>
          สร้างอัตโนมัติ · {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: th })}
        </p>
      </div>
    </div>
  );
});

PdfStatement.displayName = 'PdfStatement';
export default PdfStatement;
