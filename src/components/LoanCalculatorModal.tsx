import { useState } from "react";
import { Calculator, TrendingDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface LoanCalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoanCalculatorModal({ open, onOpenChange }: LoanCalculatorModalProps) {
  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(5);
  const [years, setYears] = useState(3);

  const monthlyRate = rate / 100 / 12;
  const months = years * 12;
  const monthlyPayment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
  const totalPaid = monthlyPayment * months;
  const totalInterest = totalPaid - principal;

  // Generate amortization data
  const amortizationData = [];
  let balance = principal;
  for (let month = 0; month <= months; month += 6) {
    const interestPaid = balance * monthlyRate * 6;
    const principalPaid = monthlyPayment * 6 - interestPaid;
    amortizationData.push({
      month,
      balance: balance / 1000,
      interest: (totalInterest - interestPaid) / 1000,
    });
    balance -= principalPaid;
    if (balance < 0) balance = 0;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-accent/20 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <Calculator className="w-6 h-6 text-accent" />
            Loan Payoff Calculator
          </DialogTitle>
          <DialogDescription>
            Plan your debt payoff strategy with interest projections
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-6">
            <div>
              <Label>Loan Amount: ${principal.toLocaleString()}</Label>
              <Slider
                value={[principal]}
                onValueChange={([value]) => setPrincipal(value)}
                min={1000}
                max={100000}
                step={1000}
                className="mt-3"
              />
            </div>

            <div>
              <Label>Interest Rate: {rate}%</Label>
              <Slider
                value={[rate]}
                onValueChange={([value]) => setRate(value)}
                min={0.1}
                max={30}
                step={0.1}
                className="mt-3"
              />
            </div>

            <div>
              <Label>Loan Term: {years} years</Label>
              <Slider
                value={[years]}
                onValueChange={([value]) => setYears(value)}
                min={1}
                max={30}
                step={1}
                className="mt-3"
              />
            </div>

            <div className="glass-card p-4 rounded-xl border-accent/20 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Monthly Payment</span>
                <span className="text-lg font-bold">${monthlyPayment.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Interest</span>
                <span className="text-lg font-bold text-destructive">
                  ${totalInterest.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Paid</span>
                <span className="text-lg font-bold">${totalPaid.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-accent" />
              Payoff Progress
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={amortizationData}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Month", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Balance ($k)", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(160 84% 39%)"
                  fill="url(#balanceGradient)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
