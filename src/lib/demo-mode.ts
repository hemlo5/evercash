/**
 * Demo Mode - Works without Actual Budget backend
 * Stores all data locally in localStorage
 */

export class DemoAPI {
  private prefix = 'emerald_demo_';
  
  // Initialize demo data
  init() {
    console.log('🎯 Running in DEMO MODE - No backend required!');
    
    // Create demo accounts if none exist
    if (!this.getAccounts().length) {
      this.createDemoData();
    }
    
    return Promise.resolve();
  }

  // Create demo data
  private createDemoData() {
    // Demo accounts
    const accounts = [
      { id: 'demo-1', name: 'Checking Account', balance: 250000, type: 'checking' },
      { id: 'demo-2', name: 'Savings Account', balance: 500000, type: 'savings' },
      { id: 'demo-3', name: 'Credit Card', balance: -150000, type: 'credit' }
    ];
    localStorage.setItem(this.prefix + 'accounts', JSON.stringify(accounts));
    
    // Demo categories
    const categories = [
      { id: 'cat-1', name: 'Dining Out', group_id: 'group-1' },
      { id: 'cat-2', name: 'Groceries', group_id: 'group-1' },
      { id: 'cat-3', name: 'Shopping', group_id: 'group-2' },
      { id: 'cat-4', name: 'Entertainment', group_id: 'group-2' },
      { id: 'cat-5', name: 'Transportation', group_id: 'group-3' },
      { id: 'cat-6', name: 'Income', group_id: 'group-income' }
    ];
    localStorage.setItem(this.prefix + 'categories', JSON.stringify(categories));
    
    // Demo transactions
    const transactions = [];
    localStorage.setItem(this.prefix + 'transactions', JSON.stringify(transactions));
  }

  // Get accounts
  getAccounts() {
    const data = localStorage.getItem(this.prefix + 'accounts');
    return data ? JSON.parse(data) : [];
  }

  // Get transactions
  getTransactions() {
    const data = localStorage.getItem(this.prefix + 'transactions');
    return data ? JSON.parse(data) : [];
  }

  // Add transactions
  addTransactions(accountId: string, transactions: any[]) {
    const existing = this.getTransactions();
    const newTransactions = transactions.map(tx => ({
      ...tx,
      id: tx.id || crypto.randomUUID(),
      account: accountId,
      date: tx.date || new Date().toISOString(),
      created_at: new Date().toISOString()
    }));
    
    const updated = [...existing, ...newTransactions];
    localStorage.setItem(this.prefix + 'transactions', JSON.stringify(updated));
    
    console.log(`✅ Added ${newTransactions.length} transactions to demo storage`);
    return Promise.resolve(newTransactions);
  }

  // Get categories
  getCategories() {
    const data = localStorage.getItem(this.prefix + 'categories');
    return data ? JSON.parse(data) : [];
  }

  // Get payees
  getPayees() {
    const data = localStorage.getItem(this.prefix + 'payees');
    return data ? JSON.parse(data) : [];
  }

  // Get budget month
  getBudgetMonth(month: string) {
    const categories = this.getCategories();
    return {
      month,
      categories: categories.map((cat: any) => ({
        ...cat,
        budgeted: 10000,
        spent: Math.floor(Math.random() * 10000),
        balance: 5000
      }))
    };
  }

  // Clear all demo data
  clearDemoData() {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key));
    console.log('🗑️ Demo data cleared');
  }

  // Get stats
  getStats() {
    const accounts = this.getAccounts();
    const transactions = this.getTransactions();
    const totalBalance = accounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
    
    return {
      mode: 'DEMO',
      accounts: accounts.length,
      transactions: transactions.length,
      totalBalance: totalBalance / 100,
      message: '📊 Using local demo storage - no backend required!'
    };
  }
}

// Export singleton
export const demoAPI = new DemoAPI();
