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
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-border z-40 md:hidden">
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
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
              <span className="text-xs mt-1 font-medium">{item.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
