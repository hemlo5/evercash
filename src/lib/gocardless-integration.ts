/**
 * GoCardless Bank Account Data Integration
 * Open Banking for European banks (PSD2 compliant)
 */

import { useState } from 'react';

export interface GoCardlessConfig {
  secretId: string;
  secretKey: string;
  environment: 'sandbox' | 'live';
}

export interface GoCardlessInstitution {
  id: string;
  name: string;
  bic: string;
  transaction_total_days: string;
  countries: string[];
  logo?: string;
}

export interface GoCardlessAccount {
  id: string;
  iban: string;
  name?: string;
  currency: string;
  institution_id: string;
  status: 'READY' | 'PROCESSING' | 'ERROR';
  balances: {
    available?: { amount: string; currency: string };
    current?: { amount: string; currency: string };
  }[];
}

export interface GoCardlessTransaction {
  transaction_id: string;
  booking_date: string;
  value_date?: string;
  transaction_amount: {
    amount: string;
    currency: string;
  };
  creditor_name?: string;
  debtor_name?: string;
  remittance_information_unstructured?: string;
  bank_transaction_code?: string;
  proprietary_bank_transaction_code?: string;
}

export class GoCardlessService {
  private config: GoCardlessConfig | null = null;
  private accessToken: string | null = null;
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = 'https://ob.gocardless.com';
  }
  
  // Initialize with API credentials
  async initialize(config: GoCardlessConfig): Promise<void> {
    this.config = config;
    this.baseUrl = config.environment === 'sandbox' 
      ? 'https://ob.gocardless.com' 
      : 'https://ob.gocardless.com';
    
    await this.authenticate();
  }
  
  // Authenticate and get access token
  private async authenticate(): Promise<void> {
    if (!this.config) {
      throw new Error('GoCardless not configured');
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/token/new/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret_id: this.config.secretId,
          secret_key: this.config.secretKey
        })
      });
      
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      
      const data = await response.json();
      this.accessToken = data.access;
      
      // Store token securely
      localStorage.setItem('gocardless_token', this.accessToken);
      
    } catch (error) {
      console.error('GoCardless authentication error:', error);
      throw error;
    }
  }
  
  // Get list of supported institutions
  async getInstitutions(country: string = 'GB'): Promise<GoCardlessInstitution[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/institutions/?country=${country}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          await this.authenticate();
          return this.getInstitutions(country);
        }
        throw new Error('Failed to fetch institutions');
      }
      
      const data = await response.json();
      return data.results || [];
      
    } catch (error) {
      console.error('Get institutions error:', error);
      throw error;
    }
  }
  
  // Create end user agreement
  async createEndUserAgreement(institutionId: string): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/agreements/enduser/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          institution_id: institutionId,
          max_historical_days: 90,
          access_valid_for_days: 90,
          access_scope: ['balances', 'details', 'transactions']
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create agreement');
      }
      
      const data = await response.json();
      return data.id;
      
    } catch (error) {
      console.error('Create agreement error:', error);
      throw error;
    }
  }
  
  // Create requisition (bank connection)
  async createRequisition(
    institutionId: string,
    agreementId: string,
    redirectUrl: string
  ): Promise<{ id: string; link: string }> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/requisitions/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          redirect: redirectUrl,
          institution_id: institutionId,
          agreement: agreementId,
          reference: crypto.randomUUID(),
          user_language: 'EN'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create requisition');
      }
      
      const data = await response.json();
      return {
        id: data.id,
        link: data.link
      };
      
    } catch (error) {
      console.error('Create requisition error:', error);
      throw error;
    }
  }
  
  // Get requisition status
  async getRequisition(requisitionId: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/requisitions/${requisitionId}/`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get requisition');
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Get requisition error:', error);
      throw error;
    }
  }
  
  // Get account details
  async getAccount(accountId: string): Promise<GoCardlessAccount> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/accounts/${accountId}/`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get account');
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Get account error:', error);
      throw error;
    }
  }
  
  // Get account balances
  async getBalances(accountId: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/accounts/${accountId}/balances/`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get balances');
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Get balances error:', error);
      throw error;
    }
  }
  
  // Get account transactions
  async getTransactions(accountId: string): Promise<GoCardlessTransaction[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/accounts/${accountId}/transactions/`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get transactions');
      }
      
      const data = await response.json();
      return data.transactions?.booked || [];
      
    } catch (error) {
      console.error('Get transactions error:', error);
      throw error;
    }
  }
  
  // Convert GoCardless transaction to our format
  convertTransaction(gcTx: GoCardlessTransaction, accountId: string): any {
    const amount = parseFloat(gcTx.transaction_amount.amount);
    const payee = gcTx.creditor_name || gcTx.debtor_name || 'Unknown';
    
    return {
      id: gcTx.transaction_id,
      account: accountId,
      amount: Math.round(amount * 100), // Convert to cents
      date: gcTx.booking_date,
      payee,
      notes: gcTx.remittance_information_unstructured || '',
      imported: true,
      source: 'gocardless',
      reference: gcTx.bank_transaction_code
    };
  }
  
  // Convert GoCardless account to our format
  convertAccount(gcAccount: GoCardlessAccount): any {
    const currentBalance = gcAccount.balances.find(b => b.current);
    const balance = currentBalance ? parseFloat(currentBalance.current!.amount) : 0;
    
    return {
      id: gcAccount.id,
      name: gcAccount.name || gcAccount.iban,
      type: 'checking', // GoCardless doesn't specify account type
      balance: Math.round(balance * 100), // Convert to cents
      currency: gcAccount.currency,
      iban: gcAccount.iban,
      imported: true,
      source: 'gocardless'
    };
  }
  
  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getInstitutions();
      return true;
    } catch {
      return false;
    }
  }
  
  // Disconnect and clear tokens
  disconnect(): void {
    this.accessToken = null;
    this.config = null;
    localStorage.removeItem('gocardless_token');
  }
  
  // Get setup instructions
  static getSetupInstructions(): {
    title: string;
    steps: string[];
    links: { name: string; url: string }[];
  } {
    return {
      title: 'GoCardless Open Banking Setup',
      steps: [
        'Register business account at GoCardless',
        'Apply for Bank Account Data API access',
        'Complete business verification process',
        'Get API credentials (Secret ID & Key)',
        'Configure webhook endpoints (optional)',
        'Test with sandbox environment first'
      ],
      links: [
        { name: 'GoCardless Registration', url: 'https://gocardless.com/bank-account-data/' },
        { name: 'API Documentation', url: 'https://developer.gocardless.com/bank-account-data/' },
        { name: 'Supported Banks', url: 'https://gocardless.com/bank-account-data/coverage/' }
      ]
    };
  }
}

// Singleton instance
export const goCardlessService = new GoCardlessService();

// React hook for GoCardless
export function useGoCardless() {
  const [connected, setConnected] = useState(false);
  const [institutions, setInstitutions] = useState<GoCardlessInstitution[]>([]);
  const [accounts, setAccounts] = useState<GoCardlessAccount[]>([]);
  const [loading, setLoading] = useState(false);
  
  const connect = async (config: GoCardlessConfig) => {
    setLoading(true);
    try {
      await goCardlessService.initialize(config);
      setConnected(true);
      
      // Load institutions
      const institutionsData = await goCardlessService.getInstitutions();
      setInstitutions(institutionsData);
      
    } catch (error) {
      console.error('GoCardless connection failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const disconnect = () => {
    goCardlessService.disconnect();
    setConnected(false);
    setInstitutions([]);
    setAccounts([]);
  };
  
  const startBankConnection = async (institutionId: string, redirectUrl: string) => {
    try {
      const agreementId = await goCardlessService.createEndUserAgreement(institutionId);
      const requisition = await goCardlessService.createRequisition(
        institutionId,
        agreementId,
        redirectUrl
      );
      
      // Open bank authorization in new window
      window.open(requisition.link, '_blank');
      
      return requisition.id;
    } catch (error) {
      console.error('Bank connection failed:', error);
      throw error;
    }
  };
  
  return {
    connected,
    institutions,
    accounts,
    loading,
    connect,
    disconnect,
    startBankConnection
  };
}
