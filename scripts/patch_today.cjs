const fs = require('fs');

const path = 'src/pages/TodayPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add confetti import
content = content.replace(
  "import { TASK_STATUS, TASK_PRIORITY, PRIORITY_WEIGHT, RATE_TYPE } from '../constants';",
  "import { TASK_STATUS, TASK_PRIORITY, PRIORITY_WEIGHT, RATE_TYPE } from '../constants';\nimport confetti from 'canvas-confetti';"
);

// 2. Add state variable
content = content.replace(
  "const [modalSize, setModalSize] = useState({ width: 600, height: 400 });",
  "const [modalSize, setModalSize] = useState({ width: 600, height: 400 });\n  const [achievementToShow, setAchievementToShow] = useState(null);"
);

// 3. Update useMemo
content = content.replace(
  "const { todayTasks, highPriorityCount, todayIncome, todayNetIncome, todaySSODeduction, chartData, fullChartData, weeklyStreak, totalToday, doneToday, pendingToday } = useMemo(() => {",
  "const { todayTasks, highPriorityCount, todayIncome, todayNetIncome, todaySSODeduction, chartData, fullChartData, weeklyStreak, totalToday, doneToday, pendingToday, currentWorkStreak, bestWorkStreak, currentMonthIncome } = useMemo(() => {"
);

content = content.replace(
  "let pendingT = 0;",
  "let pendingT = 0;\n    const completedWorkDates = new Set();"
);

// Update task loop
content = content.replace(
  /const isDone = t\.status === TASK_STATUS\.DONE;\s*if \(t\.isPartTime\) \{/g,
  `const isDone = t.status === TASK_STATUS.DONE;\n      \n      if (t.isPartTime) {\n        if ((isDone || (t.actualStart && t.actualEnd)) && !t.isExpense) {\n          completedWorkDates.add(format(new Date(t.start), 'yyyy-MM-dd'));\n        }`
);

// Update week loop and streak
const originalWeekLoop = `    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    const wStreak = weekDays.map(d => ({
      day: format(d, 'EE', { locale: th }),
      date: format(d, 'yyyy-MM-dd'),
      active: streakData.history.includes(format(d, 'yyyy-MM-dd')),
      isToday: isSameDay(d, now)
    }));`;

const newWeekLoop = `    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    const sortedWorkDates = Array.from(completedWorkDates).sort((a, b) => b.localeCompare(a));
    const todayStr = format(now, 'yyyy-MM-dd');
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = format(yesterdayDate, 'yyyy-MM-dd');

    let calcCurrentStreak = 0;
    if (completedWorkDates.has(todayStr) || completedWorkDates.has(yesterdayStr)) {
      let checkDate = new Date(completedWorkDates.has(todayStr) ? now : yesterdayDate);
      while (completedWorkDates.has(format(checkDate, 'yyyy-MM-dd'))) {
        calcCurrentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
    
    let calcBestStreak = 0;
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
       if (tempStreak > calcBestStreak) calcBestStreak = tempStreak;
       previousDate = sortedWorkDates[i];
    }
    
    const wStreak = weekDays.map(d => ({
      day: format(d, 'EE', { locale: th }),
      date: format(d, 'yyyy-MM-dd'),
      active: completedWorkDates.has(format(d, 'yyyy-MM-dd')),
      isToday: isSameDay(d, now)
    }));

    let calcMonthIncome = 0;
    const currentMonthKey = format(now, 'yyyy-MM');
    if (monthlyIncome[currentMonthKey]) {
        calcMonthIncome = monthlyIncome[currentMonthKey].income;
    }`;

content = content.replace(originalWeekLoop, newWeekLoop);

const originalReturn = `    return { 
      todayTasks: allTodayTasks.slice(0, 5), 
      highPriorityCount: highPriority, 
      todayIncome: Math.round(income),
      todayNetIncome,
      todaySSODeduction,
      chartData: cData,
      fullChartData: fcData,
      weeklyStreak: wStreak,
      totalToday: doneT + pendingT,
      doneToday: doneT,
      pendingToday: pendingT
    };`;

const newReturn = `    return { 
      todayTasks: allTodayTasks.slice(0, 5), 
      highPriorityCount: highPriority, 
      todayIncome: Math.round(income),
      todayNetIncome,
      todaySSODeduction,
      chartData: cData,
      fullChartData: fcData,
      weeklyStreak: wStreak,
      totalToday: doneT + pendingT,
      doneToday: doneT,
      pendingToday: pendingT,
      currentWorkStreak: calcCurrentStreak,
      bestWorkStreak: calcBestStreak,
      currentMonthIncome: calcMonthIncome
    };`;

content = content.replace(originalReturn, newReturn);

// 4. Add useEffect for achievements after pendingTasksList effect
const newEffect = `
  useEffect(() => {
    if (tasksLoading) return;
    
    const shown = JSON.parse(localStorage.getItem('achievements_shown') || '{}');
    const goalSettings = JSON.parse(localStorage.getItem('income_goal') || '{"goalAmount": 5000}');
    const goalAmount = Number(goalSettings.goalAmount) || 0;
    
    const milestones = [100, 30, 14, 7, 3];
    for (const m of milestones) {
       if (currentWorkStreak >= m) {
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
        const monthKey = format(now, 'yyyy-MM');
        const key = \`goal_\${monthKey}\`;
        if (!shown[key]) {
            setAchievementToShow({
                type: 'goal',
                title: '🏆 ทะลุเป้า!',
                message: \`คุณทำรายได้เดือนนี้ทะลุเป้า ฿\${goalAmount.toLocaleString()} แล้ว!\`,
                key
            });
        }
    }
  }, [currentWorkStreak, currentMonthIncome, tasksLoading, now]);

  useEffect(() => {
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
`;

content = content.replace(
  "  const getGreeting = () => {",
  newEffect + "\n  const getGreeting = () => {"
);

// 5. Update Streak UI (replace streakData with currentWorkStreak)
content = content.replace(
  "{streakData.currentStreak} วัน",
  "{currentWorkStreak} วัน"
);

content = content.replace(
  "สถิติสูงสุด {streakData.bestStreak} วัน",
  "สถิติสูงสุด {bestWorkStreak} วัน"
);

// 6. Inject the Achievement Modal at the end of the file, just inside the last </div>
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
  "    </div>\n  );\n}\n",
  modalUI + "    </div>\n  );\n}\n"
);

fs.writeFileSync(path, content);
console.log('TodayPage.jsx patched successfully.');
