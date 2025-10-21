import {
  LayoutDashboard,
  Wallet,
  Building2,
  Receipt,
  BarChart3,
  Target,
  Upload,
  Link2,
  Users,
  Settings
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Accounts", url: "/accounts", icon: Building2 },
  { title: "Budgets", url: "/budgets", icon: Wallet },
  { title: "Transactions", url: "/transactions", icon: Receipt },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Import", url: "/import", icon: Upload },
  { title: "Bank Sync", url: "/bank-sync", icon: Link2 },
  { title: "Sharing", url: "/sharing", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  return (
    <Sidebar className={`border-r border-border shadow-sm bg-sidebar ${className || ''}`}>
      <SidebarContent className="bg-sidebar">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-center mb-2">
            <h2 className="font-bold text-xl bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">EVERCASH</h2>
          </div>
        </div>

        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="px-3 text-emerald-500/70 dark:text-white/70 uppercase text-xs tracking-wider font-semibold mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <NavLink
                    to={item.url}
                    end
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-r from-green-500 to-green-400 text-white shadow-lg shadow-green-500/30 font-semibold"
                          : "text-emerald-600 dark:text-white hover:text-green-400 hover:bg-green-500/10 font-medium"
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          <div className="bg-gradient-to-br from-green-500/10 to-green-400/20 border border-green-500/30 p-4 rounded-xl shadow-[0_0_15px_rgba(0,255,0,0.2)]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-500 to-green-400 flex items-center justify-center shadow-[0_0_10px_rgba(0,255,0,0.4)]">
                <span className="text-sm font-bold text-black">JD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-emerald-600 dark:text-white">John Doe</p>
                <p className="text-xs text-green-400 font-medium">Premium</p>
              </div>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
