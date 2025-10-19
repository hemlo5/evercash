import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  currencyConverter, 
  formatCurrencyWithSymbol, 
  getPreferredCurrency, 
  setPreferredCurrency,
  SUPPORTED_CURRENCIES,
  Currency
} from '@/lib/currency-converter';

interface CurrencyContextType {
  currentCurrency: string;
  setCurrency: (currency: string) => void;
  formatAmount: (amount: number) => string;
  formatAmountFromCents: (amountInCents: number) => string;
  convertAmount: (amount: number, fromCurrency?: string) => number;
  getSupportedCurrencies: () => Currency[];
  getCurrentCurrencyInfo: () => Currency | undefined;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currentCurrency, setCurrentCurrency] = useState<string>(getPreferredCurrency());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize currency converter and update rates
    const initializeCurrency = async () => {
      setIsLoading(true);
      
      // Update exchange rates if needed
      if (currencyConverter.needsUpdate()) {
        await currencyConverter.forceUpdate();
      }
      
      setIsLoading(false);
    };

    initializeCurrency();
  }, []);

  const setCurrency = (currency: string) => {
    setCurrentCurrency(currency);
    setPreferredCurrency(currency);
    console.log(`💱 Currency changed to ${currency}`);
  };

  const formatAmount = (amount: number): string => {
    // Amount should be in USD dollars for proper conversion
    return formatCurrencyWithSymbol(amount, currentCurrency);
  };

  const formatAmountFromCents = (amountInCents: number): string => {
    // Convert cents to dollars first
    const amountInDollars = amountInCents / 100;
    return formatCurrencyWithSymbol(amountInDollars, currentCurrency);
  };

  const convertAmount = (amount: number, fromCurrency: string = 'USD'): number => {
    if (fromCurrency === currentCurrency) return amount;
    
    // Convert to USD first if needed, then to target currency
    const usdAmount = fromCurrency === 'USD' ? amount : currencyConverter.convertToUSD(amount, fromCurrency);
    return currencyConverter.convert(usdAmount, currentCurrency);
  };

  const getSupportedCurrencies = (): Currency[] => {
    return SUPPORTED_CURRENCIES;
  };

  const getCurrentCurrencyInfo = (): Currency | undefined => {
    return SUPPORTED_CURRENCIES.find(c => c.code === currentCurrency);
  };

  const contextValue: CurrencyContextType = {
    currentCurrency,
    setCurrency,
    formatAmount,
    formatAmountFromCents,
    convertAmount,
    getSupportedCurrencies,
    getCurrentCurrencyInfo,
    isLoading,
  };

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

// Hook for formatting currency amounts
export function useFormatCurrency() {
  const { formatAmount } = useCurrency();
  return formatAmount;
}

// Hook for converting amounts
export function useConvertAmount() {
  const { convertAmount } = useCurrency();
  return convertAmount;
}
