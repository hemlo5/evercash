import { useState, useEffect } from "react";
import { TrendingUp, Download, Loader2, DollarSign, PiggyBank, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/contexts/ApiContext";
import { toast } from "sonner";
import type { Transaction, Account, Category } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from "recharts";
import { useTheme } from "@/contexts/ThemeContext";

export default function Reports() {
  const { api } = useApi();
  const [timeframe, setTimeframe] = useState("month");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (api) {
      loadReportData();
    }
  }, [api, timeframe]);

  const loadReportData = async () => {
    if (!api) return;
    
    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }
      
      const [txData, accData, catData] = await Promise.all([
        api.getTransactions(
          undefined,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        ),
        api.getAccounts(),
        api.getCategories() as Promise<Category[]>,
      ]);
      
      setTransactions(txData);
      setAccounts(accData);
      setCategories(catData);
    } catch (error) {
      console.error("Error loading report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  // Calculate metrics
  const totalIncome = transactions
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const totalExpenses = Math.abs(transactions
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + tx.amount, 0));
    
  const netIncome = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;
  const netWorth = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
  
  // Spending by category
  const categoryBreakdown = categories
    .map(category => {
      const spent = Math.abs(transactions
        .filter(tx => tx.category === category.id && tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0));
      return {
        name: category.name,
        value: spent / 100,
        amount: spent,
        percentage: totalExpenses > 0 ? (spent / totalExpenses) * 100 : 0
      };
    })
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

    // Theme-aware pie colors (using in-app theme)
  // Import useTheme at the top: import { useTheme } from "@/contexts/ThemeContext";
  // Palette: 12 visually distinct colors for each theme
  // Place this at the top: import { useTheme } from "@/contexts/ThemeContext";
  const { theme } = useTheme();
  const colors = theme === 'dark'
    ? [
        '#39FF14', '#00E6F6', '#FF00C8', '#FFD600', '#FF3C00', '#00FFB3',
        '#A020F0', '#FF1744', '#00FFEA', '#FFB300', '#00FF57', '#FF61A6'
      ]
    : [
        '#1A7F5A', '#2AB67C', '#3FCF8E', '#6EE7B7', '#A7F3D0', '#D1FAE5',
        '#15803D', '#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'
      ];

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">Track your financial progress</p>
        </div>
        <div className="flex gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="quarter">Last 3 months</SelectItem>
              <SelectItem value="year">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            className="bg-gradient-emerald hover:opacity-90"
            onClick={() => toast.info("Export feature coming soon")}
          >
            <Download className="w-5 h-5 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(netIncome)}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{savingsRate.toFixed(1)}%</div>
            <Progress value={savingsRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <div className="glass-card p-8 rounded-2xl animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-6">Spending by Category</h2>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percentage }) => `${name} ${percentage.toFixed(0)}%`}
              >
                {categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                }}
                formatter={(value: any) => formatCurrency(value * 100)}
              />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="space-y-3 w-full md:w-auto">
            {categoryBreakdown.map((category, index) => (
              <div key={category.name} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-sm flex-1">{category.name}</span>
                <span className="font-semibold">{formatCurrency(category.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Net Worth Card */}
      <div className="glass-card p-8 rounded-2xl">
        <h2 className="text-2xl font-bold mb-4">Net Worth</h2>
        <div className="text-4xl font-bold text-emerald-600">{formatCurrency(netWorth)}</div>
        <p className="text-sm text-muted-foreground mt-2">Total across all accounts</p>
      </div>
    </div>
  );
}
