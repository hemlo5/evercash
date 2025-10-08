/**
 * Date Handling Utilities
 * Proper timezone handling and date formatting
 */

import { DateTime } from 'luxon';

/**
 * Convert a date to ISO string for storage (always UTC)
 */
export function toISODate(date: Date | string): string {
  if (!date) return '';
  
  const dt = typeof date === 'string' 
    ? DateTime.fromISO(date) 
    : DateTime.fromJSDate(date);
    
  if (!dt.isValid) {
    console.error('Invalid date:', date);
    return DateTime.local().toISODate();
  }
  
  return dt.toUTC().toISODate();
}

/**
 * Convert ISO date to local display format
 */
export function toLocalDate(isoDate: string): string {
  if (!isoDate) return '';
  
  const dt = DateTime.fromISO(isoDate, { zone: 'utc' });
  if (!dt.isValid) return '';
  
  return dt.toLocal().toISODate();
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, format: string = 'MMM dd, yyyy'): string {
  if (!date) return '';
  
  const dt = typeof date === 'string'
    ? DateTime.fromISO(date)
    : DateTime.fromJSDate(date);
    
  if (!dt.isValid) return '';
  
  return dt.toLocal().toFormat(format);
}

/**
 * Get start and end of month
 */
export function getMonthBounds(yearMonth: string): { start: string; end: string } {
  const [year, month] = yearMonth.split('-').map(Number);
  const dt = DateTime.local(year, month);
  
  return {
    start: dt.startOf('month').toISODate(),
    end: dt.endOf('month').toISODate()
  };
}

/**
 * Check if date is in current month
 */
export function isCurrentMonth(date: Date | string): boolean {
  const dt = typeof date === 'string'
    ? DateTime.fromISO(date)
    : DateTime.fromJSDate(date);
    
  const now = DateTime.local();
  
  return dt.year === now.year && dt.month === now.month;
}

/**
 * Add days to a date
 */
export function addDays(date: Date | string, days: number): string {
  const dt = typeof date === 'string'
    ? DateTime.fromISO(date)
    : DateTime.fromJSDate(date);
    
  return dt.plus({ days }).toISODate();
}

/**
 * Calculate age of money (average days between earning and spending)
 */
export function calculateAgeOfMoney(transactions: Array<{ date: string; amount: number }>): number {
  const income = transactions.filter(t => t.amount > 0);
  const expenses = transactions.filter(t => t.amount < 0);
  
  if (income.length === 0 || expenses.length === 0) return 0;
  
  // Calculate average age
  let totalAge = 0;
  let totalAmount = 0;
  
  expenses.forEach(expense => {
    const expenseDate = DateTime.fromISO(expense.date);
    
    // Find income transactions before this expense
    const priorIncome = income.filter(i => 
      DateTime.fromISO(i.date) < expenseDate
    );
    
    if (priorIncome.length > 0) {
      // Use weighted average based on amounts
      priorIncome.forEach(inc => {
        const incomeDate = DateTime.fromISO(inc.date);
        const ageDays = expenseDate.diff(incomeDate, 'days').days;
        totalAge += ageDays * Math.abs(expense.amount);
        totalAmount += Math.abs(expense.amount);
      });
    }
  });
  
  return totalAmount > 0 ? Math.round(totalAge / totalAmount) : 0;
}
