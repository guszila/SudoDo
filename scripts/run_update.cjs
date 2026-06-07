const fs = require('fs');

const filepath = 'src/pages/PartTimePage.jsx';
let content = fs.readFileSync(filepath, 'utf-8');

// Add imports
content = content.replace("import { DollarSign, Clock, CheckCircle2, Plus, ArrowLeft, Trash2, CalendarDays, History, Edit } from 'lucide-react';", 
"import { DollarSign, Clock, CheckCircle2, Plus, ArrowLeft, Trash2, CalendarDays, History, Edit, Target, X, Settings, List, LayoutGrid, BarChart2, PieChart } from 'lucide-react';\nimport { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';");

// Add state
const state_code = `
  const [enabledWidgets, setEnabledWidgets] = useState(() => {
    const saved = localStorage.getItem('income_dashboard');
    return saved ? JSON.parse(saved) : ['total_sso_net', 'expense_list', 'goal', 'earned', 'expected'];
  });
  const [isEditWidgetMode, setIsEditWidgetMode] = useState(false);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  
  const [incomeGoal, setIncomeGoal] = useState(() => {
    const saved = localStorage.getItem('income_goal');
    return saved ? JSON.parse(saved) : { goalAmount: 5000, goalMonth: new Date().toISOString().slice(0, 7), isRecurring: true };
  });
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempGoal, setTempGoal] = useState({ goalAmount: 5000, goalMonth: new Date().toISOString().slice(0, 7), isRecurring: true });

  React.useEffect(() => {
    localStorage.setItem('income_dashboard', JSON.stringify(enabledWidgets));
  }, [enabledWidgets]);

  React.useEffect(() => {
    localStorage.setItem('income_goal', JSON.stringify(incomeGoal));
  }, [incomeGoal]);
`;
content = content.replace("const [expenseFormData, setExpenseFormData] = useState({", state_code + "\n  const [expenseFormData, setExpenseFormData] = useState({");

// Replace stats
const old_stats = `  const stats = useMemo(() => {
    let earned = 0;
    let pending = 0;
    let ssoDeducted = 0;
    
    Object.values(monthlyGross.earned).forEach(v => earned += v);
    Object.values(monthlyGross.pending).forEach(v => pending += v);
    
    tasks.forEach(t => {
      if (!t.isExpense) return;
      
      const isCompleted = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
      
      let amt = 0;
      if (t.isPercentage) {
        const d = new Date(t.start);
        const monthKey = !isNaN(d.getTime()) ? \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}\` : null;
        
        const monthEarned = monthKey ? (monthlyGross.earned[monthKey] || 0) : 0;
        const monthPending = monthKey ? (monthlyGross.pending[monthKey] || 0) : 0;
        const percentage = Number(t.amount) || 0;
        
        amt = (monthEarned + monthPending) * (percentage / 100);
      } else {
        amt = Number(t.amount) || 0;
      }
      
      if (isCompleted) {
        earned -= amt;
      } else {
        pending -= amt;
      }
    });

    if (settings.socialSecurity) {
      const allMonths = new Set([...Object.keys(monthlyGross.earned), ...Object.keys(monthlyGross.pending)]);
      allMonths.forEach(monthKey => {
        const mEarned = monthlyGross.earned[monthKey] || 0;
        const mPending = monthlyGross.pending[monthKey] || 0;
        const mGross = mEarned + mPending;
        if (mGross > 0) {
           const { deduction } = calcSSO(mGross);
           ssoDeducted += deduction;
        }
      });
    }

    return { 
      earned: Math.round(earned), 
      pending: Math.round(pending), 
      total: Math.round(earned + pending),
      ssoDeducted: Math.round(ssoDeducted),
      netTotal: Math.round(earned + pending - ssoDeducted)
    };
  }, [tasks, monthlyGross, settings.socialSecurity]);`;

const new_stats = `  const stats = useMemo(() => {
    let earned = 0;
    let pending = 0;
    let ssoDeducted = 0;
    let expenseTotal = 0;
    
    Object.values(monthlyGross.earned).forEach(v => earned += v);
    Object.values(monthlyGross.pending).forEach(v => pending += v);
    
    tasks.forEach(t => {
      if (!t.isExpense) return;
      
      let amt = 0;
      if (t.isPercentage) {
        const d = new Date(t.start);
        const monthKey = !isNaN(d.getTime()) ? \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}\` : null;
        const monthEarned = monthKey ? (monthlyGross.earned[monthKey] || 0) : 0;
        const monthPending = monthKey ? (monthlyGross.pending[monthKey] || 0) : 0;
        const percentage = Number(t.amount) || 0;
        amt = (monthEarned + monthPending) * (percentage / 100);
      } else {
        amt = Number(t.amount) || 0;
      }
      
      expenseTotal += amt;
    });

    if (settings.socialSecurity) {
      const allMonths = new Set([...Object.keys(monthlyGross.earned), ...Object.keys(monthlyGross.pending)]);
      allMonths.forEach(monthKey => {
        const mEarned = monthlyGross.earned[monthKey] || 0;
        const mPending = monthlyGross.pending[monthKey] || 0;
        const mGross = mEarned + mPending;
        if (mGross > 0) {
           const { deduction } = calcSSO(mGross);
           ssoDeducted += deduction;
        }
      });
    }

    return { 
      earned: Math.round(earned), 
      pending: Math.round(pending), 
      total: Math.round(earned + pending),
      ssoDeducted: Math.round(ssoDeducted),
      expenseTotal: Math.round(expenseTotal),
      netTotal: Math.round(earned + pending - ssoDeducted - expenseTotal)
    };
  }, [tasks, monthlyGross, settings.socialSecurity]);

  const extraStats = useMemo(() => {
    let shiftCount = 0;
    let totalHours = 0;
    
    tasks.forEach(t => {
      if (t.isExpense) return;
      shiftCount++;
      let hours = 0;
      if (t.actualStart && t.actualEnd) {
        hours = (new Date(t.actualEnd) - new Date(t.actualStart)) / (1000 * 60 * 60);
      } else {
        hours = (new Date(t.end) - new Date(t.start)) / (1000 * 60 * 60);
      }
      if (hours > 0) totalHours += hours;
    });
    
    const allMonths = new Set([...Object.keys(monthlyGross.earned), ...Object.keys(monthlyGross.pending)]);
    const chartData = Array.from(allMonths).sort().map(month => {
      const parts = month.split('-');
      const d = new Date(parts[0], parseInt(parts[1]) - 1);
      return {
        name: format(d, 'MMM', { locale: th }),
        earned: monthlyGross.earned[month] || 0,
        expected: monthlyGross.pending[month] || 0
      };
    }).slice(-6);
    
    return { shiftCount, totalHours: Math.round(totalHours), chartData };
  }, [tasks, monthlyGross]);

  const expensesList = useMemo(() => tasks.filter(t => t.isExpense), [tasks]);

  const removeWidget = (id) => {
    setEnabledWidgets(prev => prev.filter(w => w !== id));
  };
  
  const AVAILABLE_WIDGETS = [
    { id: 'net', label: 'รายได้สุทธิ (Net Income)' },
    { id: 'earned', label: 'รายได้ที่ได้แล้ว (Earned)' },
    { id: 'expected', label: 'คาดว่าได้รับ (Expected)' },
    { id: 'total_sso_net', label: 'รายได้รวม & หักประกันสังคม' },
    { id: 'expense_list', label: 'รายจ่ายทั้งหมด (Expense List)' },
    { id: 'goal', label: 'เป้าหมายรายได้ (Income Goal)' },
    { id: 'shift_count', label: 'จำนวนกะ (Shift Count)' },
    { id: 'total_hours', label: 'ชั่วโมงรวม (Total Hours)' },
    { id: 'chart', label: 'กราฟรายเดือน (Monthly Chart)' }
  ];

  const renderWidgetContent = (id) => {
    switch(id) {
      case 'net':
        return (
          <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-purple-500 h-full">
            <p className="text-xs text-main opacity-70 font-medium mb-1">รายได้สุทธิ (Net Income)</p>
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">฿{stats.netTotal.toLocaleString()}</span>
          </div>
        );
      case 'earned':
        return (
          <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-green-500 h-full">
            <p className="text-xs text-main opacity-70 font-medium mb-1">{t.earned}</p>
            <span className="text-2xl font-bold text-green-500">฿{stats.earned.toLocaleString()}</span>
          </div>
        );
      case 'expected':
        return (
          <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-amber-500 h-full">
            <p className="text-xs text-main opacity-70 font-medium mb-1">{t.expected}</p>
            <span className="text-xl font-bold text-amber-500">฿{stats.pending.toLocaleString()}</span>
          </div>
        );
      case 'shift_count':
        return (
          <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-blue-500 h-full">
            <p className="text-xs text-main opacity-70 font-medium mb-1">จำนวนกะรวม</p>
            <span className="text-2xl font-bold text-blue-500">{extraStats.shiftCount} กะ</span>
          </div>
        );
      case 'total_hours':
        return (
          <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-indigo-500 h-full">
            <p className="text-xs text-main opacity-70 font-medium mb-1">ชั่วโมงทำงานรวม</p>
            <span className="text-2xl font-bold text-indigo-500">{extraStats.totalHours} ชม.</span>
          </div>
        );
      case 'chart':
        return (
          <div className="col-span-2 liquid-glass-card p-4 flex flex-col justify-center h-48 border-l-4 border-l-pink-500">
             <p className="text-xs text-main opacity-70 font-medium mb-2">กราฟรายได้รายเดือน</p>
             {extraStats.chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={extraStats.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{fontSize: 10, fill: 'var(--color-main)'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 10, fill: 'var(--color-main)'}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'rgba(0,0,0,0.1)'}} contentStyle={{borderRadius: '12px', border: 'none', background: 'var(--glass-bg)'}} />
                    <Bar dataKey="earned" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="expected" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="flex-1 flex items-center justify-center text-sm opacity-50">ไม่มีข้อมูล</div>
             )}
          </div>
        );
      case 'total_sso_net':
        return (
          <div className="col-span-2 liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-primary-500 border border-dashed border-main/20">
            <div className="flex justify-between items-center mb-1">
               <p className="text-sm text-main opacity-70 font-medium">{t.total} (ก่อนหัก)</p>
               <span className="text-2xl font-bold text-primary-500">฿{stats.total.toLocaleString()}</span>
            </div>
            {settings.socialSecurity && settings.showInIncome && (
               <div className="flex justify-between items-center mb-1 border-t border-main/10 pt-2 mt-2">
                 <p className="text-sm text-red-600 dark:text-red-400 opacity-90 font-medium">{lang === 'th' ? 'หักประกันสังคม (-5%)' : 'SSO Deduction (-5%)'}</p>
                 <span className="text-lg font-bold text-red-600 dark:text-red-400">-฿{stats.ssoDeducted.toLocaleString()}</span>
               </div>
            )}
            <div className="flex justify-between items-center mb-1 border-t border-main/10 pt-2 mt-2">
                 <p className="text-sm text-red-600 dark:text-red-400 opacity-90 font-medium">รวมรายจ่ายอื่นๆ</p>
                 <span className="text-lg font-bold text-red-600 dark:text-red-400">-฿{stats.expenseTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mt-2 bg-purple-500/10 p-2 rounded-xl">
               <p className="text-sm text-purple-600 dark:text-purple-400 font-bold">{lang === 'th' ? 'รายได้สุทธิ' : 'Net Income'}</p>
               <span className="text-xl font-bold text-purple-600 dark:text-purple-400">฿{stats.netTotal.toLocaleString()}</span>
            </div>
          </div>
        );
      case 'expense_list':
        return (
          <div className="col-span-2 liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-red-500">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-bold text-main flex items-center gap-2"><List size={16}/> รายจ่ายทั้งหมด</p>
              <span className="text-sm font-bold text-red-500">-฿{stats.expenseTotal.toLocaleString()}</span>
            </div>
            {expensesList.length === 0 ? (
              <p className="text-xs text-center opacity-50 py-2">ไม่มีรายการรายจ่าย</p>
            ) : (
              <div className="space-y-2">
                {expensesList.map(exp => {
                   let amt = 0;
                   if (exp.isPercentage) {
                     const d = new Date(exp.start);
                     const monthKey = !isNaN(d.getTime()) ? \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}\` : null;
                     const monthEarned = monthKey ? (monthlyGross.earned[monthKey] || 0) : 0;
                     const monthPending = monthKey ? (monthlyGross.pending[monthKey] || 0) : 0;
                     amt = (monthEarned + monthPending) * (Number(exp.amount) / 100);
                   } else {
                     amt = Number(exp.amount) || 0;
                   }
                   return (
                     <div key={exp.id} className="flex justify-between items-center p-2 bg-main/5 rounded-lg">
                       <div>
                         <p className="text-sm font-medium">{exp.title}</p>
                         <p className="text-[10px] opacity-60">{exp.isPercentage ? \`\${exp.amount}% ของรายได้\` : fDate(exp.start)}</p>
                       </div>
                       <span className="text-sm font-bold text-red-500">-฿{amt.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                     </div>
                   );
                })}
              </div>
            )}
          </div>
        );
      case 'goal':
        const currentIncome = stats.earned;
        const progress = Math.min(100, Math.round((currentIncome / incomeGoal.goalAmount) * 100)) || 0;
        const diff = incomeGoal.goalAmount - currentIncome;
        return (
          <div className="col-span-2 liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-sky-500 relative overflow-hidden">
            <div className="flex justify-between items-center mb-2 relative z-10">
               <p className="text-sm font-bold text-main flex items-center gap-2"><Target size={16}/> เป้าหมายเดือนนี้</p>
               <button onClick={(e) => { e.stopPropagation(); setTempGoal(incomeGoal); setShowGoalModal(true); setIsEditWidgetMode(false); }} className="text-sky-500 hover:bg-sky-500/10 p-1.5 rounded-full transition-colors"><Edit size={14}/></button>
            </div>
            <p className="text-xs opacity-70 mb-2 relative z-10">฿{currentIncome.toLocaleString()} / ฿{incomeGoal.goalAmount.toLocaleString()}</p>
            <div className="w-full bg-main/10 rounded-full h-3 mb-2 overflow-hidden relative z-10">
               <div className="bg-sky-500 h-3 rounded-full transition-all duration-1000" style={{ width: \`\${progress}%\` }}></div>
            </div>
            <div className="flex justify-between items-center text-xs relative z-10">
               <span className="font-medium">
                 {diff > 0 ? \`เหลืออีก ฿\${diff.toLocaleString()} ถึงเป้า\` : diff === 0 ? \`🎉 ทำได้ตามเป้าแล้ว!\` : \`🔥 เกินเป้า ฿\${Math.abs(diff).toLocaleString()}\`}
               </span>
               <span className="font-bold text-sky-500">{progress}%</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };`;
content = content.replace(old_stats, new_stats);


const old_dashboard = `      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-green-500">
          <p className="text-xs text-main opacity-70 font-medium mb-1">{t.earned}</p>
          <span className="text-2xl font-bold text-green-500">฿{stats.earned.toLocaleString()}</span>
        </div>
        <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-amber-500">
          <p className="text-xs text-main opacity-70 font-medium mb-1">{t.expected}</p>
          <span className="text-xl font-bold text-amber-500">฿{stats.pending.toLocaleString()}</span>
        </div>
        <div className="col-span-2 liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-primary-500 border border-dashed border-main/20">
          <div className="flex justify-between items-center mb-1">
             <p className="text-sm text-main opacity-70 font-medium">{t.total}</p>
             <span className="text-2xl font-bold text-primary-500">฿{stats.total.toLocaleString()}</span>
          </div>
          {settings.socialSecurity && settings.showInIncome && (
             <>
               <div className="flex justify-between items-center mb-1 border-t border-main/10 pt-2 mt-2">
                 <p className="text-sm text-red-600 dark:text-red-400 opacity-90 font-medium">{lang === 'th' ? 'หักประกันสังคม (-5%)' : 'SSO Deduction (-5%)'}</p>
                 <span className="text-lg font-bold text-red-600 dark:text-red-400">-฿{stats.ssoDeducted.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center">
                 <p className="text-sm text-purple-600 dark:text-purple-400 font-bold">{lang === 'th' ? 'รายได้สุทธิ' : 'Net Income'}</p>
                 <span className="text-xl font-bold text-purple-600 dark:text-purple-400">฿{stats.netTotal.toLocaleString()}</span>
               </div>
             </>
          )}
        </div>
      </div>`;

const new_dashboard = `      <div className="flex justify-between items-center mb-4 px-2 mt-2">
        <h2 className="font-bold text-lg text-main">ภาพรวมรายได้</h2>
        <button 
          onClick={() => setIsEditWidgetMode(!isEditWidgetMode)} 
          className={\`text-sm px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 \${isEditWidgetMode ? 'bg-primary-500 text-white shadow-md' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'}\`}
        >
          {isEditWidgetMode ? 'เสร็จสิ้น' : <><Settings size={14}/> แก้ไข Widget</>}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <AnimatePresence>
          {enabledWidgets.map(id => (
            <motion.div 
              key={id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isEditWidgetMode ? {
                 opacity: 1, 
                 scale: 1, 
                 rotate: [-0.8, 0.8, -0.8],
                 transition: { rotate: { repeat: Infinity, duration: 0.2 } }
              } : { opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className={\`relative \${['total_sso_net', 'expense_list', 'goal', 'chart'].includes(id) ? 'col-span-2' : ''}\`}
            >
              {isEditWidgetMode && (
                <button 
                  onClick={() => removeWidget(id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg z-20 hover:scale-110 transition-transform"
                >
                  <X size={14} />
                </button>
              )}
              {renderWidgetContent(id)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {isEditWidgetMode && (
         <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-8">
           <button 
             onClick={() => setShowWidgetSelector(true)}
             className="w-full py-4 border-2 border-dashed border-main/20 rounded-2xl flex items-center justify-center gap-2 text-main/60 hover:text-main hover:border-main/40 transition-colors bg-white/10"
           >
             <Plus size={20} /> เพิ่ม Widget
           </button>
           <p className="text-center text-xs opacity-50 mt-2">แตะ ✕ เพื่อลบ Widget ออกจากหน้าจอ</p>
         </motion.div>
      )}

      {!isEditWidgetMode && <div className="mb-8" />}`;

content = content.replace(old_dashboard, new_dashboard);

// Add Modals before TaskModal
const modals = `      {/* Widget Selector Bottom Sheet */}
      <AnimatePresence>
        {showWidgetSelector && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setShowWidgetSelector(false)}
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 liquid-glass-card rounded-b-none border-x-0 border-b-0 shadow-2xl p-6 max-h-[80vh] overflow-y-auto max-w-4xl mx-auto"
            >
              <div className="w-12 h-1.5 bg-black/10 dark:bg-white/20 rounded-full mx-auto mb-6" />
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><LayoutGrid size={20}/> เลือก Widget ที่ต้องการแสดง</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_WIDGETS.map(w => {
                  const isEnabled = enabledWidgets.includes(w.id);
                  return (
                    <button 
                      key={w.id}
                      disabled={isEnabled}
                      onClick={() => {
                        setEnabledWidgets(prev => [...prev, w.id]);
                        setShowWidgetSelector(false);
                      }}
                      className={\`p-4 rounded-xl flex items-center gap-3 text-left transition-all \${isEnabled ? 'bg-green-500/10 border-2 border-green-500 text-green-600 dark:text-green-400 opacity-60' : 'bg-white/20 border-2 border-transparent hover:border-primary-500/50 text-main'}\`}
                    >
                      <div className="flex-1 font-medium">{w.label}</div>
                      {isEnabled && <CheckCircle2 size={16} />}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setShowWidgetSelector(false)} className="w-full mt-6 py-4 bg-black/5 dark:bg-white/10 rounded-xl font-bold">ปิด</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Income Goal Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowGoalModal(false)} />
             <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="liquid-glass-card p-6 w-full max-w-md relative z-10 border-2 border-sky-500/30">
               <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-sky-500"><Target size={24}/> ตั้งเป้าหมายรายได้</h3>
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium opacity-80 mb-1">เป้าหมายรายได้ (บาท/เดือน)</label>
                   <input 
                     type="number" 
                     value={tempGoal.goalAmount} 
                     onChange={e => setTempGoal({...tempGoal, goalAmount: Number(e.target.value)})}
                     className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-black/5 dark:bg-white/10 font-bold text-xl text-main"
                   />
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {[3000, 5000, 10000, 15000].map(amt => (
                     <button key={amt} onClick={() => setTempGoal({...tempGoal, goalAmount: amt})} className="px-3 py-1.5 bg-sky-500/10 text-sky-500 rounded-full text-sm font-medium hover:bg-sky-500/20 transition-colors">
                       ฿{amt.toLocaleString()}
                     </button>
                   ))}
                 </div>
                 <label className="flex items-center gap-2 mt-4 cursor-pointer">
                   <input type="checkbox" checked={tempGoal.isRecurring} onChange={e => setTempGoal({...tempGoal, isRecurring: e.target.checked})} className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500" />
                   <span className="text-sm font-medium">ใช้เป้าหมายนี้ทุกเดือน</span>
                 </label>
                 
                 <div className="flex gap-3 mt-6">
                   <button onClick={() => setShowGoalModal(false)} className="flex-1 py-3 bg-black/5 dark:bg-white/10 rounded-xl font-bold">ยกเลิก</button>
                   <button 
                     onClick={() => {
                       setIncomeGoal(tempGoal);
                       setShowGoalModal(false);
                     }} 
                     className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-bold shadow-lg shadow-sky-500/30"
                   >
                     บันทึก
                   </button>
                 </div>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
`;

content = content.replace("<TaskModal", modals + "\n      <TaskModal");

fs.writeFileSync('src/pages/PartTimePage.jsx', content, 'utf-8');
console.log("Done");
