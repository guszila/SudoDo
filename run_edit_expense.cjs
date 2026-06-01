const fs = require('fs');
const filepath = 'src/pages/PartTimePage.jsx';
let content = fs.readFileSync(filepath, 'utf-8');

// 1. Add handleEditExpenseClick
const handleAddStr = "  const handleAddExpense = async (e) => {";
const handleAddIdx = content.indexOf(handleAddStr);
if (handleAddIdx === -1) throw new Error("handleAddExpense not found");

// Modify handleAddExpense
content = content.replace(
  "    await saveTask('ADD', expenseTask, user.uid);",
  "    if (expenseFormData.id) {\n      await saveTask('EDIT', { ...expenseTask, id: expenseFormData.id }, user.uid);\n    } else {\n      await saveTask('ADD', expenseTask, user.uid);\n    }"
);

const newEditFunction = `
  const handleEditExpenseClick = (exp) => {
    const startD = new Date(exp.start);
    setExpenseFormData({
      id: exp.id,
      title: exp.title,
      amount: exp.amount,
      date: isNaN(startD.getTime()) ? new Date().toISOString().slice(0, 10) : startD.toISOString().slice(0, 10),
      month: isNaN(startD.getTime()) ? new Date().toISOString().slice(0, 7) : startD.toISOString().slice(0, 7),
      isPercentage: exp.isPercentage
    });
    setShowAddExpenseForm(true);
  };
`;

content = content.replace("  const handleMarkDone = async (task) => {", newEditFunction + "\n  const handleMarkDone = async (task) => {");


// 2. Make expense_list items clickable
const oldExpenseWidget = `<div key={exp.id} className="flex justify-between items-center p-2 bg-main/5 rounded-lg">`;
const newExpenseWidget = `<div key={exp.id} onClick={() => handleEditExpenseClick(exp)} className="flex justify-between items-center p-2 bg-main/5 rounded-lg cursor-pointer hover:bg-main/10 transition-colors">`;
content = content.replace(oldExpenseWidget, newExpenseWidget);

// 3. Make history items clickable
content = content.replace(
  `onClick={() => {
                   if (!timerRef.current) return; 
                   // Normal click goes here if needed, but we don't have a specific edit on click for expenses right now
                }}`,
  `onClick={() => {
                   if (!timerRef.current) return; 
                   handleEditExpenseClick(task);
                }}`
);

// 4. Update the "Add Expense" button text in the ActionSheet
// We can find the button with type="submit" and t.addExpense inside the ActionSheet for expenses.
// Because it's hard to target exactly, we will search for `t.addExpense` used as button content in the form.
content = content.replace(
  />\s*\{t\.addExpense\}\s*<\/button>/,
  ">{expenseFormData.id ? 'บันทึกการแก้ไข' : t.addExpense}</button>"
);

// We should also replace the bottom sheet title if possible. 
// "เพิ่มรายจ่าย" => expenseFormData.id ? 'แก้ไขรายจ่าย' : 'เพิ่มรายจ่าย'
// We'll replace it with regex if we can find t.addExpense or hardcoded text.
// Actually, t.addExpense is used in the button text. What about the header?
// It might be `t.expenses` or `t.addExpense`. Let's just leave the header if we can't find it easily.

fs.writeFileSync(filepath, content, 'utf-8');
console.log("Edit Expense feature implemented.");
