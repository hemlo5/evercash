// Nanonets API Integration for PDF/CSV Import
const NANONETS_API_KEY = '0ffdde3f-a6a8-11f0-87de-76a9a004f0b1';
const NANONETS_BASE_URL = 'https://extraction-api.nanonets.com';

export interface NanonetsResponse {
  message?: string;
  data?: {
    markdown?: string;
    text?: string;
  };
  // Legacy format support
  result?: Array<{
    prediction: Array<{
      label: string;
      ocr_text: string;
      score: number;
    }>;
  }>;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
  account?: string;
  type: 'income' | 'expense';
}

export class NanonetsAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = NANONETS_API_KEY;
    this.baseUrl = NANONETS_BASE_URL;
  }

  /**
   * Upload and process a PDF/CSV file using Nanonets
   */
  async processFile(file: File): Promise<NanonetsResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('output_type', 'markdown');

    console.log('📤 Uploading to Nanonets:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      fileType: file.type,
      apiEndpoint: `${this.baseUrl}/extract`
    });

    try {
      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      console.log('📥 Nanonets Response Status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Nanonets API Error Response:', errorText);
        throw new Error(`Nanonets API error: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
      }

      const data = await response.json();
      
      // 🔍 FULL DEBUG OUTPUT - Show complete response
      console.log('🔍 COMPLETE NANONETS RESPONSE:');
      console.log(JSON.stringify(data, null, 2));
      
      console.log('✅ Nanonets API Success:', {
        message: data.message,
        hasData: !!data.data,
        hasMarkdown: !!data.data?.markdown,
        hasText: !!data.data?.text,
        // Legacy format
        resultCount: data.result?.length || 0,
        // Show all top-level keys
        responseKeys: Object.keys(data)
      });
      
      return data;
    } catch (error) {
      console.error('💥 Error processing file with Nanonets:', error);
      throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Nanonets response into structured transaction data
   */
  parseTransactions(nanonetsResponse: NanonetsResponse): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    
    try {
      let extractedText = '';
      
      console.log('🔍 DEBUGGING RESPONSE STRUCTURE:');
      console.log('Response keys:', Object.keys(nanonetsResponse));
      console.log('Has data property:', !!nanonetsResponse.data);
      console.log('Has result property:', !!nanonetsResponse.result);
      
      // Handle current API format - content property
      if ((nanonetsResponse as any).content) {
        extractedText = (nanonetsResponse as any).content;
        console.log('📝 ✅ FOUND TEXT in content property (length: ' + extractedText.length + '):');
        console.log(extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''));
      }
      // Handle data.markdown/text format
      else if (nanonetsResponse.data) {
        console.log('🔍 Data object keys:', Object.keys(nanonetsResponse.data));
        extractedText = nanonetsResponse.data.markdown || nanonetsResponse.data.text || '';
        console.log('📝 Extracted text from data property (length: ' + extractedText.length + '):');
        console.log(extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''));
      }
      // Handle legacy format
      else if (nanonetsResponse.result) {
        console.log('🔍 Legacy result array length:', nanonetsResponse.result.length);
        extractedText = nanonetsResponse.result
          .flatMap(r => r.prediction)
          .map(p => p.ocr_text)
          .join('\n');
        console.log('📝 Extracted text from legacy API format (length: ' + extractedText.length + '):');
        console.log(extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''));
      }
      // Check for other possible response formats
      else {
        console.log('🔍 Checking for other response formats...');
        console.log('🔍 Full response structure:', nanonetsResponse);
      }
      
      if (!extractedText) {
        console.warn('⚠️ No text extracted from Nanonets response');
        console.warn('🔍 Response was:', nanonetsResponse);
        return [];
      }

      // Parse different formats
      if (this.isCSVFormat(extractedText)) {
        console.log('📈 Detected CSV format, parsing as CSV');
        return this.parseCSVTransactions(extractedText);
      } else {
        console.log('📄 Detected PDF format, parsing as PDF');
        return this.parsePDFTransactions(extractedText);
      }
    } catch (error) {
      console.error('💥 Error parsing transactions:', error);
      return [];
    }
  }

  /**
   * Check if the extracted text is in CSV format
   */
  private isCSVFormat(text: string): boolean {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return false;
    
    // Check if first line looks like CSV headers
    const firstLine = lines[0].toLowerCase();
    return firstLine.includes('date') && 
           (firstLine.includes('amount') || firstLine.includes('debit') || firstLine.includes('credit'));
  }

  /**
   * Parse CSV format transactions
   */
  private parseCSVTransactions(text: string): ParsedTransaction[] {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const transactions: ParsedTransaction[] = [];

    // Find column indices
    const dateIndex = this.findColumnIndex(headers, ['date', 'transaction date', 'posting date']);
    const descIndex = this.findColumnIndex(headers, ['description', 'memo', 'payee', 'merchant']);
    const amountIndex = this.findColumnIndex(headers, ['amount', 'transaction amount']);
    const debitIndex = this.findColumnIndex(headers, ['debit', 'withdrawal', 'outgoing']);
    const creditIndex = this.findColumnIndex(headers, ['credit', 'deposit', 'incoming']);

    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
      
      if (columns.length < headers.length) continue;

      try {
        let amount = 0;
        let type: 'income' | 'expense' = 'expense';

        // Determine amount and type
        if (amountIndex !== -1 && columns[amountIndex]) {
          amount = Math.abs(parseFloat(columns[amountIndex].replace(/[^0-9.-]/g, '')));
          // Assume negative amounts are expenses, positive are income
          type = columns[amountIndex].includes('-') ? 'expense' : 'income';
        } else if (debitIndex !== -1 && columns[debitIndex]) {
          amount = parseFloat(columns[debitIndex].replace(/[^0-9.-]/g, ''));
          type = 'expense';
        } else if (creditIndex !== -1 && columns[creditIndex]) {
          amount = parseFloat(columns[creditIndex].replace(/[^0-9.-]/g, ''));
          type = 'income';
        }

        if (amount > 0 && dateIndex !== -1 && descIndex !== -1) {
          transactions.push({
            date: this.parseDate(columns[dateIndex]),
            description: columns[descIndex] || 'Unknown Transaction',
            amount: amount, // Keep in dollars
            type,
          });
        }
      } catch (error) {
        console.warn('Error parsing transaction row:', columns, error);
      }
    }

    return transactions;
  }

  /**
   * Parse PDF format transactions (bank statements, receipts)
   */
  private parsePDFTransactions(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    
    console.log('📄 Parsing PDF bank statement...');
    console.log('📄 Full text length:', text.length);
    
    // Look for HTML table data in the markdown
    const tableMatches = text.match(/<table>[\s\S]*?<\/table>/g);
    
    if (tableMatches) {
      console.log('📋 Found', tableMatches.length, 'tables in the document');
      
      tableMatches.forEach((table, tableIndex) => {
        console.log(`📋 Processing table ${tableIndex + 1}`);
        
        // Extract table rows
        const rowMatches = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/g);
        
        if (rowMatches) {
          console.log(`📋 Found ${rowMatches.length} rows in table ${tableIndex + 1}`);
          
          // First, identify the header row to understand column structure
          let headerRow = null;
          let headerIndex = -1;
          
          for (let i = 0; i < rowMatches.length; i++) {
            // Check for <th> tags first, then <thead> section with <td> tags
            if (rowMatches[i].includes('<th>') || 
                (rowMatches[i].includes('<td>') && 
                 (rowMatches[i].toLowerCase().includes('date') || 
                  rowMatches[i].toLowerCase().includes('particulars') ||
                  rowMatches[i].toLowerCase().includes('deposits') ||
                  rowMatches[i].toLowerCase().includes('withdrawals')))) {
              headerRow = rowMatches[i];
              headerIndex = i;
              break;
            }
          }
          
          if (headerRow) {
            console.log('📋 Found header row:', headerRow);
            
            // Extract header cells to understand column structure
            const headerCells = headerRow.match(/<th[^>]*>([\s\S]*?)<\/th>/g) || 
                               headerRow.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
            if (headerCells) {
              const headers = headerCells.map(cell => 
                cell.replace(/<\/?[^>]+(>|$)/g, '').trim().toLowerCase()
              );
              console.log('📋 Headers:', headers);
              
              // Find column indices for different formats
              const dateIndex = this.findHeaderIndex(headers, ['post date', 'date', 'posting date', 'transaction date']);
              const descIndex = this.findHeaderIndex(headers, ['transaction desc', 'description', 'particulars', 'details', 'detail']);
              // Support banks that label amounts as Paid In / Paid Out
              const debitIndex = this.findHeaderIndex(headers, ['dr', 'debit', 'withdrawal', 'withdrawals', 'paid out', 'paid-out']);
              const creditIndex = this.findHeaderIndex(headers, ['cr', 'credit', 'deposit', 'deposits', 'paid in', 'paid-in']);
              
              console.log('📋 Column indices:', { dateIndex, descIndex, debitIndex, creditIndex });
              
              // Process data rows
              for (let i = headerIndex + 1; i < rowMatches.length; i++) {
                const row = rowMatches[i];
                
                // Extract cell data
                const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
                
                if (cellMatches && cellMatches.length >= 4) {
                  const cells = cellMatches.map(cell => {
                    // Remove HTML tags and normalize whitespace
                    let cleaned = cell.replace(/<\/?[^>]+(>|$)/g, ' ')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/\s+/g, ' ')
                      .trim();
                    return cleaned;
                  });
                  
                  console.log(`📋 Row ${i} cells:`, cells);
                  
                  // Skip rows with insufficient data
                  if (cells.length < Math.max(dateIndex, descIndex, debitIndex, creditIndex) + 1) {
                    continue;
                  }
                  
                  const dateCell = dateIndex >= 0 ? cells[dateIndex] : '';
                  const descCell = descIndex >= 0 ? cells[descIndex] : '';
                  const debitCell = debitIndex >= 0 ? cells[debitIndex] : '';
                  const creditCell = creditIndex >= 0 ? cells[creditIndex] : '';
                  
                  // Skip opening/closing balance rows and empty rows
                  if (descCell.toLowerCase().includes('opening balance') || 
                      descCell.toLowerCase().includes('balance brought forward') ||
                      descCell.toLowerCase().includes('closing balance') ||
                      descCell.toLowerCase().includes('total debit') ||
                      descCell.toLowerCase().includes('total credit') ||
                      !descCell.trim() ||
                      descCell.toLowerCase().includes('chq:') && !debitCell && !creditCell) {
                    continue;
                  }
                  
                  // Parse date - handle multiple formats
                  const parsedDate = this.parseFlexibleDate(dateCell);
                  if (!parsedDate) {
                    console.log('📋 Skipping row due to invalid date:', dateCell);
                    continue;
                  }
                  
                  // Parse amounts
                  const debitAmount = this.parseFlexibleAmount(debitCell);
                  const creditAmount = this.parseFlexibleAmount(creditCell);
                  
                  console.log('📋 Parsed amounts:', { debitAmount, creditAmount });
                  
                  if (creditAmount > 0) {
                    // Credit/Deposit transaction
                    transactions.push({
                      date: parsedDate,
                      description: this.cleanDescription(descCell),
                      amount: creditAmount,
                      type: 'income',
                    });
                  } else if (debitAmount > 0) {
                    // Debit/Withdrawal transaction
                    transactions.push({
                      date: parsedDate,
                      description: this.cleanDescription(descCell),
                      amount: debitAmount,
                      type: 'expense',
                    });
                  }
                }
              }
            }
          } else {
            // Fallback: try to parse without header detection
            console.log('📋 No header found, trying fallback parsing');
            this.parseFallbackTable(rowMatches, transactions);
          }
        }
      });
    } else {
      console.log('📋 No tables found, trying text-based parsing');
      // Try text-based parsing as fallback
      this.parseTextBasedTransactions(text, transactions);
    }
    
    console.log('📊 Extracted', transactions.length, 'transactions from PDF');
    return transactions;
  }
  
  /**
   * Find header index by possible names
   */
  private findHeaderIndex(headers: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
      const index = headers.findIndex(h => h.includes(name));
      if (index !== -1) return index;
    }
    return -1;
  }
  
  /**
   * Parse flexible date formats
   */
  private parseFlexibleDate(dateStr: string): string | null {
    if (!dateStr || dateStr.trim() === '') return null;
    
    const cleaned = dateStr.trim().replace(/[^\w\s\-\/]/g, '');
    
    // Handle "Nov - 01" format
    const monthDayMatch = cleaned.match(/(\w+)\s*[-–]\s*(\d{1,2})/);
    if (monthDayMatch) {
      const [, monthStr, day] = monthDayMatch;
      const monthMap: { [key: string]: number } = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
      };
      
      const month = monthMap[monthStr.toLowerCase().substring(0, 3)];
      if (month) {
        const currentYear = new Date().getFullYear();
        return `${currentYear}-${month.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    // Use existing parseDate method for other formats
    return this.parseDate(dateStr);
  }
  
  /**
   * Parse flexible amount formats
   */
  private parseFlexibleAmount(amountStr: string): number {
    if (!amountStr || amountStr.trim() === '') return 0;
    
    console.log('🔍 Parsing amount:', amountStr);
    
    // Remove all non-numeric characters except decimal point and comma
    const cleaned = amountStr.replace(/[^\d.,]/g, '');
    if (!cleaned) return 0;
    
    // Handle comma as thousands separator (Indian format: 1,23,456.78)
    const normalized = cleaned.replace(/,/g, '');
    const amount = parseFloat(normalized);
    
    if (isNaN(amount)) return 0;
    
    console.log('💰 Parsed amount:', amount);
    
    // Keep in dollars
    return amount;
  }
  
  /**
   * Fallback table parsing when headers aren't detected
   */
  private parseFallbackTable(rowMatches: string[], transactions: ParsedTransaction[]): void {
    rowMatches.forEach((row, rowIndex) => {
      // Skip first row (likely header)
      if (rowIndex === 0) return;
      
      const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      
      if (cellMatches && cellMatches.length >= 6) {
        const cells = cellMatches.map(cell => 
          cell.replace(/<\/?[^>]+(>|$)/g, '').trim()
        );
        
        // Assume format: Date, Description, DocNo, ValueDate, DR, CR, Balance
        if (cells.length >= 7) {
          const [dateCell, descCell, , , debitCell, creditCell] = cells;
          
          const parsedDate = this.parseFlexibleDate(dateCell);
          if (!parsedDate) return;
          
          const debitAmount = this.parseFlexibleAmount(debitCell);
          const creditAmount = this.parseFlexibleAmount(creditCell);
          
          if (creditAmount > 0) {
            transactions.push({
              date: parsedDate,
              description: this.cleanDescription(descCell),
              amount: creditAmount,
              type: 'income',
            });
          } else if (debitAmount > 0) {
            transactions.push({
              date: parsedDate,
              description: this.cleanDescription(descCell),
              amount: debitAmount,
              type: 'expense',
            });
          }
        }
      }
    });
  }
  
  /**
   * Text-based parsing as final fallback
   */
  private parseTextBasedTransactions(text: string, transactions: ParsedTransaction[]): void {
    // Look for transaction patterns in plain text
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for date patterns at the start of lines
      const dateMatch = line.match(/^(\w+\s*[-–]\s*\d{1,2})/);
      if (dateMatch && i + 1 < lines.length) {
        const nextLines = lines.slice(i, i + 3).join(' ');
        
        // Look for amount patterns
        const amountMatches = nextLines.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
        if (amountMatches && amountMatches.length >= 2) {
          const parsedDate = this.parseFlexibleDate(dateMatch[1]);
          if (parsedDate) {
            // Extract description (text between date and amounts)
            const descMatch = nextLines.match(new RegExp(`${dateMatch[1]}\\s+([^\\d]+)`));
            const description = descMatch ? descMatch[1].trim() : 'Transaction';
            
            // Assume last amount is balance, second-to-last is transaction amount
            const transactionAmount = this.parseFlexibleAmount(amountMatches[amountMatches.length - 2]);
            
            if (transactionAmount > 0) {
              transactions.push({
                date: parsedDate,
                description: this.cleanDescription(description),
                amount: transactionAmount,
                type: description.toLowerCase().includes('deposit') ? 'income' : 'expense',
              });
            }
          }
        }
      }
    }
  }
  
  /**
   * Clean up transaction descriptions
   */
  private cleanDescription(description: string): string {
    // Remove HTML tags and clean up UPI transaction descriptions
    let cleaned = description.replace(/<[^>]*>/g, ' ').trim();
    
    // Extract meaningful parts from UPI transactions
    if (cleaned.includes('UPI/')) {
      // Extract payee name or merchant
      const upiMatch = cleaned.match(/UPI\/[CD]R\/\d+\/([^\/]+)/);
      if (upiMatch) {
        return `UPI - ${upiMatch[1].trim()}`;
      }
    }
    
    // Handle debit card charges
    if (cleaned.includes('DEBIT CARD') || cleaned.includes('PLATINUM DEBIT CARD')) {
      return 'Debit Card Annual Charges';
    }
    
    // Limit description length
    if (cleaned.length > 100) {
      cleaned = cleaned.substring(0, 100) + '...';
    }
    
    return cleaned || 'Unknown Transaction';
  }

  /**
   * Find column index by possible header names
   */
  private findColumnIndex(headers: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
      const index = headers.findIndex(h => h.includes(name));
      if (index !== -1) return index;
    }
    return -1;
  }

  /**
   * Parse various date formats
   */
  private parseDate(dateStr: string): string {
    try {
      // Remove extra whitespace and common prefixes
      const cleaned = dateStr.trim().replace(/^(date|posting|transaction):\s*/i, '');
      
      // Handle "Nov - 01" format first
      const monthDayMatch = cleaned.match(/(\w+)\s*[-–]\s*(\d{1,2})/);
      if (monthDayMatch) {
        const [, monthStr, day] = monthDayMatch;
        const monthMap: { [key: string]: number } = {
          'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
          'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        };
        
        const month = monthMap[monthStr.toLowerCase().substring(0, 3)];
        if (month) {
          const currentYear = new Date().getFullYear();
          return `${currentYear}-${month.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
      
      // Try parsing different formats
      const formats = [
        /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY (Indian format)
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{1,2})\/(\d{1,2})\/(\d{2})/, // MM/DD/YY
        /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
      ];

      for (const format of formats) {
        const match = cleaned.match(format);
        if (match) {
          let [, part1, part2, part3] = match;
          
          // Handle different date formats
          if (part3.length === 4) {
            // For DD-MM-YYYY format (first in our formats array)
            if (format === formats[0]) {
              const date = new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1));
              if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
              }
            } else {
              // MM/DD/YYYY format
              const date = new Date(parseInt(part3), parseInt(part1) - 1, parseInt(part2));
              if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
              }
            }
          } else if (part1.length === 4) {
            // YYYY-MM-DD
            const date = new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3));
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          }
        }
      }

      // Fallback to current date if parsing fails
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.warn('Error parsing date:', dateStr, error);
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Guess transaction category based on description
   */
  private guessCategory(description: string, type: 'income' | 'expense'): string {
    const desc = description.toLowerCase();

    if (type === 'income') {
      if (desc.includes('salary') || desc.includes('payroll') || desc.includes('wage')) return 'Salary';
      if (desc.includes('freelance') || desc.includes('contract')) return 'Freelance';
      if (desc.includes('dividend') || desc.includes('interest') || desc.includes('investment')) return 'Investment';
      return 'Other Income';
    } else {
      // Expense categories
      if (desc.includes('grocery') || desc.includes('food') || desc.includes('restaurant') || desc.includes('cafe')) return 'Food & Dining';
      if (desc.includes('gas') || desc.includes('fuel') || desc.includes('uber') || desc.includes('taxi')) return 'Transportation';
      if (desc.includes('amazon') || desc.includes('store') || desc.includes('shop')) return 'Shopping';
      if (desc.includes('electric') || desc.includes('water') || desc.includes('internet') || desc.includes('phone')) return 'Bills & Utilities';
      if (desc.includes('movie') || desc.includes('netflix') || desc.includes('spotify')) return 'Entertainment';
      if (desc.includes('doctor') || desc.includes('pharmacy') || desc.includes('medical')) return 'Healthcare';
      if (desc.includes('rent') || desc.includes('mortgage') || desc.includes('insurance')) return 'Bills & Utilities';
      return 'Other';
    }
  }

  /**
   * Validate parsed transactions
   */
  validateTransactions(transactions: ParsedTransaction[]): {
    valid: ParsedTransaction[];
    invalid: Array<{ transaction: ParsedTransaction; errors: string[] }>;
  } {
    const valid: ParsedTransaction[] = [];
    const invalid: Array<{ transaction: ParsedTransaction; errors: string[] }> = [];

    for (const transaction of transactions) {
      const errors: string[] = [];

      // Validate date
      if (!transaction.date || isNaN(new Date(transaction.date).getTime())) {
        errors.push('Invalid date');
      }

      // Validate amount
      if (!transaction.amount || transaction.amount <= 0) {
        errors.push('Invalid amount');
      }

      // Validate description
      if (!transaction.description || transaction.description.trim().length === 0) {
        errors.push('Missing description');
      }

      if (errors.length === 0) {
        valid.push(transaction);
      } else {
        invalid.push({ transaction, errors });
      }
    }

    return { valid, invalid };
  }
}

export const nanonetsAPI = new NanonetsAPI();
