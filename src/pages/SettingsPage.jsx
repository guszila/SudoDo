import { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PdfStatement from '../components/pdf/PdfStatement';
import { TASK_STATUS, RATE_TYPE } from '../constants';
import { calcSSO } from '../utils/socialSecurity';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, Moon, Sun, Laptop, Languages, Calendar,
  Palette, Lock, Loader2, Mail,
  Bell, Clock, Flame, Download,
  ShieldCheck, RefreshCw, Database, Info, Star,
  Trash2, LogOut, Check, PlayCircle, UserX, Briefcase, Plus, Settings
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { saveTask, fetchTasks } from '../services/taskService';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ChangelogModal from '../components/common/ChangelogModal';
import { Toggle, SettingsRow as Row } from '../components/common/SettingsUI';
import { useToast } from '../contexts/ToastContext';
import pkg from '../../package.json';
import { auth } from '../firebase';
import { signOut, deleteUser, updatePassword, sendPasswordResetEmail } from 'firebase/auth';

const ActionSheet = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 backdrop-blur-md cursor-pointer"
            style={{ backgroundColor: 'var(--overlay-bg)' }}
          />
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative liquid-glass-card rounded-b-none border-x-0 border-b-0 shadow-2xl pb-8 pt-4 px-4"
          >
            <div className="w-12 h-1.5 bg-black/10 dark:bg-white/20 rounded-full mx-auto mb-6" />
            {title && <h3 className="text-lg font-bold text-center mb-4 text-[#1a1a2e] dark:text-white">{title}</h3>}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const SettingsSection = ({ section, children, danger = false }) => {
  const Icon = section.icon;
  const cardClass = danger
    ? "bg-[rgba(252,235,235,0.55)] dark:bg-[rgba(163,45,45,0.15)] border-[rgba(242,148,148,0.45)] dark:border-[rgba(240,149,149,0.22)]"
    : "";

  return (
    <motion.section
      variants={{
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0 }
      }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="mb-5"
    >
      <div className="mx-4 mb-2.5 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shadow-sm ${section.iconClass}`}>
          <Icon size={19} />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-[600] text-[var(--theme-section-label)] dark:text-[#AFA9EC] tracking-[0.08em] uppercase">
            {section.title}
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-main/55">{section.subtitle}</p>
        </div>
      </div>
      <div className={`relative mx-4 overflow-hidden rounded-[18px] border-[0.5px] border-white/50 dark:border-white/10 bg-[rgba(255,255,255,0.38)] dark:bg-[rgba(255,255,255,0.08)] backdrop-blur-[20px] shadow-sm ${cardClass}`}>
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-r ${section.accent}`} />
        <div className="relative">
          {children}
        </div>
      </div>
    </motion.section>
  );
};

export default function SettingsPage({ user, lang, setLang, theme, setThemeMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme, setTheme, themes } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { tasks } = useTasks();
  const { showToast } = useToast();
  
  // Storage Count State
  const [storageCounts, setStorageCounts] = useState({ tasks: 0, shifts: 0 });
  const [isCountingStorage, setIsCountingStorage] = useState(true);

  // Sheets & Dialogs State
  const [activeSheet, setActiveSheet] = useState(null); // 'themeMode', 'language', 'weekStart', 'resetIncome', 'manageJobs', 'editJob', 'themePicker', 'exportPdf'
  const [showChangelog, setShowChangelog] = useState(false);
  
  // Job Management State
  const [editingJob, setEditingJob] = useState(null);
  const [jobFormData, setJobFormData] = useState({ id: '', name: '', emoji: '', color: 'blue', deductSSO: false });
  const JOB_BG_COLORS = { blue: 'bg-blue-500', red: 'bg-red-500', green: 'bg-green-500', amber: 'bg-amber-500', purple: 'bg-purple-500', pink: 'bg-pink-500' };
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(0); // 0: closed, 1: dialog, 2: input
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [deleteAccountStep, setDeleteAccountStep] = useState(0);
  const [deleteAccountText, setDeleteAccountText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Security
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return;
    setIsChangingPassword(true);
    try {
      await updatePassword(user, newPassword);
      setNewPassword('');
      showToast(lang === 'en' ? 'Password updated successfully' : 'อัปเดตรหัสผ่านสำเร็จ');
      setActiveSheet(null);
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        showToast(lang === 'en' ? 'Please log out and log in again to change password' : 'กรุณาออกจากระบบและเข้าสู่ระบบใหม่ เพื่อเปลี่ยนรหัสผ่าน', { isError: true });
      } else {
        showToast(error.message, { isError: true });
      }
    }
    setIsChangingPassword(false);
  };

  const handleResetPasswordEmail = async () => {
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      showToast(lang === 'en' ? 'Password reset link sent to your email' : 'ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลแล้ว');
    } catch (error) {
      showToast(error.message, { isError: true });
    }
    setSendingReset(false);
  };

  const t = {
    display: lang === 'en' ? 'Display' : 'การแสดงผล',
    themeColor: lang === 'en' ? 'Color Theme' : 'ธีมสี',
    themeColorSub: lang === 'en' ? 'Select app color theme' : 'เลือกสีที่ชอบ',
    themeMode: lang === 'en' ? 'Theme Mode' : 'โหมดหน้าจอ',
    themeModeSub: lang === 'en' ? 'Select light, dark, or system mode' : 'เลือกโหมดสว่าง มืด หรือตามระบบ',
    light: lang === 'en' ? 'Light Mode' : 'โหมดสว่าง',
    dark: lang === 'en' ? 'Dark Mode' : 'โหมดมืด',
    system: lang === 'en' ? 'System' : 'ตามระบบ',
    language: lang === 'en' ? 'Language' : 'ภาษา',
    weekStartTitle: lang === 'en' ? 'First Day of Week' : 'วันเริ่มต้นสัปดาห์',
    sunday: lang === 'en' ? 'Sunday' : 'อาทิตย์',
    monday: lang === 'en' ? 'Monday' : 'จันทร์',
    notifications: lang === 'en' ? 'Notifications' : 'การแจ้งเตือน',
    notifyTasks: lang === 'en' ? 'Task Reminders' : 'แจ้งเตือนงาน',
    notifyTasksSub: lang === 'en' ? '15 mins before due' : 'ก่อนถึงกำหนด 15 นาที',
    notifyShifts: lang === 'en' ? 'Shift Reminders' : 'แจ้งเตือนกะงาน',
    notifyShiftsSub: lang === 'en' ? '30 mins before start' : 'ก่อนเริ่มงาน 30 นาที',
    notifyStreak: lang === 'en' ? 'Streak Reminders' : 'แจ้งเตือน Streak',
    notifyStreakSub: lang === 'en' ? 'Remind if app not opened' : 'เตือนถ้าลืมเปิดแอปวันนี้',
    calendar: lang === 'en' ? 'Calendar' : 'ปฏิทิน',
    syncGoogle: lang === 'en' ? 'Sync Google Calendar' : 'ซิงค์ Google Calendar',
    notConnected: lang === 'en' ? 'Not connected' : 'ยังไม่ได้เชื่อมต่อ',
    new: lang === 'en' ? 'NEW' : 'ใหม่',
    exportPdf: lang === 'en' ? 'Export Monthly Income Summary' : 'Export สรุปรายได้ต่อเดือน',
    data: lang === 'en' ? 'Data' : 'ข้อมูล',
    socialSecurity: lang === 'en' ? 'Social Security' : 'ประกันสังคม',
    ssoSub: lang === 'en' ? 'Auto calculate 5% deduction' : 'คำนวณหัก 5% อัตโนมัติ',
    resetIncome: lang === 'en' ? 'Reset Income' : 'รีเซ็ตรายได้',
    resetIncomeSub: lang === 'en' ? 'Clear history, start from ฿0' : 'ล้างประวัติ เริ่มนับใหม่จาก ฿0',
    storage: lang === 'en' ? 'Storage Usage' : 'ข้อมูลที่ใช้',
    storageSub: lang === 'en' ? `${storageCounts.tasks} tasks · ${storageCounts.shifts} shifts` : `งาน ${storageCounts.tasks} รายการ · กะ ${storageCounts.shifts} รายการ`,
    about: lang === 'en' ? 'About' : 'เกี่ยวกับ',
    version: lang === 'en' ? 'Version' : 'เวอร์ชัน',
    whatsNew: lang === 'en' ? "What's New" : 'มีอะไรใหม่',
    reviewApp: lang === 'en' ? 'Review App' : 'รีวิวแอป',
    reviewAppSub: lang === 'en' ? 'Rate on App Store' : 'ให้คะแนนบน App Store',
    dangerZone: lang === 'en' ? 'Danger Zone' : 'Danger Zone',
    restartTour: lang === 'en' ? 'Restart App Tour' : 'เริ่มแนะนำการใช้งานใหม่',
    deleteAll: lang === 'en' ? 'Delete All Data' : 'ลบข้อมูลทั้งหมด',
    deleteAccount: lang === 'en' ? 'Delete Account' : 'ลบบัญชี',
    deleteAccountTitle: lang === 'en' ? 'Confirm Account Deletion' : 'ยืนยันการลบบัญชี',
    deleteAccountMsg: lang === 'en' ? 'This will permanently delete your account and all data. Cannot be undone.' : 'การกระทำนี้จะลบบัญชีและข้อมูลทั้งหมดของคุณอย่างถาวร ไม่สามารถย้อนกลับได้',
    deleteAccountError: lang === 'en' ? 'Error: Please log out and log back in to verify your identity before deleting.' : 'ข้อผิดพลาด: กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ เพื่อยืนยันตัวตนก่อนลบบัญชี',
    logout: lang === 'en' ? 'Log Out' : 'ออกจากระบบ',
    securityTitle: lang === 'en' ? 'Security' : 'ความปลอดภัย',
    changePassword: lang === 'en' ? 'Change Password' : 'เปลี่ยนรหัสผ่าน',
    selectLang: lang === 'en' ? 'Select Language' : 'เลือกภาษา',
    thai: lang === 'en' ? 'Thai' : 'ภาษาไทย',
    english: lang === 'en' ? 'English' : 'English',
    resetConfirmTitle: lang === 'en' ? 'Reset Income History' : 'รีเซ็ตประวัติรายได้',
    warning: lang === 'en' ? 'Warning!' : 'คำเตือน!',
    resetWarnText: lang === 'en' ? 'This will delete all shift and income history. Starts from ฿0. Cannot be undone.' : 'การกระทำนี้จะลบกะงานและประวัติรายได้ทั้งหมดของคุณ เริ่มนับใหม่จาก ฿0 ไม่สามารถย้อนกลับได้',
    confirmWord: lang === 'en' ? 'confirm' : 'ยืนยัน',
    typeConfirm: lang === 'en' ? "Type 'confirm'" : "พิมพ์คำว่า 'ยืนยัน'",
    deleting: lang === 'en' ? 'Deleting...' : 'กำลังลบ...',
    deleteBtn: lang === 'en' ? 'Delete Income History' : 'ลบประวัติรายได้',
    deleteAllTitle: lang === 'en' ? 'Confirm Delete All Data' : 'ยืนยันการลบข้อมูลทั้งหมด',
    deleteAllMsg: lang === 'en' ? 'This will permanently delete all tasks and shifts, but not your account.' : 'การกระทำนี้จะลบงานและกะทั้งหมดของคุณออกจากระบบอย่างถาวร แต่จะไม่ลบบัญชีผู้ใช้ของคุณ',
    continue: lang === 'en' ? 'Continue' : 'ดำเนินการต่อ',
    cancel: lang === 'en' ? 'Cancel' : 'ยกเลิก',
    finalConfirm: lang === 'en' ? 'Final Confirmation' : 'การยืนยันขั้นตอนสุดท้าย',
    type: lang === 'en' ? 'Type' : 'พิมพ์',
    deletePerm: lang === 'en' ? 'Delete Permanently' : 'ลบถาวร',
    logoutConfirm: lang === 'en' ? 'Are you sure you want to log out?' : 'คุณต้องการออกจากระบบใช่หรือไม่?',
    comingSoon: lang === 'en' ? 'Coming soon' : 'ฟีเจอร์นี้จะเปิดให้ใช้งานเร็วๆ นี้',
    inDev: lang === 'en' ? 'Feature in development' : 'ฟีเจอร์ Export PDF กำลังอยู่ระหว่างพัฒนา',
    resetSuccess: lang === 'en' ? 'Income history reset successfully' : 'รีเซ็ตประวัติรายได้ทั้งหมดสำเร็จ',
    resetError: lang === 'en' ? 'Error resetting income' : 'เกิดข้อผิดพลาดในการรีเซ็ตรายได้',
    deleteSuccess: lang === 'en' ? 'All data deleted successfully' : 'ลบข้อมูลทั้งหมดเรียบร้อยแล้ว',
    deleteError: lang === 'en' ? 'Error deleting data' : 'เกิดข้อผิดพลาดในการลบข้อมูล',
    manageJobs: lang === 'en' ? 'Manage Jobs' : 'จัดการบริษัท/ที่ทำงาน',
    manageJobsSub: lang === 'en' ? 'Set up your workplaces' : 'ตั้งค่าข้อมูลบริษัทและประกันสังคม',
    jobs: lang === 'en' ? 'Jobs' : 'บริษัท',
    addJob: lang === 'en' ? 'Add Job' : 'เพิ่มบริษัท',
    jobName: lang === 'en' ? 'Company Name' : 'ชื่อบริษัท',
    jobEmoji: lang === 'en' ? 'Emoji' : 'อิโมจิ',
    jobColor: lang === 'en' ? 'Color' : 'สีประจำบริษัท',
    saveJob: lang === 'en' ? 'Save Job' : 'บันทึก',
  };

  const [exportMonth, setExportMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const pdfRef = useRef(null);

  const exportData = useMemo(() => {
    let totalIncome = 0;
    let ssoGross = 0;
    let shiftCount = 0;
    let totalHours = 0;
    const shiftsInMonth = [];

    (tasks || []).filter(t => t.isPartTime).forEach(t => {
      const taskDate = new Date(t.start);
      if (format(taskDate, 'yyyy-MM') === exportMonth) {
        shiftsInMonth.push(t);
        const isDone = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
        let hours = 0;
        let earnings = 0;

        if (t.isExpense) {
           earnings = -(Number(t.amount) || 0);
           if (isDone) totalIncome += earnings;
        } else if (t.isExtraIncome) {
           earnings = Number(t.amount) || 0;
           if (isDone) totalIncome += earnings;
        } else {
           if (isDone) {
             if (t.actualStart && t.actualEnd) {
               hours = (new Date(t.actualEnd) - new Date(t.actualStart)) / (1000 * 60 * 60);
             } else {
               hours = (new Date(t.end) - new Date(t.start)) / (1000 * 60 * 60);
             }
             if (t.breakHours) hours -= Number(t.breakHours);
             hours = Math.max(0, hours);
             
             let rate = Number(t.hourlyRate || 0);
             if (t.rateType === RATE_TYPE.DAILY) {
               earnings = rate;
             } else {
               earnings = hours * rate;
             }
             if (t.isHolidayPay) earnings *= 2;
             
             totalHours += hours;
             totalIncome += earnings;
             if (t.deductSSO) ssoGross += earnings;
           }
        }
        if (!t.isExpense && !t.isExtraIncome) shiftCount++;
      }
    });

    const ssoResult = calcSSO(ssoGross, settings?.ssoPercent);
    const ssoDeduct = ssoResult?.deduction ?? 0;
    const finalIncome = totalIncome - ssoDeduct;

    return {
      summary: { totalIncome, ssoGross, shiftCount, totalHours, finalIncome, ssoDeduct },
      shiftsList: shiftsInMonth
    };
  }, [tasks, exportMonth, settings?.ssoPercent]);

  const handleExportPDF = async () => {
    if (exportData.shiftsList.length === 0) {
      showToast(lang === 'en' ? 'No data for this month' : 'ไม่มีข้อมูลกะงานในเดือนนี้');
      return;
    }
    setIsExportingPdf(true);
    try {
      const input = pdfRef.current;
      const canvas = await html2canvas(input, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Statement_${exportMonth}.pdf`);
      showToast(lang === 'en' ? 'PDF Exported Successfully' : 'บันทึก PDF สำเร็จ!');
      setActiveSheet(null);
    } catch (error) {
      console.error('PDF Export Error', error);
      showToast(lang === 'en' ? 'Error generating PDF' : 'เกิดข้อผิดพลาดในการสร้าง PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  useEffect(() => {
    if (location.state?.openSheet) {
      setActiveSheet(location.state.openSheet);
      // Clear the state so it doesn't reopen on reload
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (!user) return;
    const countStorage = async () => {
      setIsCountingStorage(true);
      try {
        const userTasks = await fetchTasks(user.uid);
        let tCount = 0;
        let sCount = 0;
        userTasks.forEach(t => {
          if (t.isPartTime) sCount++;
          else tCount++;
        });
        setStorageCounts({ tasks: tCount, shifts: sCount });
      } catch (err) {
        console.error(err);
      } finally {
        setIsCountingStorage(false);
      }
    };
    countStorage();
  }, [user]);

  const handleToggle = (key, value) => {
    updateSettings({ [key]: value });
  };

  const handleSetThemeMode = (mode) => {
    setThemeMode(mode);
    updateSettings({ themeMode: mode });
    setActiveSheet(null);
  };

  const handleSetLanguage = (newLang) => {
    setLang(newLang);
    updateSettings({ language: newLang });
    setActiveSheet(null);
  };

  const handleSetWeekStart = (day) => {
    updateSettings({ weekStart: day });
    setActiveSheet(null);
  };

  const handleResetIncome = async () => {
    if (resetConfirmText !== t.confirmWord) return;
    setIsResetting(true);
    try {
      const historyTasks = tasks.filter(t => t.isPartTime);
      for (const task of historyTasks) {
        await saveTask('DELETE', { id: task.id }, user.uid);
      }
      showToast(t.resetSuccess, { duration: 3000 });
      setActiveSheet(null);
      setResetConfirmText('');
    } catch (error) {
      console.error(error);
      showToast(t.resetError, { duration: 3000 });
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteData = async () => {
    if (deleteConfirmText !== user.displayName) return;
    setIsDeleting(true);
    try {
      for (const task of tasks) {
        await saveTask('DELETE', { id: task.id }, user.uid);
      }
      showToast(t.deleteSuccess, { duration: 3000 });
      setDeleteConfirmStep(0);
      setDeleteConfirmText('');
    } catch (error) {
      console.error(error);
      showToast(t.deleteError, { duration: 3000 });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountText !== user.displayName) return;
    setIsDeletingAccount(true);
    try {
      for (const task of tasks) {
        await saveTask('DELETE', { id: task.id }, user.uid);
      }
      await deleteUser(auth.currentUser);
      // It will auto redirect to login via auth listener
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        showToast(t.deleteAccountError, { duration: 5000 });
        setDeleteAccountStep(0);
      } else {
        showToast(t.deleteError, { duration: 3000 });
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm(t.logoutConfirm)) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Logout error', error);
      }
    }
  };

  const avatarInitial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');
  const avatarUrl = user?.uid ? (localStorage.getItem(`avatar_${user.uid}`) || '') : '';
  const settingSections = {
    display: {
      icon: Palette,
      title: t.display,
      subtitle: lang === 'en' ? 'Theme, language, and calendar preferences' : 'ธีม ภาษา และรูปแบบปฏิทิน',
      accent: 'from-violet-500/20 to-sky-500/10',
      iconClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-300'
    },
    notifications: {
      icon: Bell,
      title: t.notifications,
      subtitle: lang === 'en' ? 'Reminders for tasks, shifts, and streaks' : 'การเตือนสำหรับงาน กะ และสถิติการใช้งาน',
      accent: 'from-amber-500/20 to-orange-500/10',
      iconClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
    },
    data: {
      icon: Database,
      title: t.data,
      subtitle: lang === 'en' ? 'Income export, jobs, storage, and reset tools' : 'ส่งออก จัดการงาน รายได้ และพื้นที่จัดเก็บ',
      accent: 'from-emerald-500/20 to-teal-500/10',
      iconClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
    },
    about: {
      icon: Info,
      title: t.about,
      subtitle: lang === 'en' ? 'Version, release notes, and product tour' : 'เวอร์ชัน รายการอัปเดต และทัวร์แอป',
      accent: 'from-blue-500/20 to-indigo-500/10',
      iconClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
    },
    security: {
      icon: Lock,
      title: t.securityTitle,
      subtitle: lang === 'en' ? 'Account access and password controls' : 'การเข้าถึงบัญชีและรหัสผ่าน',
      accent: 'from-slate-500/15 to-amber-500/10',
      iconClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-200'
    },
    danger: {
      icon: ShieldCheck,
      title: t.dangerZone,
      subtitle: lang === 'en' ? 'Permanent actions that need confirmation' : 'คำสั่งถาวรที่ต้องยืนยันก่อนดำเนินการ',
      accent: 'from-red-500/20 to-rose-500/10',
      iconClass: 'bg-red-500/15 text-red-500'
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen font-sans pb-32 pt-4 overflow-y-auto"
    >
      <motion.div
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } }
        }}
        initial="hidden"
        animate="show"
        className="max-w-2xl mx-auto"
      >
        <motion.header
          variants={{
            hidden: { opacity: 0, y: 14 },
            show: { opacity: 1, y: 0 }
          }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="mx-4 mb-4"
        >
          <div className="relative overflow-hidden rounded-[24px] border border-white/50 dark:border-white/10 bg-white/45 dark:bg-white/10 p-5 shadow-sm backdrop-blur-[22px]">
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-[var(--theme-accent)]/20 via-white/20 to-emerald-400/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--theme-section-label)]">{t.version} {pkg.version || '1.0.0'}</p>
                <h1 className="mt-1 text-3xl font-black text-main">{lang === 'en' ? 'Settings' : 'ตั้งค่า'}</h1>
                <p className="mt-1 max-w-[28rem] text-sm leading-relaxed text-main/60">
                  {lang === 'en' ? 'Tune the app experience, reminders, account, and data tools from one place.' : 'ปรับประสบการณ์ใช้งาน การแจ้งเตือน บัญชี และข้อมูลของแอปในที่เดียว'}
                </p>
              </div>
              <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[var(--theme-accent)]/15 text-[var(--theme-accent)]">
                <Settings size={22} />
              </div>
            </div>
          </div>
        </motion.header>
        {/* Profile Card */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 14 },
            show: { opacity: 1, y: 0 }
          }}
          onClick={() => navigate('/profile')}
          className="flex items-center mx-4 mb-6 p-4 bg-[rgba(255,255,255,0.6)] dark:bg-[rgba(255,255,255,0.08)] backdrop-blur-[20px] border-[0.5px] border-white/40 dark:border-[rgba(255,255,255,0.12)] rounded-[20px] cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
        >
          <div className="w-14 h-14 rounded-full bg-[var(--theme-avatar-bg)] dark:bg-[rgba(175,169,236,0.3)] text-[#2D2665] dark:text-[#AFA9EC] flex items-center justify-center text-2xl font-bold shrink-0 shadow-inner overflow-hidden">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : avatarInitial
            }
          </div>
          <div className="flex-1 min-w-0 px-4">
            <h2 className="text-[18px] font-bold text-[#1a1a2e] dark:text-white truncate">{user?.displayName || 'User'}</h2>
            <p className="text-[13px] text-[#888780] dark:text-[#A0A0A0] truncate">{user?.email}</p>
          </div>
          <ChevronRight className="text-[#888780] shrink-0" size={20} />
        </motion.div>

        {/* Section 1: การแสดงผล */}
        <SettingsSection section={settingSections.display}>
          <Row 
            icon={Palette} iconBgClass="bg-purple-500/15" iconColorClass="text-purple-600 dark:text-purple-400"
            title={t.themeColor} subtitle={currentTheme.name}
            rightElement={<ChevronRight size={20} className="text-[#888780] dark:text-[#A0A0A0]" />}
            onClick={() => setActiveSheet('themePicker')}
          />
          <Row 
            icon={theme === 'dark' ? Moon : theme === 'light' ? Sun : Laptop} iconBgClass="bg-purple-500/15" iconColorClass="text-purple-600 dark:text-purple-400"
            title={t.themeMode} subtitle={t.themeModeSub}
            rightElement={
              <div className="relative flex p-0.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-full w-[112px] sm:w-[210px] h-[34px] items-center select-none shrink-0">
                {/* Sliding Indicator */}
                <div 
                  className="absolute top-0.5 bottom-0.5 rounded-full bg-white dark:bg-white/10 shadow-[0_2px_6px_rgba(0,0,0,0.15)] transition-all duration-300 ease-out border border-black/[0.03] dark:border-white/[0.05]"
                  style={{
                    left: `calc(${['light', 'dark', 'system'].indexOf(theme) * 100 / 3}% + 2px)`,
                    width: 'calc(100% / 3 - 4px)'
                  }}
                />
                
                {/* Light Mode Button */}
                <button 
                  onClick={() => handleSetThemeMode('light')}
                  className={`flex-grow h-full z-10 flex items-center justify-center gap-1 rounded-full transition-all duration-200 ${theme === 'light' ? 'text-[var(--theme-accent)] font-bold scale-[1.03]' : 'text-[#888780] dark:text-[#A0A0A0] hover:text-main'}`}
                >
                  <Sun size={13} />
                  <span className="hidden sm:inline text-[10px] md:text-[11px]">{lang === 'en' ? 'Light' : 'สว่าง'}</span>
                </button>

                {/* Dark Mode Button */}
                <button 
                  onClick={() => handleSetThemeMode('dark')}
                  className={`flex-grow h-full z-10 flex items-center justify-center gap-1 rounded-full transition-all duration-200 ${theme === 'dark' ? 'text-[var(--theme-accent)] font-bold scale-[1.03]' : 'text-[#888780] dark:text-[#A0A0A0] hover:text-main'}`}
                >
                  <Moon size={12} />
                  <span className="hidden sm:inline text-[10px] md:text-[11px]">{lang === 'en' ? 'Dark' : 'มืด'}</span>
                </button>

                {/* System Mode Button */}
                <button 
                  onClick={() => handleSetThemeMode('system')}
                  className={`flex-grow h-full z-10 flex items-center justify-center gap-1 rounded-full transition-all duration-200 ${theme === 'system' ? 'text-[var(--theme-accent)] font-bold scale-[1.03]' : 'text-[#888780] dark:text-[#A0A0A0] hover:text-main'}`}
                >
                  <Laptop size={12} />
                  <span className="hidden sm:inline text-[10px] md:text-[11px]">{lang === 'en' ? 'System' : 'ระบบ'}</span>
                </button>
              </div>
            }
          />
          <Row 
            icon={Languages} iconBgClass="bg-purple-500/15" iconColorClass="text-purple-600 dark:text-purple-400"
            title={t.language} subtitle={lang === 'th' ? 'ไทย' : 'English'}
            rightElement={<ChevronRight size={20} className="text-[#888780] dark:text-[#A0A0A0]" />}
            onClick={() => setActiveSheet('language')}
          />
          <Row 
            icon={Calendar} iconBgClass="bg-purple-500/15" iconColorClass="text-purple-600 dark:text-purple-400"
            title={t.weekStartTitle} subtitle={settings?.weekStart === 'จันทร์' ? t.monday : (settings?.weekStart === 'อาทิตย์' ? t.sunday : (lang === 'en' ? 'Sunday' : 'อาทิตย์'))}
            rightElement={<ChevronRight size={20} className="text-[#888780] dark:text-[#A0A0A0]" />}
            onClick={() => setActiveSheet('weekStart')}
            isLast
          />
        </SettingsSection>

        {/* Section 2: การแจ้งเตือน */}
        <SettingsSection section={settingSections.notifications}>
          <Row 
            icon={Bell} iconBgClass="bg-amber-500/15" iconColorClass="text-amber-600 dark:text-amber-400"
            title={t.notifyTasks} subtitle={t.notifyTasksSub}
            rightElement={<Toggle checked={settings?.notifyTasks ?? true} onChange={(val) => handleToggle('notifyTasks', val)} />}
          />
          <Row 
            icon={Clock} iconBgClass="bg-amber-500/15" iconColorClass="text-amber-600 dark:text-amber-400"
            title={t.notifyShifts} subtitle={t.notifyShiftsSub}
            rightElement={<Toggle checked={settings?.notifyShifts ?? true} onChange={(val) => handleToggle('notifyShifts', val)} />}
          />
          <Row 
            icon={Flame} iconBgClass="bg-amber-500/15" iconColorClass="text-amber-600 dark:text-amber-400"
            title={t.notifyStreak} subtitle={t.notifyStreakSub}
            rightElement={<Toggle checked={settings?.notifyStreak ?? false} onChange={(val) => handleToggle('notifyStreak', val)} />}
            isLast
          />
        </SettingsSection>

        {/* Section 4: ข้อมูล */}
        <SettingsSection section={settingSections.data}>
          <Row 
            icon={Download} iconBgClass="bg-emerald-500/15" iconColorClass="text-emerald-600 dark:text-emerald-400"
            title={t.exportPdf}
            rightElement={<ChevronRight size={20} className="text-[#888780] dark:text-[#A0A0A0]" />}
            onClick={() => setActiveSheet('exportPdf')}
          />
          <Row 
            icon={Briefcase} iconBgClass="bg-emerald-500/15" iconColorClass="text-emerald-600 dark:text-emerald-400"
            title={t.manageJobs} subtitle={t.manageJobsSub}
            rightElement={<ChevronRight size={20} className="text-[#888780] dark:text-[#A0A0A0]" />}
            onClick={() => setActiveSheet('manageJobs')}
          />
          <Row 
            icon={ShieldCheck} iconBgClass="bg-emerald-500/15" iconColorClass="text-emerald-600 dark:text-emerald-400"
            title={t.socialSecurity} subtitle={t.ssoSub}
            rightElement={<ChevronRight size={20} className="text-[#888780] dark:text-[#A0A0A0]" />}
            onClick={() => navigate('/social-security')}
          />
          <Row 
            icon={RefreshCw} iconBgClass="bg-emerald-500/15" iconColorClass="text-emerald-600 dark:text-emerald-400"
            title={t.resetIncome} subtitle={t.resetIncomeSub}
            rightElement={<ChevronRight size={20} className="text-[#888780] dark:text-[#A0A0A0]" />}
            onClick={() => setActiveSheet('resetIncome')}
          />
          <Row 
            icon={Database} iconBgClass="bg-emerald-500/15" iconColorClass="text-emerald-600 dark:text-emerald-400"
            title={t.storage} 
            subtitle={isCountingStorage ? (
              <div className="h-3 w-32 bg-main/10 animate-pulse rounded mt-1"></div>
            ) : t.storageSub}
            rightElement={<ChevronRight size={20} className="text-[#888780] dark:text-[#A0A0A0]" />}
            onClick={() => {}}
            isLast
          />
        </SettingsSection>

        {/* Section 5: เกี่ยวกับ */}
        <SettingsSection section={settingSections.about}>
          <Row 
            icon={Info} iconBgClass="bg-blue-500/15" iconColorClass="text-blue-600 dark:text-blue-400"
            title={t.version} subtitle={pkg.version || '1.0.0'}
          />
          <Row 
            icon={Star} iconBgClass="bg-purple-500/15" iconColorClass="text-purple-600 dark:text-purple-400"
            title={t.whatsNew} 
            rightElement={<ChevronRight size={20} className="text-[#888780] dark:text-[#A0A0A0]" />}
            onClick={() => setShowChangelog(true)}
          />
          <Row 
            icon={PlayCircle} iconBgClass="bg-blue-500/15" iconColorClass="text-blue-600 dark:text-blue-400"
            title={t.restartTour} 
            rightElement={<ChevronRight size={20} className="text-[#888780] dark:text-[#A0A0A0]" />}
            onClick={() => {
              localStorage.removeItem('tourCompleted');
              window.location.reload();
            }}
            isLast
          />
        </SettingsSection>

        {/* Section 6: Security */}
        <SettingsSection section={settingSections.security}>
          <Row 
            icon={Lock} iconBgClass="bg-amber-500/10" iconColorClass="text-amber-500"
            title={t.changePassword} 
            rightElement={<ChevronRight size={20} className="text-main/30" />}
            onClick={() => setActiveSheet('changePassword')}
            isLast
          />
        </SettingsSection>

        {/* Section 7: Danger Zone */}
        <SettingsSection section={settingSections.danger} danger>
          <Row 
            icon={Trash2} iconBgClass="bg-transparent" iconColorClass="text-red-500"
            title={<span className="text-red-500 font-bold">{t.deleteAll}</span>} 
            rightElement={<ChevronRight size={20} className="text-red-500/50" />}
            onClick={() => setDeleteConfirmStep(1)}
          />
          <Row 
            icon={UserX} iconBgClass="bg-transparent" iconColorClass="text-red-500"
            title={<span className="text-red-500 font-bold">{t.deleteAccount}</span>}
            rightElement={<ChevronRight size={20} className="text-red-500/50" />}
            onClick={() => setDeleteAccountStep(1)}
          />
          <Row 
            icon={LogOut} iconBgClass="bg-transparent" iconColorClass="text-red-500"
            title={<span className="text-red-500 font-bold">{t.logout}</span>}
            rightElement={<ChevronRight size={20} className="text-red-500/50" />}
            onClick={handleLogout}
            isLast
          />
        </SettingsSection>

      </motion.div>

      {/* Manage Jobs Sheet */}
      <ActionSheet isOpen={activeSheet === 'manageJobs'} onClose={() => setActiveSheet(null)} title={t.manageJobs}>
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto px-1">
          {(settings?.jobs || []).map(job => (
            <div 
              key={job.id} 
              onClick={() => {
                setEditingJob(job);
                setJobFormData(job);
                setActiveSheet('editJob');
              }}
              className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl bg-${job.color}-500/20 text-xl border border-${job.color}-500/30`}>
                  {job.emoji || '🏢'}
                </div>
                <div>
                  <p className="font-bold text-main">{job.name}</p>
                  <p className="text-xs text-main opacity-60">
                    {job.deductSSO ? (lang === 'en' ? 'Deducts SSO' : 'หักประกันสังคม') : (lang === 'en' ? 'No SSO' : 'ไม่หักประกันสังคม')}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-main opacity-50" />
            </div>
          ))}
          {(settings?.jobs || []).length === 0 && (
             <div className="text-center py-6 opacity-50 text-sm">
               {lang === 'en' ? 'No jobs added yet' : 'ยังไม่ได้เพิ่มบริษัท'}
             </div>
          )}
          <button 
            onClick={() => {
              setEditingJob(null);
              setJobFormData({ id: Date.now().toString(), name: '', emoji: '', color: 'blue', deductSSO: false });
              setActiveSheet('editJob');
            }}
            className="w-full mt-2 py-4 bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-500/20 transition-colors"
          >
            <Plus size={20} /> {t.addJob}
          </button>
        </div>
      </ActionSheet>

      {/* Edit Job Sheet */}
      <ActionSheet isOpen={activeSheet === 'editJob'} onClose={() => setActiveSheet('manageJobs')} title={editingJob ? t.manageJobs : t.addJob}>
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto px-1">
          <div>
            <label className="block text-sm font-bold text-main mb-2 opacity-80">{t.jobEmoji} <span className="font-normal opacity-70 text-xs">(เช่น 🍕 หรือ 🏥)</span></label>
            <input 
              type="text" 
              value={jobFormData.emoji} 
              onChange={e => setJobFormData({...jobFormData, emoji: e.target.value})} 
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main bg-black/5 dark:bg-white/10 text-2xl" 
              placeholder="🏢" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-main mb-2 opacity-80">{t.jobName}</label>
            <input 
              type="text" 
              value={jobFormData.name} 
              onChange={e => setJobFormData({...jobFormData, name: e.target.value})} 
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main bg-black/5 dark:bg-white/10" 
              placeholder="ชื่อบริษัท/ร้าน" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-main mb-2 opacity-80">{t.jobColor}</label>
            <div className="flex gap-3 flex-wrap">
              {['blue', 'red', 'green', 'amber', 'purple', 'pink'].map(color => (
                <button 
                  key={color}
                  onClick={() => setJobFormData({...jobFormData, color})}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${JOB_BG_COLORS[color]} ${jobFormData.color === color ? 'ring-4 ring-offset-2 ring-primary-500 dark:ring-offset-[#1a1a2e] scale-110' : 'hover:scale-105'}`}
                >
                  {jobFormData.color === color && <Check size={16} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-transparent mt-2">
            <div>
              <p className="font-bold text-main">{t.socialSecurity}</p>
              <p className="text-xs text-main opacity-60">{t.ssoSub}</p>
            </div>
            <Toggle checked={jobFormData.deductSSO} onChange={v => setJobFormData({...jobFormData, deductSSO: v})} />
          </div>
          
          <div className="flex gap-3 mt-4">
            {editingJob && (
               <button 
                 onClick={() => {
                   if (window.confirm(lang === 'en' ? 'Delete this job?' : 'ลบบริษัทนี้ใช่หรือไม่?')) {
                     const newJobs = (settings?.jobs || []).filter(j => j.id !== editingJob.id);
                     updateSettings({ jobs: newJobs });
                     setActiveSheet('manageJobs');
                   }
                 }}
                 className="py-4 px-4 bg-red-500/10 text-red-500 rounded-xl font-bold flex items-center justify-center hover:bg-red-500/20"
               >
                 <Trash2 size={20} />
               </button>
            )}
            <button 
              disabled={!jobFormData.name}
              onClick={() => {
                let newJobs = [...(settings?.jobs || [])];
                if (editingJob) {
                  newJobs = newJobs.map(j => j.id === editingJob.id ? jobFormData : j);
                } else {
                  newJobs.push({ ...jobFormData, id: Date.now().toString() });
                }
                updateSettings({ jobs: newJobs });
                setActiveSheet('manageJobs');
              }}
              className="flex-1 py-4 bg-primary-500 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 disabled:opacity-50"
            >
              {t.saveJob}
            </button>
          </div>
        </div>
      </ActionSheet>

      
      {/* Theme Picker Sheet */}
      <ActionSheet isOpen={activeSheet === 'themePicker'} onClose={() => setActiveSheet(null)} title={t.themeColor}>
        <div className="grid grid-cols-2 gap-3 pb-4 max-h-[60vh] overflow-y-auto">
          {Object.values(themes).map(th => {
            const isActive = currentTheme.id === th.id;
            return (
              <button 
                key={th.id} 
                onClick={() => setTheme(th.id)}
                className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${isActive ? 'border-[var(--theme-accent)] bg-black/5 dark:bg-white/5' : 'border-transparent bg-black/5 dark:bg-white/5 hover:border-[var(--theme-accent-border)]'}`}
              >
                <div 
                  className="w-full h-12 rounded-xl mb-3 shadow-sm border border-white/20"
                  style={{ background: th.gradient }}
                />
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${isActive ? 'text-[var(--theme-accent)]' : 'text-[#1a1a2e] dark:text-white'}`}>{th.name}</span>
                  {isActive && <Check size={16} className="text-[var(--theme-accent)]" />}
                </div>
                {th.forceDark && (
                  <span className="text-[10px] mt-1 text-gray-500">
                    {lang === 'en' ? 'Auto Dark Mode' : 'ใช้ร่วมกับ Dark Mode อัตโนมัติ'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ActionSheet>


      {/* Language Sheet */}
      <ActionSheet isOpen={activeSheet === 'language'} onClose={() => setActiveSheet(null)} title={t.selectLang}>
        <div className="space-y-2">
          {['th', 'en'].map(l => (
            <button 
              key={l} onClick={() => handleSetLanguage(l)}
              className="w-full p-4 rounded-[16px] bg-black/5 dark:bg-white/5 flex items-center justify-between active:bg-black/10 transition-colors"
            >
              <span className="font-bold text-[#1a1a2e] dark:text-white">{l === 'th' ? t.thai : t.english}</span>
              {lang === l && <Check size={20} className="text-[var(--theme-section-label)] dark:text-[#AFA9EC]" />}
            </button>
          ))}
        </div>
      </ActionSheet>

      {/* Week Start Sheet */}
      <ActionSheet isOpen={activeSheet === 'weekStart'} onClose={() => setActiveSheet(null)} title={t.weekStartTitle}>
        <div className="space-y-2">
          {['อาทิตย์', 'จันทร์'].map(day => (
            <button 
              key={day} onClick={() => handleSetWeekStart(day)}
              className="w-full p-4 rounded-[16px] bg-black/5 dark:bg-white/5 flex items-center justify-between active:bg-black/10 transition-colors"
            >
              <span className="font-bold text-[#1a1a2e] dark:text-white">{day === 'อาทิตย์' ? t.sunday : t.monday}</span>
              {settings?.weekStart === day && <Check size={20} className="text-[var(--theme-section-label)] dark:text-[#AFA9EC]" />}
            </button>
          ))}
        </div>
      </ActionSheet>

      {/* Reset Income Sheet */}
      <ActionSheet isOpen={activeSheet === 'resetIncome'} onClose={() => { setActiveSheet(null); setResetConfirmText(''); }} title={t.resetConfirmTitle}>
        <div className="text-center mb-6">
          <p className="text-red-500 font-bold mb-2">{t.warning}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t.resetWarnText}
          </p>
        </div>
        <input 
          type="text" 
          value={resetConfirmText}
          onChange={e => setResetConfirmText(e.target.value)}
          placeholder={t.typeConfirm}
          className="w-full px-4 py-3 rounded-[16px] bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 text-center font-bold text-[#1a1a2e] dark:text-white"
        />
        <button
          disabled={resetConfirmText !== t.confirmWord || isResetting}
          onClick={handleResetIncome}
          className="w-full py-4 bg-red-500 text-white font-bold rounded-[16px] disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {isResetting ? t.deleting : t.deleteBtn}
        </button>
      </ActionSheet>

      {/* Delete All Data Triple Confirm */}
      <ConfirmDialog 
        isOpen={deleteConfirmStep === 1}
        title={t.deleteAllTitle}
        message={t.deleteAllMsg}
        confirmText={t.continue}
        cancelText={t.cancel}
        isDanger={true}
        onConfirm={() => setDeleteConfirmStep(2)}
        onCancel={() => setDeleteConfirmStep(0)}
      />

      <ActionSheet isOpen={deleteConfirmStep === 2} onClose={() => { setDeleteConfirmStep(0); setDeleteConfirmText(''); }} title={t.finalConfirm}>
         <div className="text-center mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {lang === 'en' ? (
              <>Please type <strong>{user?.displayName}</strong> to confirm deleting all data</>
            ) : (
              <>โปรดพิมพ์ชื่อ <strong>{user?.displayName}</strong> เพื่อยืนยันการลบข้อมูลทั้งหมด</>
            )}
          </p>
        </div>
        <input 
          type="text" 
          value={deleteConfirmText}
          onChange={e => setDeleteConfirmText(e.target.value)}
          placeholder={`${t.type} '${user?.displayName}'`}
          className="w-full px-4 py-3 rounded-[16px] bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 text-center font-bold text-[#1a1a2e] dark:text-white"
        />
        <button
          disabled={deleteConfirmText !== user?.displayName || isDeleting}
          onClick={handleDeleteData}
          className="w-full py-4 bg-red-500 text-white font-bold rounded-[16px] disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {isDeleting ? t.deleting : t.deletePerm}
        </button>
      </ActionSheet>

      {/* Delete Account Sheets */}
      <ActionSheet isOpen={deleteAccountStep === 1} onClose={() => setDeleteAccountStep(0)} title={t.deleteAccountTitle}>
        <div className="flex flex-col items-center p-4 pt-0">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <UserX size={32} className="text-red-500" />
          </div>
          <p className="text-center text-main mb-6 opacity-80 leading-relaxed font-medium">
            {t.deleteAccountMsg}
          </p>
          <div className="flex w-full gap-3">
            <button 
              onClick={() => setDeleteAccountStep(0)}
              className="flex-1 py-3.5 rounded-[16px] font-bold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
            >
              {t.cancel}
            </button>
            <button 
              onClick={() => setDeleteAccountStep(2)}
              className="flex-1 py-3.5 rounded-[16px] font-bold bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
            >
              {t.continue}
            </button>
          </div>
        </div>
      </ActionSheet>

      <ActionSheet isOpen={deleteAccountStep === 2} onClose={() => { setDeleteAccountStep(0); setDeleteAccountText(''); }} title={t.finalConfirm}>
        <div className="p-4 pt-0">
          <p className="text-center text-main mb-4 opacity-80 text-sm font-medium">
            {t.type} <span className="font-bold text-red-500 select-all">"{user?.displayName}"</span> {lang === 'en' ? 'to confirm' : 'เพื่อยืนยัน'}
          </p>
          <input
            type="text"
            value={deleteAccountText}
            onChange={(e) => setDeleteAccountText(e.target.value)}
            placeholder={user?.displayName || ''}
            className="w-full bg-black/5 dark:bg-[#1a1a2e] border border-main/10 rounded-[16px] px-4 py-3.5 outline-none focus:border-red-500 transition-colors mb-6 text-center font-bold text-main"
          />
          <button 
            disabled={deleteAccountText !== user?.displayName || isDeletingAccount}
            onClick={handleDeleteAccount}
            className={`w-full py-3.5 rounded-[16px] font-bold flex items-center justify-center gap-2 transition-all ${
              deleteAccountText === user?.displayName && !isDeletingAccount 
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600' 
                : 'bg-black/5 dark:bg-white/10 text-main opacity-50 cursor-not-allowed'
            }`}
          >
            {isDeletingAccount ? <RefreshCw size={20} className="animate-spin" /> : <UserX size={20} />}
            {isDeletingAccount ? t.deleting : t.deleteAccount}
          </button>
        </div>
      </ActionSheet>

      {/* Change Password Sheet */}
      <ActionSheet isOpen={activeSheet === 'changePassword'} onClose={() => setActiveSheet(null)} title={t.changePassword}>
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto px-1">
          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-main mb-2 opacity-80">{lang === 'en' ? 'New Password' : 'เปลี่ยนรหัสผ่านใหม่ (New Password)'}</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-main bg-black/5 dark:bg-white/10"
                placeholder={lang === 'en' ? "At least 6 characters" : "รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร"}
              />
            </div>
            <button 
              type="submit"
              disabled={isChangingPassword || newPassword.length < 6}
              className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 disabled:opacity-50 transition-all hover:bg-amber-600"
            >
              {isChangingPassword ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              {t.changePassword}
            </button>
          </form>

          <button
            type="button"
            onClick={handleResetPasswordEmail}
            disabled={sendingReset}
            className="mt-2 text-sm flex items-center justify-center gap-2 text-main opacity-70 hover:opacity-100 transition-opacity font-medium py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
          >
            {sendingReset ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            {lang === 'en' ? 'Forgot password? Send reset link' : 'ลืมรหัสผ่าน? ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมล'}
          </button>
        </div>
      </ActionSheet>

      {/* Export PDF Sheet */}
      <ActionSheet isOpen={activeSheet === 'exportPdf'} onClose={() => setActiveSheet(null)} title={t.exportPdf}>
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto px-1">
          <p className="text-sm text-center text-main opacity-70 mb-2">
            {lang === 'en' ? 'Select month to export as PDF statement.' : 'เลือกเดือนที่ต้องการสรุปเป็นเอกสาร PDF'}
          </p>
          <div>
            <label className="block text-sm font-bold text-main mb-2 opacity-80">
              {lang === 'en' ? 'Month' : 'ประจำเดือน'}
            </label>
            <input 
              type="month" 
              value={exportMonth} 
              onChange={e => setExportMonth(e.target.value)} 
              onClick={e => e.currentTarget.showPicker && e.currentTarget.showPicker()}
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main bg-black/5 dark:bg-white/10"
            />
          </div>
          <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl flex justify-between items-center">
            <span className="text-sm font-medium text-main opacity-80">{lang === 'en' ? 'Found' : 'พบข้อมูล'}</span>
            <span className="font-bold text-primary-500">{exportData.shiftsList.length} {lang === 'en' ? 'records' : 'รายการ'}</span>
          </div>
          <button 
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="w-full mt-4 py-4 bg-primary-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30 disabled:opacity-50 transition-all"
          >
            {isExportingPdf ? (
               <><RefreshCw size={20} className="animate-spin" /> {lang === 'en' ? 'Generating...' : 'กำลังสร้าง...'}</>
            ) : (
               <><Download size={20} /> {lang === 'en' ? 'Download PDF' : 'ดาวน์โหลดเอกสาร'}</>
            )}
          </button>
        </div>
        {/* Hidden PDF Component */}
        <div style={{ position: 'fixed', left: '-10000px', top: 0 }}>
          <PdfStatement 
            ref={pdfRef}
            month={exportMonth}
            summary={exportData.summary}
            shiftsList={exportData.shiftsList}
            user={user}
          />
        </div>
      </ActionSheet>

      {/* Changelog Modal */}
      <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} lang={lang} />
    </motion.div>
  );
}
