/**
 * Currency Selector Component
 * Provides UI for selecting currencies in the application
 */

import React from 'react';
import { SUPPORTED_CURRENCIES } from '@/contexts/SimpleCurrencyContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from 'lucide-react';

export interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  className?: string;
  showIcon?: boolean;
  label?: string;
}

export function CurrencySelector({ 
  value,
  onChange,
  className = "",
  showIcon = true,
  label
}: CurrencySelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
      )}
      {showIcon && <Globe className="w-4 h-4 text-muted-foreground" />}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[128px] sm:w-[160px] md:w-[180px]">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_CURRENCIES.map(currency => (
            <SelectItem key={currency.code} value={currency.code}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{currency.flag}</span>
                <span className="font-mono text-sm">{currency.symbol}</span>
                <span className="font-medium">{currency.code}</span>
                <span className="text-muted-foreground text-xs">- {currency.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Compact version for inline use
export function CompactCurrencySelector({
  value,
  onChange
}: {
  value: string;
  onChange: (currency: string) => void;
}) {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === value);
  
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        // This would open a modal or dropdown in a real implementation
      }}
      className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-accent/10 hover:bg-accent/20 rounded-md transition-colors"
    >
      <Globe className="w-3 h-3" />
      <span className="font-mono">{currency?.symbol || '$'}</span>
      <span>{value}</span>
    </button>
  );
}
