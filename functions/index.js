const { createHash, randomBytes } = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

initializeApp();

const db = getFirestore();
const REGION = 'asia-southeast1';
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const VERIFY_ID_PATTERN = /^SD-\d{6}-[A-F0-9]{24}$/;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const bangkokMonth = (value) => {
  const date = toDate(value);
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : '';
};

const calculateStatement = (tasks, month) => {
  let totalIncome = 0;
  let ssoGross = 0;
  let shiftCount = 0;
  let totalHours = 0;

  const rows = tasks
    .filter((task) => task.isPartTime && bangkokMonth(task.start) === month)
    .map((task) => {
      const isDone = task.status === 'Done' || (task.actualStart && task.actualEnd);
      let hours = 0;
      let earnings;

      if (task.isExpense) {
        earnings = -toNumber(task.amount);
        if (isDone) totalIncome += earnings;
      } else if (task.isExtraIncome) {
        earnings = toNumber(task.amount);
        if (isDone) totalIncome += earnings;
      } else {
        shiftCount += 1;
        if (isDone) {
          const start = toDate(task.actualStart) || toDate(task.start);
          const end = toDate(task.actualEnd) || toDate(task.end);
          if (start && end) hours = Math.max(0, (end - start) / 3600000 - toNumber(task.breakHours));
          earnings = task.rateType === 'daily' ? toNumber(task.hourlyRate) : hours * toNumber(task.hourlyRate);
          if (task.isHolidayPay) earnings *= 2;
          totalHours += hours;
          totalIncome += earnings;
          if (task.deductSSO) ssoGross += earnings;
        }
      }

      return {
        id: task.id || '',
        title: task.title || '',
        start: toDate(task.start)?.toISOString() || '',
        end: toDate(task.end)?.toISOString() || '',
        actualStart: toDate(task.actualStart)?.toISOString() || '',
        actualEnd: toDate(task.actualEnd)?.toISOString() || '',
        amount: toNumber(task.amount),
        hourlyRate: toNumber(task.hourlyRate),
        rateType: task.rateType || '',
        breakHours: toNumber(task.breakHours),
        status: task.status || '',
        isExpense: Boolean(task.isExpense),
        isExtraIncome: Boolean(task.isExtraIncome),
        isHolidayPay: Boolean(task.isHolidayPay),
        deductSSO: Boolean(task.deductSSO),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const ssoDeduct = Math.max(0, Math.min(Math.round(ssoGross * 0.05), 750));
  return {
    rows,
    summary: {
      totalIncome: Number(totalIncome.toFixed(2)),
      ssoDeduct,
      finalIncome: Number((totalIncome - ssoDeduct).toFixed(2)),
      totalHours: Number(totalHours.toFixed(1)),
      shiftCount,
      recordCount: rows.length,
    },
  };
};

const maskName = (name) => {
  const clean = String(name || '').trim();
  if (!clean) return 'SudoDo user';
  if (clean.length <= 2) return `${clean[0]}*`;
  return `${clean.slice(0, 2)}${'*'.repeat(Math.min(clean.length - 2, 6))}`;
};

exports.issuePdfVerification = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Please sign in before exporting a verified PDF.');
  const month = String(request.data?.month || '');
  if (!MONTH_PATTERN.test(month)) throw new HttpsError('invalid-argument', 'Invalid statement month.');

  const uid = request.auth.uid;
  const snapshot = await db.collection('users').doc(uid).collection('tasks').get();
  const tasks = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  const statement = calculateStatement(tasks, month);
  if (statement.rows.length === 0) throw new HttpsError('failed-precondition', 'No shifts were found for this month.');

  const userRecord = await getAuth().getUser(uid);
  const source = {
    app: 'SudoDo',
    type: 'monthly-income-statement',
    month,
    userId: uid,
    summary: statement.summary,
    rows: statement.rows,
  };
  const hash = createHash('sha256').update(JSON.stringify(source)).digest('hex');
  const verifyId = `SD-${month.replace('-', '')}-${randomBytes(12).toString('hex').toUpperCase()}`;
  const publicRecord = {
    verifyId,
    month,
    ownerName: maskName(userRecord.displayName || request.auth.token.name),
    summary: statement.summary,
    hash,
    status: 'valid',
  };

  await db.collection('pdfVerifications').doc(verifyId).set({
    ...publicRecord,
    ownerUid: uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ...publicRecord, createdAt: new Date().toISOString() };
});

exports.getPdfVerification = onCall({ region: REGION }, async (request) => {
  const verifyId = String(request.data?.verifyId || '').toUpperCase();
  if (!VERIFY_ID_PATTERN.test(verifyId)) throw new HttpsError('invalid-argument', 'Invalid verification ID.');

  const snapshot = await db.collection('pdfVerifications').doc(verifyId).get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Verification record not found.');

  const record = snapshot.data();
  return {
    verifyId: record.verifyId,
    month: record.month,
    ownerName: record.ownerName,
    summary: record.summary,
    hash: record.hash,
    status: record.status,
    createdAt: record.createdAt?.toDate().toISOString() || null,
  };
});
