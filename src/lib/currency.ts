/**
 * Centralized currency formatting utilities
 * All amounts in the API are stored in cents (e.g., 50000 = $500.00)
 */

/**
 * Formats an amount in cents to currency string
 * @param amountInCents - Amount in cents (e.g., 50000 for $500.00)
 * @returns Formatted currency string (e.g., "$500.00")
 */
export function formatCurrency(amountInCents: number): string {
  if (typeof amountInCents !== 'number' || isNaN(amountInCents)) {
    return '$0.00';
  }
  
  const dollars = amountInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Converts dollars to cents
 * @param dollars - Amount in dollars (e.g., 500.00)
 * @returns Amount in cents (e.g., 50000)
 */
export function dollarsToCents(dollars: number): number {
  if (typeof dollars !== 'number' || isNaN(dollars)) {
    return 0;
  }
  return Math.round(dollars * 100);
}

/**
 * Converts cents to dollars
 * @param cents - Amount in cents (e.g., 50000)
 * @returns Amount in dollars (e.g., 500.00)
 */
export function centsToDollars(cents: number): number {
  if (typeof cents !== 'number' || isNaN(cents)) {
    return 0;
  }
  return cents / 100;
}

/**
 * Parses a currency input string to cents
 * @param input - User input string (e.g., "$500", "500.00", "500")
 * @returns Amount in cents (e.g., 50000)
 */
export function parseCurrencyInput(input: string): number {
  if (!input || typeof input !== 'string') {
    return 0;
  }
  
  // Remove currency symbols and whitespace
  const cleaned = input.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    return 0;
  }
  
  return dollarsToCents(parsed);
}

/**
 * Formats a percentage with proper precision
 * @param percentage - Percentage value (e.g., 75.5)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "75.5%")
 */
export function formatPercentage(percentage: number, decimals: number = 1): string {
  if (typeof percentage !== 'number' || isNaN(percentage)) {
    return '0%';
  }
  
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Formats a compact currency amount (e.g., $1.2K, $1.5M)
 * @param amountInCents - Amount in cents
 * @returns Compact formatted string
 */
export function formatCurrencyCompact(amountInCents: number): string {
  if (typeof amountInCents !== 'number' || isNaN(amountInCents)) {
    return '$0';
  }
  
  const dollars = amountInCents / 100;
  const absAmount = Math.abs(dollars);
  const sign = dollars < 0 ? '-' : '';
  
  if (absAmount >= 1000000) {
    return `${sign}$${(absAmount / 1000000).toFixed(1)}M`;
  } else if (absAmount >= 1000) {
    return `${sign}$${(absAmount / 1000).toFixed(1)}K`;
  } else {
    return `${sign}$${absAmount.toFixed(0)}`;
  }
}
