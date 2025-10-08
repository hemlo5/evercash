import { useState, useEffect } from "react";
import { Search, Upload, Download, Filter, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TransactionItem } from "@/components/TransactionItem";
import { BankSyncModal } from "@/components/BankSyncModal";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/contexts/ApiContext";
import { toast } from "sonner";
import type { Transaction, Account, Category, Payee } from "@/lib/api";
import { sanitizeInput, sanitizeAmount, sanitizeNotes } from "@/lib/sanitize";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Transactions() {
  const { api } = useApi();
  const [bankSyncOpen, setBankSyncOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    account: "",
    payee: "",
    category: "",
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: "",
    type: 'expense' as 'expense' | 'income',
  });

  useEffect(() => {
    if (api) {
      loadData();
    }
  }, [api]);

  const loadData = async () => {
    if (!api) return;
    
    setIsLoading(true);
    try {
      const [txData, accData, catData, payeeData] = await Promise.all([
        api.getTransactions(),
        api.getAccounts(),
        api.getCategories() as Promise<Category[]>,
        api.getPayees(),
      ]);
      
      setTransactions(txData);
      setAccounts(accData);
      setCategories(catData);
      setPayees(payeeData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTransaction = async () => {
    if (!api) return;
    try {
      // Sanitize inputs
      const sanitizedPayee = sanitizeInput(formData.payee);
      const sanitizedNotes = sanitizeNotes(formData.notes);
      const sanitizedAmount = sanitizeAmount(formData.amount);
      
      // Validate
      if (!sanitizedPayee || sanitizedAmount <= 0) {
        toast.error("Please enter valid payee and amount");
        return;
      }
      
      const signedAmount = formData.type === 'expense' ? -sanitizedAmount : sanitizedAmount;
      await api.addTransactions(formData.account, [{
        payee: sanitizedPayee,
        category: formData.category,
        amount: Math.round(signedAmount * 100), // Convert to cents
        date: formData.date,
        notes: sanitizedNotes,
      }]);
      toast.success("✅ Transaction added securely");
      setCreateDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("❌ Failed to create transaction");
    }
  };


  const handleUpdateTransaction = async () => {
    if (!api || !selectedTransaction) return;
    
    try {
      // Sanitize inputs
      const sanitizedPayee = sanitizeInput(formData.payee);
      const sanitizedNotes = sanitizeNotes(formData.notes);
      const sanitizedAmount = sanitizeAmount(formData.amount);
      
      // Validate
      if (!sanitizedPayee || sanitizedAmount <= 0) {
        toast.error("Please enter valid payee and amount");
        return;
      }
      
      await api.updateTransaction(selectedTransaction.id, {
        payee: sanitizedPayee,
        category: formData.category,
        amount: Math.round(sanitizedAmount * 100),
        date: formData.date,
        notes: sanitizedNotes,
      });
      
      toast.success("✅ Transaction updated securely");
      setEditDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error("❌ Failed to update transaction");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!api) return;
    
    try {
      await api.deleteTransaction(id);
      toast.success("Transaction deleted successfully");
      await loadData();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else {
      const daysAgo = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo < 7) {
        return `${daysAgo} days ago`;
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getPayeeName = (payeeId: string) => {
    const payee = payees.find(p => p.id === payeeId);
    return payee?.name || 'Unknown';
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  const filteredTransactions = transactions.filter(tx => {
    if (!searchTerm) return true;
    const payeeName = getPayeeName(tx.payee).toLowerCase();
    const categoryName = getCategoryName(tx.category).toLowerCase();
    const search = searchTerm.toLowerCase();
    return payeeName.includes(search) || 
           categoryName.includes(search) ||
           tx.notes?.toLowerCase().includes(search);
  });

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading transactions...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Transactions</h1>
          <p className="text-muted-foreground">View and manage all your transactions</p>
        </div>
        <Button
          onClick={() => {
            setFormData({
              account: accounts[0]?.id || "",
              payee: "",
              category: "",
              amount: 0,
              date: new Date().toISOString().split('T')[0],
              notes: "",
              type: 'expense',
            });
            setCreateDialogOpen(true);
          }}
          className="bg-gradient-emerald hover:opacity-90"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Sync Status Badge */}
      <div className="flex items-center gap-3 animate-fade-in-up">
        <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30">
          <span className="w-2 h-2 rounded-full bg-accent mr-1.5 animate-pulse"></span>
          Live sync enabled
        </Badge>
        <Badge variant="outline">
          {filteredTransactions.length} transactions
        </Badge>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 bg-muted/30 border-border/50 focus:border-accent/50 transition-colors"
            aria-label="Search transactions"
          />
        </div>
        <Button
          variant="outline"
          className="h-12 border-accent/30 hover:bg-accent/10"
        >
          <Filter className="w-5 h-5 mr-2" />
          Filter
        </Button>
        <Button
          onClick={() => setBankSyncOpen(true)}
          className="bg-gradient-emerald hover:opacity-90 transition-opacity h-12 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
        >
          <Upload className="w-5 h-5 mr-2" />
          Import / Sync
        </Button>
      </div>

      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">All Transactions</h2>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={async () => {
              // Export functionality
              toast.info("Export feature coming soon");
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
        <div className="space-y-2">
          {filteredTransactions.slice(0, 100).map((transaction) => (
            <div 
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/5 transition-colors group"
            >
              <TransactionItem
                merchant={getPayeeName(transaction.payee)}
                category={getCategoryName(transaction.category)}
                amount={transaction.amount / 100}
                date={formatDate(transaction.date)}
              />
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTransaction(transaction);
                    setFormData({
                      account: transaction.account,
                      payee: transaction.payee,
                      category: transaction.category,
                      amount: Math.abs(transaction.amount / 100),
                      date: transaction.date,
                      notes: transaction.notes || "",
                      type: transaction.amount < 0 ? 'expense' : 'income',
                    });
                    setEditDialogOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTransaction(transaction.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BankSyncModal open={bankSyncOpen} onOpenChange={setBankSyncOpen} />

      {/* Create Transaction Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
            <DialogDescription>
              Create a new transaction entry
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <span className="text-xs font-semibold">Type:</span>
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${formData.type === 'expense' ? 'bg-red-500 text-white border-red-500' : 'bg-transparent border-muted-foreground text-muted-foreground hover:bg-red-500/10'}`}
              onClick={() => setFormData(f => ({ ...f, type: 'expense' }))}
            >Expense</button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${formData.type === 'income' ? 'bg-green-500 text-white border-green-500' : 'bg-transparent border-muted-foreground text-muted-foreground hover:bg-green-500/10'}`}
              onClick={() => setFormData(f => ({ ...f, type: 'income' }))}
            >Income</button>
          </div>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Account</Label>
              <Select
                value={formData.account}
                onValueChange={(value) => setFormData({ ...formData, account: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => !a.closed).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Payee</Label>
              <Input
                value={formData.payee}
                onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                placeholder="Enter payee name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => !c.is_income).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes (optional)</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTransaction}>
              Add Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update transaction details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Payee</Label>
              <Input
                value={formData.payee}
                onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                placeholder="Enter payee name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => !c.is_income).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes (optional)</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTransaction}>
              Update Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
