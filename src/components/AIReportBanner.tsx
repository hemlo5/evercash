import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { Transaction as ApiTransaction } from "@/lib/api";
import { useSimpleCurrency } from "@/contexts/SimpleCurrencyContext";

interface Props {
  transactions: ApiTransaction[];
  monthlyIncome?: number;
  monthlyExpenses?: number;
}

export function AIReportBanner({ transactions, monthlyIncome, monthlyExpenses }: Props) {
  const { formatAmount } = useSimpleCurrency();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let income = 0;
  let expense = 0;
  const categoryTotals: Record<string, number> = {};

  if (monthlyIncome !== undefined && monthlyExpenses !== undefined) {
    // Use provided monthly totals to stay consistent with Dashboard stat cards
    income = monthlyIncome;
    expense = monthlyExpenses;
    // Build category totals from last 30 days for context only
    for (const tx of transactions) {
      const d = new Date(tx.date);
      if (isNaN(d.getTime()) || d < thirtyDaysAgo) continue;
      const amt = tx.amount || 0;
      if (amt < 0) {
        const cat = tx.category || "Other";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(amt);
      }
    }
  } else {
    // Fallback: compute from last 30 days
    for (const tx of transactions) {
      const d = new Date(tx.date);
      if (isNaN(d.getTime()) || d < thirtyDaysAgo) continue;
      const amt = tx.amount || 0;
      if (amt > 0) income += amt;
      else expense += Math.abs(amt);
      if (amt < 0) {
        const cat = tx.category || "Other";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(amt);
      }
    }
  }

  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  const surplus = income - expense;

  let type: "success" | "warning" | "info" = "info";
  let title = "AI Report";
  let subtitle = "Not enough data";

  if (income === 0 && expense > 0) {
    type = "info";
    title = "No income recorded";
    subtitle = "Add income to see savings and surplus";
  } else if (expense > income) {
    type = "warning";
    const diff = formatAmount(Math.abs(surplus));
    let topCat = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
    title = "Expenses exceeding income";
    subtitle = topCat ? `${diff} over. Major spend: ${topCat}` : `${diff} over this period`;
  } else if (savingsRate >= 20) {
    type = "success";
    title = "Savings are great";
    subtitle = `Savings rate ${savingsRate.toFixed(1)}%, surplus ${formatAmount(surplus)}`;
  } else if (savingsRate >= 10) {
    type = "info";
    title = "Savings on track";
    subtitle = `Savings rate ${savingsRate.toFixed(1)}%, surplus ${formatAmount(surplus)}`;
  } else {
    type = "warning";
    title = "Savings are low";
    subtitle = `Savings rate ${savingsRate.toFixed(1)}%`;
  }

  const color =
    type === "warning"
      ? "bg-red-500/10 text-red-600 border-red-500/30"
      : type === "success"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
      : "bg-blue-500/10 text-blue-600 border-blue-500/30";

  const Icon = type === "warning" ? AlertTriangle : type === "success" ? CheckCircle2 : Info;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${color}`}>
      <Icon className="w-4 h-4" />
      <span className="text-xs font-semibold">{title}</span>
      <span className="text-[11px] opacity-75">• {subtitle}</span>
    </div>
  );
}
