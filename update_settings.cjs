const fs = require('fs');
const filepath = 'src/pages/SettingsPage.jsx';
let content = fs.readFileSync(filepath, 'utf-8');

// 1. Import Palette icon
content = content.replace(
  "import { \n  ArrowLeft, ChevronRight, Moon, Sun, Languages, Calendar,",
  "import { \n  ArrowLeft, ChevronRight, Moon, Sun, Languages, Calendar,\n  Palette,"
);

// 2. Import useTheme
content = content.replace(
  "import { useSettings } from '../contexts/SettingsContext';",
  "import { useSettings } from '../contexts/SettingsContext';\nimport { useTheme } from '../contexts/ThemeContext';"
);

// 3. Add useTheme inside the component
content = content.replace(
  "  const navigate = useNavigate();",
  "  const navigate = useNavigate();\n  const { currentTheme, setTheme, themes } = useTheme();"
);

// 4. Add translations for theme picker
content = content.replace(
  "    display: lang === 'en' ? 'Display' : 'การแสดงผล',",
  "    display: lang === 'en' ? 'Display' : 'การแสดงผล',\n    themeColor: lang === 'en' ? 'Color Theme' : 'ธีมสี',\n    themeColorSub: lang === 'en' ? 'Select app color theme' : 'เลือกสีที่ชอบ',"
);

// 5. Add Theme Picker Row
const oldDisplaySection = `        <SectionLabel>{t.display}</SectionLabel>
        <GlassCard>
          <Row `;
const newDisplaySection = `        <SectionLabel>{t.display}</SectionLabel>
        <GlassCard>
          <Row 
            icon={Palette} iconBgClass="bg-[var(--theme-accent-light)]" iconColorClass="text-[var(--theme-accent)]"
            title={t.themeColor} subtitle={currentTheme.name}
            rightElement={<ChevronRight size={20} className="text-[#888780] dark:text-[#A0A0A0]" />}
            onClick={() => setActiveSheet('themePicker')}
          />
          <Row `;
content = content.replace(oldDisplaySection, newDisplaySection);

// 6. Add Theme Picker ActionSheet
const themePickerSheet = `
      {/* Theme Picker Sheet */}
      <ActionSheet isOpen={activeSheet === 'themePicker'} onClose={() => setActiveSheet(null)} title={t.themeColor}>
        <div className="grid grid-cols-2 gap-3 pb-4 max-h-[60vh] overflow-y-auto">
          {Object.values(themes).map(th => {
            const isActive = currentTheme.id === th.id;
            return (
              <button 
                key={th.id} 
                onClick={() => setTheme(th.id)}
                className={\`flex flex-col items-center p-3 rounded-2xl border-2 transition-all \${isActive ? 'border-[var(--theme-accent)] bg-black/5 dark:bg-white/5' : 'border-transparent bg-black/5 dark:bg-white/5 hover:border-[var(--theme-accent-border)]'}\`}
              >
                <div 
                  className="w-full h-12 rounded-xl mb-3 shadow-sm border border-white/20"
                  style={{ background: th.gradient }}
                />
                <div className="flex items-center gap-2">
                  <span className={\`font-bold text-sm \${isActive ? 'text-[var(--theme-accent)]' : 'text-[#1a1a2e] dark:text-white'}\`}>{th.name}</span>
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
`;

content = content.replace(
  "{/* Language Sheet */}",
  themePickerSheet + "\n      {/* Language Sheet */}"
);

fs.writeFileSync(filepath, content, 'utf-8');
console.log("SettingsPage updated with Theme Picker.");
