/**
 * Scheduled Transactions Module
 * Implements recurring transactions like YNAB
 */

export interface ScheduledTransaction {
  id: string;
  payee: string;
  amount: number;
  category: string;
  account: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  nextDate: string;
  autoEnter: boolean;
  notes?: string;
  enabled: boolean;
}

export class ScheduledTransactionManager {
  private schedules: ScheduledTransaction[] = [];
  
  constructor() {
    this.loadSchedules();
  }
  
  // Load schedules from storage
  private loadSchedules() {
    const stored = localStorage.getItem('scheduled_transactions');
    if (stored) {
      this.schedules = JSON.parse(stored);
    }
  }
  
  // Save schedules to storage
  private saveSchedules() {
    localStorage.setItem('scheduled_transactions', JSON.stringify(this.schedules));
  }
  
  // Add new scheduled transaction
  addSchedule(schedule: Omit<ScheduledTransaction, 'id' | 'nextDate'>): string {
    const id = crypto.randomUUID();
    const nextDate = this.calculateNextDate(schedule.startDate, schedule.frequency);
    
    const newSchedule: ScheduledTransaction = {
      ...schedule,
      id,
      nextDate
    };
    
    this.schedules.push(newSchedule);
    this.saveSchedules();
    
    return id;
  }
  
  // Update scheduled transaction
  updateSchedule(id: string, updates: Partial<ScheduledTransaction>) {
    const index = this.schedules.findIndex(s => s.id === id);
    if (index !== -1) {
      this.schedules[index] = { ...this.schedules[index], ...updates };
      
      // Recalculate next date if frequency changed
      if (updates.frequency) {
        this.schedules[index].nextDate = this.calculateNextDate(
          this.schedules[index].startDate,
          updates.frequency
        );
      }
      
      this.saveSchedules();
    }
  }
  
  // Delete scheduled transaction
  deleteSchedule(id: string) {
    this.schedules = this.schedules.filter(s => s.id !== id);
    this.saveSchedules();
  }
  
  // Get all schedules
  getSchedules(): ScheduledTransaction[] {
    return this.schedules;
  }
  
  // Get schedules due today
  getDueSchedules(): ScheduledTransaction[] {
    const today = new Date().toISOString().split('T')[0];
    return this.schedules.filter(s => 
      s.enabled && 
      s.nextDate <= today &&
      (!s.endDate || s.nextDate <= s.endDate)
    );
  }
  
  // Calculate next occurrence date
  private calculateNextDate(fromDate: string, frequency: string): string {
    const date = new Date(fromDate);
    
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'biweekly':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    
    return date.toISOString().split('T')[0];
  }
  
  // Process scheduled transactions
  async processScheduledTransactions(addTransaction: (tx: any) => Promise<void>) {
    const due = this.getDueSchedules();
    const processed: string[] = [];
    
    for (const schedule of due) {
      try {
        // Create transaction from schedule
        await addTransaction({
          payee: schedule.payee,
          amount: schedule.amount,
          category: schedule.category,
          account: schedule.account,
          date: schedule.nextDate,
          notes: schedule.notes || `Scheduled: ${schedule.payee}`,
          scheduled: true
        });
        
        // Update next date
        schedule.nextDate = this.calculateNextDate(schedule.nextDate, schedule.frequency);
        
        // Disable if past end date
        if (schedule.endDate && schedule.nextDate > schedule.endDate) {
          schedule.enabled = false;
        }
        
        processed.push(schedule.id);
      } catch (error) {
        console.error(`Failed to process scheduled transaction ${schedule.id}:`, error);
      }
    }
    
    if (processed.length > 0) {
      this.saveSchedules();
    }
    
    return processed;
  }
  
  // Get upcoming schedules for preview
  getUpcoming(days: number = 30): ScheduledTransaction[] {
    const future = new Date();
    future.setDate(future.getDate() + days);
    const futureDate = future.toISOString().split('T')[0];
    
    return this.schedules.filter(s =>
      s.enabled &&
      s.nextDate <= futureDate &&
      (!s.endDate || s.nextDate <= s.endDate)
    ).sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  }
}

// Singleton instance
export const scheduledTransactions = new ScheduledTransactionManager();
