/**
 * Bank Sync Service
 * Integrates bank sync with Actual Budget backend
 */

import { ActualAPI } from './api';
import { fileImportService } from './file-import';
import { plaidService } from './plaid-integration';
import { simpleFINService } from './simplefin-integration';
import { goCardlessService } from './gocardless-integration';
import { importRules } from './import-rules';

export interface BankSyncConnection {
  id: string;
  name: string;
  type: 'plaid' | 'simplefin' | 'gocardless' | 'csv';
  status: 'connected' | 'error' | 'expired' | 'pending';
  accountId: string; // Actual Budget account ID
  externalAccountId: string; // Bank/service account ID
  lastSync: string;
  accessToken?: string;
  metadata?: any;
}

export interface SyncResult {
  success: boolean;
  transactionsImported: number;
  duplicatesSkipped: number;
  errors: string[];
  newTransactions: any[];
}

export class BankSyncService {
  private api: ActualAPI;
  private connections: BankSyncConnection[] = [];

  constructor(api: ActualAPI) {
    this.api = api;
    this.loadConnections();
  }

  // Load connections from localStorage
  private loadConnections() {
    const stored = localStorage.getItem('bank_sync_connections');
    if (stored) {
      this.connections = JSON.parse(stored);
    }
  }

  // Save connections to localStorage
  private saveConnections() {
    localStorage.setItem('bank_sync_connections', JSON.stringify(this.connections));
  }

  // Add new bank connection
  async addConnection(
    type: 'plaid' | 'simplefin' | 'gocardless',
    accountId: string,
    externalAccountId: string,
    accessToken: string,
    metadata: any = {}
  ): Promise<string> {
    const connection: BankSyncConnection = {
      id: crypto.randomUUID(),
      name: metadata.name || `${type} Account`,
      type,
      status: 'connected',
      accountId,
      externalAccountId,
      lastSync: new Date().toISOString(),
      accessToken,
      metadata
    };

    this.connections.push(connection);
    this.saveConnections();

    return connection.id;
  }

  // Remove bank connection
  removeConnection(connectionId: string): void {
    this.connections = this.connections.filter(c => c.id !== connectionId);
    this.saveConnections();
  }

  // Get all connections
  getConnections(): BankSyncConnection[] {
    return this.connections;
  }

  // Sync specific connection
  async syncConnection(connectionId: string): Promise<SyncResult> {
    const connection = this.connections.find(c => c.id === connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    try {
      let result: SyncResult;

      switch (connection.type) {
        case 'plaid':
          result = await this.syncPlaidConnection(connection);
          break;
        case 'simplefin':
          result = await this.syncSimpleFINConnection(connection);
          break;
        case 'gocardless':
          result = await this.syncGoCardlessConnection(connection);
          break;
        default:
          throw new Error(`Unsupported connection type: ${connection.type}`);
      }

      // Update connection status
      connection.status = result.success ? 'connected' : 'error';
      connection.lastSync = new Date().toISOString();
      this.saveConnections();

      return result;

    } catch (error) {
      console.error(`Sync failed for connection ${connectionId}:`, error);
      
      // Update connection status
      connection.status = 'error';
      this.saveConnections();

      return {
        success: false,
        transactionsImported: 0,
        duplicatesSkipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        newTransactions: []
      };
    }
  }

  // Sync Plaid connection
  private async syncPlaidConnection(connection: BankSyncConnection): Promise<SyncResult> {
    if (!connection.accessToken) {
      throw new Error('No access token for Plaid connection');
    }

    // Get transactions from last 30 days
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const plaidTransactions = await plaidService.getTransactions(
      connection.accessToken,
      startDate,
      endDate
    );

    // Convert to our format
    const transactions = plaidTransactions.map(tx => 
      plaidService.convertTransaction(tx)
    );

    return await this.processTransactions(connection, transactions);
  }

  // Sync SimpleFIN connection
  private async syncSimpleFINConnection(connection: BankSyncConnection): Promise<SyncResult> {
    const transactions = await simpleFINService.getTransactions(connection.externalAccountId);
    
    // Convert to our format
    const convertedTransactions = transactions.map(tx => 
      simpleFINService.convertTransaction(tx)
    );

    return await this.processTransactions(connection, convertedTransactions);
  }

  // Sync GoCardless connection
  private async syncGoCardlessConnection(connection: BankSyncConnection): Promise<SyncResult> {
    const transactions = await goCardlessService.getTransactions(connection.externalAccountId);
    
    // Convert to our format
    const convertedTransactions = transactions.map(tx => 
      goCardlessService.convertTransaction(tx, connection.accountId)
    );

    return await this.processTransactions(connection, convertedTransactions);
  }

  // Process and import transactions
  private async processTransactions(
    connection: BankSyncConnection,
    transactions: any[]
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      transactionsImported: 0,
      duplicatesSkipped: 0,
      errors: [],
      newTransactions: []
    };

    // Get existing transactions to check for duplicates
    const existingTransactions = await this.api.getTransactions();
    const existingIds = new Set(existingTransactions.map(tx => tx.id));

    for (const transaction of transactions) {
      try {
        // Check for duplicates
        if (existingIds.has(transaction.id)) {
          result.duplicatesSkipped++;
          continue;
        }

        // Apply import rules for categorization
        const processedTransaction = importRules.applyRules(transaction);

        // Set the correct account ID
        processedTransaction.account = connection.accountId;

        // Add to Actual Budget
        await this.api.addTransactions(connection.accountId, [processedTransaction]);

        result.transactionsImported++;
        result.newTransactions.push(processedTransaction);

      } catch (error) {
        console.error('Failed to import transaction:', error);
        result.errors.push(`Failed to import transaction: ${error}`);
        result.success = false;
      }
    }

    return result;
  }

  // Import CSV file
  async importCSVFile(file: File, accountId: string): Promise<SyncResult> {
    try {
      const importResult = await fileImportService.importCSV(file);
      
      if (importResult.errors.length > 0) {
        console.warn('CSV import warnings:', importResult.errors);
      }

      // Validate transactions
      const validTransactions = fileImportService.validateTransactions(importResult.transactions);
      
      // Convert to our transaction format
      const transactions = fileImportService.convertToTransactionFormat(validTransactions, accountId);

      // Process transactions (apply rules, check duplicates, etc.)
      const dummyConnection: BankSyncConnection = {
        id: 'csv-import',
        name: 'CSV Import',
        type: 'csv',
        status: 'connected',
        accountId,
        externalAccountId: '',
        lastSync: new Date().toISOString()
      };

      return await this.processTransactions(dummyConnection, transactions);

    } catch (error) {
      console.error('CSV import failed:', error);
      return {
        success: false,
        transactionsImported: 0,
        duplicatesSkipped: 0,
        errors: [error instanceof Error ? error.message : 'CSV import failed'],
        newTransactions: []
      };
    }
  }

  // Sync all connections
  async syncAll(): Promise<{ [connectionId: string]: SyncResult }> {
    const results: { [connectionId: string]: SyncResult } = {};

    for (const connection of this.connections) {
      if (connection.status === 'connected') {
        try {
          results[connection.id] = await this.syncConnection(connection.id);
        } catch (error) {
          console.error(`Failed to sync connection ${connection.id}:`, error);
          results[connection.id] = {
            success: false,
            transactionsImported: 0,
            duplicatesSkipped: 0,
            errors: [error instanceof Error ? error.message : 'Sync failed'],
            newTransactions: []
          };
        }
      }
    }

    return results;
  }

  // Setup automatic sync (would use a service worker or background task in production)
  setupAutoSync(intervalHours: number = 24): void {
    // Clear existing interval
    const existingInterval = localStorage.getItem('bank_sync_interval');
    if (existingInterval) {
      clearInterval(parseInt(existingInterval));
    }

    // Set up new interval
    const intervalId = setInterval(async () => {
      console.log('Running automatic bank sync...');
      try {
        await this.syncAll();
        console.log('Automatic sync completed');
      } catch (error) {
        console.error('Automatic sync failed:', error);
      }
    }, intervalHours * 60 * 60 * 1000);

    localStorage.setItem('bank_sync_interval', intervalId.toString());
  }

  // Get sync statistics
  getSyncStats(): {
    totalConnections: number;
    activeConnections: number;
    lastSyncTime?: string;
    totalTransactionsSynced: number;
  } {
    const activeConnections = this.connections.filter(c => c.status === 'connected');
    const lastSyncTimes = this.connections
      .map(c => new Date(c.lastSync).getTime())
      .filter(time => !isNaN(time));
    
    const lastSyncTime = lastSyncTimes.length > 0 
      ? new Date(Math.max(...lastSyncTimes)).toISOString()
      : undefined;

    // This would come from actual sync history in production
    const totalTransactionsSynced = this.connections.reduce((sum, c) => 
      sum + (c.metadata?.transactionCount || 0), 0
    );

    return {
      totalConnections: this.connections.length,
      activeConnections: activeConnections.length,
      lastSyncTime,
      totalTransactionsSynced
    };
  }

  // Test connection
  async testConnection(connectionId: string): Promise<boolean> {
    const connection = this.connections.find(c => c.id === connectionId);
    if (!connection) {
      return false;
    }

    try {
      switch (connection.type) {
        case 'plaid':
          return connection.accessToken ? await plaidService.testConnection() : false;
        case 'simplefin':
          return await simpleFINService.testConnection();
        case 'gocardless':
          return await goCardlessService.testConnection();
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
}

// Export singleton factory
export function createBankSyncService(api: ActualAPI): BankSyncService {
  return new BankSyncService(api);
}
