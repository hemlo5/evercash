import React, { createContext, useContext, useState, ReactNode } from 'react';

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

interface SimpleCurrencyContextType {
  currentCurrency: string;
  setCurrency: (currency: string) => void;
  formatAmount: (amount: number) => string;
  getSupportedCurrencies: () => Currency[];
  getCurrentCurrencyInfo: () => Currency | undefined;
}

const SimpleCurrencyContext = createContext<SimpleCurrencyContextType | undefined>(undefined);

interface SimpleCurrencyProviderProps {
  children: ReactNode;
}

export function SimpleCurrencyProvider({ children }: SimpleCurrencyProviderProps) {
  // Get preferred currency from localStorage, default to USD
  const getPreferredCurrency = (): string => {
    return localStorage.getItem('preferred-currency') || 'USD';
  };

  const [currentCurrency, setCurrentCurrency] = useState<string>(getPreferredCurrency());

  const setCurrency = (currency: string) => {
    setCurrentCurrency(currency);
    localStorage.setItem('preferred-currency', currency);
    console.log(`💱 Currency display changed to ${currency}`);
  };

  const formatAmount = (amount: number): string => {
    const currencyInfo = getCurrentCurrencyInfo();
    const symbol = currencyInfo?.symbol || '$';
    
    // Format number with commas and 2 decimal places
    const formattedNumber = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Handle negative numbers
    if (amount < 0) {
      return `-${symbol}${formattedNumber}`;
    }
    
    return `${symbol}${formattedNumber}`;
  };

  const getSupportedCurrencies = (): Currency[] => {
    return SUPPORTED_CURRENCIES;
  };

  const getCurrentCurrencyInfo = (): Currency | undefined => {
    return SUPPORTED_CURRENCIES.find(c => c.code === currentCurrency);
  };

  const contextValue: SimpleCurrencyContextType = {
    currentCurrency,
    setCurrency,
    formatAmount,
    getSupportedCurrencies,
    getCurrentCurrencyInfo,
  };

  return (
    <SimpleCurrencyContext.Provider value={contextValue}>
      {children}
    </SimpleCurrencyContext.Provider>
  );
}

export function useSimpleCurrency() {
  const context = useContext(SimpleCurrencyContext);
  if (context === undefined) {
    throw new Error('useSimpleCurrency must be used within a SimpleCurrencyProvider');
  }
  return context;
}
