// Type definitions for loot-core

declare module 'loot-core/types/server' {
  export interface Handlers {
    getBudgets: () => Promise<Array<{
      id: string;
      name: string;
      currency: string;
    }>>;
    
    getAccounts: () => Promise<Array<{
      id: string;
      name: string;
      balance: number;
      offbudget?: boolean;
    }>>;
    
    getTransactions: (accountId: string) => Promise<Array<{
      id: string;
      date: string;
      payee: string;
      amount: number;
      category: string;
    }>>;
    
    getCategories: () => Promise<Array<{
      id: string;
      name: string;
      is_income?: boolean;
    }>>;
    
    // Add more method signatures as needed
  }
}
