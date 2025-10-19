// Currency Converter with Real-time Exchange Rates
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
];

interface ExchangeRates {
  [key: string]: number;
}

class CurrencyConverter {
  private exchangeRates: ExchangeRates = {};
  private baseCurrency = 'USD';
  private lastUpdated: Date | null = null;
  private updateInterval = 1000 * 60 * 60; // 1 hour

  constructor() {
    this.loadCachedRates();
    this.updateRates();
  }

  /**
   * Get current exchange rates from API
   */
  async updateRates(): Promise<void> {
    try {
      console.log('💱 Updating exchange rates...');
      
      // Using a free exchange rate API
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      
      if (response.ok) {
        const data = await response.json();
        this.exchangeRates = data.rates;
        this.lastUpdated = new Date();
        
        // Cache rates in localStorage
        localStorage.setItem('exchange_rates', JSON.stringify({
          rates: this.exchangeRates,
          lastUpdated: this.lastUpdated.toISOString()
        }));
        
        console.log('✅ Exchange rates updated:', this.exchangeRates);
      } else {
        console.warn('⚠️ Failed to fetch exchange rates, using cached rates');
      }
    } catch (error) {
      console.error('❌ Error updating exchange rates:', error);
      // Fallback to approximate rates if API fails
      this.setFallbackRates();
    }
  }

  /**
   * Load cached exchange rates from localStorage
   */
  private loadCachedRates(): void {
    try {
      const cached = localStorage.getItem('exchange_rates');
      if (cached) {
        const { rates, lastUpdated } = JSON.parse(cached);
        const cacheAge = Date.now() - new Date(lastUpdated).getTime();
        
        if (cacheAge < this.updateInterval) {
          this.exchangeRates = rates;
          this.lastUpdated = new Date(lastUpdated);
          console.log('📦 Using cached exchange rates');
          return;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error loading cached rates:', error);
    }
    
    // Set fallback rates if no valid cache
    this.setFallbackRates();
  }

  /**
   * Set approximate fallback rates
   */
  private setFallbackRates(): void {
    this.exchangeRates = {
      USD: 1,
      INR: 83.25,
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110.5,
      CAD: 1.25,
      AUD: 1.35,
    };
    console.log('🔄 Using fallback exchange rates');
  }

  /**
   * Convert amount from USD to target currency
   */
  convert(amountInUSD: number, targetCurrency: string): number {
    if (targetCurrency === 'USD') return amountInUSD;
    
    const rate = this.exchangeRates[targetCurrency];
    if (!rate) {
      console.warn(`⚠️ No exchange rate for ${targetCurrency}, using USD`);
      return amountInUSD;
    }
    
    return amountInUSD * rate;
  }

  /**
   * Convert amount from any currency to USD
   */
  convertToUSD(amount: number, fromCurrency: string): number {
    if (fromCurrency === 'USD') return amount;
    
    const rate = this.exchangeRates[fromCurrency];
    if (!rate) {
      console.warn(`⚠️ No exchange rate for ${fromCurrency}, assuming USD`);
      return amount;
    }
    
    return amount / rate;
  }

  /**
   * Get current exchange rate for a currency
   */
  getRate(currency: string): number {
    return this.exchangeRates[currency] || 1;
  }

  /**
   * Check if rates need updating
   */
  needsUpdate(): boolean {
    if (!this.lastUpdated) return true;
    const age = Date.now() - this.lastUpdated.getTime();
    return age > this.updateInterval;
  }

  /**
   * Force update rates
   */
  async forceUpdate(): Promise<void> {
    await this.updateRates();
  }
}

// Global currency converter instance
export const currencyConverter = new CurrencyConverter();

/**
 * Format currency with proper symbol and locale
 */
export function formatCurrencyWithSymbol(amount: number, currency: string): string {
  const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currency);
  const symbol = currencyInfo?.symbol || currency;
  
  // Convert amount to target currency
  const convertedAmount = currencyConverter.convert(amount, currency);
  
  // Format based on currency
  switch (currency) {
    case 'INR':
      // Indian number format with lakhs/crores
      return `${symbol}${formatIndianNumber(convertedAmount)}`;
    case 'JPY':
      // Japanese Yen has no decimal places
      return `${symbol}${Math.round(convertedAmount).toLocaleString()}`;
    default:
      // Standard formatting for other currencies
      return `${symbol}${convertedAmount.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
  }
}

/**
 * Format numbers in Indian style (lakhs, crores)
 */
function formatIndianNumber(num: number): string {
  const absNum = Math.abs(num);
  const isNegative = num < 0;
  
  let formatted: string;
  
  if (absNum >= 10000000) {
    // Crores
    formatted = `${(absNum / 10000000).toFixed(2)} Cr`;
  } else if (absNum >= 100000) {
    // Lakhs
    formatted = `${(absNum / 100000).toFixed(2)} L`;
  } else if (absNum >= 1000) {
    // Thousands
    formatted = `${(absNum / 1000).toFixed(1)}K`;
  } else {
    // Regular formatting
    formatted = absNum.toFixed(2);
  }
  
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Get user's preferred currency from localStorage
 */
export function getPreferredCurrency(): string {
  return localStorage.getItem('preferred_currency') || 'USD';
}

/**
 * Set user's preferred currency
 */
export function setPreferredCurrency(currency: string): void {
  localStorage.setItem('preferred_currency', currency);
  console.log(`💱 Preferred currency set to ${currency}`);
}
