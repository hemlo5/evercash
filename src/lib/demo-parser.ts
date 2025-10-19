// Demo CSV Parser for testing without Nanonets API
import { ParsedTransaction } from './nanonets-api';

export class DemoCSVParser {
  /**
   * Parse CSV content directly without API calls (for demo/testing)
   */
  static parseCSVContent(csvContent: string): ParsedTransaction[] {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const transactions: ParsedTransaction[] = [];

    // Find column indices
    const dateIndex = this.findColumnIndex(headers, ['date', 'transaction date', 'posting date']);
    const descIndex = this.findColumnIndex(headers, ['description', 'memo', 'payee', 'merchant']);
    const amountIndex = this.findColumnIndex(headers, ['amount', 'transaction amount']);
    const typeIndex = this.findColumnIndex(headers, ['type', 'transaction type']);

    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
      
      if (columns.length < headers.length) continue;

      try {
        let amount = 0;
        let type: 'income' | 'expense' = 'expense';

        // Determine amount and type
        if (amountIndex !== -1 && columns[amountIndex]) {
          amount = Math.abs(parseFloat(columns[amountIndex].replace(/[^0-9.-]/g, '')));
          // Check if it's negative or if type column indicates debit
          const isNegative = columns[amountIndex].includes('-');
          const isDebit = typeIndex !== -1 && columns[typeIndex].toLowerCase().includes('debit');
          type = (isNegative || isDebit) ? 'expense' : 'income';
        }

        if (amount > 0 && dateIndex !== -1 && descIndex !== -1) {
          transactions.push({
            date: this.parseDate(columns[dateIndex]),
            description: columns[descIndex] || 'Unknown Transaction',
            amount: Math.round(amount * 100), // Convert to cents
            type,
            category: this.guessCategory(columns[descIndex] || '', type),
          });
        }
      } catch (error) {
        console.warn('Error parsing CSV row:', columns, error);
      }
    }

    return transactions;
  }

  /**
   * Find column index by possible header names
   */
  private static findColumnIndex(headers: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
      const index = headers.findIndex(h => h.includes(name));
      if (index !== -1) return index;
    }
    return -1;
  }

  /**
   * Parse various date formats
   */
  private static parseDate(dateStr: string): string {
    try {
      const cleaned = dateStr.trim();
      
      // Try parsing different formats
      const formats = [
        /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY
      ];

      for (const format of formats) {
        const match = cleaned.match(format);
        if (match) {
          let [, part1, part2, part3] = match;
          
          if (part1.length === 4) {
            // YYYY-MM-DD
            const date = new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3));
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } else {
            // MM/DD/YYYY or MM-DD-YYYY
            const date = new Date(parseInt(part3), parseInt(part1) - 1, parseInt(part2));
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          }
        }
      }

      // Fallback to current date
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.warn('Error parsing date:', dateStr, error);
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Guess transaction category based on description
   */
  private static guessCategory(description: string, type: 'income' | 'expense'): string {
    const desc = description.toLowerCase();

    if (type === 'income') {
      if (desc.includes('salary') || desc.includes('payroll') || desc.includes('wage')) return 'Salary';
      if (desc.includes('freelance') || desc.includes('contract')) return 'Freelance';
      if (desc.includes('dividend') || desc.includes('interest') || desc.includes('investment')) return 'Investment';
      return 'Other Income';
    } else {
      // Expense categories
      if (desc.includes('starbucks') || desc.includes('coffee') || desc.includes('restaurant') || desc.includes('food')) return 'Food & Dining';
      if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('market')) return 'Food & Dining';
      if (desc.includes('gas') || desc.includes('fuel') || desc.includes('uber') || desc.includes('taxi')) return 'Transportation';
      if (desc.includes('amazon') || desc.includes('store') || desc.includes('shop') || desc.includes('purchase')) return 'Shopping';
      if (desc.includes('electric') || desc.includes('water') || desc.includes('internet') || desc.includes('phone') || desc.includes('bill')) return 'Bills & Utilities';
      if (desc.includes('netflix') || desc.includes('movie') || desc.includes('spotify') || desc.includes('theater')) return 'Entertainment';
      if (desc.includes('pharmacy') || desc.includes('doctor') || desc.includes('medical') || desc.includes('health')) return 'Healthcare';
      return 'Other';
    }
  }
}
