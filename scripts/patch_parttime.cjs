const fs = require('fs');

const path = 'src/pages/PartTimePage.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add confetti import
content = content.replace(
  "import { translations } from '../i18n';",
  "import { translations } from '../i18n';\nimport confetti from 'canvas-confetti';"
);

// 2. Add Flame to lucide-react import
content = content.replace(
  "GripHorizontal } from 'lucide-react';",
  "GripHorizontal, Flame } from 'lucide-react';"
);

// 3. Add achievementToShow state
content = content.replace(
  "const [showAddForm, setShowAddForm] = useState(false);",
  "const [achievementToShow, setAchievementToShow] = useState(null);\n  const [showAddForm, setShowAddForm] = useState(false);"
);

// 4. Update enabledWidgets default
content = content.replace(
  "return saved ? JSON.parse(saved) : ['total_sso_net', 'expense_list', 'goal', 'earned', 'expected'];",
  "return saved ? JSON.parse(saved) : ['total_sso_net', 'expense_list', 'goal', 'earned', 'expected', 'work_streak'];"
);

// 5. Update extraStats useMemo
const oldExtraStats = `    const chartData = Array.from(allMonths).sort().map(month => {
      const parts = month.split('-');
      const d = new Date(parts[0], parseInt(parts[1]) - 1);
      return {
        name: format(d, 'MMM', { locale: th }),
        earned: monthlyGross.earned[month] || 0,
        expected: monthlyGross.pending[month] || 0
      };
    }).slice(-6);
    
    return { shiftCount, totalHours: Math.round(totalHours), chartData };`;

const newExtraStats = `    const chartData = Array.from(allMonths).sort().map(month => {
      const parts = month.split('-');
      const d = new Date(parts[0], parseInt(parts[1]) - 1);
      return {
        name: format(d, 'MMM', { locale: th }),
        earned: monthlyGross.earned[month] || 0,
        expected: monthlyGross.pending[month] || 0
      };
    }).slice(-6);

    let currentWorkStreak = 0;
    let bestWorkStreak = 0;
    const completedWorkDates = new Set();
    tasks.forEach(t => {
      const isDone = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
      if (t.isPartTime && !t.isExpense && isDone) {
         completedWorkDates.add(format(new Date(t.start), 'yyyy-MM-dd'));
      }
    });
    const sortedWorkDates = Array.from(completedWorkDates).sort((a, b) => b.localeCompare(a));
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = format(yesterdayDate, 'yyyy-MM-dd');

    if (completedWorkDates.has(todayStr) || completedWorkDates.has(yesterdayStr)) {
      let checkDate = new Date(completedWorkDates.has(todayStr) ? now : yesterdayDate);
      while (completedWorkDates.has(format(checkDate, 'yyyy-MM-dd'))) {
        currentWorkStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
    
    let tempStreak = 0;
    let previousDate = null;
    for (let i = sortedWorkDates.length - 1; i >= 0; i--) {
       if (i === sortedWorkDates.length - 1) {
          tempStreak = 1;
       } else {
          const currentD = new Date(sortedWorkDates[i]);
          const prevD = new Date(previousDate);
          prevD.setDate(prevD.getDate() + 1);
          if (format(currentD, 'yyyy-MM-dd') === format(prevD, 'yyyy-MM-dd')) {
             tempStreak++;
          } else {
             tempStreak = 1;
          }
       }
       if (tempStreak > bestWorkStreak) bestWorkStreak = tempStreak;
       previousDate = sortedWorkDates[i];
    }
    
    return { shiftCount, totalHours: Math.round(totalHours), chartData, currentWorkStreak, bestWorkStreak };`;

content = content.replace(oldExtraStats, newExtraStats);

// 6. Update AVAILABLE_WIDGETS
content = content.replace(
  "{ id: 'goal', label: 'เป้าหมายรายได้ (Income Goal)' },",
  "{ id: 'goal', label: 'เป้าหมายรายได้ (Income Goal)' },\n    { id: 'work_streak', label: 'วันทำงานต่อเนื่อง (Work Streak)' },"
);

// 7. Update renderWidgetContent
const newWidget = `      case 'work_streak':
        return (
          <div className="liquid-glass-card p-4 flex flex-col justify-between h-full border-l-4 border-l-orange-500 relative overflow-hidden group">
            <motion.div 
              className="absolute -right-4 -top-4 text-orange-500/10"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Flame size={80} strokeWidth={1.5} />
            </motion.div>
            <h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1 relative z-10 group-hover:text-orange-500 transition-colors">
              <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} style={{ originY: 0.8 }}>
                <Flame size={16} className="text-orange-500" fill="currentColor" />
              </motion.div>
              Work Streak
            </h3>
            <div className="text-2xl md:text-3xl font-black text-orange-600 dark:text-orange-500 mb-0.5 relative z-10 group-hover:scale-105 transition-transform origin-left">
              {extraStats.currentWorkStreak} วัน
            </div>
            <p className="text-[10px] font-medium text-orange-700/70 dark:text-orange-300/70 relative z-10">สถิติสูงสุด {extraStats.bestWorkStreak} วัน</p>
          </div>
        );
      case 'shift_count':`;

content = content.replace("case 'shift_count':", newWidget);

// 8. Add useEffects for Achievements before return
const newEffects = `
  React.useEffect(() => {
    if (isTasksLoading) return;
    
    const shown = JSON.parse(localStorage.getItem('achievements_shown') || '{}');
    const goalAmount = Number(incomeGoal.goalAmount) || 0;
    const now = new Date();
    const currentMonthKey = format(now, 'yyyy-MM');
    const currentMonthIncome = monthlyGross.earned[currentMonthKey] || 0;
    
    const milestones = [100, 30, 14, 7, 3];
    for (const m of milestones) {
       if (extraStats.currentWorkStreak >= m) {
           const key = \`work_streak_\${m}\`;
           if (!shown[key]) {
               setAchievementToShow({
                   type: 'streak',
                   title: '🔥 ไฟลุกซู่!',
                   message: \`ยอดเยี่ยม! คุณทำงาน Part-Time ต่อเนื่องมา \${m} วันแล้ว\`,
                   key
               });
               return; 
           }
           break; 
       }
    }
    
    if (currentMonthIncome >= goalAmount && goalAmount > 0) {
        const key = \`goal_\${currentMonthKey}\`;
        if (!shown[key]) {
            setAchievementToShow({
                type: 'goal',
                title: '🏆 ทะลุเป้า!',
                message: \`คุณทำรายได้เดือนนี้ทะลุเป้า ฿\${goalAmount.toLocaleString()} แล้ว!\`,
                key
            });
        }
    }
  }, [extraStats.currentWorkStreak, monthlyGross, isTasksLoading, incomeGoal]);

  React.useEffect(() => {
    if (achievementToShow) {
       confetti({
           particleCount: 150,
           spread: 70,
           origin: { y: 0.6 },
           colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
           zIndex: 1000
       });
    }
  }, [achievementToShow]);

  return (
`;

content = content.replace("  return (", newEffects);

// 9. Add Modal UI at the end
const modalUI = `
      <AnimatePresence>
        {achievementToShow && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => {
              const shown = JSON.parse(localStorage.getItem('achievements_shown') || '{}');
              shown[achievementToShow.key] = true;
              localStorage.setItem('achievements_shown', JSON.stringify(shown));
              setAchievementToShow(null);
            }}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="bg-white dark:bg-[#1e1e2d] w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary-500/20 to-transparent" />
              
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-24 h-24 mx-auto bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-5xl shadow-lg shadow-primary-500/30 mb-6 relative z-10"
              >
                {achievementToShow.type === 'streak' ? '🔥' : '🏆'}
              </motion.div>
              
              <h2 className="text-2xl font-bold text-main mb-2 relative z-10">{achievementToShow.title}</h2>
              <p className="text-main/70 mb-8 relative z-10">{achievementToShow.message}</p>
              
              <button 
                onClick={() => {
                  const shown = JSON.parse(localStorage.getItem('achievements_shown') || '{}');
                  shown[achievementToShow.key] = true;
                  localStorage.setItem('achievements_shown', JSON.stringify(shown));
                  setAchievementToShow(null);
                }}
                className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary-500/20 active:scale-95"
              >
                สุดยอดไปเลย!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
`;

content = content.replace(
  "    </div>\n  );\n}",
  modalUI + "    </div>\n  );\n}"
);

fs.writeFileSync(path, content);
console.log('PartTimePage.jsx patched successfully.');
