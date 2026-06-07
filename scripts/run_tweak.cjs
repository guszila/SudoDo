const fs = require('fs');
const filepath = 'src/pages/PartTimePage.jsx';
let content = fs.readFileSync(filepath, 'utf-8');

// 1. Remove Math.round from stats
content = content.replace(/Math\.round\((earned)\)/g, '$1');
content = content.replace(/Math\.round\((pending)\)/g, '$1');
content = content.replace(/Math\.round\((earned \+ pending)\)/g, '$1');
content = content.replace(/Math\.round\((ssoDeducted)\)/g, '$1');
content = content.replace(/Math\.round\((expenseTotal)\)/g, '$1');
content = content.replace(/Math\.round\((earned \+ pending - ssoDeducted - expenseTotal)\)/g, '$1');

// 2. Add WIDGET_ORDER and replace enabledWidgets.map
const widgetOrderCode = `
  const WIDGET_ORDER = {
    'goal': 1,
    'earned': 2,
    'expected': 3,
    'total_sso_net': 4,
    'expense_list': 5,
    'net': 6,
    'shift_count': 7,
    'total_hours': 8,
    'chart': 9
  };
  const sortedWidgets = [...enabledWidgets].sort((a, b) => (WIDGET_ORDER[a] || 99) - (WIDGET_ORDER[b] || 99));
`;

content = content.replace(
  '<AnimatePresence>\n          {enabledWidgets.map(id => (',
  `<AnimatePresence>\n          {${widgetOrderCode}\n          sortedWidgets.map(id => (`
);

// 3. Replace all .toLocaleString() and .toLocaleString(undefined, { maximumFractionDigits: 2 }) with minimumFractionDigits
content = content.replace(/\.toLocaleString\([^)]*\)/g, ".toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })");

fs.writeFileSync(filepath, content, 'utf-8');
console.log('Update complete');
