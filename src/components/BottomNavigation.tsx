import { useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Wallet, 
  Receipt, 
  BarChart3, 
  Target 
} from "lucide-react";

const bottomNavItems = [
  { 
    title: "Budgets", 
    url: "/budgets", 
    icon: Wallet 
  },
  { 
    title: "Transactions", 
    url: "/transactions", 
    icon: Receipt 
  },
  { 
    title: "Dashboard", 
    url: "/", 
    icon: LayoutDashboard 
  },
  { 
    title: "Reports", 
    url: "/reports", 
    icon: BarChart3 
  },
  { 
    title: "Goals", 
    url: "/goals", 
    icon: Target 
  },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around h-16">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.url;
          
          return (
            <button
              key={item.url}
              onClick={() => navigate(item.url)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className={`inline-flex items-center justify-center rounded-full p-2 ${
                isActive ? 'bg-emerald-500/10 ring-1 ring-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : ''
              }`}>
                <Icon className="w-5 h-5" />
              </span>
              <span className={`text-[11px] sm:text-xs mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
