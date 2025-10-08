import DOMPurify from 'dompurify';

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input - The user input to sanitize
 * @param options - Additional options for sanitization
 * @returns Sanitized string safe for display/storage
 */
export function sanitizeInput(input: string, options?: {
  allowedTags?: string[];
  allowedAttributes?: string[];
}): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Configure DOMPurify
  const config: DOMPurify.Config = {
    ALLOWED_TAGS: options?.allowedTags || [], // No HTML tags by default
    ALLOWED_ATTR: options?.allowedAttributes || [],
    KEEP_CONTENT: true, // Keep text content
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  };

  // Sanitize the input
  const cleaned = DOMPurify.sanitize(input.trim(), config);

  // Additional validation for financial data
  if (options?.allowedTags?.length === 0) {
    // Remove any potential script injections
    return cleaned
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  }

  return cleaned;
}

/**
 * Sanitizes numeric input for amounts
 * @param value - The value to sanitize
 * @returns Sanitized numeric value or 0
 */
export function sanitizeAmount(value: string | number): number {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.abs(parsed); // Always positive for amounts
}

/**
 * Sanitizes and validates email addresses
 * @param email - The email to validate
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  const cleaned = sanitizeInput(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned : '';
}

/**
 * Sanitizes transaction notes with limited HTML
 * @param notes - The notes to sanitize
 * @returns Sanitized notes
 */
export function sanitizeNotes(notes: string): string {
  return sanitizeInput(notes, {
    allowedTags: ['b', 'i', 'u', 'br'], // Allow basic formatting
    allowedAttributes: []
  });
}

/**
 * Auto-suggest sanitized payees
 * @param payee - The payee name to sanitize and suggest
 * @param existingPayees - List of existing payees for suggestions
 * @returns Object with sanitized payee and suggestions
 */
export function sanitizePayee(payee: string, existingPayees: string[] = []): {
  sanitized: string;
  suggestions: string[];
} {
  const sanitized = sanitizeInput(payee);
  
  // Find similar payees for auto-suggestions
  const suggestions = existingPayees
    .filter(existing => 
      existing.toLowerCase().includes(sanitized.toLowerCase()) ||
      sanitized.toLowerCase().includes(existing.toLowerCase())
    )
    .slice(0, 5);

  return {
    sanitized,
    suggestions
  };
}

/**
 * Validates and sanitizes category names
 * @param category - The category name
 * @returns Sanitized category name
 */
export function sanitizeCategory(category: string): string {
  const sanitized = sanitizeInput(category);
  // Limit length for categories
  return sanitized.slice(0, 50);
}
