import { LayoutDashboard, Wallet, Receipt, BarChart3, Target, Users, Settings } from "lucide-react";
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
  { title: "Budgets", url: "/budgets", icon: Wallet },
  { title: "Transactions", url: "/transactions", icon: Receipt },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Sharing", url: "/sharing", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-border shadow-sm bg-sidebar">
      <SidebarContent className="bg-sidebar">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-gradient-emerald flex items-center justify-center font-bold text-lg shadow-md">
              MB
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">MyBudget</h2>
              <p className="text-xs text-emerald-600 font-medium">Pro</p>
            </div>
          </div>
        </div>

        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="px-3 text-muted-foreground uppercase text-xs tracking-wider font-semibold mb-2">
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
                          ? "bg-gradient-emerald text-white shadow-lg shadow-emerald-500/30 font-semibold"
                          : "text-gray-800 hover:text-gray-900 hover:bg-emerald-50 font-medium"
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
          <div className="bg-gradient-emerald-subtle border border-emerald-200 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-emerald flex items-center justify-center shadow-md">
                <span className="text-sm font-bold text-white">JD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-foreground">John Doe</p>
                <p className="text-xs text-emerald-600 font-medium">Premium</p>
              </div>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
