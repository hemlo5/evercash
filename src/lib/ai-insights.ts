import type { Transaction as ApiTransaction } from "@/lib/api";

export interface AIInsight {
  type: 'warning' | 'info' | 'success';
  message: string;
  detail: string;
  priority: number; // Higher = more important
}

interface CategorySpending {
  category: string;
  amount: number;
  count: number;
  avgPerTransaction: number;
}

interface SpendingPattern {
  totalSpent: number;
  totalIncome: number;
  topCategories: CategorySpending[];
  frequentPayees: { payee: string; amount: number; count: number }[];
}

/**
 * Analyzes transaction data and generates AI-powered insights
 */
export class AIInsightGenerator {
  private transactions: ApiTransaction[];
  private patterns: SpendingPattern;
  private incomeOverride?: number;
  private expenseOverride?: number;

  constructor(transactions: ApiTransaction[], options?: { income?: number; expense?: number }) {
    this.transactions = transactions;
    this.patterns = this.analyzeSpendingPatterns();
    this.incomeOverride = options?.income;
    this.expenseOverride = options?.expense;
  }

  /**
   * Analyze spending patterns from transaction data
   */
  private analyzeSpendingPatterns(): SpendingPattern {
    const categorySpending: Record<string, CategorySpending> = {};
    const payeeSpending: Record<string, { amount: number; count: number }> = {};
    let totalSpent = 0;
    let totalIncome = 0;

    // Filter to last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate < thirtyDaysAgo) return;

      const amount = tx.amount || 0;
      const category = tx.category || 'Other';
      const payee = tx.payee || 'Unknown';

      // Track income vs expenses
      if (amount > 0) {
        totalIncome += amount;
      } else {
        totalSpent += Math.abs(amount);
      }

      // Track category spending (only expenses)
      if (amount < 0) {
        if (!categorySpending[category]) {
          categorySpending[category] = {
            category,
            amount: 0,
            count: 0,
            avgPerTransaction: 0
          };
        }
        categorySpending[category].amount += Math.abs(amount);
        categorySpending[category].count += 1;
      }

      // Track payee spending
      if (!payeeSpending[payee]) {
        payeeSpending[payee] = { amount: 0, count: 0 };
      }
      payeeSpending[payee].amount += Math.abs(amount);
      payeeSpending[payee].count += 1;
    });

    // Calculate averages and sort
    Object.values(categorySpending).forEach(cat => {
      cat.avgPerTransaction = cat.amount / cat.count;
    });

    const topCategories = Object.values(categorySpending)
      .sort((a, b) => b.amount - a.amount);

    const frequentPayees = Object.entries(payeeSpending)
      .map(([payee, data]) => ({ payee, ...data }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalSpent,
      totalIncome,
      topCategories,
      frequentPayees
    };
  }

  /**
   * Generate AI insights based on spending patterns
   */
  public generateInsights(): AIInsight[] {
    const insights: AIInsight[] = [];

    // 1. Budget warnings for high spending categories
    this.generateBudgetWarnings(insights);

    // 2. Savings opportunities
    this.generateSavingsOpportunities(insights);

    // 3. Spending pattern insights
    this.generateSpendingPatternInsights(insights);

    // 4. Income vs expense insights
    this.generateIncomeExpenseInsights(insights);

    // Sort by priority and return top 3
    return insights
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }

  private generateBudgetWarnings(insights: AIInsight[]) {
    const { topCategories, totalSpent } = this.patterns;

    // Check if any category is consuming more than 25% of total spending
    topCategories.forEach(cat => {
      const percentage = (cat.amount / totalSpent) * 100;
      
      if (percentage > 25 && cat.amount > 200) {
        insights.push({
          type: 'warning',
          message: `${cat.category} spending high`,
          detail: `You've spent $${cat.amount.toFixed(0)} (${percentage.toFixed(0)}%) on ${cat.category} this month. Consider reviewing these expenses.`,
          priority: 90
        });
      } else if (percentage > 15 && cat.amount > 150) {
        insights.push({
          type: 'info',
          message: `${cat.category} trending up`,
          detail: `${cat.category} represents ${percentage.toFixed(0)}% of your spending ($${cat.amount.toFixed(0)}). Track this category closely.`,
          priority: 60
        });
      }
    });
  }

  private generateSavingsOpportunities(insights: AIInsight[]) {
    const { totalIncome, totalSpent } = this.patterns;
    // Use overrides when provided to align with dashboard monthly stats
    const income = this.incomeOverride !== undefined ? this.incomeOverride : totalIncome;
    const spent = this.expenseOverride !== undefined ? this.expenseOverride : totalSpent;
    const savingsRate = income > 0 ? ((income - spent) / income) * 100 : 0;

    if (savingsRate < 10 && income > 0) {
      insights.push({
        type: 'warning',
        message: 'Low savings rate',
        detail: `You're saving only ${savingsRate.toFixed(1)}% of your income. Aim for at least 20% to build financial security.`,
        priority: 85
      });
    } else if (savingsRate >= 20) {
      insights.push({
        type: 'success',
        message: 'Great savings rate!',
        detail: `You're saving ${savingsRate.toFixed(1)}% of your income. Keep up the excellent financial discipline!`,
        priority: 70
      });
    } else if (savingsRate >= 10) {
      insights.push({
        type: 'info',
        message: 'Ready to save more',
        detail: `You're saving ${savingsRate.toFixed(1)}%. Consider increasing to 20% by reducing discretionary spending.`,
        priority: 50
      });
    }
  }

  private generateSpendingPatternInsights(insights: AIInsight[]) {
    const { frequentPayees, topCategories } = this.patterns;

    // Check for frequent small transactions that could be optimized
    const frequentSmallSpenders = frequentPayees.filter(p => 
      p.count >= 5 && p.amount / p.count < 20 && p.amount > 50
    );

    if (frequentSmallSpenders.length > 0) {
      const topSmallSpender = frequentSmallSpenders[0];
      insights.push({
        type: 'info',
        message: 'Frequent small purchases',
        detail: `You made ${topSmallSpender.count} transactions with ${topSmallSpender.payee} ($${(topSmallSpender.amount / topSmallSpender.count).toFixed(0)} avg). Consider bulk purchases to save.`,
        priority: 40
      });
    }

    // Check for dining/food spending patterns
    const foodCategories = topCategories.filter(cat => 
      cat.category.toLowerCase().includes('food') || 
      cat.category.toLowerCase().includes('dining') ||
      cat.category.toLowerCase().includes('restaurant')
    );

    if (foodCategories.length > 0 && foodCategories[0].amount > 300) {
      const foodSpending = foodCategories[0];
      insights.push({
        type: 'warning',
        message: 'High dining expenses',
        detail: `You spent $${foodSpending.amount.toFixed(0)} on ${foodSpending.category} (${foodSpending.count} transactions). Consider meal planning to reduce costs.`,
        priority: 75
      });
    }
  }

  private generateIncomeExpenseInsights(insights: AIInsight[]) {
    const { totalIncome, totalSpent } = this.patterns;

    if (totalSpent > totalIncome && totalIncome > 0) {
      const deficit = totalSpent - totalIncome;
      insights.push({
        type: 'warning',
        message: 'Spending exceeds income',
        detail: `You're spending $${deficit.toFixed(0)} more than you earn this month. Review expenses immediately.`,
        priority: 100
      });
    }

    if (totalIncome === 0 && totalSpent > 0) {
      insights.push({
        type: 'info',
        message: 'No income recorded',
        detail: 'Add your income transactions to get better financial insights and track your savings rate.',
        priority: 30
      });
    }
  }
}

/**
 * Generate AI insights from transaction data
 */
export function generateAIInsights(transactions: ApiTransaction[], options?: { income?: number; expense?: number }): AIInsight[] {
  const generator = new AIInsightGenerator(transactions, options);
  return generator.generateInsights();
}
