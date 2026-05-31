/**
 * Calculates Social Security (SSO) deduction based on gross income.
 * Rate: 5% of monthly income.
 * Cap: ฿750 per month (i.e. capped at 15,000 income).
 * Never returns negative values.
 * 
 * @param {number} grossIncome - The total monthly income
 * @returns {{deduction: number, netIncome: number}}
 */
export function calcSSO(grossIncome) {
  // Ensure grossIncome is a valid number, default to 0
  const income = typeof grossIncome === 'number' && !isNaN(grossIncome) ? grossIncome : 0;
  
  // Calculate 5% of gross income, round it
  const calculatedDeduction = Math.round(income * 0.05);
  
  // Apply cap of 750, ensure it's not negative
  const deduction = Math.max(0, Math.min(calculatedDeduction, 750));
  
  // Calculate net income
  const netIncome = Math.round(income - deduction);
  
  return {
    deduction,
    netIncome
  };
}
