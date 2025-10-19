/**
 * Multi-Currency Support
 * Handle multiple currencies and exchange rates
 */

import { useState, useEffect } from 'react';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  date: string;
  source: string;
}

// Common currencies
export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', decimals: 2 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimals: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2 }
];

export class CurrencyService {
  private baseCurrency: string = 'USD';
  private rates: Map<string, ExchangeRate> = new Map();
  private lastFetch: Date | null = null;
  
  constructor() {
    this.loadSettings();
    this.loadCachedRates();
  }
  
  // Load user's currency settings
  private loadSettings() {
    const stored = localStorage.getItem('currency_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      this.baseCurrency = settings.baseCurrency || 'USD';
    }
  }
  
  // Save settings
  private saveSettings() {
    localStorage.setItem('currency_settings', JSON.stringify({
      baseCurrency: this.baseCurrency,
      lastUpdated: new Date().toISOString()
    }));
  }
  
  // Load cached exchange rates
  private loadCachedRates() {
    const stored = localStorage.getItem('exchange_rates');
    if (stored) {
      const cached = JSON.parse(stored);
      cached.rates?.forEach((rate: ExchangeRate) => {
        this.rates.set(`${rate.from}_${rate.to}`, rate);
      });
      this.lastFetch = cached.lastFetch ? new Date(cached.lastFetch) : null;
    }
  }
  
  // Save rates to cache
  private saveRates() {
    const ratesArray = Array.from(this.rates.values());
    localStorage.setItem('exchange_rates', JSON.stringify({
      rates: ratesArray,
      lastFetch: this.lastFetch?.toISOString()
    }));
  }
  
  // Set base currency
  setBaseCurrency(currency: string) {
    if (CURRENCIES.find(c => c.code === currency)) {
      this.baseCurrency = currency;
      this.saveSettings();
    }
  }
  
  // Get base currency
  getBaseCurrency(): string {
    return this.baseCurrency;
  }
  
  // Fetch exchange rates (using free API or mock data)
  async fetchRates(): Promise<void> {
    // Check if rates are recent (within 24 hours)
    if (this.lastFetch) {
      const hoursSinceLastFetch = (Date.now() - this.lastFetch.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastFetch < 24) {
        return; // Use cached rates
      }
    }
    
    try {
      // In production, use actual API like:
      // const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${this.baseCurrency}`);
      // const data = await response.json();
      
      // For now, use mock rates
      const mockRates: Record<string, number> = {
        'USD': 1.00,
        'EUR': 0.85,
        'GBP': 0.73,
        'JPY': 110.50,
        'CAD': 1.25,
        'AUD': 1.35,
        'CHF': 0.92,
        'CNY': 6.45,
        'INR': 74.50,
        'MXN': 20.10,
        'BRL': 5.25,
        'ZAR': 14.80
      };
      
      // Store rates for all currency pairs
      Object.keys(mockRates).forEach(toCurrency => {
        if (toCurrency !== this.baseCurrency) {
          const rate: ExchangeRate = {
            from: this.baseCurrency,
            to: toCurrency,
            rate: mockRates[toCurrency],
            date: new Date().toISOString(),
            source: 'mock'
          };
          this.rates.set(`${this.baseCurrency}_${toCurrency}`, rate);
          
          // Also store inverse rate
          const inverseRate: ExchangeRate = {
            from: toCurrency,
            to: this.baseCurrency,
            rate: 1 / mockRates[toCurrency],
            date: new Date().toISOString(),
            source: 'mock'
          };
          this.rates.set(`${toCurrency}_${this.baseCurrency}`, inverseRate);
        }
      });
      
      this.lastFetch = new Date();
      this.saveRates();
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      // Use cached rates if available
    }
  }
  
  // Convert amount between currencies
  convert(amount: number, from: string, to: string): number {
    if (from === to) return amount;
    
    const rateKey = `${from}_${to}`;
    const rate = this.rates.get(rateKey);
    
    if (rate) {
      return amount * rate.rate;
    }
    
    // Try to find indirect rate through base currency
    const fromBase = this.rates.get(`${from}_${this.baseCurrency}`);
    const toBase = this.rates.get(`${this.baseCurrency}_${to}`);
    
    if (fromBase && toBase) {
      return amount * fromBase.rate * toBase.rate;
    }
    
    // Fallback to same amount if no rate found
    console.warn(`No exchange rate found for ${from} to ${to}`);
    return amount;
  }
  
  // Format amount in specific currency
  formatAmount(amount: number, currencyCode: string): string {
    const currency = CURRENCIES.find(c => c.code === currencyCode);
    if (!currency) {
      return `${amount.toFixed(2)} ${currencyCode}`;
    }
    
    // Use Intl.NumberFormat for proper formatting
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: currency.decimals,
        maximumFractionDigits: currency.decimals
      }).format(amount / 100); // Assuming amount is in cents
    } catch {
      // Fallback formatting
      const formatted = (amount / 100).toFixed(currency.decimals);
      return `${currency.symbol}${formatted}`;
    }
  }
  
  // Get all supported currencies
  getCurrencies(): Currency[] {
    return CURRENCIES;
  }
  
  // Get exchange rate
  getRate(from: string, to: string): number | null {
    if (from === to) return 1;
    
    const rate = this.rates.get(`${from}_${to}`);
    return rate?.rate || null;
  }
  
  // Calculate total in base currency for multi-currency accounts
  calculateTotalInBaseCurrency(accounts: Array<{ balance: number; currency: string }>): number {
    return accounts.reduce((total, account) => {
      const converted = this.convert(account.balance, account.currency, this.baseCurrency);
      return total + converted;
    }, 0);
  }
  
  // Get currency symbol
  getSymbol(currencyCode: string): string {
    const currency = CURRENCIES.find(c => c.code === currencyCode);
    return currency?.symbol || currencyCode;
  }
}

// Singleton instance
export const currencyService = new CurrencyService();

// React hook for currency
export function useCurrency() {
  const [baseCurrency, setBaseCurrencyState] = useState(currencyService.getBaseCurrency());
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  
  useEffect(() => {
    // Fetch rates on mount
    currencyService.fetchRates().then(() => {
      // Update state if needed
    });
  }, []);
  
  const setBaseCurrency = (currency: string) => {
    currencyService.setBaseCurrency(currency);
    setBaseCurrencyState(currency);
    currencyService.fetchRates(); // Refresh rates for new base
  };
  
  const convert = (amount: number, from: string, to: string): number => {
    return currencyService.convert(amount, from, to);
  };
  
  const format = (amount: number, currency: string): string => {
    return currencyService.formatAmount(amount, currency);
  };
  
  return {
    baseCurrency,
    setBaseCurrency,
    convert,
    format,
    currencies: CURRENCIES
  };
}
