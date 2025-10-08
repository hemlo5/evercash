import { useState } from "react";
import { useApi } from "@/contexts/ApiContext";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput, sanitizeAmount, sanitizeCategory } from "@/lib/sanitize";

// Integration note: Use useTransactions() from Actual to add transaction
// Call addTransaction(transactionData) with proper validation
export function QuickAddTransaction({ onAdded }: { onAdded?: () => void }) {
  const { toast } = useToast();
  const { api } = useApi();
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;
    setLoading(true);
    try {
      // Sanitize all inputs
      const sanitizedMerchant = sanitizeInput(merchant);
      const sanitizedCategory = sanitizeCategory(category);
      const sanitizedAmount = sanitizeAmount(amount);
      
      // Validate sanitized inputs
      if (!sanitizedMerchant || sanitizedAmount <= 0) {
        toast({
          title: "Invalid input",
          description: "Please enter valid merchant and amount",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      const isExpense = type === 'expense';
      const signedAmount = isExpense ? -sanitizedAmount : sanitizedAmount;
      
      // Get first account or throw error
      const accounts = await api.getAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts available. Please create an account first.');
      }
      
      await api.addTransactions(accounts[0].id, [{
        payee: sanitizedMerchant,
        category: sanitizedCategory,
        amount: Math.round(signedAmount * 100),
        date: new Date().toISOString().split('T')[0],
        notes: '',
      }]);
      
      toast({
        title: "✅ Transaction Added",
        description: (
          <span className={isExpense ? 'text-red-500' : 'text-green-500'}>
            {isExpense ? '-' : '+'}${sanitizedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} at {sanitizedMerchant}
          </span>
        ),
      });
      setMerchant("");
      setAmount("");
      setCategory("");
      setType('expense');
      if (onAdded) onAdded();
    } catch (err) {
      toast({ 
        title: '❌ Failed to add transaction', 
        description: err instanceof Error ? err.message : 'An error occurred', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-4 mb-2">
        <span className="text-xs font-semibold">Type:</span>
        <button
          type="button"
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${type === 'expense' ? 'bg-red-500 text-white border-red-500' : 'bg-transparent border-muted-foreground text-muted-foreground hover:bg-red-500/10'}`}
          onClick={() => setType('expense')}
        >Expense</button>
        <button
          type="button"
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${type === 'income' ? 'bg-green-500 text-white border-green-500' : 'bg-transparent border-muted-foreground text-muted-foreground hover:bg-green-500/10'}`}
          onClick={() => setType('income')}
        >Income</button>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Merchant</Label>
        <Input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="Coffee shop"
          className="mt-1 bg-muted/30"
          required
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Amount</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={e => {
            // Only allow positive
            const v = e.target.value;
            if (!v.startsWith("-") && !v.includes("e")) setAmount(v);
          }}
          placeholder="0.00"
          className="mt-1 bg-muted/30"
          required
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Category</Label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger className="mt-1 bg-muted/30">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="glass-card border-accent/20">
            <SelectItem value="dining">Dining</SelectItem>
            <SelectItem value="shopping">Shopping</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
            <SelectItem value="utilities">Utilities</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full bg-gradient-emerald hover:opacity-90">
        <Plus className="w-4 h-4 mr-2" />
        Add Transaction
      </Button>
    </form>
  );
}
