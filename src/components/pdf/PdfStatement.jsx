import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { TASK_STATUS, RATE_TYPE } from '../../constants';
import { calcSSO } from '../../utils/socialSecurity';

const PdfStatement = forwardRef(({ month, summary, shiftsList, user }, ref) => {
  const monthDate = new Date(`${month}-01T00:00:00`);
  
  // Sort shifts chronologically
  const sortedShifts = [...(shiftsList || [])].sort((a, b) => new Date(a.start) - new Date(b.start));

  return (
    <div 
      ref={ref} 
      style={{
        position: 'absolute', 
        top: '-10000px', 
        left: '-10000px',
        width: '210mm', 
        minHeight: '297mm',
        padding: '20mm',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
        boxSizing: 'border-box'
      }}
      className="pdf-statement"
    >
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px 0' }}>สรุปรายได้ประจำเดือน</h1>
        <p style={{ fontSize: '16px', margin: '0', color: '#4a5568' }}>
          {format(monthDate, 'MMMM yyyy', { locale: th })}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px' }}>
        <div>
          <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#718096' }}>ผู้รับเงิน</p>
          <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>{user?.displayName || 'พนักงาน'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#718096' }}>พิมพ์เมื่อ</p>
          <p style={{ margin: '0', fontSize: '14px' }}>{format(new Date(), 'dd MMM yyyy HH:mm', { locale: th })}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        <div style={{ flex: 1, backgroundColor: '#f7fafc', padding: '15px', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#718096' }}>รายได้รวม</p>
          <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold', color: '#2b6cb0' }}>
            ฿{summary?.totalIncome?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div style={{ flex: 1, backgroundColor: '#f7fafc', padding: '15px', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#718096' }}>หักประกันสังคม</p>
          <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold', color: '#c53030' }}>
            {summary?.ssoDeduct > 0 ? `-฿${summary.ssoDeduct.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}
          </p>
        </div>
        <div style={{ flex: 1, backgroundColor: '#ebf8fa', padding: '15px', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#718096' }}>ยอดสุทธิ</p>
          <p style={{ margin: '0', fontSize: '22px', fontWeight: 'bold', color: '#319795' }}>
            ฿{summary?.finalIncome?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 15px 0' }}>รายการกะงาน ({summary?.shiftCount} กะ / {summary?.totalHours?.toFixed(1)} ชม.)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#edf2f7', borderBottom: '2px solid #cbd5e0' }}>
              <th style={{ padding: '10px', textAlign: 'left', width: '15%' }}>วันที่</th>
              <th style={{ padding: '10px', textAlign: 'left', width: '30%' }}>สถานที่ / งาน</th>
              <th style={{ padding: '10px', textAlign: 'center', width: '20%' }}>เวลา</th>
              <th style={{ padding: '10px', textAlign: 'center', width: '15%' }}>ชม.</th>
              <th style={{ padding: '10px', textAlign: 'right', width: '20%' }}>จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {sortedShifts.map((shift, index) => {
              const start = new Date(shift.actualStart || shift.start);
              const end = new Date(shift.actualEnd || shift.end);
              const isDone = shift.status === TASK_STATUS.DONE || (shift.actualStart && shift.actualEnd);
              
              if (shift.isExpense) {
                return (
                  <tr key={shift.id} style={{ borderBottom: '1px solid #e2e8f0', opacity: isDone ? 1 : 0.6 }}>
                    <td style={{ padding: '12px 10px' }}>{format(start, 'dd MMM yyyy', { locale: th })}</td>
                    <td style={{ padding: '12px 10px', color: '#c53030' }}>
                      {shift.title} {shift.isPercentage && '(หัก %)'}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>-</td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>-</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#c53030', fontWeight: 'bold' }}>
                      -฿{Number(shift.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              }

              if (shift.isExtraIncome) {
                return (
                  <tr key={shift.id} style={{ borderBottom: '1px solid #e2e8f0', opacity: isDone ? 1 : 0.6 }}>
                    <td style={{ padding: '12px 10px' }}>{format(start, 'dd MMM yyyy', { locale: th })}</td>
                    <td style={{ padding: '12px 10px', color: '#38a169' }}>
                      {shift.title}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>-</td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>-</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#38a169', fontWeight: 'bold' }}>
                      +฿{Number(shift.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              }

              let hours = 0;
              let earnings = 0;
              if (isDone) {
                hours = (end - start) / (1000 * 60 * 60);
                if (shift.breakHours) hours -= Number(shift.breakHours);
                hours = Math.max(0, hours);
                
                let rate = Number(shift.hourlyRate || 0);
                if (shift.rateType === RATE_TYPE.DAILY) {
                  earnings = rate;
                } else {
                  earnings = hours * rate;
                }
                if (shift.isHolidayPay) earnings *= 2;
              }

              return (
                <tr key={shift.id} style={{ borderBottom: '1px solid #e2e8f0', opacity: isDone ? 1 : 0.5 }}>
                  <td style={{ padding: '12px 10px' }}>{format(start, 'dd MMM', { locale: th })}</td>
                  <td style={{ padding: '12px 10px' }}>
                    {shift.title}
                    {!isDone && <span style={{ fontSize: '12px', color: '#718096', marginLeft: '8px' }}>(ยังไม่จบกะ)</span>}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                    {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                    {isDone ? hours.toFixed(1) : '-'}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold' }}>
                    {isDone ? `฿${earnings.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '50px', textAlign: 'center', color: '#a0aec0', fontSize: '12px' }}>
        <p>เอกสารฉบับนี้ถูกสร้างขึ้นโดยอัตโนมัติจากแอปพลิเคชัน SudoDo</p>
      </div>
    </div>
  );
});

PdfStatement.displayName = 'PdfStatement';
export default PdfStatement;
