/**
 * Secure API Client with JWT Authentication
 * Production-ready implementation with proper error handling and token management
 */

import DOMPurify from 'dompurify';

// API Configuration
interface ApiConfig {
  baseUrl: string;
  accessToken?: string;
}

// Token Response
interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  user?: {
    id: string;
    email: string;
  };
}

// Token Storage Keys
const TOKEN_KEY = 'emerald_access_token';
const TOKEN_EXPIRY_KEY = 'emerald_token_expiry';
const USER_KEY = 'emerald_user';

// Token Management Class
class TokenManager {
  private refreshTimer?: NodeJS.Timeout;

  // Store token securely
  storeToken(tokenData: TokenResponse) {
    const expiryTime = Date.now() + (tokenData.expiresIn * 1000);
    
    // Store in sessionStorage for better security (cleared on tab close)
    sessionStorage.setItem(TOKEN_KEY, tokenData.accessToken);
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    
    if (tokenData.user) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(tokenData.user));
    }
    
    // Set up auto-refresh before expiry
    this.scheduleRefresh(tokenData.expiresIn);
  }
  
  // Get current token
  getToken(): string | null {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) return null;
    
    // Check if token expired
    if (Date.now() > parseInt(expiry)) {
      this.clearToken();
      return null;
    }
    
    return token;
  }
  
  // Clear token
  clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    sessionStorage.removeItem(USER_KEY);
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }
  
  // Get stored user
  getUser() {
    const userStr = sessionStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }
  
  // Schedule token refresh
  private scheduleRefresh(expiresIn: number) {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // Refresh 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000;
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken();
      }, refreshTime);
    }
  }
  
  // Refresh token
  private async refreshToken() {
    try {
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? process.env.REACT_APP_PROD_API_URL || 'https://api.emerald-budget.com'
        : process.env.REACT_APP_LOCAL_API_URL || 'http://localhost:5006';
        
      const response = await fetch(`${baseUrl}/account/refresh`, {
        method: 'POST',
        credentials: 'include', // Include cookies
      });
      
      if (response.ok) {
        const data = await response.json();
        this.storeToken(data.data);
      } else {
        // Refresh failed, clear token
        this.clearToken();
        window.dispatchEvent(new Event('auth:expired'));
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearToken();
    }
  }
}

// Singleton token manager
const tokenManager = new TokenManager();

// CSRF Token Management
let csrfToken: string | null = null;

async function getCsrfToken(baseUrl: string): Promise<string> {
  if (csrfToken) return csrfToken;
  
  try {
    const response = await fetch(`${baseUrl}/csrf-token`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken;
      return csrfToken;
    }
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
  }
  
  return '';
}

// Request Queue for offline support
class RequestQueue {
  private queue: Array<{ url: string; options: RequestInit; timestamp: number }> = [];
  private isOnline = navigator.onLine;
  
  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }
  
  async add(url: string, options: RequestInit) {
    if (!this.isOnline) {
      this.queue.push({
        url,
        options,
        timestamp: Date.now()
      });
      
      throw new Error('Offline - request queued');
    }
  }
  
  private async processQueue() {
    while (this.queue.length > 0 && this.isOnline) {
      const request = this.queue.shift();
      if (request) {
        try {
          await fetch(request.url, request.options);
        } catch (error) {
          // Re-queue if failed
          this.queue.unshift(request);
          break;
        }
      }
    }
  }
}

const requestQueue = new RequestQueue();

// Main API Client Class
export class SecureAPIClient {
  private config: ApiConfig;
  private abortController?: AbortController;
  
  constructor(config: ApiConfig) {
    // Auto-detect environment
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_PROD_API_URL || 'https://api.emerald-budget.com'
      : process.env.REACT_APP_LOCAL_API_URL || 'http://localhost:5006';
      
    this.config = {
      ...config,
      baseUrl: config.baseUrl || baseUrl
    };
  }
  
  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  // Login with enhanced security
  async login(password: string): Promise<TokenResponse> {
    try {
      // Validate input
      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      
      // Sanitize password (remove any potential XSS)
      const sanitizedPassword = DOMPurify.sanitize(password, { ALLOWED_TAGS: [] });
      
      const response = await this.request('/account/login', {
        method: 'POST',
        body: JSON.stringify({ password: sanitizedPassword })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }
      
      const data = await response.json();
      
      // Store token
      tokenManager.storeToken(data.data);
      
      // Update config with new token
      this.config.accessToken = data.data.accessToken;
      
      return data.data;
    } catch (error: any) {
      // Clear any existing tokens on login failure
      tokenManager.clearToken();
      throw error;
    }
  }
  
  // Logout
  async logout(): Promise<void> {
    try {
      await this.request('/account/logout', { method: 'POST' });
    } finally {
      // Clear tokens regardless of server response
      tokenManager.clearToken();
      this.config.accessToken = undefined;
    }
  }
  
  // Make authenticated request with all security features
  private async request(
    endpoint: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<Response> {
    // Create abort controller for timeout
    this.abortController = new AbortController();
    const timeoutId = setTimeout(() => this.abortController?.abort(), 10000); // 10s timeout
    
    try {
      // Get current token
      const token = this.config.accessToken || tokenManager.getToken();
      
      // Build headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };
      
      // Add auth token if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Add CSRF token for state-changing operations
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || 'GET')) {
        const csrf = await getCsrfToken(this.config.baseUrl);
        if (csrf) {
          headers['X-CSRF-Token'] = csrf;
        }
      }
      
      // Make request
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include', // Include cookies
        signal: this.abortController.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle token expiry
      if (response.status === 401) {
        const error = await response.json();
        if (error.code === 'TOKEN_EXPIRED') {
          // Token expired, trigger refresh
          window.dispatchEvent(new Event('auth:expired'));
        }
        tokenManager.clearToken();
      }
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
        
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.request(endpoint, options, retries - 1);
        }
      }
      
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Handle offline
      if (!navigator.onLine) {
        // Queue request for later
        await requestQueue.add(`${this.config.baseUrl}${endpoint}`, {
          ...options,
          headers: options.headers as HeadersInit,
          credentials: 'include'
        });
      }
      
      // Handle abort
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }
  
  // Abort current request
  abort() {
    this.abortController?.abort();
  }
  
  // API Methods with proper error handling
  
  async getAccounts() {
    const response = await this.request('/accounts');
    if (!response.ok) throw new Error('Failed to fetch accounts');
    return response.json();
  }
  
  async getTransactions(accountId?: string, startDate?: string, endDate?: string) {
    let url = '/transactions';
    const params = new URLSearchParams();
    
    if (accountId) params.append('account', accountId);
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);
    
    if (params.toString()) {
      url += `?${params}`;
    }
    
    const response = await this.request(url);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  }
  
  async addTransaction(transaction: any) {
    // Sanitize all text fields
    const sanitized = {
      ...transaction,
      payee: DOMPurify.sanitize(transaction.payee || ''),
      notes: DOMPurify.sanitize(transaction.notes || ''),
      category: DOMPurify.sanitize(transaction.category || '')
    };
    
    // Validate amount
    if (typeof sanitized.amount !== 'number' || isNaN(sanitized.amount)) {
      throw new Error('Invalid amount');
    }
    
    // Validate date
    if (!sanitized.date || isNaN(Date.parse(sanitized.date))) {
      throw new Error('Invalid date');
    }
    
    const response = await this.request('/sync/sync', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{
          dataset: 'transactions',
          row: {
            id: crypto.randomUUID(), // Use UUID instead of Date.now()
            ...sanitized,
            timestamp: Date.now()
          }
        }]
      })
    });
    
    if (!response.ok) throw new Error('Failed to add transaction');
    return response.json();
  }
  
  async updateTransaction(id: string, updates: any) {
    // Sanitize updates
    const sanitized = {};
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'string') {
        sanitized[key] = DOMPurify.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    const response = await this.request('/sync/sync', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{
          dataset: 'transactions',
          row: { id, ...sanitized }
        }]
      })
    });
    
    if (!response.ok) throw new Error('Failed to update transaction');
    return response.json();
  }
  
  async deleteTransaction(id: string) {
    const response = await this.request('/sync/sync', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{
          dataset: 'transactions',
          row: { id, tombstone: 1 }
        }]
      })
    });
    
    if (!response.ok) throw new Error('Failed to delete transaction');
    return response.json();
  }
  
  async getBudgetMonth(month: string) {
    const response = await this.request(`/budget/${month}`);
    if (!response.ok) throw new Error('Failed to fetch budget');
    return response.json();
  }
  
  async setBudgetAmount(month: string, categoryId: string, amount: number) {
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      throw new Error('Invalid budget amount');
    }
    
    const response = await this.request('/sync/sync', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{
          dataset: 'budget',
          row: {
            month,
            category: categoryId,
            budgeted: Math.round(amount) // Ensure integer cents
          }
        }]
      })
    });
    
    if (!response.ok) throw new Error('Failed to update budget');
    return response.json();
  }
}

// Export singleton instance
export const api = new SecureAPIClient({
  baseUrl: process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_PROD_API_URL || 'https://api.emerald-budget.com'
    : process.env.REACT_APP_LOCAL_API_URL || 'http://localhost:5006'
});

// Export token manager for auth state
export { tokenManager };

// Listen for auth events
window.addEventListener('auth:expired', () => {
  // Redirect to login or show modal
  window.location.href = '/';
});
