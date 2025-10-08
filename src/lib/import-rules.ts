/**
 * Import Rules Engine
 * Automatic transaction categorization based on patterns
 */

export interface ImportRule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  enabled: boolean;
  createdAt: string;
  lastUsed?: string;
  useCount: number;
}

export interface RuleCondition {
  field: 'payee' | 'amount' | 'notes' | 'account';
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'regex';
  value: string | number;
  caseSensitive?: boolean;
}

export interface RuleAction {
  type: 'set_category' | 'set_payee' | 'add_tag' | 'set_cleared' | 'add_note';
  value: string | boolean;
}

export class ImportRulesEngine {
  private rules: ImportRule[] = [];
  
  constructor() {
    this.loadRules();
    this.initializeDefaultRules();
  }
  
  // Load rules from storage
  private loadRules() {
    const stored = localStorage.getItem('import_rules');
    if (stored) {
      this.rules = JSON.parse(stored);
    }
  }
  
  // Save rules to storage
  private saveRules() {
    localStorage.setItem('import_rules', JSON.stringify(this.rules));
  }
  
  // Initialize with smart default rules
  private initializeDefaultRules() {
    if (this.rules.length === 0) {
      const defaults: Omit<ImportRule, 'id'>[] = [
        {
          name: 'Starbucks → Coffee',
          conditions: [
            { field: 'payee', operator: 'contains', value: 'starbucks', caseSensitive: false }
          ],
          actions: [
            { type: 'set_category', value: 'Dining Out' },
            { type: 'set_payee', value: 'Starbucks' }
          ],
          priority: 100,
          enabled: true,
          createdAt: new Date().toISOString(),
          useCount: 0
        },
        {
          name: 'Amazon → Shopping',
          conditions: [
            { field: 'payee', operator: 'contains', value: 'amazon', caseSensitive: false }
          ],
          actions: [
            { type: 'set_category', value: 'Shopping' },
            { type: 'set_payee', value: 'Amazon' }
          ],
          priority: 90,
          enabled: true,
          createdAt: new Date().toISOString(),
          useCount: 0
        },
        {
          name: 'Salary → Income',
          conditions: [
            { field: 'payee', operator: 'contains', value: 'payroll', caseSensitive: false },
            { field: 'amount', operator: 'greater_than', value: 1000 }
          ],
          actions: [
            { type: 'set_category', value: 'Income' },
            { type: 'set_cleared', value: true }
          ],
          priority: 110,
          enabled: true,
          createdAt: new Date().toISOString(),
          useCount: 0
        },
        {
          name: 'Gas Stations → Transportation',
          conditions: [
            { field: 'payee', operator: 'regex', value: '(shell|chevron|exxon|mobil|bp|gas)', caseSensitive: false }
          ],
          actions: [
            { type: 'set_category', value: 'Transportation' }
          ],
          priority: 80,
          enabled: true,
          createdAt: new Date().toISOString(),
          useCount: 0
        },
        {
          name: 'Utilities → Bills',
          conditions: [
            { field: 'payee', operator: 'regex', value: '(electric|water|gas|internet|comcast|at&t|verizon)', caseSensitive: false }
          ],
          actions: [
            { type: 'set_category', value: 'Bills & Utilities' }
          ],
          priority: 85,
          enabled: true,
          createdAt: new Date().toISOString(),
          useCount: 0
        }
      ];
      
      defaults.forEach(rule => this.addRule(rule));
    }
  }
  
  // Add new rule
  addRule(rule: Omit<ImportRule, 'id'>): string {
    const id = crypto.randomUUID();
    const newRule: ImportRule = {
      ...rule,
      id
    };
    
    this.rules.push(newRule);
    this.sortRules();
    this.saveRules();
    
    return id;
  }
  
  // Update rule
  updateRule(id: string, updates: Partial<ImportRule>) {
    const index = this.rules.findIndex(r => r.id === id);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
      this.sortRules();
      this.saveRules();
    }
  }
  
  // Delete rule
  deleteRule(id: string) {
    this.rules = this.rules.filter(r => r.id !== id);
    this.saveRules();
  }
  
  // Sort rules by priority (higher priority first)
  private sortRules() {
    this.rules.sort((a, b) => b.priority - a.priority);
  }
  
  // Apply rules to a transaction
  applyRules(transaction: any): any {
    const modifiedTx = { ...transaction };
    
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      // Check if all conditions match
      const allConditionsMatch = rule.conditions.every(condition => 
        this.checkCondition(transaction, condition)
      );
      
      if (allConditionsMatch) {
        // Apply all actions
        rule.actions.forEach(action => {
          this.applyAction(modifiedTx, action);
        });
        
        // Update rule statistics
        rule.lastUsed = new Date().toISOString();
        rule.useCount++;
        
        // Only apply first matching rule
        break;
      }
    }
    
    this.saveRules();
    return modifiedTx;
  }
  
  // Check if condition matches
  private checkCondition(transaction: any, condition: RuleCondition): boolean {
    const fieldValue = transaction[condition.field];
    
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }
    
    const value = condition.caseSensitive === false 
      ? String(fieldValue).toLowerCase() 
      : String(fieldValue);
      
    const conditionValue = condition.caseSensitive === false && typeof condition.value === 'string'
      ? condition.value.toLowerCase()
      : condition.value;
    
    switch (condition.operator) {
      case 'contains':
        return value.includes(String(conditionValue));
        
      case 'equals':
        return value === String(conditionValue);
        
      case 'starts_with':
        return value.startsWith(String(conditionValue));
        
      case 'ends_with':
        return value.endsWith(String(conditionValue));
        
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
        
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
        
      case 'regex':
        try {
          const regex = new RegExp(String(conditionValue), condition.caseSensitive ? 'g' : 'gi');
          return regex.test(value);
        } catch {
          return false;
        }
        
      default:
        return false;
    }
  }
  
  // Apply action to transaction
  private applyAction(transaction: any, action: RuleAction) {
    switch (action.type) {
      case 'set_category':
        transaction.category = action.value;
        transaction.auto_categorized = true;
        break;
        
      case 'set_payee':
        transaction.payee = action.value;
        transaction.payee_normalized = true;
        break;
        
      case 'add_tag':
        transaction.tags = transaction.tags || [];
        if (!transaction.tags.includes(action.value)) {
          transaction.tags.push(action.value);
        }
        break;
        
      case 'set_cleared':
        transaction.cleared = action.value;
        break;
        
      case 'add_note':
        transaction.notes = transaction.notes 
          ? `${transaction.notes}\n${action.value}`
          : action.value;
        break;
    }
  }
  
  // Get all rules
  getRules(): ImportRule[] {
    return this.rules;
  }
  
  // Get rule statistics
  getStatistics(): {
    totalRules: number;
    enabledRules: number;
    totalApplications: number;
    mostUsedRule?: ImportRule;
  } {
    const enabledRules = this.rules.filter(r => r.enabled).length;
    const totalApplications = this.rules.reduce((sum, r) => sum + r.useCount, 0);
    const mostUsedRule = this.rules.reduce((max, r) => 
      r.useCount > (max?.useCount || 0) ? r : max
    , this.rules[0]);
    
    return {
      totalRules: this.rules.length,
      enabledRules,
      totalApplications,
      mostUsedRule
    };
  }
  
  // Batch process transactions
  batchProcess(transactions: any[]): any[] {
    return transactions.map(tx => this.applyRules(tx));
  }
  
  // Learn from user corrections (ML-lite)
  learnFromCorrection(
    originalTransaction: any,
    correctedCategory: string,
    correctedPayee?: string
  ) {
    // Check if we should create a new rule based on this correction
    const payee = originalTransaction.payee;
    
    // Look for similar corrections
    const similarCorrections = this.getSimilarCorrections(payee);
    
    if (similarCorrections >= 3) {
      // Auto-create a rule after 3 similar corrections
      this.addRule({
        name: `Learned: ${payee} → ${correctedCategory}`,
        conditions: [
          { field: 'payee', operator: 'contains', value: payee, caseSensitive: false }
        ],
        actions: [
          { type: 'set_category', value: correctedCategory },
          ...(correctedPayee ? [{ type: 'set_payee', value: correctedPayee } as RuleAction] : [])
        ],
        priority: 70,
        enabled: true,
        createdAt: new Date().toISOString(),
        useCount: 0
      });
    }
  }
  
  // Track similar corrections (simplified ML)
  private getSimilarCorrections(payee: string): number {
    // In production, this would track corrections in a separate store
    // For now, return a simulated count
    return 0;
  }
}

// Singleton instance
export const importRules = new ImportRulesEngine();
