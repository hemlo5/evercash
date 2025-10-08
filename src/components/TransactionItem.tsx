import { Coffee, ShoppingBag, Home, Car, Smartphone, MoreHorizontal } from "lucide-react";

interface TransactionItemProps {
  merchant: string;
  category: string;
  amount: number;
  date: string;
}

const categoryIcons = {
  dining: Coffee,
  shopping: ShoppingBag,
  housing: Home,
  transport: Car,
  utilities: Smartphone,
};

export function TransactionItem({ merchant, category, amount, date }: TransactionItemProps) {
  const Icon = categoryIcons[category as keyof typeof categoryIcons] || MoreHorizontal;
  const isPositive = amount > 0;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/30 transition-all duration-300 group cursor-pointer">
      <div className="w-12 h-12 rounded-xl bg-gradient-emerald-subtle flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{merchant}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {category}
          </span>
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
      </div>
      <div
        className={`text-lg font-bold ${
          isPositive ? "text-green-500" : "text-red-500"
        }`}
      >
        {isPositive ? "+" : "-"}${Math.abs(amount).toFixed(2)}
      </div>
    </div>
  );
}
