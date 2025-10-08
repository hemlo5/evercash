// Actual Budget API Client
// Connects to Actual Budget sync-server on localhost:5006

export interface ApiConfig {
  baseUrl: string;
  token?: string;
}

export interface BudgetMonth {
  month: string;
  incomeAvailable: number;
  lastMonthOverspent: number;
  forNextMonth: number;
  totalBudgeted: number;
  toBudget: number;
  fromLastMonth: number;
  totalIncome: number;
  totalSpent: number;
  totalBalance: number;
  categoryGroups: CategoryGroup[];
}

export interface CategoryGroup {
  id: string;
  name: string;
  is_income: boolean;
  hidden?: boolean;
  budgeted?: number;
  spent?: number;
  balance?: number;
  received?: number;
  categories: Category[];
}

export interface Category {
  id: string;
  name: string;
  group_id: string;
  is_income: boolean;
  hidden?: boolean;
  budgeted?: number;
  spent?: number;
  balance?: number;
  carryover?: boolean;
  received?: number;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  offbudget: boolean;
  closed: boolean;
  balance?: number;
  bank?: string;
  account_sync_source?: string;
}

export interface Transaction {
  id: string;
  account: string;
  payee?: string;
  payee_name?: string;
  imported_payee?: string;
  category?: string;
  date: string;
  amount: number;
  notes?: string;
  imported_id?: string;
  transfer_id?: string;
  cleared?: boolean;
  reconciled?: boolean;
  subtransactions?: Transaction[];
}

export interface Payee {
  id: string;
  name: string;
  category?: string;
  transfer_acct?: string;
}

export interface Schedule {
  id: string;
  name: string;
  next_date: string;
  completed: boolean;
  posts_transaction: boolean;
  rule?: any;
  _conditions?: any[];
}

export interface Rule {
  id: string;
  stage: string;
  conditions: any[];
  actions: any[];
}

export interface Budget {
  id: string;
  name: string;
  cloudFileId?: string;
  groupId?: string;
  owner?: string;
  deleted?: boolean;
}

export class ActualAPI {
  private config: ApiConfig;
  private initialized: boolean = false;
  
  // In-memory data store for mock data
  private mockData = {
    accounts: [
      {
        id: 'checking-1',
        name: 'Checking Account',
        type: 'checking',
        offbudget: false,
        closed: false,
        balance: 250000, // $2500.00
      },
      {
        id: 'savings-1',
        name: 'Savings Account',
        type: 'savings',
        offbudget: false,
        closed: false,
        balance: 500000, // $5000.00
      },
      {
        id: 'credit-1',
        name: 'Credit Card',
        type: 'credit',
        offbudget: false,
        closed: false,
        balance: -15000, // -$150.00
      },
    ] as Account[],
    transactions: [
      {
        id: 'tx-1',
        account: 'checking-1',
        amount: -5000, // -$50.00
        payee_name: 'Grocery Store',
        category: 'groceries',
        notes: 'Weekly shopping',
        date: '2025-10-05',
        cleared: true,
      },
      {
        id: 'tx-2',
        account: 'checking-1',
        amount: -3000, // -$30.00
        payee_name: 'Gas Station',
        category: 'transportation',
        notes: 'Fill up',
        date: '2025-10-04',
        cleared: true,
      },
      {
        id: 'tx-3',
        account: 'checking-1',
        amount: 300000, // $3000.00
        payee_name: 'Salary',
        category: 'income',
        notes: 'Monthly salary',
        date: '2025-10-01',
        cleared: true,
      },
    ] as Transaction[],
    categories: [
      {
        id: 'groceries',
        name: 'Groceries',
        group_id: 'everyday',
        is_income: false,
        budgeted: 50000, // $500.00
        spent: 30000,    // $300.00
        balance: 20000,  // $200.00
      },
      {
        id: 'dining',
        name: 'Dining Out',
        group_id: 'everyday',
        is_income: false,
        budgeted: 20000, // $200.00
        spent: 15000,    // $150.00
        balance: 5000,   // $50.00
      },
      {
        id: 'transportation',
        name: 'Transportation',
        group_id: 'everyday',
        is_income: false,
        budgeted: 15000, // $150.00
        spent: 3000,     // $30.00
        balance: 12000,  // $120.00
      },
      {
        id: 'income',
        name: 'Income',
        group_id: 'income-group',
        is_income: true,
        received: 300000, // $3000.00
      }
    ] as Category[],
    payees: [
      { id: 'payee-1', name: 'Grocery Store' },
      { id: 'payee-2', name: 'Gas Station' },
      { id: 'payee-3', name: 'Restaurant' },
      { id: 'payee-4', name: 'Online Store' },
      { id: 'payee-5', name: 'Utility Company' },
    ] as Payee[],
  };

  constructor(config: ApiConfig) {
    this.config = config;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Ensure endpoint starts with a slash
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.config.baseUrl}${normalizedEndpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error (${response.status}): ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Request failed:', endpoint, error);
      throw error;
    }
  }

  async init(): Promise<void> {
    try {
      // Check if server is responding
      const response = await fetch(`${this.config.baseUrl}/`);
      if (response.ok) {
        this.initialized = true;
        console.log('Connected to Actual Budget server');
      } else {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to connect to Actual Budget server:', error);
    }
  }

  // Authentication
  async login(password: string): Promise<{ token: string; message?: string }> {
    try {
      const response = await this.request<any>('/account/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      
      if (response.status === 'ok' && response.data?.token) {
        this.token = response.data.token;
        
        // Load a budget file after login
        await this.loadBudget();
        
        return { 
          token: response.data.token,
          message: response.data.message
        };
      }
      throw new Error('Login failed');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Helper to load a budget file
  async loadBudget(): Promise<void> {
    try {
      // Get list of budget files
      const files = await this.request<any[]>('/sync/list-user-files', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      
      if (files && files.length > 0) {
        // Load the first budget file
        const fileId = files[0].fileId || files[0].groupId;
        await this.request('/sync/sync', {
          method: 'POST',
          body: JSON.stringify({
            id: fileId,
            groupId: fileId,
            since: null,
          }),
        });
        console.log('Budget loaded:', fileId);
      }
    } catch (error) {
      console.warn('Could not load budget:', error);
    }
  }

  // Account Management
  async getAccounts(): Promise<Account[]> {
    try {
      // Use the sync endpoint to get accounts
      const response = await this.request<any>('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              dataset: 'accounts',
              row: null,
              column: null,
            },
          ],
        }),
      });
      
      // Parse the response to get accounts
      const accounts = response?.messages?.find((m: any) => m.dataset === 'accounts')?.data || [];
      
      return accounts.map((account: any) => ({
        id: account.id || account.account_id,
        name: account.name || 'Unnamed Account',
        type: account.type || 'checking',
        offbudget: account.offbudget === 1,
        closed: account.closed === 1,
        balance: account.balance || 0,
        bank: account.bank,
        account_sync_source: account.account_sync_source,
      }));
    } catch (error) {
      console.error('Failed to get accounts:', error);
      // Return empty array on error
      return [];
    }
  }

  // Transactions
  async getTransactions(accountId?: string, startDate?: string, endDate?: string): Promise<Transaction[]> {
    try {
      // Use the sync endpoint to get transactions
      const messages: any[] = [
        {
          dataset: 'transactions',
          row: null,
          column: null,
        },
      ];
      
      const response = await this.request<any>('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });
      
      // Parse the response to get transactions
      const transactions = response?.messages?.find((m: any) => m.dataset === 'transactions')?.data || [];
      
      return transactions
        .filter((tx: any) => {
          // Apply filters
          if (accountId && tx.account !== accountId) return false;
          if (startDate && tx.date < startDate.replace(/-/g, '')) return false;
          if (endDate && tx.date > endDate.replace(/-/g, '')) return false;
          return true;
        })
        .map((tx: any) => ({
          id: tx.id || tx.transaction_id,
          account: tx.account,
          payee: tx.payee || undefined,
          payee_name: tx.payee_name || undefined,
          imported_payee: tx.imported_payee || undefined,
          category: tx.category || undefined,
          date: tx.date ? `${tx.date.slice(0,4)}-${tx.date.slice(4,6)}-${tx.date.slice(6,8)}` : new Date().toISOString().split('T')[0],
          amount: tx.amount || 0,
          notes: tx.notes || undefined,
          imported_id: tx.imported_id || undefined,
          transfer_id: tx.transfer_id || undefined,
          cleared: tx.cleared === 1,
          reconciled: tx.reconciled === 1,
          subtransactions: [],
        }));
    } catch (error) {
      console.error('Failed to get transactions:', error);
      return [];
    }
  }

  // Payee Management
  async getPayees(): Promise<Payee[]> {
    try {
      const response = await this.request<any>('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              dataset: 'payees',
              row: null,
              column: null,
            },
          ],
        }),
      });
      
      const payees = response?.messages?.find((m: any) => m.dataset === 'payees')?.data || [];
      
      return payees.map((payee: any) => ({
        id: payee.id || payee.payee_id,
        name: payee.name || 'Unknown',
        category: payee.category,
        transfer_acct: payee.transfer_acct,
      }));
    } catch (error) {
      console.error('Failed to get payees:', error);
      return [];
    }
  }

  // Category Management
  async getCategories(grouped: boolean = false): Promise<Category[] | CategoryGroup[]> {
    try {
      const response = await this.request<any>('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              dataset: 'categories',
              row: null,
              column: null,
            },
            {
              dataset: 'category_groups',
              row: null,
              column: null,
            },
          ],
        }),
      });
      
      const categories = response?.messages?.find((m: any) => m.dataset === 'categories')?.data || [];
      const groups = response?.messages?.find((m: any) => m.dataset === 'category_groups')?.data || [];
      
      if (grouped) {
        return groups.map((group: any) => ({
          id: group.id || group.group_id,
          name: group.name || 'Unnamed Group',
          is_income: group.is_income === 1,
          hidden: group.hidden === 1,
          categories: categories
            .filter((cat: any) => cat.cat_group === group.id)
            .map((cat: any) => ({
              id: cat.id || cat.category_id,
              name: cat.name || 'Unnamed Category',
              group_id: cat.cat_group,
              is_income: cat.is_income === 1,
              hidden: cat.hidden === 1,
              budgeted: 0,
              spent: 0,
              balance: 0,
            })),
        }));
      }
      
      return categories.map((cat: any) => ({
        id: cat.id || cat.category_id,
        name: cat.name || 'Unnamed Category',
        group_id: cat.cat_group,
        is_income: cat.is_income === 1,
        hidden: cat.hidden === 1,
        budgeted: 0,
        spent: 0,
        balance: 0,
      }));
    } catch (error) {
      console.error('Failed to get categories:', error);
      return [];
    }
  }

  // Budget Management
  async getBudgetMonth(month: string): Promise<BudgetMonth> {
    try {
      // Try the dedicated budget endpoint first
      const budgetData = await this.request<BudgetMonth>(`/budget/${month}`);
      console.log('Budget data from dedicated endpoint:', budgetData);
      return budgetData;
    } catch (error) {
      console.error('Error fetching budget month from dedicated endpoint, falling back to sync:', error);
      
      try {
        // Fallback to the old method using sync
        const categoryGroups = await this.getCategories(true) as CategoryGroup[];
        
        // Calculate totals
        let totalIncome = 0;
        let totalBudgeted = 0;
        let totalSpent = 0;
        
        categoryGroups.forEach(group => {
          group.categories.forEach(cat => {
            if (group.is_income) {
              totalIncome += Math.abs(cat.received || 0);
            } else {
              totalBudgeted += cat.budgeted || 0;
              totalSpent += Math.abs(cat.spent || 0);
            }
          });
        });
        
        console.log('Budget data from fallback method:', {
          totalIncome,
          totalBudgeted,
          totalSpent,
          categoryGroups: categoryGroups.length
        });
        
        return {
          month,
          incomeAvailable: totalIncome,
          lastMonthOverspent: 0,
          forNextMonth: 0,
          totalBudgeted,
          toBudget: totalIncome - totalBudgeted,
          fromLastMonth: 0,
          totalIncome,
          totalSpent,
          totalBalance: totalBudgeted - totalSpent,
          categoryGroups,
        };
      } catch (fallbackError) {
        console.error('Both budget methods failed:', fallbackError);
        
        // Return empty data structure to prevent crashes
        return {
          month,
          incomeAvailable: 0,
          lastMonthOverspent: 0,
          forNextMonth: 0,
          totalBudgeted: 0,
          toBudget: 0,
          fromLastMonth: 0,
          totalIncome: 0,
          totalSpent: 0,
          totalBalance: 0,
          categoryGroups: [],
        };
      }
    }
  }

  // Budget Management Methods
  async setBudgetAmount(month: string, categoryId: string, amount: number): Promise<void> {
    console.log('Setting budget amount:', { month, categoryId, amount });
    
    try {
      // Use a direct API call to update the budget
      const response = await this.request<any>('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              dataset: 'categories',
              row: {
                id: categoryId,
                budgeted: amount,
              },
            },
          ],
        }),
      });
      
      console.log('Budget update response:', response);
      
      // Also try to update via a direct budget endpoint if available
      try {
        await this.request<any>(`/budget/${month}/category/${categoryId}`, {
          method: 'PUT',
          body: JSON.stringify({
            budgeted: amount,
          }),
        });
        console.log('Budget updated via direct endpoint');
      } catch (directError) {
        console.log('Direct budget endpoint not available, using sync only');
      }
      
    } catch (error) {
      console.error('Error setting budget amount:', error);
      throw error;
    }
  }

  async setBudgetCarryover(month: string, categoryId: string, flag: boolean): Promise<void> {
    console.log('Setting budget carryover:', { month, categoryId, flag });
  }

  async getBudgetMonths(): Promise<string[]> {
    // Return mock data for available budget months
    const currentDate = new Date();
    const months = [];
    for (let i = -6; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      months.push(date.toISOString().slice(0, 7)); // YYYY-MM format
    }
    return months;
  }

  // Transaction Management
  async addTransactions(accountId: string, transactions: Partial<Transaction>[]): Promise<void> {
    try {
      const messages = transactions.map(tx => ({
        dataset: 'transactions',
        row: {
          id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          account: accountId,
          date: (tx.date || new Date().toISOString().split('T')[0]).replace(/-/g, ''),
          amount: tx.amount || 0,
          payee: tx.payee || null,
          payee_name: tx.payee_name || null,
          category: tx.category || null,
          notes: tx.notes || null,
          cleared: tx.cleared ? 1 : 0,
          reconciled: tx.reconciled ? 1 : 0,
        },
        column: null,
      }));
      
      await this.request('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });
    } catch (error) {
      console.error('Failed to add transactions:', error);
      throw error;
    }
  }

  async updateTransaction(id: string, fields: Partial<Transaction>): Promise<void> {
    try {
      const message = {
        dataset: 'transactions',
        row: {
          id,
          ...fields,
          date: fields.date ? fields.date.replace(/-/g, '') : undefined,
          cleared: fields.cleared !== undefined ? (fields.cleared ? 1 : 0) : undefined,
          reconciled: fields.reconciled !== undefined ? (fields.reconciled ? 1 : 0) : undefined,
        },
        column: null,
      };
      
      await this.request('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({ messages: [message] }),
      });
    } catch (error) {
      console.error('Failed to update transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    try {
      const message = {
        dataset: 'transactions',
        row: { id, tombstone: 1 },
        column: null,
      };
      
      await this.request('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({ messages: [message] }),
      });
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    }
  }

  // Account Management
  async createAccount(account: Partial<Account>): Promise<string> {
    try {
      const accountId = `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const message = {
        dataset: 'accounts',
        row: {
          id: accountId,
          name: account.name || 'New Account',
          type: account.type || 'checking',
          offbudget: account.offbudget ? 1 : 0,
          closed: 0,
          balance: account.balance || 0,
          starting_balance: account.balance || 0,
        },
        column: null,
      };
      
      await this.request('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({ messages: [message] }),
      });
      
      return accountId;
    } catch (error) {
      console.error('Failed to create account:', error);
      throw error;
    }
  }

  async updateAccount(id: string, fields: Partial<Account>): Promise<void> {
    try {
      const message = {
        dataset: 'accounts',
        row: {
          id,
          ...fields,
          offbudget: fields.offbudget !== undefined ? (fields.offbudget ? 1 : 0) : undefined,
          closed: fields.closed !== undefined ? (fields.closed ? 1 : 0) : undefined,
        },
        column: null,
      };
      
      await this.request('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({ messages: [message] }),
      });
    } catch (error) {
      console.error('Failed to update account:', error);
      throw error;
    }
  }

  async deleteAccount(id: string): Promise<void> {
    try {
      const message = {
        dataset: 'accounts',
        row: { id, tombstone: 1 },
        column: null,
      };
      
      await this.request('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({ messages: [message] }),
      });
    } catch (error) {
      console.error('Failed to delete account:', error);
      throw error;
    }
  }

  async closeAccount(id: string, transferAccountId?: string, transferCategoryId?: string): Promise<void> {
    console.log('Closing account:', { id, transferAccountId, transferCategoryId });
  }

  async reopenAccount(id: string): Promise<void> {
    console.log('Reopening account:', id);
  }

  // Category Management
  async createCategory(category: Partial<Category>): Promise<string> {
    console.log('Creating category:', category);
    return 'new-category-id';
  }

  async updateCategory(id: string, fields: Partial<Category>): Promise<void> {
    console.log('Updating category:', { id, fields });
  }

  async deleteCategory(id: string, transferCategoryId?: string): Promise<void> {
    console.log('Deleting category:', { id, transferCategoryId });
  }

  // Category Group Management
  async getCategoryGroups(): Promise<CategoryGroup[]> {
    return [
      {
        id: 'everyday',
        name: 'Everyday Expenses',
        is_income: false,
        budgeted: 70000,
        spent: 45000,
        balance: 25000,
        categories: [],
      },
      {
        id: 'income-group',
        name: 'Income',
        is_income: true,
        received: 300000,
        categories: [],
      },
    ];
  }

  async createCategoryGroup(group: Partial<CategoryGroup>): Promise<string> {
    console.log('Creating category group:', group);
    return 'new-group-id';
  }

  async updateCategoryGroup(id: string, fields: Partial<CategoryGroup>): Promise<void> {
    console.log('Updating category group:', { id, fields });
  }

  async deleteCategoryGroup(id: string, transferCategoryId?: string): Promise<void> {
    console.log('Deleting category group:', { id, transferCategoryId });
  }

  // Payee Management
  async createPayee(payee: Partial<Payee>): Promise<string> {
    console.log('Creating payee:', payee);
    return 'new-payee-id';
  }

  async updatePayee(id: string, fields: Partial<Payee>): Promise<void> {
    console.log('Updating payee:', { id, fields });
  }

  async deletePayee(id: string): Promise<void> {
    console.log('Deleting payee:', id);
  }

  async mergePayees(targetId: string, mergeIds: string[]): Promise<void> {
    console.log('Merging payees:', { targetId, mergeIds });
  }

  // Utility Methods
  async getServerVersion(): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseUrl}/`);
      if (response.ok) {
        const data = await response.json();
        return data.version || 'unknown';
      }
      return 'unknown';
    } catch (error) {
      console.error('Failed to get server version:', error);
      return 'unknown';
    }
  }

  async sync(): Promise<void> {
    console.log('Syncing with server...');
  }

  async downloadBudget(syncId: string, password?: string): Promise<void> {
    console.log('Downloading budget:', { syncId, password: password ? '[HIDDEN]' : undefined });
  }

  // Server info
  async getServerVersion(): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseUrl}/`);
      if (response.ok) {
        const data = await response.json();
        return data.version || '1.0.0';
      }
      return '1.0.0';
    } catch (error) {
      console.error('Failed to get server version:', error);
      return '1.0.0';
    }
  }

  // Account management
  async getAccounts(): Promise<Account[]> {
    try {
      const response = await this.request<any>('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ dataset: 'accounts', row: null, column: null }],
        }),
      });
      const accounts = response?.messages?.find((m: any) => m.dataset === 'accounts')?.data || [];
      return accounts.map((account: any) => ({
        id: account.id || account.account_id,
        name: account.name || 'Unnamed Account',
        type: account.type || 'checking',
        offbudget: account.offbudget === 1,
        closed: account.closed === 1,
        balance: account.balance || 0,
        bank: account.bank,
        account_sync_source: account.account_sync_source,
      }));
    } catch (error) {
      console.error('Failed to get accounts:', error);
      return [];
    }
  }

  // Transaction management
  async getTransactions(accountId?: string, startDate?: string, endDate?: string): Promise<Transaction[]> {
    try {
      const messages: any[] = [{ dataset: 'transactions', row: null, column: null }];
      const response = await this.request<any>('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });
      const transactions = response?.messages?.find((m: any) => m.dataset === 'transactions')?.data || [];
      return transactions
        .filter((tx: any) => {
          if (accountId && tx.account !== accountId) return false;
          if (startDate && tx.date < startDate.replace(/-/g, '')) return false;
          if (endDate && tx.date > endDate.replace(/-/g, '')) return false;
          return true;
        })
        .map((tx: any) => ({
          id: tx.id || tx.transaction_id,
          account: tx.account,
          payee: tx.payee || undefined,
          payee_name: tx.payee_name || undefined,
          imported_payee: tx.imported_payee || undefined,
          category: tx.category || undefined,
          date: tx.date,
          amount: tx.amount,
          notes: tx.notes || undefined,
          imported_id: tx.imported_id || undefined,
          transfer_id: tx.transfer_id || undefined,
          cleared: tx.cleared === 1,
          reconciled: tx.reconciled === 1,
        }));
    } catch (error) {
      console.error('Failed to get transactions:', error);
      return [];
    }
  }

  async addTransactions(accountId: string, transactions: Partial<Transaction>[]): Promise<void> {
    try {
      const messages = transactions.map(tx => ({
        dataset: 'transactions',
        row: {
          id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          account: accountId,
          ...tx,
          amount: tx.amount || 0,
          date: tx.date || new Date().toISOString().split('T')[0],
        },
        column: null,
      }));
      await this.request('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });
    } catch (error) {
      console.error('Failed to add transactions:', error);
      throw error;
    }
  }

  async updateTransaction(id: string, fields: Partial<Transaction>): Promise<void> {
    try {
      const message = {
        dataset: 'transactions',
        row: { id, ...fields },
        column: null,
      };
      await this.request('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({ messages: [message] }),
      });
    } catch (error) {
      console.error('Failed to update transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    try {
      const message = {
        dataset: 'transactions',
        row: { id, tombstone: 1 },
        column: null,
      };
      await this.request('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({ messages: [message] }),
      });
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    }
  }

  // Payee management  
  async getPayees(): Promise<Payee[]> {
    try {
      const response = await this.request<any>('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ dataset: 'payees', row: null, column: null }],
        }),
      });
      const payees = response?.messages?.find((m: any) => m.dataset === 'payees')?.data || [];
      return payees.map((payee: any) => ({
        id: payee.id || payee.payee_id,
        name: payee.name || 'Unknown',
        category: payee.category || undefined,
        transfer_acct: payee.transfer_acct || undefined,
      }));
    } catch (error) {
      console.error('Failed to get payees:', error);
      return [];
    }
  }

  // Category management
  async getCategories(grouped?: boolean): Promise<Category[] | CategoryGroup[]> {
    try {
      const response = await this.request<any>('/sync/sync', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { dataset: 'categories', row: null, column: null },
            { dataset: 'category_groups', row: null, column: null },
          ],
        }),
      });
      
      const categories = response?.messages?.find((m: any) => m.dataset === 'categories')?.data || [];
      const groups = response?.messages?.find((m: any) => m.dataset === 'category_groups')?.data || [];
      
      if (grouped && groups.length > 0) {
        return groups.map((group: any) => ({
          id: group.id,
          name: group.name,
          is_income: group.is_income === 1,
          hidden: group.hidden === 1,
          categories: categories
            .filter((cat: any) => cat.cat_group === group.id)
            .map((cat: any) => ({
              id: cat.id,
              name: cat.name,
              group_id: cat.cat_group,
              is_income: group.is_income === 1,
              hidden: cat.hidden === 1,
              budgeted: cat.budgeted || 0,
              spent: cat.spent || 0,
              balance: cat.balance || 0,
            })),
        }));
      }
      
      return categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        group_id: cat.cat_group,
        is_income: cat.is_income === 1,
        hidden: cat.hidden === 1,
        budgeted: cat.budgeted || 0,
        spent: cat.spent || 0,
        balance: cat.balance || 0,
      }));
    } catch (error) {
      console.error('Failed to get categories:', error);
      return [];
    }
  }
}

// Global API instance
let apiInstance: ActualAPI | null = null;

export async function initAPI(config?: ApiConfig) {
  if (!config) {
    config = {
      baseUrl: 'http://localhost:5006',
      token: localStorage.getItem('actual-token') || undefined,
    };
  }

  apiInstance = new ActualAPI(config);
  await apiInstance.init();
  return apiInstance;
}

export function getAPI(): ActualAPI {
  if (!apiInstance) {
    throw new Error('API not initialized. Call initAPI() first.');
  }
  return apiInstance;
}
