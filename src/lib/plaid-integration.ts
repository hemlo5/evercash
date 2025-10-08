/**
 * Plaid Bank Integration
 * Real bank sync implementation
 */

interface PlaidConfig {
  clientId: string;
  secret: string;
  environment: 'sandbox' | 'development' | 'production';
  webhook?: string;
}

interface PlaidAccount {
  id: string;
  name: string;
  type: string;
  subtype: string;
  mask: string;
  balances: {
    available: number | null;
    current: number | null;
    limit: number | null;
  };
}

interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
  category?: string[];
  pending: boolean;
}

export class PlaidService {
  private config: PlaidConfig;
  private baseUrl = 'https://api.plaid.com';
  
  constructor() {
    this.config = {
      clientId: process.env.REACT_APP_PLAID_CLIENT_ID || '',
      secret: process.env.REACT_APP_PLAID_SECRET || '',
      environment: (process.env.REACT_APP_PLAID_ENV as any) || 'sandbox',
      webhook: process.env.REACT_APP_PLAID_WEBHOOK
    };
  }
  
  // Create Link token for Plaid Link flow
  async createLinkToken(userId: string): Promise<string> {
    try {
      const response = await fetch('/api/plaid/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          client_name: 'Emerald Budget',
          products: ['transactions', 'accounts', 'assets'],
          country_codes: ['US', 'CA'],
          language: 'en'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create link token');
      }
      
      const data = await response.json();
      return data.link_token;
    } catch (error) {
      console.error('Plaid link token error:', error);
      throw error;
    }
  }
  
  // Exchange public token for access token
  async exchangePublicToken(publicToken: string): Promise<string> {
    try {
      const response = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken })
      });
      
      if (!response.ok) {
        throw new Error('Failed to exchange token');
      }
      
      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }
  
  // Get accounts from Plaid
  async getAccounts(accessToken: string): Promise<PlaidAccount[]> {
    try {
      const response = await fetch('/api/plaid/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      
      const data = await response.json();
      return data.accounts;
    } catch (error) {
      console.error('Get accounts error:', error);
      throw error;
    }
  }
  
  // Get transactions from Plaid
  async getTransactions(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<PlaidTransaction[]> {
    try {
      const response = await fetch('/api/plaid/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          start_date: startDate,
          end_date: endDate
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      return data.transactions;
    } catch (error) {
      console.error('Get transactions error:', error);
      throw error;
    }
  }
  
  // Convert Plaid transaction to our format
  convertTransaction(plaidTx: PlaidTransaction): any {
    return {
      id: plaidTx.transaction_id,
      account: plaidTx.account_id,
      amount: Math.round(plaidTx.amount * 100), // Convert to cents
      date: plaidTx.date,
      payee: plaidTx.merchant_name || plaidTx.name,
      category: this.mapCategory(plaidTx.category),
      imported: true,
      pending: plaidTx.pending
    };
  }
  
  // Map Plaid categories to our categories
  private mapCategory(plaidCategories?: string[]): string {
    if (!plaidCategories || plaidCategories.length === 0) {
      return 'Other';
    }
    
    const primary = plaidCategories[0].toLowerCase();
    
    // Map common categories
    const categoryMap: Record<string, string> = {
      'food': 'Dining',
      'restaurants': 'Dining',
      'groceries': 'Groceries',
      'gas': 'Transportation',
      'transport': 'Transportation',
      'entertainment': 'Entertainment',
      'shopping': 'Shopping',
      'bills': 'Bills & Utilities',
      'healthcare': 'Healthcare',
      'education': 'Education'
    };
    
    for (const [key, value] of Object.entries(categoryMap)) {
      if (primary.includes(key)) {
        return value;
      }
    }
    
    return 'Other';
  }
  
  // Set up webhook for real-time updates
  async setupWebhook(accessToken: string, webhook: string): Promise<void> {
    try {
      await fetch('/api/plaid/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          webhook
        })
      });
    } catch (error) {
      console.error('Webhook setup error:', error);
    }
  }
}

// Singleton instance
export const plaidService = new PlaidService();

// React component for Plaid Link
export function PlaidLinkButton({ 
  onSuccess,
  onError 
}: {
  onSuccess: (publicToken: string, metadata: any) => void;
  onError: (error: any) => void;
}) {
  const handleClick = async () => {
    try {
      // Dynamically import Plaid Link
      const linkToken = await plaidService.createLinkToken('user-id');
      
      // In production, use actual react-plaid-link
      // For now, simulate the flow
      console.log('Plaid Link would open with token:', linkToken);
      
      // Simulate success for development
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          onSuccess('sandbox-public-token', {
            accounts: [{
              id: 'account-1',
              name: 'Checking Account',
              mask: '1234'
            }]
          });
        }, 2000);
      }
    } catch (error) {
      onError(error);
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
    >
      <div className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 28 28" fill="currentColor">
          <path d="M14 0C6.268 0 0 6.268 0 14s6.268 14 14 14 14-6.268 14-14S21.732 0 14 0zm1.75 21h-3.5v-3.5h3.5V21zm0-5.25h-3.5v-8.75h3.5v8.75z"/>
        </svg>
        Connect with Plaid
      </div>
    </button>
  );
}
