/**
 * SimpleFIN Integration
 * Direct bank connections without third-party data sharing
 */

import { useState } from 'react';

export interface SimpleFINConfig {
  bridgeUrl: string;
  username: string;
  password: string;
}

export interface SimpleFINAccount {
  id: string;
  name: string;
  currency: string;
  balance: number;
  available_balance?: number;
  balance_date: string;
  type: 'checking' | 'savings' | 'credit' | 'investment';
  institution: {
    name: string;
    url?: string;
  };
}

export interface SimpleFINTransaction {
  id: string;
  account_id: string;
  amount: number;
  date: string;
  description: string;
  payee?: string;
  memo?: string;
  category?: string;
  pending: boolean;
}

export class SimpleFINService {
  private config: SimpleFINConfig | null = null;
  private accessToken: string | null = null;
  
  // Initialize with bridge configuration
  async initialize(config: SimpleFINConfig): Promise<void> {
    this.config = config;
    await this.authenticate();
  }
  
  // Authenticate with SimpleFIN bridge
  private async authenticate(): Promise<void> {
    if (!this.config) {
      throw new Error('SimpleFIN not configured');
    }
    
    try {
      const response = await fetch(`${this.config.bridgeUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: this.config.username,
          password: this.config.password
        })
      });
      
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      
      const data = await response.json();
      this.accessToken = data.access_token;
      
      // Store token securely
      localStorage.setItem('simplefin_token', this.accessToken);
      
    } catch (error) {
      console.error('SimpleFIN authentication error:', error);
      throw error;
    }
  }
  
  // Get accounts from SimpleFIN
  async getAccounts(): Promise<SimpleFINAccount[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }
    
    try {
      const response = await fetch(`${this.config!.bridgeUrl}/accounts`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, re-authenticate
          await this.authenticate();
          return this.getAccounts();
        }
        throw new Error('Failed to fetch accounts');
      }
      
      const data = await response.json();
      return data.accounts || [];
      
    } catch (error) {
      console.error('Get accounts error:', error);
      throw error;
    }
  }
  
  // Get transactions from SimpleFIN
  async getTransactions(
    accountId: string,
    startDate?: string,
    endDate?: string
  ): Promise<SimpleFINTransaction[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }
    
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const url = `${this.config!.bridgeUrl}/accounts/${accountId}/transactions?${params}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          await this.authenticate();
          return this.getTransactions(accountId, startDate, endDate);
        }
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      return data.transactions || [];
      
    } catch (error) {
      console.error('Get transactions error:', error);
      throw error;
    }
  }
  
  // Sync all accounts and transactions
  async syncAll(): Promise<{
    accounts: SimpleFINAccount[];
    transactions: SimpleFINTransaction[];
  }> {
    const accounts = await this.getAccounts();
    const allTransactions: SimpleFINTransaction[] = [];
    
    // Get transactions for each account
    for (const account of accounts) {
      try {
        const transactions = await this.getTransactions(account.id);
        allTransactions.push(...transactions);
      } catch (error) {
        console.error(`Failed to sync account ${account.name}:`, error);
      }
    }
    
    return { accounts, transactions: allTransactions };
  }
  
  // Convert SimpleFIN transaction to our format
  convertTransaction(sfTx: SimpleFINTransaction): any {
    return {
      id: sfTx.id,
      account: sfTx.account_id,
      amount: Math.round(sfTx.amount * 100), // Convert to cents
      date: sfTx.date,
      payee: sfTx.payee || sfTx.description,
      notes: sfTx.memo,
      category: sfTx.category || '',
      imported: true,
      pending: sfTx.pending,
      source: 'simplefin'
    };
  }
  
  // Convert SimpleFIN account to our format
  convertAccount(sfAccount: SimpleFINAccount): any {
    return {
      id: sfAccount.id,
      name: sfAccount.name,
      type: this.mapAccountType(sfAccount.type),
      balance: Math.round(sfAccount.balance * 100), // Convert to cents
      institution: sfAccount.institution.name,
      currency: sfAccount.currency,
      imported: true,
      source: 'simplefin'
    };
  }
  
  // Map SimpleFIN account types to our types
  private mapAccountType(sfType: string): string {
    const typeMap: Record<string, string> = {
      'checking': 'checking',
      'savings': 'savings',
      'credit': 'credit',
      'investment': 'investment'
    };
    
    return typeMap[sfType] || 'other';
  }
  
  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccounts();
      return true;
    } catch {
      return false;
    }
  }
  
  // Disconnect and clear tokens
  disconnect(): void {
    this.accessToken = null;
    this.config = null;
    localStorage.removeItem('simplefin_token');
  }
  
  // Setup SimpleFIN bridge (instructions)
  static getSetupInstructions(): {
    title: string;
    steps: string[];
    links: { name: string; url: string }[];
  } {
    return {
      title: 'SimpleFIN Bridge Setup',
      steps: [
        'Download SimpleFIN Bridge from simplefin.org',
        'Install and configure the bridge server',
        'Add your bank credentials to the bridge',
        'Note the bridge URL (usually http://localhost:8080)',
        'Create bridge username and password',
        'Test connection with your bank'
      ],
      links: [
        { name: 'SimpleFIN Website', url: 'https://simplefin.org/' },
        { name: 'Bridge Documentation', url: 'https://simplefin.org/bridge/' },
        { name: 'Supported Banks', url: 'https://simplefin.org/banks/' }
      ]
    };
  }
}

// Singleton instance
export const simpleFINService = new SimpleFINService();

// React hook for SimpleFIN
export function useSimpleFIN() {
  const [connected, setConnected] = useState(false);
  const [accounts, setAccounts] = useState<SimpleFINAccount[]>([]);
  const [loading, setLoading] = useState(false);
  
  const connect = async (config: SimpleFINConfig) => {
    setLoading(true);
    try {
      await simpleFINService.initialize(config);
      setConnected(true);
      
      // Load accounts
      const accountsData = await simpleFINService.getAccounts();
      setAccounts(accountsData);
      
    } catch (error) {
      console.error('SimpleFIN connection failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const disconnect = () => {
    simpleFINService.disconnect();
    setConnected(false);
    setAccounts([]);
  };
  
  const sync = async () => {
    setLoading(true);
    try {
      const { accounts: accountsData } = await simpleFINService.syncAll();
      setAccounts(accountsData);
    } catch (error) {
      console.error('SimpleFIN sync failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    connected,
    accounts,
    loading,
    connect,
    disconnect,
    sync
  };
}
