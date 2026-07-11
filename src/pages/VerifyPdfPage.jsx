import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileCheck2, Loader2, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getPdfVerification } from '../services/pdfVerificationService';

const money = (value) => Number(value || 0).toLocaleString('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 2,
});

const formatMonth = (month) => {
  if (!/^\d{4}-\d{2}$/.test(month || '')) return month || '-';
  return new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' })
    .format(new Date(`${month}-01T00:00:00+07:00`));
};

export default function VerifyPdfPage() {
  const { verifyId } = useParams();
  const [state, setState] = useState({ loading: true, record: null, error: '' });

  useEffect(() => {
    let active = true;
    getPdfVerification(verifyId)
      .then((record) => active && setState({ loading: false, record, error: '' }))
      .catch((error) => {
        if (!active) return;
        const notFound = error?.code === 'functions/not-found' || error?.code === 'not-found';
        setState({
          loading: false,
          record: null,
          error: notFound ? 'ไม่พบเอกสารหมายเลขนี้ในระบบ' : 'ไม่สามารถตรวจสอบเอกสารได้ กรุณาลองใหม่อีกครั้ง',
        });
      });
    return () => { active = false; };
  }, [verifyId]);

  if (state.loading) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-slate-50 px-5 text-slate-900">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-violet-600" />
          <p className="font-semibold">กำลังตรวจสอบเอกสาร...</p>
        </div>
      </main>
    );
  }

  if (state.error) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-slate-50 px-5 text-slate-900">
        <section className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-7 text-center shadow-xl shadow-slate-200/60">
          <XCircle className="mx-auto mb-4 h-14 w-14 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold">ยืนยันเอกสารไม่สำเร็จ</h1>
          <p className="mb-2 text-slate-600">{state.error}</p>
          <p className="mb-6 break-all font-mono text-xs text-slate-400">{verifyId}</p>
          <Link to="/" className="inline-flex rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white">ไปที่ SudoDo</Link>
        </section>
      </main>
    );
  }

  const { record } = state;
  const isValid = record.status === 'valid';
  return (
    <main className="min-h-[100dvh] bg-slate-50 px-5 py-10 text-slate-900">
      <section className="mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className={`px-7 py-8 text-center text-white ${isValid ? 'bg-emerald-600' : 'bg-amber-500'}`}>
          {isValid
            ? <CheckCircle2 className="mx-auto mb-3 h-16 w-16" />
            : <AlertTriangle className="mx-auto mb-3 h-16 w-16" />}
          <h1 className="text-2xl font-bold">{isValid ? 'เอกสารถูกต้อง' : 'เอกสารนี้ถูกยกเลิก'}</h1>
          <p className="mt-1 text-sm text-white/85">ตรวจสอบจากฐานข้อมูล SudoDo</p>
        </div>

        <div className="space-y-6 p-7">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-violet-100 p-3 text-violet-700"><FileCheck2 /></div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">เลขอ้างอิง</p>
              <p className="break-all font-mono text-sm font-bold">{record.verifyId}</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-2xl bg-slate-50 p-5 text-sm">
            <div><dt className="text-slate-500">เจ้าของเอกสาร</dt><dd className="mt-1 font-semibold">{record.ownerName}</dd></div>
            <div><dt className="text-slate-500">รอบเดือน</dt><dd className="mt-1 font-semibold">{formatMonth(record.month)}</dd></div>
            <div><dt className="text-slate-500">จำนวนกะ</dt><dd className="mt-1 font-semibold">{record.summary.shiftCount} กะ</dd></div>
            <div><dt className="text-slate-500">จำนวนรายการ</dt><dd className="mt-1 font-semibold">{record.summary.recordCount} รายการ</dd></div>
            <div><dt className="text-slate-500">ชั่วโมงรวม</dt><dd className="mt-1 font-semibold">{record.summary.totalHours} ชั่วโมง</dd></div>
            <div><dt className="text-slate-500">ประกันสังคม</dt><dd className="mt-1 font-semibold">{money(record.summary.ssoDeduct)}</dd></div>
            <div><dt className="text-slate-500">รายได้รวม</dt><dd className="mt-1 font-semibold">{money(record.summary.totalIncome)}</dd></div>
            <div><dt className="text-slate-500">รายได้สุทธิ</dt><dd className="mt-1 font-bold text-emerald-700">{money(record.summary.finalIncome)}</dd></div>
          </dl>

          <div className="border-t border-slate-100 pt-5 text-xs text-slate-500">
            <p>ออกเอกสารเมื่อ {record.createdAt ? new Date(record.createdAt).toLocaleString('th-TH') : '-'}</p>
            <p className="mt-2 break-all font-mono">HASH {record.hash?.slice(0, 16).toUpperCase()}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
