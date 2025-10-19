/**
 * File Import Service
 * Handles CSV, OFX, QIF file imports from banks
 */

export interface ImportedTransaction {
  date: string;
  amount: number;
  payee: string;
  category?: string;
  notes?: string;
  account?: string;
  reference?: string;
}

export interface ImportResult {
  transactions: ImportedTransaction[];
  errors: string[];
  summary: {
    total: number;
    imported: number;
    duplicates: number;
    errors: number;
  };
}

export class FileImportService {
  
  // Import CSV file
  async importCSV(file: File): Promise<ImportResult> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('File is empty');
    }
    
    // Detect CSV format
    const format = this.detectCSVFormat(lines[0]);
    const transactions: ImportedTransaction[] = [];
    const errors: string[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      try {
        const transaction = this.parseCSVLine(lines[i], format);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        errors.push(`Line ${i + 1}: ${error}`);
      }
    }
    
    return {
      transactions,
      errors,
      summary: {
        total: lines.length - 1,
        imported: transactions.length,
        duplicates: 0, // TODO: Implement duplicate detection
        errors: errors.length
      }
    };
  }
  
  // Import OFX file
  async importOFX(file: File): Promise<ImportResult> {
    const text = await file.text();
    const transactions: ImportedTransaction[] = [];
    const errors: string[] = [];
    
    try {
      // Parse OFX XML structure
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/xml');
      
      // Find transaction elements
      const stmtTrns = doc.querySelectorAll('STMTTRN');
      
      stmtTrns.forEach((trn, index) => {
        try {
          const transaction = this.parseOFXTransaction(trn);
          transactions.push(transaction);
        } catch (error) {
          errors.push(`Transaction ${index + 1}: ${error}`);
        }
      });
      
    } catch (error) {
      throw new Error(`Invalid OFX file: ${error}`);
    }
    
    return {
      transactions,
      errors,
      summary: {
        total: transactions.length + errors.length,
        imported: transactions.length,
        duplicates: 0,
        errors: errors.length
      }
    };
  }
  
  // Import QIF file
  async importQIF(file: File): Promise<ImportResult> {
    const text = await file.text();
    const lines = text.split('\n').map(line => line.trim());
    
    const transactions: ImportedTransaction[] = [];
    const errors: string[] = [];
    
    let currentTransaction: Partial<ImportedTransaction> = {};
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      
      if (line === '^') {
        // End of transaction
        if (currentTransaction.date && currentTransaction.amount !== undefined) {
          transactions.push(currentTransaction as ImportedTransaction);
        } else {
          errors.push(`Line ${lineNumber}: Incomplete transaction`);
        }
        currentTransaction = {};
        continue;
      }
      
      if (line.length === 0) continue;
      
      const code = line[0];
      const value = line.substring(1);
      
      try {
        switch (code) {
          case 'D': // Date
            currentTransaction.date = this.parseQIFDate(value);
            break;
          case 'T': // Amount
            currentTransaction.amount = parseFloat(value);
            break;
          case 'P': // Payee
            currentTransaction.payee = value;
            break;
          case 'M': // Memo
            currentTransaction.notes = value;
            break;
          case 'L': // Category
            currentTransaction.category = value;
            break;
          case 'N': // Number/Reference
            currentTransaction.reference = value;
            break;
        }
      } catch (error) {
        errors.push(`Line ${lineNumber}: ${error}`);
      }
    }
    
    return {
      transactions,
      errors,
      summary: {
        total: transactions.length + errors.length,
        imported: transactions.length,
        duplicates: 0,
        errors: errors.length
      }
    };
  }
  
  // Detect CSV format based on header
  private detectCSVFormat(header: string): 'bank' | 'mint' | 'quicken' | 'custom' {
    const lower = header.toLowerCase();
    
    if (lower.includes('transaction date') && lower.includes('description')) {
      return 'bank';
    }
    if (lower.includes('date') && lower.includes('original description')) {
      return 'mint';
    }
    if (lower.includes('date') && lower.includes('payee')) {
      return 'quicken';
    }
    
    return 'custom';
  }
  
  // Parse CSV line based on format
  private parseCSVLine(line: string, format: string): ImportedTransaction | null {
    const fields = this.parseCSVFields(line);
    
    switch (format) {
      case 'bank':
        return this.parseBankCSV(fields);
      case 'mint':
        return this.parseMintCSV(fields);
      case 'quicken':
        return this.parseQuickenCSV(fields);
      default:
        return this.parseCustomCSV(fields);
    }
  }
  
  // Parse CSV fields (handles quoted fields)
  private parseCSVFields(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    fields.push(current.trim());
    return fields;
  }
  
  // Parse bank CSV format
  private parseBankCSV(fields: string[]): ImportedTransaction {
    // Common bank format: Date, Description, Amount, Balance
    return {
      date: this.parseDate(fields[0]),
      payee: fields[1] || 'Unknown',
      amount: parseFloat(fields[2]) || 0,
      notes: fields[3] || ''
    };
  }
  
  // Parse Mint CSV format
  private parseMintCSV(fields: string[]): ImportedTransaction {
    // Mint format: Date, Description, Original Description, Amount, Transaction Type, Category, Account Name, Labels, Notes
    return {
      date: this.parseDate(fields[0]),
      payee: fields[2] || fields[1] || 'Unknown',
      amount: parseFloat(fields[3]) || 0,
      category: fields[5],
      account: fields[6],
      notes: fields[8]
    };
  }
  
  // Parse Quicken CSV format
  private parseQuickenCSV(fields: string[]): ImportedTransaction {
    // Quicken format: Date, Payee, Category, Memo, Outflow, Inflow
    const outflow = parseFloat(fields[4]) || 0;
    const inflow = parseFloat(fields[5]) || 0;
    
    return {
      date: this.parseDate(fields[0]),
      payee: fields[1] || 'Unknown',
      category: fields[2],
      notes: fields[3],
      amount: inflow - outflow
    };
  }
  
  // Parse custom CSV format (best guess)
  private parseCustomCSV(fields: string[]): ImportedTransaction {
    // Try to intelligently parse unknown format
    return {
      date: this.parseDate(fields[0]),
      payee: fields[1] || 'Unknown',
      amount: parseFloat(fields[2]) || 0,
      notes: fields[3] || ''
    };
  }
  
  // Parse OFX transaction element
  private parseOFXTransaction(trn: Element): ImportedTransaction {
    const getTagValue = (tagName: string): string => {
      const element = trn.querySelector(tagName);
      return element?.textContent?.trim() || '';
    };
    
    const dateStr = getTagValue('DTPOSTED');
    const amount = parseFloat(getTagValue('TRNAMT')) || 0;
    const payee = getTagValue('NAME') || getTagValue('MEMO') || 'Unknown';
    const reference = getTagValue('FITID');
    
    return {
      date: this.parseOFXDate(dateStr),
      amount,
      payee,
      reference,
      notes: getTagValue('MEMO')
    };
  }
  
  // Parse various date formats
  private parseDate(dateStr: string): string {
    if (!dateStr) throw new Error('Invalid date');
    
    // Try common formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
      /^(\d{2})\/(\d{2})\/(\d{2})$/, // MM/DD/YY
      /^(\d{2})-(\d{2})-(\d{4})$/, // MM-DD-YYYY
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        // Convert to ISO format
        if (format === formats[0]) {
          return dateStr; // Already ISO
        } else if (format === formats[1] || format === formats[3]) {
          const [, month, day, year] = match;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else if (format === formats[2]) {
          const [, month, day, year] = match;
          const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
          return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    }
    
    // Try parsing as Date
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    throw new Error(`Unable to parse date: ${dateStr}`);
  }
  
  // Parse OFX date format (YYYYMMDD)
  private parseOFXDate(dateStr: string): string {
    if (dateStr.length >= 8) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `${year}-${month}-${day}`;
    }
    throw new Error(`Invalid OFX date: ${dateStr}`);
  }
  
  // Parse QIF date format
  private parseQIFDate(dateStr: string): string {
    // QIF uses MM/DD/YY or MM/DD/YYYY
    return this.parseDate(dateStr);
  }
  
  // Validate imported transactions
  validateTransactions(transactions: ImportedTransaction[]): ImportedTransaction[] {
    return transactions.filter(tx => {
      // Must have date and amount
      if (!tx.date || tx.amount === undefined) return false;
      
      // Date must be valid
      const date = new Date(tx.date);
      if (isNaN(date.getTime())) return false;
      
      // Amount must be a number
      if (typeof tx.amount !== 'number') return false;
      
      // Must have payee
      if (!tx.payee || tx.payee.trim() === '') return false;
      
      return true;
    });
  }
  
  // Convert to our transaction format
  convertToTransactionFormat(imported: ImportedTransaction[], accountId: string): any[] {
    return imported.map(tx => ({
      id: crypto.randomUUID(),
      account: accountId,
      date: tx.date,
      amount: Math.round(tx.amount * 100), // Convert to cents
      payee: tx.payee,
      category: tx.category || '',
      notes: tx.notes || '',
      imported: true,
      reference: tx.reference
    }));
  }
}

// Singleton instance
export const fileImportService = new FileImportService();
