// Supabase-compatible API client for EVERCASH
export interface SupabaseAccount {
  id: string;
  name: string;
  type: string;
  balance: number; // in cents
  closed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseTransaction {
  id: string;
  account_id: string;
  amount: number; // in cents
  date: string;
  notes?: string;
  payee_id?: string;
  category_id?: string;
  cleared: boolean;
  imported: boolean;
  created_at?: string;
}

export interface SupabaseCategory {
  id: string;
  name: string;
  cat_group?: string;
  is_income: boolean;
  sort_order: number;
}

export interface SupabasePayee {
  id: string;
  name: string;
}

export class SupabaseAPI {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Don't get token in constructor, get it fresh each time
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Get fresh token each time
    const token = localStorage.getItem('actual-token');
    console.log('🔑 Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'null');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔐 Authorization header set:', `Bearer ${token.substring(0, 20)}...`);
    } else {
      console.warn('⚠️ No token found in localStorage!');
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      throw new Error(`API Error (${response.status}): ${JSON.stringify(errorData)}`);
    }

    const data = await response.text();
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  // Authentication
  async login(password: string): Promise<{ token: string }> {
    const response = await this.request('/account/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });

    if (response.status === 'ok' && response.data.token) {
      this.token = response.data.token;
      localStorage.setItem('actual-token', this.token);
      return { token: this.token };
    }

    throw new Error('Login failed');
  }

  // Server info
  async getServerVersion(): Promise<string> {
    const response = await this.request('/');
    return response.version || '2.0.0';
  }

  // Accounts
  async getAccounts(): Promise<SupabaseAccount[]> {
    const accounts = await this.request('/accounts');
    return accounts.map((acc: any) => ({
      ...acc,
      balance: acc.balance / 100, // Convert from cents to dollars
    }));
  }

  async createAccount(account: Partial<SupabaseAccount>): Promise<string> {
    const response = await this.request('/accounts', {
      method: 'POST',
      body: JSON.stringify({
        name: account.name || 'New Account',
        type: account.type || 'checking',
        balance: Math.round((account.balance || 0) * 100), // Convert to cents
        closed: account.closed || false,
      }),
    });

    return response.data.id;
  }

  async updateAccount(id: string, updates: Partial<SupabaseAccount>): Promise<void> {
    await this.request(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updates,
        balance: updates.balance !== undefined ? Math.round(updates.balance * 100) : undefined,
      }),
    });
  }

  async deleteAccount(id: string): Promise<void> {
    await this.request(`/accounts/${id}`, {
      method: 'DELETE',
    });
  }

  async closeAccount(id: string): Promise<void> {
    await this.updateAccount(id, { closed: true });
  }

  async reopenAccount(id: string): Promise<void> {
    await this.updateAccount(id, { closed: false });
  }

  // Transactions
  async getTransactions(accountId?: string): Promise<SupabaseTransaction[]> {
    const url = accountId ? `/transactions?account=${accountId}` : '/transactions';
    console.log('🔍 Fetching transactions from:', `${this.baseUrl}${url}`);
    const transactions = await this.request(url);
    console.log('📊 Raw transactions from Supabase:', transactions?.length || 0, 'transactions');
    if (transactions?.length > 0) {
      console.log('📋 Sample transaction:', transactions[0]);
    }
    return transactions.map((txn: any) => ({
      ...txn,
      amount: typeof txn.amount === 'number' ? txn.amount / 100 : txn.amount,
    }));
  }

  async createTransaction(transaction: any): Promise<string> {
    const response = await this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        ...transaction,
        amount: Math.round((transaction.amount || 0) * 100),
      }),
    });

    return response.data.id;
  }

  async updateTransaction(transactionId: string, updates: any): Promise<void> {
    const updateData = { ...updates };
    
    // Keep amount in dollars (no conversion needed)
    if (updates.amount !== undefined) {
      updateData.amount = Math.round(updates.amount * 100);
    }
    
    await this.request(`/transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    await this.request(`/transactions/${transactionId}`, {
      method: 'DELETE',
    });
  }

  async deleteAllTransactions(): Promise<void> {
    console.log('🗑️ Frontend: Sending bulk delete request to /transactions/bulk-delete');
    const response = await this.request('/transactions/bulk-delete', {
      method: 'DELETE',
    });
    console.log('✅ Frontend: Bulk delete response:', response);
  }

  async setBudgetAmount(categoryId: string, month: string, amountCents: number): Promise<any> {
    const response = await this.request('/budgets/set-amount', {
      method: 'POST',
      body: JSON.stringify({
        categoryId,
        month,
        amount: amountCents
      })
    });
    return response.data;
  }

  async getBudgetAmounts(month: string): Promise<any[]> {
    return await this.request(`/budgets/${month}`);
  }

  // Goals
  async getGoals(): Promise<any[]> {
    return await this.request('/goals');
  }

  async createGoal(goalData: any): Promise<any> {
    const response = await this.request('/goals', {
      method: 'POST',
      body: JSON.stringify(goalData)
    });
    return response.data;
  }

  async updateGoal(goalId: string, updates: any): Promise<any> {
    const response = await this.request(`/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return response.data;
  }

  async deleteGoal(goalId: string): Promise<void> {
    await this.request(`/goals/${goalId}`, {
      method: 'DELETE'
    });
  }

  // Categories
  async getCategories(): Promise<SupabaseCategory[]> {
    return await this.request('/categories');
  }

  async createCategory(category: Partial<SupabaseCategory>): Promise<string> {
    const response = await this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });

    return response.data.id;
  }

  // Payees
  async getPayees(): Promise<SupabasePayee[]> {
    return await this.request('/payees');
  }

  // Budget
  async getBudgetMonth(month: string): Promise<any> {
    return await this.request(`/budget/${month}`);
  }

  // CSV Import
  async importTransactions(accountId: string, file: File): Promise<{ imported: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accountId', accountId);

    const response = await this.request('/import-transactions', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData
        'Authorization': `Bearer ${this.token}`,
      },
    });

    return { imported: response.imported };
  }
}

// Global instance
let supabaseApiInstance: SupabaseAPI | null = null;

export function initSupabaseAPI(baseUrl: string): SupabaseAPI {
  supabaseApiInstance = new SupabaseAPI(baseUrl);
  return supabaseApiInstance;
}

export function getSupabaseAPI(): SupabaseAPI {
  if (!supabaseApiInstance) {
    throw new Error('Supabase API not initialized');
  }
  return supabaseApiInstance;
}
